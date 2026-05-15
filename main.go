package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"syscall"
)

const (
	githubRepo   = "DaxServer/curator"
	assetName    = "curator-server"
	downloadDest = "/tmp/curator-server"
)

func main() {
	serverPath := downloadServer()
	slog.Info("starting curator-server", "path", serverPath)
	if err := syscall.Exec(serverPath, append([]string{assetName}, os.Args[1:]...), os.Environ()); err != nil {
		slog.Error("failed to exec curator-server", "error", err)
		os.Exit(1)
	}
}

func downloadServer() string {
	slog.Info("Downloading curator-server from GitHub releases")
	url, err := releaseAssetURL()
	if err != nil {
		slog.Error("Failed to fetch release info", "error", err)
		os.Exit(1)
	}
	slog.Info("Downloading", "url", url)
	if err := downloadFile(url, downloadDest); err != nil {
		slog.Error("Failed to download curator-server", "error", err)
		os.Exit(1)
	}
	if err := os.Chmod(downloadDest, 0755); err != nil {
		slog.Error("Failed to chmod curator-server", "error", err)
		os.Exit(1)
	}
	return downloadDest
}

type releaseAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
}

func releaseAssetURL() (string, error) {
	req, err := http.NewRequest("GET",
		fmt.Sprintf("https://api.github.com/repos/%s/releases/latest", githubRepo), nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	if token := os.Getenv("GITHUB_TOKEN"); token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("GitHub API returned %d", resp.StatusCode)
	}

	var release struct {
		Assets []releaseAsset `json:"assets"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return "", err
	}
	for _, a := range release.Assets {
		if a.Name == assetName {
			return a.BrowserDownloadURL, nil
		}
	}
	return "", fmt.Errorf("Asset %q not found in latest release", assetName)
}

func downloadFile(url, dest string) error {
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("Download returned %d", resp.StatusCode)
	}
	f, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(f, resp.Body)
	return err
}
