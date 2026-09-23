package main

import (
	"bufio"
	"context"
	"crypto/subtle"
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/mail"
	"os"
	"strings"
	"time"

	"portfolio-backend/internal/database"

	"golang.org/x/crypto/bcrypt"
	"golang.org/x/term"
)

const (
	minimumPasswordLength = 12
	maximumPasswordLength = 72
	maximumEmailLength    = 320
	maximumNameLength     = 200
)

func main() {
	ownerFlag := flag.Bool("owner", false, "create this later admin as an owner (requires confirmation)")
	flag.Parse()

	if !term.IsTerminal(int(os.Stdin.Fd())) {
		fail("This command requires an interactive terminal so the password is not exposed.")
	}

	reader := bufio.NewReader(os.Stdin)
	email, err := prompt(reader, "Admin email: ")
	if err != nil {
		fail("Unable to read the admin email.")
	}
	email, err = normalizeEmail(email)
	if err != nil {
		fail(err.Error())
	}

	fullName, err := prompt(reader, "Full name: ")
	if err != nil {
		fail("Unable to read the full name.")
	}
	fullName, err = normalizeFullName(fullName)
	if err != nil {
		fail(err.Error())
	}

	password, err := promptPassword("Password: ")
	if err != nil {
		fail("Unable to read the password.")
	}
	defer clear(password)
	confirmation, err := promptPassword("Confirm password: ")
	if err != nil {
		fail("Unable to read the password confirmation.")
	}
	defer clear(confirmation)
	if err := validatePassword(password, confirmation); err != nil {
		fail(err.Error())
	}

	db, err := database.OpenFromEnv()
	if err != nil {
		fail("Unable to open the database connection. Check DATABASE_URL and database availability.")
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		fail("Unable to connect to the database. Check DATABASE_URL and database availability.")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	role, err := provisionAdmin(ctx, db, email, fullName, password, *ownerFlag, reader, os.Stdout)
	if err != nil {
		switch {
		case errors.Is(err, errDuplicateEmail):
			fail("An account with that email already exists.")
		case errors.Is(err, errOwnerConfirmationDeclined):
			fail("Owner creation cancelled.")
		default:
			fail("Unable to create the admin account. No changes were made.")
		}
	}

	fmt.Printf("Admin account created for %s with role %s.\n", email, role)
}

var (
	errDuplicateEmail            = errors.New("duplicate email")
	errOwnerConfirmationDeclined = errors.New("owner confirmation declined")
)

func provisionAdmin(ctx context.Context, db *sql.DB, email, fullName string, password []byte, ownerRequested bool, reader *bufio.Reader, output io.Writer) (string, error) {
	passwordHash, err := bcrypt.GenerateFromPassword(password, bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	defer clear(passwordHash)

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return "", err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `LOCK TABLE portfolio_admins IN SHARE ROW EXCLUSIVE MODE`); err != nil {
		return "", err
	}
	var adminCount int
	if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM portfolio_admins`).Scan(&adminCount); err != nil {
		return "", err
	}

	role, err := selectRole(adminCount, ownerRequested, reader, output)
	if err != nil {
		return "", err
	}

	var userID string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO users (email, password_hash, full_name)
		VALUES ($1, $2, $3)
		ON CONFLICT DO NOTHING
		RETURNING id::text`, email, string(passwordHash), fullName).Scan(&userID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", errDuplicateEmail
	}
	if err != nil {
		return "", err
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO portfolio_admins (user_id, role) VALUES ($1, $2)`, userID, role); err != nil {
		return "", err
	}
	if err := tx.Commit(); err != nil {
		return "", err
	}
	return role, nil
}

func selectRole(adminCount int, ownerRequested bool, reader *bufio.Reader, output io.Writer) (string, error) {
	if adminCount == 0 {
		fmt.Fprintln(output, "No administrators exist; this first admin will be assigned the owner role.")
		return "owner", nil
	}
	if !ownerRequested {
		return "admin", nil
	}
	confirmation, err := promptWithWriter(reader, output, "Type OWNER to confirm owner privileges: ")
	if err != nil || confirmation != "OWNER" {
		return "", errOwnerConfirmationDeclined
	}
	return "owner", nil
}

func prompt(reader *bufio.Reader, label string) (string, error) {
	return promptWithWriter(reader, os.Stdout, label)
}

func promptWithWriter(reader *bufio.Reader, output io.Writer, label string) (string, error) {
	if _, err := fmt.Fprint(output, label); err != nil {
		return "", err
	}
	value, err := reader.ReadString('\n')
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(value), nil
}

func promptPassword(label string) ([]byte, error) {
	fmt.Fprint(os.Stdout, label)
	password, err := term.ReadPassword(int(os.Stdin.Fd()))
	fmt.Fprintln(os.Stdout)
	return password, err
}

func normalizeEmail(value string) (string, error) {
	email := strings.ToLower(strings.TrimSpace(value))
	parsed, err := mail.ParseAddress(email)
	if err != nil || parsed.Address != email || len(email) > maximumEmailLength {
		return "", errors.New("Enter a valid email address.")
	}
	return email, nil
}

func normalizeFullName(value string) (string, error) {
	name := strings.Join(strings.Fields(value), " ")
	if name == "" || len([]rune(name)) > maximumNameLength {
		return "", fmt.Errorf("Full name must be between 1 and %d characters.", maximumNameLength)
	}
	return name, nil
}

func validatePassword(password, confirmation []byte) error {
	if len(password) < minimumPasswordLength || len(password) > maximumPasswordLength {
		return fmt.Errorf("Password must be between %d and %d bytes.", minimumPasswordLength, maximumPasswordLength)
	}
	if subtle.ConstantTimeCompare(password, confirmation) != 1 {
		return errors.New("Passwords do not match.")
	}
	return nil
}

func clear(value []byte) {
	for i := range value {
		value[i] = 0
	}
}

func fail(message string) {
	fprintln(os.Stderr, message)
	os.Exit(1)
}

func fprintln(writer io.Writer, message string) {
	_, _ = fmt.Fprintln(writer, message)
}
