#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');

const BASE = (process.env.SNIP_API || 'http://localhost:3000').replace(/\/$/, '');

// ── Utilities ─────────────────────────────────────────────────────────────────

function die(msg) {
  process.stderr.write(msg + '\n');
  process.exit(1);
}

function openBrowser(url) {
  const map = {
    win32:  ['cmd.exe', ['/c', 'start', '', url]],
    darwin: ['open',    [url]],
  };
  const [bin, args] = map[process.platform] ?? ['xdg-open', [url]];
  const r = spawnSync(bin, args, { stdio: 'inherit' });
  if (r.error) die(`Cannot open browser: ${r.error.message}`);
}

async function apiFetch(path, opts) {
  try {
    return await fetch(`${BASE}${path}`, opts);
  } catch (e) {
    die(`Cannot reach backend at ${BASE}: ${e.message}`);
  }
}

// ── snip add <url> ────────────────────────────────────────────────────────────

async function cmdAdd(url) {
  if (!url) die('Usage: snip add <url>');

  const res = await apiFetch('/api/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) die(`Error ${res.status}: ${json.error || res.statusText}`);
  console.log(json.shortUrl);
}

// ── snip ls ───────────────────────────────────────────────────────────────────

async function cmdLs() {
  const res = await apiFetch('/api/links');
  const links = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(links)) die('Failed to fetch links from backend');

  if (links.length === 0) {
    console.log('No links yet.');
    return;
  }

  const codeW = Math.max(4, ...links.map(l => l.code.length));
  const hitsW = Math.max(4, ...links.map(l => String(l.hits).length));

  const row = (code, hits, url) =>
    `${String(code).padEnd(codeW)}  ${String(hits).padStart(hitsW)}  ${url}`;

  console.log(row('CODE', 'HITS', 'URL'));
  console.log('-'.repeat(codeW + 2 + hitsW + 2 + 60));
  for (const l of links) console.log(row(l.code, l.hits, l.url));
}

// ── snip open <code> ──────────────────────────────────────────────────────────

async function cmdOpen(code) {
  if (!code) die('Usage: snip open <code>');

  let res;
  try {
    // redirect:'manual' in Node.js (undici-based fetch) returns the raw 3xx
    // response without following it, exposing the Location header.
    res = await fetch(`${BASE}/${code}`, { redirect: 'manual' });
  } catch (e) {
    die(`Cannot reach backend at ${BASE}: ${e.message}`);
  }

  const location = res.headers.get('location');

  if (!location) {
    if (res.status === 404) die(`Unknown short code: ${code}`);
    // Opaque-redirect (status 0) or unexpected response without Location
    if (res.status === 0) die(`Unknown short code: ${code}`);
    die(`Unexpected response (status ${res.status}): no Location header`);
  }

  openBrowser(location);
}

// ── help ──────────────────────────────────────────────────────────────────────

function help() {
  console.log(`
Snip CLI  —  tiny URL shortener

Usage:
  snip add <url>      Shorten <url> and print the short link
  snip ls             List all links (code / hits / original URL)
  snip open <code>    Open a short code in the default OS browser
  snip help           Show this message

Environment:
  SNIP_API            Backend base URL  (default: http://localhost:3000)
`.trim());
}

// ── Entry ─────────────────────────────────────────────────────────────────────

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case 'add':       await cmdAdd(rest[0]);  break;
    case 'ls':        await cmdLs();          break;
    case 'open':      await cmdOpen(rest[0]); break;
    case 'help':
    case undefined:   help();                 break;
    default:
      process.stderr.write(`Unknown command: ${cmd}\n\n`);
      help();
      process.exit(1);
  }
}

main().catch(e => die(e.message));
