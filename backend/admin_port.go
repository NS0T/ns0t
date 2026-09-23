package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strings"

	"github.com/lib/pq"
)

type PortfolioItemInput struct {
	Title                  string   `json:"title"`
	Description            string   `json:"description"`
	ProjectURL             string   `json:"project_url"`
	ImageURL               string   `json:"image_url"`
	CloudinaryPublicID     string   `json:"cloudinary_public_id"`
	CloudinaryResourceType string   `json:"cloudinary_resource_type"`
	Technologies           []string `json:"technologies"`
	Category               string   `json:"category"`
	SortOrder              int      `json:"sort_order"`
	IsPublished            bool     `json:"is_published"`
}

type AdminPortfolioItem struct {
	ID           string   `json:"id"`
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	ProjectURL   string   `json:"project_url"`
	ImageURL     string   `json:"image_url"`
	Technologies []string `json:"technologies"`
	Category     string   `json:"category"`
	SortOrder    int      `json:"sort_order"`
	IsPublished  bool     `json:"is_published"`
	CreatedAt    string   `json:"created_at"`
	UpdatedAt    string   `json:"updated_at"`
}

var slugInvalidChats = regexp.MustCompile(`[^a-z0-9]+`)

func generateSlug(title string) string {
	slug := strings.ToLower(strings.TrimSpace(title))
	slug = slugInvalidChats.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")

	if slug == "" {
		slug = "item"
	}
	return slug
}

func adminPortfolioCollectionHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		listAdminPortfolioItems(w, r)

	case http.MethodPost:
		createAdminPortfolioItem(w, r)

	default:
		w.Header().Set("Allow", "GET, POST")
		writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func adminPortfolioItemHandler(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/admin/portfolio/")
	path = strings.Trim(path, "/")

	if path == "" {
		writeJSONError(w, http.StatusBadRequest, "missing portfolio item id")
		return
	}

	parts := strings.Split(path, "/")
	itemID := parts[0]

	if !isValidUUID(itemID) {
		writeJSONError(w, http.StatusBadRequest, "invalid portfolio item id")
		return
	}

	if len(parts) == 1 && r.Method == http.MethodPut {
		updateAdminPortfolioItem(w, r, itemID)
		return
	}

	if len(parts) == 1 && r.Method == http.MethodDelete {
		deleteAdminPortfolioItem(w, r, itemID)
		return
	}

	if len(parts) == 2 &&
		parts[1] == "publish" &&
		r.Method == http.MethodPatch {
		updateAdminPortfolioPublishStatus(w, r, itemID)
		return
	}

	writeJSONError(w, http.StatusNotFound, "route not found")
}

func listAdminPortfolioItems(w http.ResponseWriter, r *http.Request) {
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
			is_published,
			created_at::text,
			updated_at::text
		FROM portfolio_items
		ORDER BY category ASC, sort_order ASC, created_at DESC
	`)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to load portfolio items")
		return
	}
	defer rows.Close()

	items := make([]AdminPortfolioItem, 0)

	for rows.Next() {
		var item AdminPortfolioItem

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
			&item.CreatedAt,
			&item.UpdatedAt,
		)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "failed to read portfolio item")
			return
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to read portfolio items")
		return
	}

	writeJSON(w, http.StatusOK, items)
}
func createAdminPortfolioItem(w http.ResponseWriter, r *http.Request) {
	var input PortfolioItemInput

	if err := decodePortfolioInput(r, &input); err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := validatePortfolioInput(&input); err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	slug := generateSlug(input.Title)

	var item AdminPortfolioItem

	err := db.QueryRowContext(r.Context(), `
		INSERT INTO portfolio_items (
			title,
			slug,
			description,
			project_url,
			image_url,
			technologies,
			category,
			sort_order,
			is_published
		)
		VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), $6, $7, $8, $9)
		RETURNING
			id::text,
			title,
			COALESCE(description, ''),
			COALESCE(project_url, ''),
			COALESCE(image_url, ''),
			COALESCE(technologies, '{}'::text[]),
			category,
			sort_order,
			is_published,
			created_at::text,
			updated_at::text
	`,
		input.Title,
		slug,
		input.Description,
		input.ProjectURL,
		input.ImageURL,
		input.CloudinaryPublicID,
		input.CloudinaryResourceType,
		pq.Array(input.Technologies),
		input.Category,
		input.SortOrder,
		input.IsPublished,
	).Scan(
		&item.ID,
		&item.Title,
		&item.Description,
		&item.ProjectURL,
		&item.ImageURL,
		pq.Array(&item.Technologies),
		&item.Category,
		&item.SortOrder,
		&item.IsPublished,
		&item.CreatedAt,
		&item.UpdatedAt,
	)

	if err != nil {
		log.Println("failed to create portfolio item:", err)
		writeJSONError(w, http.StatusInternalServerError, "failed to create portfolio item")
		return
	}

	writeJSON(w, http.StatusCreated, item)
}

func updateAdminPortfolioItem(w http.ResponseWriter, r *http.Request, itemID string) {
	var input PortfolioItemInput

	if err := decodePortfolioInput(r, &input); err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := validatePortfolioInput(&input); err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	var item AdminPortfolioItem

	err := db.QueryRowContext(r.Context(), `
		UPDATE portfolio_items
		SET
			title = $1,
			description = NULLIF($2, ''),
			project_url = NULLIF($3, ''),
			image_url = NULLIF($4, ''),
			technologies = $5,
			category = $6,
			sort_order = $7,
			is_published = $8
		WHERE id = $9::uuid
		RETURNING
			id::text,
			title,
			COALESCE(description, ''),
			COALESCE(project_url, ''),
			COALESCE(image_url, ''),
			COALESCE(technologies, '{}'::text[]),
			category,
			sort_order,
			is_published,
			created_at::text,
			updated_at::text
	`,
		input.Title,
		input.Description,
		input.ProjectURL,
		input.ImageURL,
		input.CloudinaryPublicID,
		input.CloudinaryResourceType,
		pq.Array(input.Technologies),
		input.Category,
		input.SortOrder,
		input.IsPublished,
		itemID,
	).Scan(
		&item.ID,
		&item.Title,
		&item.Description,
		&item.ProjectURL,
		&item.ImageURL,
		pq.Array(&item.Technologies),
		&item.Category,
		&item.SortOrder,
		&item.IsPublished,
		&item.CreatedAt,
		&item.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSONError(w, http.StatusNotFound, "portfolio item not found")
			return
		}

		writeJSONError(w, http.StatusInternalServerError, "failed to update portfolio item")
		return
	}

	writeJSON(w, http.StatusOK, item)
}

func updateAdminPortfolioPublishStatus(w http.ResponseWriter, r *http.Request, itemID string) {
	var request struct {
		IsPublished bool `json:"is_published"`
	}

	if err := decodeJSONBody(r, &request); err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	var item AdminPortfolioItem

	err := db.QueryRowContext(r.Context(), `
		UPDATE portfolio_items
		SET is_published = $1
		WHERE id = $2::uuid
		RETURNING
			id::text,
			title,
			COALESCE(description, ''),
			COALESCE(project_url, ''),
			COALESCE(image_url, ''),
			COALESCE(technologies, '{}'::text[]),
			category,
			sort_order,
			is_published,
			created_at::text,
			updated_at::text
	`,
		request.IsPublished,
		itemID,
	).Scan(
		&item.ID,
		&item.Title,
		&item.Description,
		&item.ProjectURL,
		&item.ImageURL,
		pq.Array(&item.Technologies),
		&item.Category,
		&item.SortOrder,
		&item.IsPublished,
		&item.CreatedAt,
		&item.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSONError(w, http.StatusNotFound, "portfolio item not found")
			return
		}

		writeJSONError(w, http.StatusInternalServerError, "failed to update publish status")
		return
	}

	writeJSON(w, http.StatusOK, item)
}

func deleteAdminPortfolioItem(w http.ResponseWriter, r *http.Request, itemID string) {
	result, err := db.ExecContext(r.Context(), `
		DELETE FROM portfolio_items
		WHERE id = $1::uuid
	`, itemID)

	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to delete portfolio item")
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to verify deletion")
		return
	}

	if rowsAffected == 0 {
		writeJSONError(w, http.StatusNotFound, "portfolio item not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "portfolio item deleted",
	})
}

func decodePortfolioInput(r *http.Request, input *PortfolioItemInput) error {
	return decodeJSONBody(r, input)
}

func decodeJSONBody(r *http.Request, destination interface{}) error {
	defer r.Body.Close()

	decoder := json.NewDecoder(http.MaxBytesReader(nil, r.Body, 1<<20))
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(destination); err != nil {
		return errors.New("invalid JSON body")
	}

	var extra interface{}
	if err := decoder.Decode(&extra); err != nil {
		return nil
	}

	return errors.New("request body must contain one JSON object")
}

func validatePortfolioInput(input *PortfolioItemInput) error {
	input.Title = strings.TrimSpace(input.Title)
	input.Description = strings.TrimSpace(input.Description)
	input.ProjectURL = strings.TrimSpace(input.ProjectURL)
	input.ImageURL = strings.TrimSpace(input.ImageURL)
	input.Category = strings.TrimSpace(strings.ToLower(input.Category))

	if input.Technologies == nil {
		input.Technologies = []string{}
	}

	for index := range input.Technologies {
		input.Technologies[index] = strings.TrimSpace(input.Technologies[index])
	}

	if input.Title == "" {
		return errors.New("title is required")
	}

	if len([]rune(input.Title)) > 200 {
		return errors.New("title is too long")
	}

	if len([]rune(input.Description)) > 5000 {
		return errors.New("description is too long")
	}

	switch input.Category {
	case "work", "skill", "tool", "repository":
	default:
		return errors.New("invalid category")
	}

	if input.SortOrder < 0 {
		return errors.New("sort_order cannot be negative")
	}

	if input.ProjectURL != "" && !isValidHTTPURL(input.ProjectURL) {
		return errors.New("project_url must be a valid http or https URL")
	}

	if input.ImageURL != "" && !isValidHTTPURL(input.ImageURL) {
		return errors.New("image_url must be a valid http or https URL")
	}

	return nil
}

func isValidHTTPURL(value string) bool {
	parsed, err := url.ParseRequestURI(value)
	if err != nil {
		return false
	}

	return (parsed.Scheme == "http" || parsed.Scheme == "https") &&
		parsed.Host != ""
}

func isValidUUID(value string) bool {
	if len(value) != 36 {
		return false
	}

	for index, character := range value {
		switch {
		case index == 8 || index == 13 || index == 18 || index == 23:
			if character != '-' {
				return false
			}

		case character >= '0' && character <= '9':
		case character >= 'a' && character <= 'f':
		case character >= 'A' && character <= 'F':
		default:
			return false
		}
	}

	return true
}
