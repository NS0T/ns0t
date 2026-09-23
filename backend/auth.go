package main

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"portfolio-backend/internal/database"

	"golang.org/x/crypto/bcrypt"
)

const (
	sessionCookieName = "portfolio_admin_session"
	sessionLifetime   = 8 * time.Hour
	maxLoginBodyBytes = 1 << 20
)

const dummyPasswordHash = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

type config struct {
	databaseURL    string
	sessionSecret  []byte
	frontendOrigin string
	cookieSecure   bool
}

var appConfig config

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authenticatedAdmin struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	FullName string `json:"full_name,omitempty"`
	Role     string `json:"role"`
}

type contextKey string

const adminContextKey contextKey = "authenticated-admin"

func loadConfig() (config, error) {
	databaseURL, err := database.URLFromEnv()
	if err != nil {
		return config{}, err
	}

	secret := os.Getenv("SESSION_SECRET")
	if len(secret) < 32 {
		return config{}, errors.New("SESSION_SECRET must be at least 32 bytes")
	}

	frontendOrigin := strings.TrimRight(strings.TrimSpace(os.Getenv("FRONTEND_ORIGIN")), "/")
	parsedOrigin, err := url.Parse(frontendOrigin)
	if err != nil || parsedOrigin.Scheme == "" || parsedOrigin.Host == "" || parsedOrigin.Path != "" {
		return config{}, errors.New("FRONTEND_ORIGIN must be a single absolute origin")
	}

	production := strings.EqualFold(os.Getenv("APP_ENV"), "production")
	if production && parsedOrigin.Scheme != "https" {
		return config{}, errors.New("FRONTEND_ORIGIN must use HTTPS in production")
	}

	return config{
		databaseURL: databaseURL, sessionSecret: []byte(secret), frontendOrigin: frontendOrigin, cookieSecure: production,
	}, nil
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxLoginBodyBytes)
	defer r.Body.Close()
	var request loginRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil || decoder.Decode(&struct{}{}) != io.EOF {
		writeJSONError(w, http.StatusBadRequest, "invalid login request")
		return
	}

	request.Email = strings.TrimSpace(request.Email)
	if request.Email == "" || request.Password == "" || len(request.Email) > 320 {
		writeJSONError(w, http.StatusBadRequest, "invalid login request")
		return
	}

	admin, passwordHash, err := findAdminByEmail(r.Context(), request.Email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			_ = bcrypt.CompareHashAndPassword([]byte(dummyPasswordHash), []byte(request.Password))
			writeJSONError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}
		log.Printf("admin login lookup failed: %v", err)
		writeJSONError(w, http.StatusInternalServerError, "unable to sign in")
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(request.Password)) != nil {
		writeJSONError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	token, tokenHash, err := newSessionToken()
	if err != nil {
		log.Printf("admin session token generation failed: %v", err)
		writeJSONError(w, http.StatusInternalServerError, "unable to sign in")
		return
	}
	expiresAt := time.Now().UTC().Add(sessionLifetime)
	tx, err := db.BeginTx(r.Context(), nil)
	if err != nil {
		log.Printf("admin session transaction failed: %v", err)
		writeJSONError(w, http.StatusInternalServerError, "unable to sign in")
		return
	}
	defer tx.Rollback()
	if _, err = tx.ExecContext(r.Context(), `INSERT INTO admin_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)`, tokenHash, admin.ID, expiresAt); err != nil {
		log.Printf("admin session creation failed: %v", err)
		writeJSONError(w, http.StatusInternalServerError, "unable to sign in")
		return
	}
	if _, err = tx.ExecContext(r.Context(), `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`, admin.ID); err != nil {
		log.Printf("admin login timestamp update failed: %v", err)
		writeJSONError(w, http.StatusInternalServerError, "unable to sign in")
		return
	}
	if err = tx.Commit(); err != nil {
		log.Printf("admin session commit failed: %v", err)
		writeJSONError(w, http.StatusInternalServerError, "unable to sign in")
		return
	}

	setSessionCookie(w, token, expiresAt)
	writeJSON(w, http.StatusOK, map[string]authenticatedAdmin{"admin": admin})
}

func findAdminByEmail(ctx context.Context, email string) (authenticatedAdmin, string, error) {
	var admin authenticatedAdmin
	var passwordHash string
	err := db.QueryRowContext(ctx, `
		SELECT u.id::text, u.email, COALESCE(u.full_name, ''), u.password_hash, pa.role
		FROM users u
		JOIN portfolio_admins pa ON pa.user_id = u.id
		WHERE LOWER(u.email) = LOWER($1) AND u.is_active = TRUE
		LIMIT 1`, email).Scan(&admin.ID, &admin.Email, &admin.FullName, &passwordHash, &admin.Role)
	return admin, passwordHash, err
}

func meHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	admin, ok := adminFromRequest(r)
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	writeJSON(w, http.StatusOK, map[string]authenticatedAdmin{"admin": admin})
}

func logoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if cookie, err := r.Cookie(sessionCookieName); err == nil {
		if tokenHash, err := sessionTokenHash(cookie.Value); err == nil {
			if _, err := db.ExecContext(r.Context(), `DELETE FROM admin_sessions WHERE token_hash = $1`, tokenHash); err != nil {
				log.Printf("admin session deletion failed: %v", err)
				writeJSONError(w, http.StatusInternalServerError, "unable to sign out")
				return
			}
		}
	}
	clearSessionCookie(w)
	writeJSON(w, http.StatusOK, map[string]string{"message": "signed out"})
}

func requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		admin, ok := adminFromRequest(r)
		if !ok {
			writeJSONError(w, http.StatusUnauthorized, "authentication required")
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), adminContextKey, admin)))
	})
}

func adminFromContext(ctx context.Context) (authenticatedAdmin, bool) {
	admin, ok := ctx.Value(adminContextKey).(authenticatedAdmin)
	return admin, ok
}

func adminFromRequest(r *http.Request) (authenticatedAdmin, bool) {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil || cookie.Value == "" {
		return authenticatedAdmin{}, false
	}
	tokenHash, err := sessionTokenHash(cookie.Value)
	if err != nil {
		return authenticatedAdmin{}, false
	}
	var admin authenticatedAdmin
	err = db.QueryRowContext(r.Context(), `
		SELECT u.id::text, u.email, COALESCE(u.full_name, ''), pa.role
		FROM admin_sessions s
		JOIN users u ON u.id = s.user_id
		JOIN portfolio_admins pa ON pa.user_id = u.id
		WHERE s.token_hash = $1 AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = TRUE`, tokenHash).
		Scan(&admin.ID, &admin.Email, &admin.FullName, &admin.Role)
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			log.Printf("admin session validation failed: %v", err)
		}
		return authenticatedAdmin{}, false
	}
	return admin, true
}

func newSessionToken() (string, []byte, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", nil, err
	}
	token := base64.RawURLEncoding.EncodeToString(raw)
	hash, err := sessionTokenHash(token)
	return token, hash, err
}

func sessionTokenHash(token string) ([]byte, error) {
	decoded, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil || len(decoded) != 32 {
		return nil, fmt.Errorf("invalid session token")
	}
	mac := hmac.New(sha256.New, appConfig.sessionSecret)
	_, _ = mac.Write(decoded)
	return mac.Sum(nil), nil
}

func setSessionCookie(w http.ResponseWriter, token string, expiresAt time.Time) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/api",
		Expires:  expiresAt,
		MaxAge:   int(sessionLifetime.Seconds()),
		HttpOnly: true,
		Secure:   appConfig.cookieSecure,
		SameSite: http.SameSiteLaxMode})
}

func clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(1, 0),
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   appConfig.cookieSecure,
		SameSite: http.SameSiteLaxMode})
}
