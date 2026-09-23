package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestRequireAdminRejectsUnauthenticatedRequest(t *testing.T) {
	handler := requireAdmin(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("protected handler was called without a session")
	}))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/admin/portfolio", nil))
	if response.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusUnauthorized)
	}
}

func TestSessionCookieAttributes(t *testing.T) {
	original := appConfig
	defer func() { appConfig = original }()
	appConfig.cookieSecure = true
	response := httptest.NewRecorder()
	setSessionCookie(response, "opaque-token", time.Now().Add(sessionLifetime))
	cookies := response.Result().Cookies()
	if len(cookies) != 1 {
		t.Fatalf("cookies = %d, want 1", len(cookies))
	}
	cookie := cookies[0]
	if !cookie.HttpOnly || !cookie.Secure || cookie.SameSite != http.SameSiteLaxMode || cookie.Path != "/api" || cookie.MaxAge <= 0 {
		t.Fatalf("cookie security attributes are incomplete: %+v", cookie)
	}
}

func TestCORSAllowsOnlyConfiguredOrigin(t *testing.T) {
	original := appConfig
	defer func() { appConfig = original }()
	appConfig.frontendOrigin = "http://localhost:5500"
	handler := corsMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	allowed := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodOptions, "/api/auth/login", nil)
	request.Header.Set("Origin", appConfig.frontendOrigin)
	handler.ServeHTTP(allowed, request)
	if allowed.Code != http.StatusNoContent || allowed.Header().Get("Access-Control-Allow-Origin") != appConfig.frontendOrigin || allowed.Header().Get("Access-Control-Allow-Credentials") != "true" {
		t.Fatalf("allowed origin did not receive credentialed CORS headers: status=%d headers=%v", allowed.Code, allowed.Header())
	}

	disallowed := httptest.NewRecorder()
	request = httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	request.Header.Set("Origin", "https://untrusted.example")
	handler.ServeHTTP(disallowed, request)
	if disallowed.Code != http.StatusForbidden {
		t.Fatalf("disallowed origin status = %d, want %d", disallowed.Code, http.StatusForbidden)
	}
}

func TestHealthHandler(t *testing.T) {
	response := httptest.NewRecorder()
	healthHandler(response, httptest.NewRequest(http.MethodGet, "/health", nil))
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
}

func TestAuthEndpointsWithoutSession(t *testing.T) {
	malformedLogin := httptest.NewRecorder()
	loginHandler(malformedLogin, httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader("not json")))
	if malformedLogin.Code != http.StatusBadRequest {
		t.Fatalf("malformed login status = %d, want %d", malformedLogin.Code, http.StatusBadRequest)
	}

	meResponse := httptest.NewRecorder()
	meHandler(meResponse, httptest.NewRequest(http.MethodGet, "/api/auth/me", nil))
	if meResponse.Code != http.StatusUnauthorized {
		t.Fatalf("me status = %d, want %d", meResponse.Code, http.StatusUnauthorized)
	}

	logoutResponse := httptest.NewRecorder()
	logoutHandler(logoutResponse, httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil))
	if logoutResponse.Code != http.StatusOK || len(logoutResponse.Result().Cookies()) != 1 {
		t.Fatalf("logout response was not successful with a clearing cookie")
	}
}
