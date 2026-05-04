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

const bunInstallDir = "/tmp/.bun"

func ensureBun() string {
	bunPath := filepath.Join(bunInstallDir, "bin", "bun")
	if _, err := os.Stat(bunPath); err == nil {
		return bunPath
	}
	slog.Info("bun not found, installing")
	cmd := exec.Command("bash", "-c", "curl -fsSL https://bun.sh/install | bash")
	cmd.Env = append(os.Environ(), "BUN_INSTALL="+bunInstallDir)
	if err := cmd.Run(); err != nil {
		slog.Error("failed to install bun", "error", err)
		os.Exit(1)
	}
	return bunPath
}
