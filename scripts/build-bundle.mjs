#!/usr/bin/env node
// scripts/build-bundle.mjs
// Zero-dependency build script.  Works on Windows, macOS, Linux, and in CI.
//
// Usage:
//   node scripts/build-bundle.mjs          # assemble bundle/ locally (dry-run)
//   node scripts/build-bundle.mjs --push   # assemble + push to remote

import { execSync }                           from 'node:child_process';
import { cpSync, existsSync, rmSync,
         writeFileSync }                      from 'node:fs';
import { join, resolve, dirname }             from 'node:path';
import { fileURLToPath }                      from 'node:url';

const ROOT   = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = join(ROOT, 'bundle');
const PUSH   = process.argv.includes('--push');

// ── helpers ──────────────────────────────────────────────────────────────────

function sh(cmd, opts = {}) {
  console.log(`  $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', shell: true, cwd: ROOT, ...opts });
}

function capture(cmd, opts = {}) {
  return execSync(cmd, {
    encoding: 'utf8', shell: true, cwd: ROOT, ...opts,
  }).trim();
}

/** Returns true when `git diff --cached` is non-empty (i.e. there IS something staged). */
function hasStagedChanges(dir) {
  try {
    execSync('git diff --cached --quiet', { cwd: dir, stdio: 'pipe', shell: true });
    return false; // exit 0 → nothing staged
  } catch {
    return true;  // exit 1 → changes staged
  }
}

function step(n, title) {
  const bar = '─'.repeat(58);
  console.log(`\n${bar}\n  ${n}. ${title}\n${bar}`);
}

// ── 1. Update submodules to their branch tips ─────────────────────────────────

step(1, 'Update submodules to branch tips');
sh('git submodule update --init --remote backend frontend cli');

// ── 2. Build the frontend ─────────────────────────────────────────────────────

step(2, 'Build frontend');
const FE = join(ROOT, 'frontend');
sh('npm install --prefer-offline', { cwd: FE, env: { ...process.env, NG_CLI_ANALYTICS: 'false' } });
sh('npm run build',                { cwd: FE, env: { ...process.env, NG_CLI_ANALYTICS: 'false' } });

const INDEX_HTML = join(FE, 'dist', 'snip-frontend', 'browser', 'index.html');
if (!existsSync(INDEX_HTML)) {
  console.error(`\n  ✗ FATAL: build output missing:\n    ${INDEX_HTML}`);
  process.exit(1);
}
console.log('  ✓ frontend/dist/snip-frontend/browser/index.html present');

// ── 3. Assemble bundle/ ───────────────────────────────────────────────────────

step(3, 'Assemble bundle/');

// server.js  (Bun backend, zero-dep)
cpSync(join(ROOT, 'backend', 'server.js'), join(BUNDLE, 'server.js'));
console.log('  ✓ bundle/server.js');

// cli.js  (Node CLI, CommonJS, zero-dep)
cpSync(join(ROOT, 'cli', 'cli.js'), join(BUNDLE, 'cli.js'));
console.log('  ✓ bundle/cli.js');

// public/  — fresh copy of the Angular build output
const PUBLIC = join(BUNDLE, 'public');
if (existsSync(PUBLIC)) rmSync(PUBLIC, { recursive: true, force: true });
cpSync(join(FE, 'dist', 'snip-frontend', 'browser'), PUBLIC, { recursive: true });
console.log('  ✓ bundle/public/');

// .env  — Bun auto-loads this; switches backend into "serve UI" mode
writeFileSync(join(BUNDLE, '.env'), 'PUBLIC_DIR=./public\n');
console.log('  ✓ bundle/.env');

// package.json  — NO "type" field so cli.js runs under plain node
writeFileSync(join(BUNDLE, 'package.json'), JSON.stringify({
  name: 'snip-bundle',
  version: '1.0.0',
  description: 'Snip — self-contained production bundle (backend + frontend + CLI)',
  scripts: { start: 'bun server.js' },
  engines: { bun: '>=1' },
}, null, 2) + '\n');
console.log('  ✓ bundle/package.json');

// Dockerfile
writeFileSync(join(BUNDLE, 'Dockerfile'), [
  'FROM oven/bun:1-alpine',
  'WORKDIR /app',
  'COPY . .',
  'ENV PORT=3000',
  'ENV PUBLIC_DIR=./public',
  'EXPOSE 3000',
  'CMD bun server.js',
  '',
].join('\n'));
console.log('  ✓ bundle/Dockerfile');

// .dockerignore
writeFileSync(join(BUNDLE, '.dockerignore'), [
  '.git',
  'node_modules',
  '.env',
  '',
].join('\n'));
console.log('  ✓ bundle/.dockerignore');

// railway.json
writeFileSync(join(BUNDLE, 'railway.json'), JSON.stringify({
  $schema: 'https://railway.app/railway.schema.json',
  build:  { builder: 'DOCKERFILE', dockerfilePath: 'Dockerfile' },
  deploy: { startCommand: 'bun server.js', healthcheckPath: '/api/links' },
}, null, 2) + '\n');
console.log('  ✓ bundle/railway.json');

// ── 4. Commit inside bundle/ ─────────────────────────────────────────────────

step(4, 'Commit inside bundle/');

// Propagate superproject git identity into the submodule checkout, which
// starts life without a local user.name / user.email.
try {
  const uname = capture('git config user.name');
  const email = capture('git config user.email');
  execSync(`git config user.name  "${uname}"`, { cwd: BUNDLE, shell: true, stdio: 'pipe' });
  execSync(`git config user.email "${email}"`, { cwd: BUNDLE, shell: true, stdio: 'pipe' });
} catch { /* ignore — CI usually has a global identity */ }

sh('git add -A', { cwd: BUNDLE });

if (hasStagedChanges(BUNDLE)) {
  sh('git commit -m "build: assemble bundle"', { cwd: BUNDLE });
  console.log('  ✓ Committed changes in bundle/');
} else {
  console.log('  ℹ Nothing to commit in bundle/ — already up-to-date');
}

// ── 5. Bump superproject pointers ─────────────────────────────────────────────

step(5, 'Bump superproject submodule pointers');
sh('git add bundle backend frontend cli');

if (hasStagedChanges(ROOT)) {
  sh('git commit -m "chore: bump bundle and submodule pointers"');
  console.log('  ✓ Superproject pointer commit done');
} else {
  console.log('  ℹ No pointer changes — superproject already up-to-date');
}

// ── 6. Push (only with --push) ────────────────────────────────────────────────

if (PUSH) {
  step(6, 'Push to remote');
  // bundle submodule may be in detached HEAD; push current commit to the bundle branch ref
  sh('git push origin HEAD:bundle', { cwd: BUNDLE });
  console.log('  ✓ Pushed bundle branch');
  sh('git push origin main');
  console.log('  ✓ Pushed main branch');
} else {
  console.log('\n  ℹ Dry-run mode — pass --push to push to remote.');
}

console.log('\n✓  build-bundle complete.\n');
