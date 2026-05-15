## Development

```bash
go build ./...
go test ./...
```

```bash
# TypeScript backend — run from app/
bun install          # install workspace deps
bun test             # run backend + frontend tests
bun typecheck        # tsc on both packages (authoritative — LSP warnings may be stale)
bun lint             # biome lint on both packages
bun run build        # compile curator-server binary at repo root
bun db:generate      # generate Drizzle migrations (requires DB_URL)
```

## TypeScript Backend Notes

- `@elysiajs/static` default prefix is `/public` — use `prefix: "/"` to serve assets at root
- Drizzle `datetime` has no `.onUpdateNow()` — use `timestamp` for auto-update columns
- `bun install` from `app/` hard-errors if a workspace member in `"workspaces"` doesn't exist yet

## Toolforge Build Notes

- `heroku/go` buildpack only builds the root package — Go files must be at repo root, not `cmd/`
- `heroku/go` names the binary after the last segment of the module path in `go.mod`
- Toolforge's `step-inject-buildpacks` rewrites `order.toml` before detect — `project.toml` buildpack overrides are ignored
- `heroku/nodejs` v5.5.5 detects on `index.js` or `server.js`, not just `package.json`
- Container filesystem is read-only except `/tmp` — runtime installs must target `/tmp`
- `heroku/go` buildpack version on Toolforge may lag behind latest release — check supported Go versions before updating `go.mod`
