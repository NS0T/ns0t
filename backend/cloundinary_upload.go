package main

import (
	"bytes"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"
)

const maxImageSize = 10 << 20 // 10 MB

type cloudinaryUploadResponse struct {
	SecureURL    string `json:"secure_url"`
	PublicID     string `json:"public_id"`
	ResourceType string `json:"resource_type"`

	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

type imageUploadResponse struct {
	ImageURL     string `json:"image_url"`
	PublicID     string `json:"public_id"`
	ResourceType string `json:"resource_type"`
}

func uploadImageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	cloudName := strings.TrimSpace(os.Getenv("CLOUDINARY_CLOUD_NAME"))
	apiKey := strings.TrimSpace(os.Getenv("CLOUDINARY_API_KEY"))
	apiSecret := strings.TrimSpace(os.Getenv("CLOUDINARY_API_SECRET"))

	if cloudName == "" || apiKey == "" || apiSecret == "" {
		writeJSONError(w, http.StatusInternalServerError, "Cloudinary is not configured")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxImageSize+1024*1024)

	if err := r.ParseMultipartForm(maxImageSize); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid multipart form or image is too large")
		return
	}

	file, fileHeader, err := r.FormFile("image")
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "image file is required")
		return
	}
	defer file.Close()

	if fileHeader.Size <= 0 {
		writeJSONError(w, http.StatusBadRequest, "image file is empty")
		return
	}

	if fileHeader.Size > maxImageSize {
		writeJSONError(w, http.StatusBadRequest, "image must be smaller than 10 MB")
		return
	}

	if !isSupportedImage(fileHeader.Filename) {
		writeJSONError(w, http.StatusBadRequest, "only jpg, jpeg, png, webp, and gif images are allowed")
		return
	}

	result, err := uploadToCloudinary(
		r,
		file,
		fileHeader,
		cloudName,
		apiKey,
		apiSecret,
	)
	if err != nil {
		writeJSONError(w, http.StatusBadGateway, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, imageUploadResponse{
		ImageURL:     result.SecureURL,
		PublicID:     result.PublicID,
		ResourceType: result.ResourceType,
	})
}

func uploadToCloudinary(
	r *http.Request,
	file multipart.File,
	fileHeader *multipart.FileHeader,
	cloudName string,
	apiKey string,
	apiSecret string,
) (cloudinaryUploadResponse, error) {
	timestamp := time.Now().Unix()
	folder := "portfolio"

	signature := cloudinarySignature(
		map[string]string{
			"folder":    folder,
			"timestamp": strconv.FormatInt(timestamp, 10),
		},
		apiSecret,
	)

	var requestBody bytes.Buffer
	writer := multipart.NewWriter(&requestBody)

	if err := writer.WriteField("api_key", apiKey); err != nil {
		return cloudinaryUploadResponse{}, err
	}

	if err := writer.WriteField(
		"timestamp",
		strconv.FormatInt(timestamp, 10),
	); err != nil {
		return cloudinaryUploadResponse{}, err
	}

	if err := writer.WriteField("folder", folder); err != nil {
		return cloudinaryUploadResponse{}, err
	}

	if err := writer.WriteField("signature", signature); err != nil {
		return cloudinaryUploadResponse{}, err
	}

	part, err := writer.CreateFormFile("file", fileHeader.Filename)
	if err != nil {
		return cloudinaryUploadResponse{}, err
	}

	if _, err := io.Copy(part, file); err != nil {
		return cloudinaryUploadResponse{}, err
	}

	if err := writer.Close(); err != nil {
		return cloudinaryUploadResponse{}, err
	}

	uploadURL := fmt.Sprintf(
		"https://api.cloudinary.com/v1_1/%s/image/upload",
		url.PathEscape(cloudName),
	)

	request, err := http.NewRequestWithContext(
		r.Context(),
		http.MethodPost,
		uploadURL,
		&requestBody,
	)
	if err != nil {
		return cloudinaryUploadResponse{}, err
	}

	request.Header.Set("Content-Type", writer.FormDataContentType())

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return cloudinaryUploadResponse{}, err
	}
	defer response.Body.Close()

	responseBody, err := io.ReadAll(io.LimitReader(response.Body, 2<<20))
	if err != nil {
		return cloudinaryUploadResponse{}, err
	}

	var result cloudinaryUploadResponse

	if err := json.Unmarshal(responseBody, &result); err != nil {
		return cloudinaryUploadResponse{}, errors.New(
			"invalid response from Cloudinary",
		)
	}

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		message := "Cloudinary upload failed"

		if result.Error != nil && result.Error.Message != "" {
			message = result.Error.Message
		}

		return cloudinaryUploadResponse{}, errors.New(message)
	}

	if result.SecureURL == "" {
		return cloudinaryUploadResponse{}, errors.New(
			"Cloudinary did not return an image URL",
		)
	}

	return result, nil
}

func cloudinarySignature(
	params map[string]string,
	apiSecret string,
) string {
	keys := make([]string, 0, len(params))

	for key := range params {
		keys = append(keys, key)
	}

	sort.Strings(keys)

	parts := make([]string, 0, len(keys))

	for _, key := range keys {
		parts = append(parts, key+"="+params[key])
	}

	signatureText := strings.Join(parts, "&") + apiSecret
	hash := sha1.Sum([]byte(signatureText))

	return hex.EncodeToString(hash[:])
}

func isSupportedImage(filename string) bool {
	extension := strings.ToLower(fileExtension(filename))

	switch extension {
	case ".jpg", ".jpeg", ".png", ".webp", ".gif":
		return true
	default:
		return false
	}
}

func fileExtension(filename string) string {
	index := strings.LastIndex(filename, ".")

	if index == -1 {
		return ""
	}

	return filename[index:]
}
