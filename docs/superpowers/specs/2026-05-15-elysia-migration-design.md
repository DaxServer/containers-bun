# Curator Backend Migration: Python FastAPI → TypeScript/Bun/Elysia

## Context

The Curator application currently runs a Python FastAPI backend (`../backend/`) with a Vue 3 TypeScript frontend (`../frontend/`). The backend handles OAuth1 authentication, REST admin endpoints, real-time WebSocket upload management, and Celery background jobs for uploading images to Wikimedia Commons.

The migration moves the backend to TypeScript/Bun/Elysia to unify the stack under a single language, enable type-safe frontend–backend contracts via Elysia Eden, and simplify the Toolforge deployment by producing a standalone compiled binary.

## Target Architecture

```
curator/ (this repo — becomes the monorepo)
├── app/
│   ├── backend/          TypeScript + Bun + Elysia server
│   └── frontend/         Vue 3 frontend (moved from ../frontend/)
├── main.go               Go binary — execs the compiled Bun binary
├── go.mod
└── Procfile
```

**Stack decisions:**

| Concern | Current | Target |
|---|---|---|
| HTTP/WS server | Python FastAPI | Elysia (Bun) |
| Database ORM | SQLModel + Alembic | Drizzle + mysql2 + drizzle-kit |
| Background jobs | Celery + Redis | BullMQ + Bun workers |
| Frontend–backend contract | AsyncAPI (generated types) | Elysia Eden (inferred types) |
| Toolforge deployment | Go bootstraps Bun at runtime | Go execs a compiled `bun build --compile` binary |

**Database:** Stays on Toolforge MariaDB — no infrastructure change needed.

---

## Migration Phases

### Phase 0 — Foundation & Repo Restructure

**Goal:** Working Elysia skeleton in the right repo location with schema and build pipeline in place.

- Move `../frontend/` into `app/frontend/`
- Create `app/backend/` with Bun + Elysia + TypeScript + Biome
- Port SQLModel schema → Drizzle schema (`app/backend/src/db/schema.ts`)
- Set up `drizzle-kit` for migrations (replacing Alembic)
- Port environment config (`core/config.py` → typed Env object)
- Basic Elysia app: health check + static frontend serving
- Configure `bun build --compile` build step
- Update `main.go` to exec the compiled binary (remove Bun bootstrapping)

**Critical files:**
- `app/backend/package.json`, `tsconfig.json`, `biome.json`
- `app/backend/src/index.ts` (Elysia entry)
- `app/backend/src/db/schema.ts` (Drizzle schema)
- `app/backend/drizzle.config.ts`
- `main.go` (exec path update)

---

### Phase 1 — Auth Layer + Eden Auth Integration

**Goal:** Full OAuth1 Wikimedia flow running in Elysia; Vue frontend uses Eden for auth calls.

- Port `auth.py` routes: `/auth/login`, `/auth/callback`, `/auth/logout`, `/auth/whoami`, `/auth/register`
- Port Redis session management (`core/auth.py`)
- Port OAuth1 crypto (`core/crypto.py` — token encryption with Fernet equivalent)
- Wire Elysia Eden in frontend: replace raw `fetch` auth calls in `auth.store.ts`

**Key dependency:** `oauth-1.0a` (npm) for Wikimedia OAuth1 signing.

**Critical files:**
- `app/backend/src/routes/auth.ts`
- `app/backend/src/core/session.ts`
- `app/backend/src/core/crypto.ts`
- `app/frontend/src/stores/auth.store.ts` (Eden wiring)

---

### Phase 2 — Admin REST API + Eden REST Integration

**Goal:** All admin endpoints running in Elysia with Drizzle DAL; Vue admin panel uses Eden.

- Port Drizzle DALs from Python DALs (`dal_batches.py`, `dal_uploads.py`, `dal_presets.py`, `dal_users.py`)
- Port `admin.py` endpoints: batches, users, uploads, presets, failed uploads, bulk ops, retry
- Expose Elysia Eden types from the server
- Wire Eden in frontend: replace raw `fetch` in `admin.store.ts` and `failedUploads.store.ts`

**Critical files:**
- `app/backend/src/db/dal/` (one file per entity)
- `app/backend/src/routes/admin.ts`
- `app/frontend/src/stores/admin.store.ts` (Eden wiring)

---

### Phase 3 — WebSocket Layer + Eden WS Integration

**Goal:** Full real-time WebSocket channel in Elysia; frontend uses Eden WS instead of raw WebSocket + AsyncAPI types.

- Port Elysia WebSocket endpoint (`ws.py` → Elysia `.ws()`)
- Port WS message dispatch and all handlers (`core/handler.py` — 17+ message types)
- Port subscription/publish patterns (batch subscriptions, list subscriptions)
- Port Mapillary handler (`handlers/mapillary_handler.py`)
- Port geocoding (`core/geocoding.py`)
- Wire Elysia Eden WebSocket client in frontend: replace `useSocket.ts`
- Remove `asyncapi.json` contract (Eden WS types replace it)
- Remove `@asyncapi/modelina` codegen dependency

**Critical files:**
- `app/backend/src/routes/ws.ts`
- `app/backend/src/core/handler.ts`
- `app/backend/src/handlers/mapillary.ts`
- `app/frontend/src/composables/useSocket.ts` (replaced by Eden WS)
- `app/frontend/asyncapi.json` (removed)

---

### Phase 4 — Background Jobs (BullMQ)

**Goal:** Upload processing runs in BullMQ workers; Python Celery fully replaced.

- Port `workers/tasks.py` upload processing logic to BullMQ worker
- Port `core/task_enqueuer.py` to BullMQ queue client
- Port Commons/MediaWiki API calls (`mediawiki/` module)
- Set up worker process alongside Elysia server (separate Bun worker process or BullMQ sandbox worker)
- Configure queue names, concurrency, retry policies to match Celery config

**Key dependency:** `bullmq` (npm), Redis stays as-is.

**Critical files:**
- `app/backend/src/workers/upload.worker.ts`
- `app/backend/src/workers/queue.ts`
- `app/backend/src/mediawiki/` (Commons API port)

---

### Phase 5 — Production Build & Cutover

**Goal:** Elysia server compiled into a standalone binary and deployed to Toolforge; Python backend decommissioned.

- Configure `bun build --compile` to bundle `app/backend/` into a single executable
- Verify `main.go` execs the binary correctly on Toolforge
- Update `Procfile` for new process model (Elysia server + BullMQ worker)
- End-to-end smoke test: OAuth login → create batch → upload images → verify on Wikimedia Commons
- Decommission `../backend/` (Python FastAPI)

---

## Key Design Decisions

**Elysia Eden replaces AsyncAPI.** The frontend currently generates TypeScript types from `asyncapi.json` using `@asyncapi/modelina`. With Elysia Eden, types flow directly from the server's route definitions — no codegen step. This is a Phase 3 outcome.

**Drizzle-kit replaces Alembic.** Migration files move from Python Alembic scripts to SQL files generated by `drizzle-kit generate`. The existing Alembic migration history does not need to be ported — only the current schema state matters.

**Bun compiled binary removes runtime bootstrapping.** The current `main.go` downloads and invokes Bun at runtime on Toolforge. `bun build --compile` embeds the Bun runtime into the output binary — the Go binary just needs to exec it. This is cleaner and removes the network dependency at startup.

**Python backend stays live until Phase 5.** During Phases 0–4, the Python backend continues serving production. The Elysia backend is built and tested in parallel. Cutover happens in Phase 5 once all layers pass smoke testing.

---

## Verification Per Phase

| Phase | Verification |
|---|---|
| 0 | `bun dev` starts Elysia server, serves frontend index.html, `bun build --compile` produces executable |
| 1 | OAuth login → callback → session cookie set → `/auth/whoami` returns user |
| 2 | Admin panel loads batches/users/uploads via Eden, all CRUD ops work |
| 3 | Create batch → upload images → receive real-time WS status updates → batch completes |
| 4 | Upload job enqueued → BullMQ worker picks up → file appears on Wikimedia Commons |
| 5 | Full end-to-end on Toolforge staging, Python backend stopped, no regressions |
