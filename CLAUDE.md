## Development

```bash
go build ./...
go test ./...
```

## Toolforge Build Notes

- `heroku/go` buildpack only builds the root package — Go files must be at repo root, not `cmd/`
- `heroku/go` names the binary after the last segment of the module path in `go.mod`
- Toolforge's `step-inject-buildpacks` rewrites `order.toml` before detect — `project.toml` buildpack overrides are ignored
- `heroku/nodejs` v5.5.5 detects on `index.js` or `server.js`, not just `package.json`
- Container filesystem is read-only except `/tmp` — runtime installs must target `/tmp`
- `heroku/go` buildpack version on Toolforge may lag behind latest release — check supported Go versions before updating `go.mod`
