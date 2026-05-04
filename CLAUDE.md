## Development

```bash
go build ./...
go test ./...
```

## Container Build

Local pack build (Docker Desktop for Mac mangles apt traffic without NO_PROXY):
```bash
pack build containers-bun \
  --builder tools-harbor.wmcloud.org/toolforge/heroku-builder:24_0.21.5 \
  --trust-builder \
  --buildpack ./buildpacks/bun \
  --buildpack heroku/go@2.2.2 \
  --buildpack heroku/procfile \
  --env NO_PROXY=archive.ubuntu.com,security.ubuntu.com \
  --env no_proxy=archive.ubuntu.com,security.ubuntu.com
```
