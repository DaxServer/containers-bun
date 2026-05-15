package main

import (
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
)

func main() {
	serverPath := findServer()
	slog.Info("starting curator-server", "path", serverPath)
	if err := syscall.Exec(serverPath, append([]string{"curator-server"}, os.Args[1:]...), os.Environ()); err != nil {
		slog.Error("failed to exec curator-server", "error", err)
		os.Exit(1)
	}
}

func findServer() string {
	// 1. Same directory as this binary
	if exe, err := os.Executable(); err == nil {
		candidate := filepath.Join(filepath.Dir(exe), "curator-server")
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}

	// 2. Current working directory (go run . sets CWD to repo root)
	if cwd, err := os.Getwd(); err == nil {
		candidate := filepath.Join(cwd, "curator-server")
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}

	// 3. PATH
	if path, err := exec.LookPath("curator-server"); err == nil {
		return path
	}

	slog.Error("curator-server binary not found — run 'cd app && bun run build' first")
	os.Exit(1)
	return ""
}
