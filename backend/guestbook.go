package main

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"log"
	"net/http"
	"strings"
)

type GuestbookCommentResponse struct {
	ID         string                   `json:"id"`
	Name       string                   `json:"name"`
	Message    string                   `json:"message"`
	GIFURL     string                   `json:"gif_url,omitempty"`
	IsApproved bool                     `json:"is_approved"`
	CreatedAt  string                   `json:"created_at"`
	UpdatedAt  string                   `json:"updated_at"`
	Replies    []GuestbookReplyResponse `json:"replies,omitempty"`
	OwnerToken string                   `json:"owner_token,omitempty"`
}

type GuestbookReplyResponse struct {
	ID          string `json:"id"`
	CommentID   string `json:"comment_id"`
	AuthorName  string `json:"author_name"`
	Message     string `json:"message"`
	GIFURL      string `json:"gif_url,omitempty"`
	IsPublished bool   `json:"is_published"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
	OwnerToken  string `json:"owner_token,omitempty"`
}

type GuestbookCommentInput struct {
	Name    string `json:"name"`
	Message string `json:"message"`
}

type GuestbookReplyInput struct {
	Name    string `json:"name"`
	Message string `json:"message"`
}

type GuestbookPublishInput struct {
	IsPublished bool `json:"is_published"`
}

func publicGuestbookHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		listPublicGuestbookComments(w, r)
	case http.MethodPost:
		createGuestbookComment(w, r)
	default:
		w.Header().Set("Allow", "GET, POST")
		writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func publicGuestbookItemHandler(w http.ResponseWriter, r *http.Request) {
	const prefix = "/api/guestbook/"
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, prefix), "/")
	parts := strings.Split(path, "/")
	if path == "" {
		writeJSONError(w, http.StatusBadRequest, "invalid comment id")
		return
	}

	if len(parts) == 2 && parts[0] == "replies" && isValidUUID(parts[1]) {
		if r.Method == http.MethodPatch {
			updateOwnGuestbookReply(w, r, parts[1])
			return
		}
		if r.Method == http.MethodDelete {
			deleteOwnGuestbookReply(w, r, parts[1])
			return
		}
	}

	if !isValidUUID(parts[0]) {
		writeJSONError(w, http.StatusBadRequest, "invalid comment id")
		return
	}
	commentID := parts[0]

	if len(parts) == 2 && parts[1] == "reply" && r.Method == http.MethodPost {
		createPublicGuestbookReply(w, r, commentID)
		return
	}
	if len(parts) == 1 && r.Method == http.MethodPatch {
		updateOwnGuestbookComment(w, r, commentID)
		return
	}
	if len(parts) == 1 && r.Method == http.MethodDelete {
		deleteOwnGuestbookComment(w, r, commentID)
		return
	}
	w.Header().Set("Allow", "POST, PATCH, DELETE")
	writeJSONError(w, http.StatusNotFound, "route not found")
}

func listPublicGuestbookComments(w http.ResponseWriter, r *http.Request) {
	rows, err := db.QueryContext(r.Context(), `
		SELECT id::text, COALESCE(name, ''), COALESCE(message, ''),
		       COALESCE(gif_url, ''), is_approved,
		       created_at::text, updated_at::text
		FROM guestbook_comments
		WHERE is_approved = TRUE
		ORDER BY created_at DESC`)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to load guestbook comments")
		return
	}
	defer rows.Close()
	comments := make([]GuestbookCommentResponse, 0)
	for rows.Next() {
		comment, err := scanGuestbookComment(rows)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "failed to read guestbook comment")
			return
		}
		comment.Replies, err = loadGuestbookReplies(r, comment.ID, true)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "failed to load guestbook replies")
			return
		}
		comments = append(comments, comment)
	}
	if err := rows.Err(); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to read guestbook comments")
		return
	}
	writeJSON(w, http.StatusOK, comments)
}

func createGuestbookComment(w http.ResponseWriter, r *http.Request) {
	var input GuestbookCommentInput
	if err := decodeJSONBody(r, &input); err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := validateGuestbookCommentInput(&input); err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	token, err := generateOwnerToken()
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to generate owner token")
		return
	}
	hash := hashOwnerToken(token)
	var comment GuestbookCommentResponse
	err = db.QueryRowContext(r.Context(), `
		INSERT INTO guestbook_comments (name, message, gif_url, owner_token_hash,
		                                is_approved, created_at, updated_at)
		VALUES ($1, $2, NULL, $3, TRUE, NOW(), NOW())
		RETURNING id::text, name, message, COALESCE(gif_url, ''), is_approved,
		          created_at::text, updated_at::text`, input.Name, input.Message, hash).Scan(
		&comment.ID, &comment.Name, &comment.Message, &comment.GIFURL,
		&comment.IsApproved, &comment.CreatedAt, &comment.UpdatedAt)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to create guestbook comment")
		return
	}
	comment.OwnerToken = token
	writeJSON(w, http.StatusCreated, comment)
}

func adminGuestbookCollectionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", "GET")
		writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	rows, err := db.QueryContext(r.Context(), `
		SELECT id::text, COALESCE(name, ''), COALESCE(message, ''),
		       COALESCE(gif_url, ''), is_approved,
		       created_at::text, updated_at::text
		FROM guestbook_comments ORDER BY created_at DESC`)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to load admin guestbook")
		return
	}
	defer rows.Close()
	comments := make([]GuestbookCommentResponse, 0)
	for rows.Next() {
		comment, err := scanGuestbookComment(rows)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "failed to read guestbook comment")
			return
		}
		comment.Replies, err = loadGuestbookReplies(r, comment.ID, false)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "failed to load guestbook replies")
			return
		}
		comments = append(comments, comment)
	}
	writeJSON(w, http.StatusOK, comments)
}
func updateGuestbookCommentVisibility(
	w http.ResponseWriter,
	r *http.Request,
	commentID string,
) {
	var input struct {
		IsPublished bool `json:"is_published"`
	}

	if err := decodeJSONBody(r, &input); err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	result, err := db.ExecContext(r.Context(), `
		UPDATE guestbook_comments
		SET
			is_approved = $1,
			updated_at = NOW()
		WHERE id = $2::uuid
	`,
		input.IsPublished,
		commentID,
	)

	if err != nil {
		log.Println("failed to update comment visibility:", err)
		writeJSONError(
			w,
			http.StatusInternalServerError,
			"failed to update comment visibility",
		)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to check comment")
		return
	}

	if rowsAffected == 0 {
		writeJSONError(w, http.StatusNotFound, "comment not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"message":      "comment visibility updated",
		"is_published": input.IsPublished,
	})
}

func updateGuestbookReplyVisibility(
	w http.ResponseWriter,
	r *http.Request,
	replyID string,
) {
	var input struct {
		IsPublished bool `json:"is_published"`
	}

	if err := decodeJSONBody(r, &input); err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	result, err := db.ExecContext(r.Context(), `
		UPDATE guestbook_replies
		SET
			is_published = $1,
			updated_at = NOW()
		WHERE id = $2::uuid
	`,
		input.IsPublished,
		replyID,
	)

	if err != nil {
		log.Println("failed to update reply visibility:", err)
		writeJSONError(
			w,
			http.StatusInternalServerError,
			"failed to update reply visibility",
		)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to check reply")
		return
	}

	if rowsAffected == 0 {
		writeJSONError(w, http.StatusNotFound, "reply not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"message":      "reply visibility updated",
		"is_published": input.IsPublished,
	})
}

func adminGuestbookItemHandler(w http.ResponseWriter, r *http.Request) {
	const prefix = "/api/admin/guestbook/"

	path := strings.TrimPrefix(r.URL.Path, prefix)
	path = strings.Trim(path, "/")

	parts := strings.Split(path, "/")

	if len(parts) == 2 &&
		parts[1] == "publish" &&
		r.Method == http.MethodPatch {
		updateGuestbookCommentVisibility(w, r, parts[0])
		return
	}

	if len(parts) == 3 &&
		parts[0] == "replies" &&
		parts[2] == "publish" &&
		r.Method == http.MethodPatch {
		updateGuestbookReplyVisibility(w, r, parts[1])
		return
	}

	if len(parts) == 1 &&
		r.Method == http.MethodDelete {
		deleteGuestbookComment(w, r, parts[0])
		return
	}

	if len(parts) == 2 &&
		parts[0] == "replies" &&
		r.Method == http.MethodDelete {
		deleteGuestbookReply(w, r, parts[1])
		return
	}

	writeJSONError(w, http.StatusNotFound, "route not found")
}

func approveGuestbookComment(w http.ResponseWriter, r *http.Request, id string) {
	if !isValidUUID(id) {
		writeJSONError(w, http.StatusBadRequest, "invalid comment id")
		return
	}
	var c GuestbookCommentResponse
	err := db.QueryRowContext(r.Context(), `
		UPDATE guestbook_comments SET is_approved = TRUE, updated_at = NOW()
		WHERE id = $1::uuid
		RETURNING id::text, name, message, COALESCE(gif_url, ''), is_approved,
		          created_at::text, updated_at::text`, id).Scan(
		&c.ID, &c.Name, &c.Message, &c.GIFURL, &c.IsApproved, &c.CreatedAt, &c.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		writeJSONError(w, http.StatusNotFound, "comment not found")
		return
	}
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to approve comment")
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func deleteGuestbookComment(w http.ResponseWriter, r *http.Request, id string) {
	if !isValidUUID(id) {
		writeJSONError(w, http.StatusBadRequest, "invalid comment id")
		return
	}
	result, err := db.ExecContext(r.Context(), `DELETE FROM guestbook_comments WHERE id = $1::uuid`, id)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to delete comment")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeJSONError(w, http.StatusNotFound, "comment not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "comment deleted"})
}

func createPublicGuestbookReply(w http.ResponseWriter, r *http.Request, commentID string) {
	var input GuestbookReplyInput
	if err := decodeJSONBody(r, &input); err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	input.Name = strings.TrimSpace(input.Name)
	input.Message = strings.TrimSpace(input.Message)
	if input.Name == "" || len([]rune(input.Name)) > 100 || input.Message == "" || len([]rune(input.Message)) > 5000 {
		writeJSONError(w, http.StatusBadRequest, "valid name and message are required")
		return
	}
	token, err := generateOwnerToken()
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to generate owner token")
		return
	}
	var reply GuestbookReplyResponse
	err = db.QueryRowContext(r.Context(), `
		INSERT INTO guestbook_replies (
			comment_id,
			user_id,
			author_name,
			message,
			gif_url,
			owner_token_hash,
			is_published,
			created_at,
			updated_at
		)

		SELECT $1::uuid, NULL, $2, $3, NULL, $4, TRUE, NOW(), NOW()
		WHERE EXISTS (SELECT 1 FROM guestbook_comments WHERE id = $1::uuid AND is_approved = TRUE)
		RETURNING id::text, comment_id::text, author_name, message, COALESCE(gif_url, ''),
		          is_published, created_at::text, updated_at::text`, commentID, input.Name, input.Message, hashOwnerToken(token)).Scan(
		&reply.ID, &reply.CommentID, &reply.AuthorName, &reply.Message, &reply.GIFURL,
		&reply.IsPublished, &reply.CreatedAt, &reply.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		writeJSONError(w, http.StatusNotFound, "approved comment not found")
		return
	}
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to create reply")
		return
	}
	reply.OwnerToken = token
	writeJSON(w, http.StatusCreated, reply)
}

func createGuestbookReply(w http.ResponseWriter, r *http.Request, commentID string) {
	var input GuestbookReplyInput
	if err := decodeJSONBody(r, &input); err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	input.Name = "ns0t"
	input.Message = strings.TrimSpace(input.Message)
	if input.Message == "" || len([]rune(input.Message)) > 5000 {
		writeJSONError(w, http.StatusBadRequest, "message is required")
		return
	}
	var reply GuestbookReplyResponse
	err := db.QueryRowContext(r.Context(), `
		INSERT INTO guestbook_replies (comment_id, user_id, author_name, message, gif_url,
		                               owner_token_hash, is_published, created_at, updated_at)
		VALUES ($1::uuid, NULL, $2, $3, NULL, NULL, TRUE, NOW(), NOW())
		RETURNING id::text, comment_id::text, author_name, message, COALESCE(gif_url, ''),
		          is_published, created_at::text, updated_at::text`, commentID, input.Name, input.Message).Scan(
		&reply.ID, &reply.CommentID, &reply.AuthorName, &reply.Message, &reply.GIFURL,
		&reply.IsPublished, &reply.CreatedAt, &reply.UpdatedAt)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to create reply")
		return
	}
	writeJSON(w, http.StatusCreated, reply)
}

func updateOwnGuestbookComment(w http.ResponseWriter, r *http.Request, id string) {
	token, err := getOwnerTokenFromRequest(r)
	if err != nil {
		writeJSONError(w, http.StatusUnauthorized, err.Error())
		return
	}
	var input GuestbookCommentInput
	if err := decodeJSONBody(r, &input); err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := validateGuestbookCommentInput(&input); err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	var c GuestbookCommentResponse
	err = db.QueryRowContext(r.Context(), `
		UPDATE guestbook_comments SET name = $1, message = $2, is_approved = TRUE, updated_at = NOW()
		WHERE id = $3::uuid AND owner_token_hash = $4
		RETURNING id::text, name, message, COALESCE(gif_url, ''), is_approved,
		          created_at::text, updated_at::text`, input.Name, input.Message, id, hashOwnerToken(token)).Scan(
		&c.ID, &c.Name, &c.Message, &c.GIFURL, &c.IsApproved, &c.CreatedAt, &c.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		writeJSONError(w, http.StatusNotFound, "comment not found or owner token is invalid")
		return
	}
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to update comment")
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func deleteOwnGuestbookComment(w http.ResponseWriter, r *http.Request, id string) {
	token, err := getOwnerTokenFromRequest(r)
	if err != nil {
		writeJSONError(w, http.StatusUnauthorized, err.Error())
		return
	}
	result, err := db.ExecContext(r.Context(), `DELETE FROM guestbook_comments WHERE id = $1::uuid AND owner_token_hash = $2`, id, hashOwnerToken(token))
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to delete comment")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeJSONError(w, http.StatusNotFound, "comment not found or owner token is invalid")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "comment deleted"})
}

func updateOwnGuestbookReply(w http.ResponseWriter, r *http.Request, replyID string) {
	if !isValidUUID(replyID) {
		writeJSONError(w, http.StatusBadRequest, "invalid reply id")
		return
	}
	token, err := getOwnerTokenFromRequest(r)
	if err != nil {
		writeJSONError(w, http.StatusUnauthorized, err.Error())
		return
	}
	var input GuestbookReplyInput
	if err := decodeJSONBody(r, &input); err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	input.Name = strings.TrimSpace(input.Name)
	input.Message = strings.TrimSpace(input.Message)
	if input.Name == "" || input.Message == "" || len([]rune(input.Name)) > 100 || len([]rune(input.Message)) > 5000 {
		writeJSONError(w, http.StatusBadRequest, "valid name and message are required")
		return
	}
	var reply GuestbookReplyResponse
	err = db.QueryRowContext(r.Context(), `
		UPDATE guestbook_replies SET author_name = $1, message = $2, is_published = FALSE, updated_at = NOW()
		WHERE id = $3::uuid AND owner_token_hash = $4
		RETURNING id::text, comment_id::text, author_name, message, COALESCE(gif_url, ''),
		          is_published, created_at::text, updated_at::text`, input.Name, input.Message, replyID, hashOwnerToken(token)).Scan(
		&reply.ID, &reply.CommentID, &reply.AuthorName, &reply.Message, &reply.GIFURL,
		&reply.IsPublished, &reply.CreatedAt, &reply.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		writeJSONError(w, http.StatusNotFound, "reply not found or owner token is invalid")
		return
	}
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to update reply")
		return
	}
	writeJSON(w, http.StatusOK, reply)
}

func deleteOwnGuestbookReply(w http.ResponseWriter, r *http.Request, replyID string) {
	if !isValidUUID(replyID) {
		writeJSONError(w, http.StatusBadRequest, "invalid reply id")
		return
	}
	token, err := getOwnerTokenFromRequest(r)
	if err != nil {
		writeJSONError(w, http.StatusUnauthorized, err.Error())
		return
	}
	result, err := db.ExecContext(r.Context(), `DELETE FROM guestbook_replies WHERE id = $1::uuid AND owner_token_hash = $2`, replyID, hashOwnerToken(token))
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to delete reply")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeJSONError(w, http.StatusNotFound, "reply not found or owner token is invalid")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "reply deleted"})
}

func updateGuestbookReplyPublishedStatus(w http.ResponseWriter, r *http.Request, replyID string) {
	if !isValidUUID(replyID) {
		writeJSONError(w, http.StatusBadRequest, "invalid reply id")
		return
	}
	var input GuestbookPublishInput
	if err := decodeJSONBody(r, &input); err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	var reply GuestbookReplyResponse
	err := db.QueryRowContext(r.Context(), `
		UPDATE guestbook_replies SET is_published = $1, updated_at = NOW()
		WHERE id = $2::uuid
		RETURNING id::text, comment_id::text, author_name, message, COALESCE(gif_url, ''),
		          is_published, created_at::text, updated_at::text`, input.IsPublished, replyID).Scan(
		&reply.ID, &reply.CommentID, &reply.AuthorName, &reply.Message, &reply.GIFURL,
		&reply.IsPublished, &reply.CreatedAt, &reply.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		writeJSONError(w, http.StatusNotFound, "reply not found")
		return
	}
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to update reply")
		return
	}
	writeJSON(w, http.StatusOK, reply)
}

func deleteGuestbookReply(w http.ResponseWriter, r *http.Request, replyID string) {
	if !isValidUUID(replyID) {
		writeJSONError(w, http.StatusBadRequest, "invalid reply id")
		return
	}
	result, err := db.ExecContext(r.Context(), `DELETE FROM guestbook_replies WHERE id = $1::uuid`, replyID)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to delete reply")
		return
	}
	if n, _ := result.RowsAffected(); n == 0 {
		writeJSONError(w, http.StatusNotFound, "reply not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "reply deleted"})
}

func loadGuestbookReplies(r *http.Request, commentID string, publishedOnly bool) ([]GuestbookReplyResponse, error) {
	query := `
		SELECT
			id::text,
			comment_id::text,
			COALESCE(author_name, 'ns0t'),
			COALESCE(message, ''),
			COALESCE(gif_url, ''),
			is_published,
			created_at::text,
			updated_at::text
			FROM guestbook_replies
		WHERE comment_id = $1::uuid`
	if publishedOnly {
		query += " AND is_published = TRUE"
	}
	query += " ORDER BY created_at ASC"
	rows, err := db.QueryContext(r.Context(), query, commentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	replies := make([]GuestbookReplyResponse, 0)
	for rows.Next() {
		var reply GuestbookReplyResponse
		if err := rows.Scan(&reply.ID, &reply.CommentID, &reply.AuthorName, &reply.Message, &reply.GIFURL, &reply.IsPublished, &reply.CreatedAt, &reply.UpdatedAt); err != nil {
			return nil, err
		}
		replies = append(replies, reply)
	}
	return replies, rows.Err()
}

func scanGuestbookComment(rows *sql.Rows) (GuestbookCommentResponse, error) {
	var c GuestbookCommentResponse
	err := rows.Scan(&c.ID, &c.Name, &c.Message, &c.GIFURL, &c.IsApproved, &c.CreatedAt, &c.UpdatedAt)
	return c, err
}

func validateGuestbookCommentInput(input *GuestbookCommentInput) error {
	input.Name = strings.TrimSpace(input.Name)
	input.Message = strings.TrimSpace(input.Message)
	if input.Name == "" {
		return errors.New("name is required")
	}
	if len([]rune(input.Name)) > 100 {
		return errors.New("name is too long")
	}
	if input.Message == "" {
		return errors.New("message is required")
	}
	if len([]rune(input.Message)) > 5000 {
		return errors.New("message is too long")
	}
	return nil
}

func generateOwnerToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func hashOwnerToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

func getOwnerTokenFromRequest(r *http.Request) (string, error) {
	token := strings.TrimSpace(r.Header.Get("X-Owner-Token"))
	if token == "" {
		return "", errors.New("owner token is required")
	}
	if len(token) > 200 {
		return "", errors.New("invalid owner token")
	}
	return token, nil
}
