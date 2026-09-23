package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"portfolio-backend/internal/database"

	"github.com/lib/pq"

	"github.com/joho/godotenv"
)

type PortfolioItem struct {
	ID                     string   `json:"id"`
	Title                  string   `json:"title"`
	Description            string   `json:"description"`
	ProjectURL             string   `json:"project_url"`
	ImageURL               string   `json:"image_url"`
	CloudinaryPublicID     string   `json:"cloudinary_public_id,omitempty"`
	CloudinaryResourceType string   `json:"cloudinary_resource_type,omitempty"`
	Technologies           []string `json:"technologies"`
	Category               string   `json:"category"`
	SortOrder              int      `json:"sort_order"`
	IsPublished            bool     `json:"is_published"`
}

var db *sql.DB

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println(".env file not found, using system env")
	}

	var err error
	appConfig, err = loadConfig()
	if err != nil {
		log.Fatal("invalid server configuration:", err)
	}

	db, err = database.Open(appConfig.databaseURL)
	if err != nil {
		log.Fatal("failed to open database:", err)
	}
	defer db.Close()

	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)

	if err := db.Ping(); err != nil {
		log.Fatal("failed to connect to database:", err)
	}

	log.Println("database connection successful")

	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/api/portfolio", portfolioHandler)
	http.HandleFunc("/api/auth/login", loginHandler)
	http.HandleFunc("/api/auth/me", meHandler)
	http.HandleFunc("/api/auth/logout", logoutHandler)

	http.Handle(
		"/api/admin/portfolio",
		requireAdmin(http.HandlerFunc(adminPortfolioCollectionHandler)),
	)

	http.Handle(
		"/api/admin/portfolio/",
		requireAdmin(http.HandlerFunc(adminPortfolioItemHandler)),
	)
	log.Println("admin portfolio routes registered")

	http.Handle(
		"/api/admin/upload",
		requireAdmin(http.HandlerFunc(uploadImageHandler)),
	)

	http.Handle(
		"/api/guestbook",
		http.HandlerFunc(publicGuestbookHandler ),
	)

	http.Handle(
		"/api/guestbook/",
		http.HandlerFunc(publicGuestbookItemHandler ),
	)


	http.Handle(
		"/api/admin/guestbook",
		requireAdmin(http.HandlerFunc(adminGuestbookCollectionHandler )),
	)

	http.Handle(
		"/api/admin/guestbook/",
		requireAdmin(http.HandlerFunc(adminGuestbookItemHandler )),
	)

	http.Handle(
	"GET /api/admin/guestbook",
	requireAdmin(http.HandlerFunc(adminGuestbookCollectionHandler )),
)


	log.Println("admin guestbook routes registered")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("server is running on http://localhost:%s", port)

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      corsMiddleware(http.DefaultServeMux),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	if err := server.ListenAndServe(); err != nil {
		log.Fatal("server failed:", err)
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"message": "backend is running",
	})
}

func portfolioHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	rows, err := db.QueryContext(r.Context(), `
		SELECT
			id::text,
			title,
			COALESCE(description, ''),
			COALESCE(project_url, ''),
			COALESCE(image_url, ''),
			COALESCE(technologies, '{}'::text[]),
			category,
			sort_order,
			is_published
		FROM portfolio_items
		WHERE is_published = TRUE
		ORDER BY sort_order ASC, created_at DESC
	`)

	if err != nil {
		log.Println("failed to query portfolio items:", err)
		writeJSONError(w, http.StatusInternalServerError, "failed to load portfolio items")
		return
	}
	defer rows.Close()

	items := make([]PortfolioItem, 0)

	for rows.Next() {
		var item PortfolioItem

		err := rows.Scan(
			&item.ID,
			&item.Title,
			&item.Description,
			&item.ProjectURL,
			&item.ImageURL,
			pq.Array(&item.Technologies),
			&item.Category,
			&item.SortOrder,
			&item.IsPublished,
		)

		if err != nil {
			log.Println("failed to scan portfolio item:", err)
			writeJSONError(w, http.StatusInternalServerError, "failed to read portfolio item")
			return
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		log.Println("error while reading portfolio rows:", err)
		writeJSONError(w, http.StatusInternalServerError, "failed to read portfolio items")
		return
	}

	writeJSON(w, http.StatusOK, items)
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			if origin != appConfig.frontendOrigin {
				writeJSONError(w, http.StatusForbidden, "origin not allowed")
				return
			}

			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			w.Header().Set(	"Access-Control-Allow-Headers", "Content-Type, Accept, X-Owner-Token",)
			w.Header().Set( "Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS", )


		}

		w.Header().Set("Content-Type", "application/json")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.WriteHeader(statusCode)

	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Println("failed to encode JSON:", err)
	}
}

func writeJSONError(w http.ResponseWriter, statusCode int, message string) {
	writeJSON(w, statusCode, map[string]string{
		"error": message,
	})
}
