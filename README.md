# snip-cli

Zero-dependency Node.js CLI for the Snip URL shortener. Uses Node 18+
built-in `fetch` — no `npm install` required.

## Quick start

```sh
# run directly
node cli.js help

# or use a wrapper from the folder (no global install needed)
./snip help          # Linux / macOS (sh)
./snip.cmd help      # Windows Command Prompt
./snip.ps1 help      # PowerShell
```

## Install globally

```sh
npm install -g .
snip help
```

## Commands

| Command | Description |
|---|---|
| `snip add <url>` | Shorten `<url>`; prints the short link |
| `snip ls` | List all links — aligned `code / hits / url` table |
| `snip open <code>` | Open a short code in the default OS browser |
| `snip help` | Show usage text |

### Examples

```sh
snip add https://www.typescriptlang.org/docs/handbook/2/types-from-types.html
# http://localhost:3000/aB3xZ9

snip ls
# CODE    HITS  URL
# ---------------------------------------------------------------…
# aB3xZ9     3  https://www.typescriptlang.org/…

snip open aB3xZ9
# opens the URL in your default browser
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `SNIP_API` | `http://localhost:3000` | Backend base URL |

```sh
SNIP_API=https://your-domain.railway.app snip ls
```

## Error handling

- Invalid / missing arguments → message on **stderr**, exit 1  
- Unknown short code → message on **stderr**, exit 1  
- Backend unreachable → message on **stderr**, exit 1
