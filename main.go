package main

import (
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
)

func main() {
	bunPath := ensureBun()
	args := append([]string{"bun"}, os.Args[1:]...)
	slog.Info("starting bun")
	if err := syscall.Exec(bunPath, args, os.Environ()); err != nil {
		slog.Error("failed to exec bun", "error", err)
		os.Exit(1)
	}
}

func ensureBun() string {
	if path, err := exec.LookPath("bun"); err == nil {
		return path
	}
	home, err := os.UserHomeDir()
	if err != nil {
		slog.Error("failed to get home dir", "error", err)
		os.Exit(1)
	}
	bunPath := filepath.Join(home, ".bun", "bin", "bun")
	if _, err := os.Stat(bunPath); err == nil {
		return bunPath
	}
	slog.Info("bun not found, installing")
	cmd := exec.Command("bash", "-c", "curl -fsSL https://bun.sh/install | bash")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		slog.Error("failed to install bun", "error", err)
		os.Exit(1)
	}
	return bunPath
}
