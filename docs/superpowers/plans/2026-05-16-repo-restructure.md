# Repo Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the Go launcher into its own `curator-launcher` repo and flatten the Bun monorepo from `app/` to the root of this repo.

**Architecture:** Two independent changes — populate `curator-launcher` with the Go binary + CI, then strip the Go layer from `curator` and hoist the `app/` workspace contents to root. CI workflows in `curator` drop the `working-directory: app` default and the binary output path updates by one level.

**Tech Stack:** Go 1.26, Bun, GitHub Actions, GitButler

---

## File Map

### curator-launcher repo (`~/projects/wikimedia/curator-app/curator-launcher/`)

| Action | Path |
|--------|------|
| Create | `main.go` |
| Create | `go.mod` |
| Create | `Procfile` |
| Create | `.github/workflows/go.yml` |

### curator repo (this repo)

| Action | Path |
|--------|------|
| Move (bulk) | `app/*` → repo root |
| Delete | `main.go`, `go.mod`, `Procfile` |
| Delete | `.github/workflows/go.yml` |
| Modify | `backend/package.json` — fix `--outfile` path |
| Modify | `.github/workflows/ci.yml` — remove `working-directory: app`, fix frontend path |
| Modify | `.github/workflows/build.yml` — remove `working-directory: app` |

---

## Task 1: Populate curator-launcher

No tests for Go launcher (it's a thin bootstrap with no logic worth unit-testing; the CI build check is sufficient).

**Files:**
- Create: `~/projects/wikimedia/curator-app/curator-launcher/main.go`
- Create: `~/projects/wikimedia/curator-app/curator-launcher/go.mod`
- Create: `~/projects/wikimedia/curator-app/curator-launcher/Procfile`
- Create: `~/projects/wikimedia/curator-app/curator-launcher/.github/workflows/go.yml`

- [ ] **Step 1: Copy main.go to launcher repo**

Copy the file verbatim — no logic changes needed since `githubRepo = "DaxServer/curator"` stays the same.

```bash
cp /Users/daxserver/projects/wikimedia/curator-app/curator/main.go \
   /Users/daxserver/projects/wikimedia/curator-app/curator-launcher/main.go
```

- [ ] **Step 2: Create go.mod with correct module name**

The current `go.mod` has a placeholder module `github.com/DaxServer/bun`. The `heroku/go` buildpack names the binary after the last segment of the module path, so this controls the binary name in Toolforge.

Create `/Users/daxserver/projects/wikimedia/curator-app/curator-launcher/go.mod`:

```
module github.com/DaxServer/curator-launcher

go 1.26.1
```

- [ ] **Step 3: Create Procfile**

The binary name matches the last segment of the module path (`curator-launcher`).

Create `/Users/daxserver/projects/wikimedia/curator-app/curator-launcher/Procfile`:

```
web: ./curator-launcher
```

- [ ] **Step 4: Create CI workflow**

No path filter needed — the entire repo is Go.

Create `/Users/daxserver/projects/wikimedia/curator-app/curator-launcher/.github/workflows/go.yml`:

```yaml
name: Go

on:
  pull_request:
  push:
    branches:
      - main

permissions:
  contents: read

jobs:
  build:
    name: Go build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-go@v6
        with:
          go-version-file: go.mod

      - run: go build ./...
```

- [ ] **Step 5: Verify the launcher builds locally**

```bash
cd /Users/daxserver/projects/wikimedia/curator-app/curator-launcher && go build ./...
```

Expected: exits 0, produces a `curator-launcher` binary.

- [ ] **Step 6: Commit launcher repo via GitButler skill**

Use the gitbutler skill to commit all new files in `curator-launcher` with message:
`feat: add Go launcher bootstrapped from curator repo`

---

## Task 2: Move Bun monorepo from app/ to root

**Files:**
- Move: `app/backend/` → `backend/`
- Move: `app/frontend/` → `frontend/`
- Move: `app/bun.lock` → `bun.lock`
- Move: `app/bunfig.toml` → `bunfig.toml`
- Move: `app/env.d.ts` → `env.d.ts`
- Move: `app/package.json` → `package.json`
- Move: `app/tsconfig.base.json` → `tsconfig.base.json`
- Modify: `backend/package.json` — fix `--outfile` path

- [ ] **Step 1: Move app/ contents to root**

```bash
cd /Users/daxserver/projects/wikimedia/curator-app/curator && \
  mv app/backend app/frontend app/bun.lock app/bunfig.toml app/env.d.ts app/package.json app/tsconfig.base.json .
```

- [ ] **Step 2: Remove now-empty app/ directory**

```bash
rmdir /Users/daxserver/projects/wikimedia/curator-app/curator/app
```

- [ ] **Step 3: Fix binary output path in backend/package.json**

Currently `--outfile ../../curator-server` (relative to `app/backend/`). After the move, `backend/` is at root so it needs to go up only one level.

In `backend/package.json`, change the build script from:
```
"build": "bun build --compile --minify src/index.ts --outfile ../../curator-server",
```
to:
```
"build": "bun build --compile --minify src/index.ts --outfile ../curator-server",
```

- [ ] **Step 4: Verify the monorepo installs and tests pass**

```bash
cd /Users/daxserver/projects/wikimedia/curator-app/curator && bun install && bun test
```

Expected: all tests pass.

- [ ] **Step 5: Verify typecheck passes**

```bash
cd /Users/daxserver/projects/wikimedia/curator-app/curator && bun typecheck
```

Expected: exits 0.

- [ ] **Step 6: Verify build produces the binary at repo root**

```bash
cd /Users/daxserver/projects/wikimedia/curator-app/curator && bun run build && ls -lh curator-server
```

Expected: `curator-server` binary present at repo root.

- [ ] **Step 7: Remove curator-server binary (build artifact, not committed)**

```bash
rm /Users/daxserver/projects/wikimedia/curator-app/curator/curator-server
```

---

## Task 3: Remove Go files from curator repo

**Files:**
- Delete: `main.go`
- Delete: `go.mod`
- Delete: `Procfile`
- Delete: `.github/workflows/go.yml`

- [ ] **Step 1: Delete Go launcher files**

```bash
rm /Users/daxserver/projects/wikimedia/curator-app/curator/main.go \
   /Users/daxserver/projects/wikimedia/curator-app/curator/go.mod \
   /Users/daxserver/projects/wikimedia/curator-app/curator/Procfile \
   /Users/daxserver/projects/wikimedia/curator-app/curator/.github/workflows/go.yml
```

---

## Task 4: Update CI workflows

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/build.yml`

- [ ] **Step 1: Update ci.yml**

Remove the top-level `defaults.run.working-directory: app` block, and change the typecheck job's `working-directory: app/frontend` to `frontend`.

Final `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:

permissions:
  contents: read

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Determine Bun version
        id: bun-version
        run: echo "BUN_VERSION=$(jq -r '.engines.bun' package.json)" >> $GITHUB_OUTPUT

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ steps.bun-version.outputs.BUN_VERSION }}

      - run: bun install --frozen-lockfile
      - run: bun test
        env:
          TOKEN_ENCRYPTION_KEY: AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE

  typecheck:
    name: Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Determine Bun version
        id: bun-version
        run: echo "BUN_VERSION=$(jq -r '.engines.bun' package.json)" >> $GITHUB_OUTPUT

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ steps.bun-version.outputs.BUN_VERSION }}

      - run: bun install --frozen-lockfile
      - run: bunx vite build
        working-directory: frontend
      - run: bun typecheck

  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Determine Bun version
        id: bun-version
        run: echo "BUN_VERSION=$(jq -r '.engines.bun' package.json)" >> $GITHUB_OUTPUT

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ steps.bun-version.outputs.BUN_VERSION }}

      - run: bun install --frozen-lockfile
      - run: bun lint
```

- [ ] **Step 2: Update build.yml**

Remove the `defaults.run.working-directory: app` block. The `bun-version` step reads `package.json` at root (correct), build runs at root, and `files: curator-server` in the release step is already relative to workspace root.

Final `.github/workflows/build.yml`:

```yaml
name: Build

on:
  pull_request:
  push:
    branches:
      - main

permissions:
  contents: write
  attestations: write
  id-token: write

jobs:
  build:
    name: Build application
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Determine Bun version
        id: bun-version
        run: echo "BUN_VERSION=$(jq -r '.engines.bun' package.json)" >> $GITHUB_OUTPUT

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ steps.bun-version.outputs.BUN_VERSION }}

      - run: bun install --frozen-lockfile
      - run: bun run build

      - name: Create GitHub Release
        if: github.event_name == 'push'
        uses: softprops/action-gh-release@v3
        with:
          files: curator-server
          tag_name: auto-release-${{ github.run_number }}
          target_commitish: ${{ github.sha }}
          make_latest: true

      - name: Generate artifact attestation
        if: github.event_name == 'push'
        uses: actions/attest-build-provenance@v4
        with:
          subject-path: curator-server
```

- [ ] **Step 3: Run lint to catch any issues**

```bash
cd /Users/daxserver/projects/wikimedia/curator-app/curator && bun lint
```

Expected: exits 0, no errors.

- [ ] **Step 4: Commit curator repo changes via GitButler skill**

Use the gitbutler skill to commit all changes with message:
`chore: flatten monorepo to root, remove Go launcher`
