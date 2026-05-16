## GitButler Workflow

This repo is managed with GitButler locally. Claude branches integrate via GitHub PR merge only — never cherry-pick or rebase `claude/*` branches as GitButler virtual branches. Target branch is `main`. See global `~/.claude/CLAUDE.md` for full rules.

## Development

```bash
# TypeScript backend — run from app/
bun install          # install workspace deps
bun test             # run all tests (backend + frontend, scanned recursively)
bun typecheck        # tsc on backend + frontend
bun lint             # biome lint on backend + frontend
bun run build        # compile curator-server binary (backend only)
bun db:generate      # generate Drizzle migrations (requires DB_URL)
```

## TypeScript Backend Notes

- `@elysiajs/static` default prefix is `/public` — use `prefix: "/"` to serve assets at root
- Drizzle `datetime` has no `.onUpdateNow()` — use `timestamp` for auto-update columns
- `bun install` from `app/` hard-errors if a workspace member in `"workspaces"` doesn't exist yet
- Bun workspace catalog defined in `app/package.json` under `workspaces.catalog` — all package deps use `catalog:` protocol
- Elysia guard plugins: use `as: 'scoped'` (not `'local'`) — `'local'` silently skips the guard when consumed via a parent `.use()`
- `config.*` values are frozen at module import time — guards should read from `config`, and tests should seed sessions/state matching the config defaults rather than injecting env vars
- `vue-tsc` is stricter than `tsc` — it catches `T | undefined` from `.then(r => r[0])` that backend-only typecheck passes; run `bun typecheck` (runs both) before committing

## Go Launcher Notes

- Go launcher (`main.go`) is production-only — local dev runs `bun dev` directly, not via the launcher
- `curator-server` binary is downloaded from GitHub releases at startup to `/tmp/curator-server`; it is never bundled

## Toolforge Build Notes

- `heroku/go` buildpack only builds the root package — Go files must be at repo root, not `cmd/`
- `heroku/go` names the binary after the last segment of the module path in `go.mod`
- Toolforge's `step-inject-buildpacks` rewrites `order.toml` before detect — `project.toml` buildpack overrides are ignored
- `heroku/nodejs` v5.5.5 detects on `index.js` or `server.js`, not just `package.json`
- Container filesystem is read-only except `/tmp` — runtime installs must target `/tmp`
- `heroku/go` buildpack version on Toolforge may lag behind latest release — check supported Go versions before updating `go.mod`
