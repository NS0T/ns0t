package database

import (
	"database/sql"
	"errors"
	"os"
	"strings"

	_ "github.com/lib/pq"
)

func URLFromEnv() (string, error) {
	url := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if url == "" {
		return "", errors.New("DATABASE_URL is required")
	}
	return url, nil
}

func OpenFromEnv() (*sql.DB, error) {
	url, err := URLFromEnv()
	if err != nil {
		return nil, err
	}
	return Open(url)
}

func Open(url string) (*sql.DB, error) {
	return sql.Open("postgres", url)
}
