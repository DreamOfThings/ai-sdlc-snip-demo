# Snip — tiny URL shortener (backend)

A single-file Bun server with zero npm dependencies.

## Start

```sh
bun run server.js
# or
bun start
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/links` | Create a short URL — body: `{ "url": "https://…" }` |
| `GET` | `/api/links` | List all links |
| `GET` | `/:code` | Redirect to the original URL (302) |

### Link shape

```json
{
  "code":     "aB3xZ9",
  "url":      "https://example.com",
  "shortUrl": "http://localhost:3000/aB3xZ9",
  "hits":     0,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port to listen on |
| `BASE_URL` | auto | Origin used in `shortUrl`; falls back to `https://$RAILWAY_PUBLIC_DOMAIN` when set, else `http://localhost:PORT` |
| `PUBLIC_DIR` | — | When set, static files are served from this directory (`/` → `index.html`). A real file always wins over a same-named short code. |

## Notes

- Short codes are 6 random base62 characters.
- Links are stored in memory; they are lost on restart.
- Full CORS support (including `OPTIONS` preflight) is enabled for all origins.
