import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendTeaching, readTeachings, summarizeTeachings } from './src/memory.mjs';
import { readBrotoculateur } from './src/brotoculateur.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const MEMORY = process.env.BRUTUS_MEMORY_FILE || join(ROOT, 'data', 'memory.jsonl');
const PORT = Number(process.env.PORT || 8811);
const HOST = process.env.HOST || '127.0.0.1';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
};

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'content-type': type,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'",
  });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

async function parseJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 20_000) throw new Error('BODY_TOO_LARGE');
  }
  return JSON.parse(body || '{}');
}

async function api(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/state') {
    const [brotoculateur, events] = await Promise.all([
      readBrotoculateur(),
      readTeachings(MEMORY),
    ]);
    return send(res, 200, {
      schema: 'BRUTUS-PROTOTYPE-STATE-v0.1',
      mode: 'VERSO_DEFAULT_LOCKED',
      live_routing: 'DENIED',
      unknown_card: 'STOP',
      auto_proof_promotion: false,
      learning_mode: 'OPERATOR_SUPERVISED_APPEND_ONLY',
      brotoculateur,
      memory: summarizeTeachings(events),
      modules: [
        { id: 'BROTOCULATEUR', status: brotoculateur.reachable ? 'RUNNING' : 'WAITING_SOURCE' },
        { id: 'BRUTUS-PELL', status: 'READY' },
        { id: 'ZELSTEREOS', status: 'READY' },
        { id: 'FOURMIS', status: 'READY' },
      ],
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/memory') {
    const events = await readTeachings(MEMORY);
    return send(res, 200, { events, summary: summarizeTeachings(events) });
  }

  if (req.method === 'POST' && url.pathname === '/api/teach') {
    try {
      const event = await appendTeaching(MEMORY, await parseJson(req));
      return send(res, 201, { ok: true, event });
    } catch (error) {
      return send(res, 400, { ok: false, error: String(error?.message || error) });
    }
  }

  return false;
}

async function staticFile(req, res, url) {
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const safe = normalize(requested).replace(/^([.][.][/\\])+/, '');
  const file = join(PUBLIC, safe);
  if (!file.startsWith(PUBLIC)) return send(res, 403, 'forbidden', 'text/plain; charset=utf-8');
  try {
    const body = await readFile(file);
    return send(res, 200, body, mime[extname(file)] || 'application/octet-stream');
  } catch (error) {
    if (error?.code === 'ENOENT') return send(res, 404, 'not found', 'text/plain; charset=utf-8');
    throw error;
  }
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
      const handled = await api(req, res, url);
      if (handled !== false) return;
      await staticFile(req, res, url);
    } catch (error) {
      send(res, 500, { ok: false, error: 'INTERNAL_ERROR' });
      console.error(error);
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer().listen(PORT, HOST, () => {
    console.log(`BRUTUS v0.1 ready: http://${HOST}:${PORT}`);
    console.log('Learning: operator-supervised, append-only, no auto proof promotion.');
  });
}
