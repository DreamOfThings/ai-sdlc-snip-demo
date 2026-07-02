# Snip

A tiny URL shortener built as three independent, deployable layers. Each layer
lives on its own orphan git branch and is wired into this `main` branch as a
git submodule.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Snip Backend  (Bun)                    │
│   POST /api/links · GET /api/links · GET /:code → 302    │
└───────────────────┬──────────────────────────────────────┘
                    │  http://localhost:3000
          ┌─────────┴──────────┐
          │                    │
┌─────────▼────────┐  ┌────────▼────────┐
│  Frontend        │  │  CLI            │
│  Angular 19 SPA  │  │  Node 18+ CLI   │
│  localhost:4200  │  │  terminal       │
└──────────────────┘  └─────────────────┘
```

## API Contract

| Method | Path | Request | Response |
|--------|------|---------|----------|
| `POST` | `/api/links` | `{ "url": "https://…" }` | 201 `{ code, url, shortUrl, hits, createdAt }` · 400 `{ error }` |
| `GET` | `/api/links` | — | 200 array of link objects |
| `GET` | `/:code` | — | 302 → original URL · 404 `{ error }` |

All responses are JSON. CORS is open (`*`); OPTIONS preflight returns 204.

## Repository Layout

This repo uses a **branch-per-layer** strategy. Each layer is developed on its
own orphan branch with no shared history. The `main` branch is a **superproject**
that aggregates all three via git submodules, each pinned to the tip of its branch.

| Submodule path | Branch | Description |
|----------------|--------|-------------|
| `backend/` | `backend` | Bun server · `server.js` · zero npm deps · in-memory `Map` |
| `frontend/` | `frontend` | Angular 19 SPA · signals · `HttpClient` · dark UI |
| `cli/` | `cli` | CommonJS Node CLI · zero npm deps · global `fetch` |
| `bundle/` | `bundle` | **Generated output** — do not hand-edit; see [Bundle](#bundle) |

```
snip-demo/           ← superproject (main branch)
├── .gitmodules
├── scripts/
│   └── build-bundle.mjs   ← build automation
├── backend/         ← submodule → branch: backend
├── frontend/        ← submodule → branch: frontend
├── cli/             ← submodule → branch: cli
└── bundle/          ← submodule → branch: bundle (generated)
```

## Cloning

A plain `git clone` leaves submodule folders empty. Always use:

```sh
git clone --recurse-submodules https://github.com/DreamOfThings/ai-sdlc-snip-demo
cd ai-sdlc-snip-demo
```

Already cloned without the flag? Initialise afterwards:

```sh
git submodule update --init --recursive
```

## Running All Three Pieces

### 1 · Backend  (requires [Bun](https://bun.sh))

```sh
cd backend
bun run server.js
# Listening on http://localhost:3000
```

Optional env vars:

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | Port to listen on |
| `BASE_URL` | `http://localhost:PORT` | Origin used in `shortUrl` values |
| `PUBLIC_DIR` | — | Serve static files from this path (e.g. the Angular build output) |

### 2 · Frontend  (requires Node ≥ 18 + npm)

```sh
cd frontend
npm install
npx ng serve          # dev server  → http://localhost:4200
# — or —
npx ng build          # production build → dist/snip-frontend/browser/
```

Point the backend's `PUBLIC_DIR` at the build output to serve everything from one
origin:

```sh
cd backend
PUBLIC_DIR=../frontend/dist/snip-frontend/browser bun run server.js
```

### 3 · CLI  (requires Node ≥ 18)

```sh
cd cli
node cli.js help

node cli.js add https://example.com    # shorten a URL
node cli.js ls                         # list all links
node cli.js open <code>               # open in default browser
```

Install globally so `snip` is on your PATH:

```sh
cd cli
npm install -g .
snip help
```

Override the backend URL with `SNIP_API`:

```sh
SNIP_API=https://your-domain.railway.app snip ls
```

## Submodule Update Workflow

Each submodule folder is a normal git repo — commit and push inside it as usual.
After pushing, advance the superproject's pinned pointer:

```sh
# 1. Make and push a change inside a submodule
cd backend
git add server.js
git commit -m "feat: add rate limiting"
git push

# 2. From the superproject root, advance the pointer to the new commit
cd ..
git submodule update --remote backend   # pulls HEAD of the tracked branch
git add backend
git commit -m "chore: bump backend to latest"
git push
```

> **Why `--remote`?**  Without it, `git submodule update` resets the submodule to
> the SHA already recorded in the superproject's index. `--remote` fetches and
> checks out the tip of the tracked branch instead, then you commit that new SHA.

## Bundle

The `bundle/` submodule (branch `bundle`) is **generated output** — a
self-contained deployment artifact produced by `scripts/build-bundle.mjs`.
Never commit to it by hand.

### What it contains

| File | Source |
|------|--------|
| `server.js` | copied from `backend/` |
| `cli.js` | copied from `cli/` |
| `public/` | Angular production build (`frontend/dist/snip-frontend/browser/`) |
| `.env` | `PUBLIC_DIR=./public` — Bun auto-loads this to enable UI serving |
| `package.json` | `start: bun server.js`, no `"type"` field |
| `Dockerfile` | `FROM oven/bun:1-alpine`, single-process, port 3000 |
| `.dockerignore` | excludes `.git`, `node_modules`, `.env` |
| `railway.json` | selects DOCKERFILE builder for Railway |

### Running the bundle locally

```sh
cd bundle
bun server.js          # serves API on :3000 + UI from ./public
SNIP_API=http://localhost:3000 node cli.js ls   # CLI against same server
```

### Regenerating

```sh
# dry-run (no push)
node scripts/build-bundle.mjs

# build + push both bundle branch and main
node scripts/build-bundle.mjs --push
```

The script is a **safe no-op** when nothing has changed — it checks
`git diff --cached` before every commit and skips when the stage is empty.
