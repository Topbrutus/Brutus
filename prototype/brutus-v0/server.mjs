import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendTeaching, readTeachings, summarizeTeachings } from './src/memory.mjs';
import { readBrotoculateur } from './src/brotoculateur.mjs';
import {
  readQueenEvents, reduceQueenState, createTask, reportTask,
  createCandidate, setCandidateGate, sendCandidateToAstra, setQuestStatus,
} from './src/queen-ledger.mjs';
import { startQueenObserver } from './src/observer.mjs';
import { startDiscoveryWorker } from './src/discovery.mjs';
import { startEvaluationWorker } from './src/evaluation-worker.mjs';
import { summarizeEvaluations, evaluateCrystal, evaluateTask, evaluateModule } from './src/evaluator.mjs';
import { readPellArchive, readZelArchive } from './src/archive-sources.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const MEMORY = process.env.BRUTUS_MEMORY_FILE || join(ROOT, 'data', 'memory.jsonl');
const QUEEN_LEDGER = process.env.BRUTUS_QUEEN_LEDGER || join(ROOT, 'data', 'queen-ledger.jsonl');
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
  if (Buffer.isBuffer(body) || body instanceof Uint8Array) return res.end(body);
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

function writesAllowed() {
  return HOST === '127.0.0.1' || HOST === 'localhost' || process.env.BRUTUS_ALLOW_WRITES === '1';
}

function denyWrite(res) {
  return send(res, 403, { ok: false, error: 'WRITE_LOCKED_OUTSIDE_LOCALHOST' });
}

async function queenState() {
  return reduceQueenState(await readQueenEvents(QUEEN_LEDGER));
}

function runtimeModules({ brotoculateur, pell, zel }) {
  return [
    { id: 'BROTOCULATEUR', status: brotoculateur.reachable ? 'RUNNING' : 'WAITING_SOURCE' },
    { id: 'BRUTUS-PELL', status: pell.available ? 'ARCHIVE_PASS' : 'WAITING_ARCHIVE' },
    { id: 'ZELSTEREOS', status: zel.available ? 'ARCHIVE_PASS' : 'WAITING_ARCHIVE' },
    { id: 'FOURMIS', status: 'QUEEN_BUS_READY' },
    { id: 'BRUTOTABLEUR', status: 'FRESCO_READY' },
    { id: 'BRUTUS-EVALUATOR', status: 'RUNNING' },
    { id: 'ASTRA-MAILBOX', status: 'READY' },
  ];
}

async function api(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/state') {
    const [brotoculateur, events, queen, pell, zel] = await Promise.all([
      readBrotoculateur(), readTeachings(MEMORY), queenState(), readPellArchive(), readZelArchive(),
    ]);
    const modules = runtimeModules({ brotoculateur, pell, zel });
    return send(res, 200, {
      schema: 'BRUTUS-PROTOTYPE-STATE-v0.4',
      mode: 'VERSO_DEFAULT_LOCKED',
      live_routing: 'DENIED',
      unknown_card: 'STOP',
      auto_proof_promotion: false,
      learning_mode: 'OPERATOR_SUPERVISED_APPEND_ONLY',
      queen_mode: 'ORCHESTRATE_OBSERVE_DISCOVER_EVALUATE_TRACE',
      discovery_mode: 'BOUNDED_PATTERN_MINER',
      evaluation_mode: 'UNIVERSAL_GATED_EVALUATOR',
      writes_local_only: !process.env.BRUTUS_ALLOW_WRITES,
      brotoculateur,
      pell,
      zel,
      memory: summarizeTeachings(events),
      colony: queen.counts,
      evaluation: {
        candidates: summarizeEvaluations(queen.candidates),
        latest_crystals: (brotoculateur.latest_crystals || []).map((crystal) => evaluateCrystal(crystal)),
      },
      modules: modules.map((module) => ({ ...module, evaluation: evaluateModule(module) })),
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/memory') {
    const events = await readTeachings(MEMORY);
    return send(res, 200, { events, summary: summarizeTeachings(events) });
  }

  if (req.method === 'GET' && url.pathname === '/api/queen') {
    const [queen, brotoculateur] = await Promise.all([queenState(), readBrotoculateur()]);
    return send(res, 200, { queen, brotoculateur });
  }

  if (req.method === 'GET' && url.pathname === '/api/queen/ledger') {
    const events = await readQueenEvents(QUEEN_LEDGER);
    return send(res, 200, { events: events.slice(-100).reverse() });
  }

  if (req.method === 'GET' && url.pathname === '/api/evaluations') {
    const [queen, brotoculateur, pell, zel] = await Promise.all([
      queenState(), readBrotoculateur(), readPellArchive(), readZelArchive(),
    ]);
    const modules = runtimeModules({ brotoculateur, pell, zel });
    return send(res, 200, {
      schema: 'BRUTUS-EVALUATION-INDEX-v0.1',
      summary: summarizeEvaluations(queen.candidates),
      candidates: queen.candidates.map((candidate) => candidate.evaluation),
      tasks: queen.tasks.map((task) => evaluateTask(task)),
      crystals: (brotoculateur.latest_crystals || []).map((crystal) => evaluateCrystal(crystal)),
      modules: modules.map((module) => evaluateModule(module)),
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/teach') {
    if (!writesAllowed()) return denyWrite(res);
    try { return send(res, 201, { ok: true, event: await appendTeaching(MEMORY, await parseJson(req)) }); }
    catch (error) { return send(res, 400, { ok: false, error: String(error?.message || error) }); }
  }

  if (req.method === 'POST' && url.pathname === '/api/tasks') {
    if (!writesAllowed()) return denyWrite(res);
    try { return send(res, 201, { ok: true, event: await createTask(QUEEN_LEDGER, await parseJson(req)) }); }
    catch (error) { return send(res, 400, { ok: false, error: String(error?.message || error) }); }
  }

  if (req.method === 'POST' && url.pathname === '/api/reports') {
    if (!writesAllowed()) return denyWrite(res);
    try { return send(res, 201, { ok: true, event: await reportTask(QUEEN_LEDGER, await parseJson(req)) }); }
    catch (error) { return send(res, 400, { ok: false, error: String(error?.message || error) }); }
  }

  if (req.method === 'POST' && url.pathname === '/api/candidates') {
    if (!writesAllowed()) return denyWrite(res);
    try { return send(res, 201, { ok: true, event: await createCandidate(QUEEN_LEDGER, await parseJson(req)) }); }
    catch (error) { return send(res, 400, { ok: false, error: String(error?.message || error) }); }
  }

  const gateMatch = url.pathname.match(/^\/api\/candidates\/([^/]+)\/gate$/);
  if (req.method === 'POST' && gateMatch) {
    if (!writesAllowed()) return denyWrite(res);
    try {
      const input = await parseJson(req);
      return send(res, 201, { ok: true, event: await setCandidateGate(QUEEN_LEDGER, { ...input, candidate_id: decodeURIComponent(gateMatch[1]) }) });
    } catch (error) { return send(res, 400, { ok: false, error: String(error?.message || error) }); }
  }

  const astraMatch = url.pathname.match(/^\/api\/candidates\/([^/]+)\/send-astra$/);
  if (req.method === 'POST' && astraMatch) {
    if (!writesAllowed()) return denyWrite(res);
    try { return send(res, 201, { ok: true, event: await sendCandidateToAstra(QUEEN_LEDGER, decodeURIComponent(astraMatch[1])) }); }
    catch (error) { return send(res, 400, { ok: false, error: String(error?.message || error) }); }
  }

  const questMatch = url.pathname.match(/^\/api\/quests\/([^/]+)\/status$/);
  if (req.method === 'POST' && questMatch) {
    if (!writesAllowed()) return denyWrite(res);
    try {
      const input = await parseJson(req);
      return send(res, 201, { ok: true, event: await setQuestStatus(QUEEN_LEDGER, { ...input, quest_id: decodeURIComponent(questMatch[1]) }) });
    } catch (error) { return send(res, 400, { ok: false, error: String(error?.message || error) }); }
  }

  return false;
}

function staticFilePath(pathname) {
  let requested;
  try { requested = decodeURIComponent(pathname === '/' ? '/index.html' : pathname); }
  catch { return null; }
  const relativePath = requested.replace(/^[/\\]+/, '');
  const candidate = resolve(PUBLIC, relativePath);
  const rel = relative(PUBLIC, candidate);
  if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))) return candidate;
  return null;
}

async function staticFile(req, res, url) {
  const file = staticFilePath(url.pathname);
  if (!file) return send(res, 403, 'forbidden', 'text/plain; charset=utf-8');
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
  startQueenObserver(QUEEN_LEDGER, { intervalMs: 30_000 });
  startDiscoveryWorker(QUEEN_LEDGER, { intervalMs: 60_000 });
  startEvaluationWorker(QUEEN_LEDGER, { intervalMs: 45_000 });
  createServer().listen(PORT, HOST, () => {
    console.log(`BRUTUS v0.4 Queen ready: http://${HOST}:${PORT}`);
    console.log('Queen: observe -> discover -> evaluate -> dispatch ants -> Astra mailbox. No auto proof or publication.');
  });
}
