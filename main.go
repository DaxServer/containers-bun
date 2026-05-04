package main

import (
	"log/slog"
	"os"
	"os/exec"
	"syscall"
)

func main() {
	bunPath, err := exec.LookPath("bun")
	if err != nil {
		slog.Error("bun not found in PATH", "error", err)
		os.Exit(1)
	}

	args := append([]string{"bun"}, os.Args[1:]...)
	slog.Info("starting bun")

	if err := syscall.Exec(bunPath, args, os.Environ()); err != nil {
		slog.Error("failed to exec bun", "error", err)
		os.Exit(1)
	}
}
