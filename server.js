const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const links = new Map(); // code → { code, url, shortUrl, hits, createdAt }

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL =
  process.env.BASE_URL ??
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${PORT}`);
const PUBLIC_DIR = process.env.PUBLIC_DIR; // optional static-file root

// ── helpers ────────────────────────────────────────────────────────────────

function randomCode() {
  let code = '';
  for (let i = 0; i < 6; i++) code += BASE62[Math.floor(Math.random() * 62)];
  return code;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function tryStaticFile(pathname) {
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  const file = Bun.file(`${PUBLIC_DIR}/${rel}`);
  return (await file.exists()) ? new Response(file, { headers: CORS }) : null;
}

// ── server ─────────────────────────────────────────────────────────────────

Bun.serve({
  port: PORT,
  async fetch(req) {
    const { pathname } = new URL(req.url);
    const method = req.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // POST /api/links — create a short URL
    if (method === 'POST' && pathname === '/api/links') {
      let body;
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ error: 'Invalid JSON' }, 400);
      }

      const raw = body?.url;
      if (typeof raw !== 'string') {
        return jsonResponse({ error: '"url" field is required' }, 400);
      }

      let parsed;
      try {
        parsed = new URL(raw);
      } catch {
        return jsonResponse({ error: 'Invalid URL' }, 400);
      }

      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return jsonResponse({ error: 'URL must use http or https protocol' }, 400);
      }

      let code;
      do { code = randomCode(); } while (links.has(code));

      const link = {
        code,
        url: raw,
        shortUrl: `${BASE_URL}/${code}`,
        hits: 0,
        createdAt: new Date().toISOString(),
      };
      links.set(code, link);
      return jsonResponse(link, 201);
    }

    // GET /api/links — list all links
    if (method === 'GET' && pathname === '/api/links') {
      return jsonResponse([...links.values()]);
    }

    // GET — static files take priority over short codes
    if (method === 'GET' && PUBLIC_DIR) {
      const staticRes = await tryStaticFile(pathname);
      if (staticRes) return staticRes;
    }

    // GET /:code — redirect to original URL
    if (method === 'GET' && pathname.length > 1) {
      const code = pathname.slice(1);
      const link = links.get(code);
      if (link) {
        link.hits++;
        return new Response(null, {
          status: 302,
          headers: { Location: link.url, ...CORS },
        });
      }
      return jsonResponse({ error: 'Short code not found' }, 404);
    }

    return jsonResponse({ error: 'Not found' }, 404);
  },
});

console.log(`Snip backend listening on port ${PORT}`);
console.log(`BASE_URL: ${BASE_URL}`);
if (PUBLIC_DIR) console.log(`Serving static files from: ${PUBLIC_DIR}`);
