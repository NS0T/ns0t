package main

import (
	"bufio"
	"bytes"
	"errors"
	"strings"
	"testing"
)

func TestNormalizeEmail(t *testing.T) {
	email, err := normalizeEmail(" Admin@Example.COM ")
	if err != nil || email != "admin@example.com" {
		t.Fatalf("normalizeEmail() = %q, %v", email, err)
	}
	if _, err := normalizeEmail("not-an-email"); err == nil {
		t.Fatal("invalid email was accepted")
	}
}

func TestNormalizeFullName(t *testing.T) {
	name, err := normalizeFullName("  Ada   Lovelace ")
	if err != nil || name != "Ada Lovelace" {
		t.Fatalf("normalizeFullName() = %q, %v", name, err)
	}
	if _, err := normalizeFullName("   "); err == nil {
		t.Fatal("blank name was accepted")
	}
}

func TestValidatePassword(t *testing.T) {
	if err := validatePassword([]byte("correct horse"), []byte("correct horse")); err != nil {
		t.Fatalf("valid password rejected: %v", err)
	}
	if err := validatePassword([]byte("short"), []byte("short")); err == nil {
		t.Fatal("short password was accepted")
	}
	if err := validatePassword([]byte("correct horse"), []byte("different pass")); err == nil {
		t.Fatal("mismatched passwords were accepted")
	}
}

func TestSelectRole(t *testing.T) {
	var output bytes.Buffer
	role, err := selectRole(0, false, bufio.NewReader(strings.NewReader("")), &output)
	if err != nil || role != "owner" {
		t.Fatalf("first role = %q, %v", role, err)
	}

	role, err = selectRole(1, false, bufio.NewReader(strings.NewReader("")), &output)
	if err != nil || role != "admin" {
		t.Fatalf("later default role = %q, %v", role, err)
	}

	role, err = selectRole(1, true, bufio.NewReader(strings.NewReader("OWNER\n")), &output)
	if err != nil || role != "owner" {
		t.Fatalf("confirmed owner role = %q, %v", role, err)
	}

	if _, err := selectRole(1, true, bufio.NewReader(strings.NewReader("no\n")), &output); !errors.Is(err, errOwnerConfirmationDeclined) {
		t.Fatalf("unconfirmed owner error = %v", err)
	}
}
