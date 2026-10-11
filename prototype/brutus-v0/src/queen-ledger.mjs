import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, appendFile, open, stat, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { evaluateCandidate } from './evaluator.mjs';

const TASK_KINDS = new Set(['COLLECT', 'COMPUTE', 'TEST', 'COUNTER_TEST', 'VERIFY', 'ARCHIVE', 'RESEARCH']);
const TASK_PERMISSIONS = new Set(['READ', 'COMPUTE', 'TEST', 'REPORT']);
const GATES = new Set(['OBSERVED', 'REPRODUCED', 'COUNTER_TESTED', 'PROVENANCE', 'PRIOR_ART_CHECKED', 'NOVELTY_CLEARED', 'COUNTEREXAMPLE_FOUND']);
const QUEST_STATUS = new Set(['NEW', 'IN_REVIEW', 'RETURN_TO_COLONY', 'READY_TO_PUBLISH', 'PUBLISHED', 'REJECTED']);

function canonical(event) {
  const { hash, ...withoutHash } = event;
  return JSON.stringify(withoutHash);
}

export function hashQueenEvent(event) {
  return createHash('sha256').update(canonical(event)).digest('hex');
}

const LOCK_STALE_MS = 30_000;
const LOCK_TIMEOUT_MS = 5_000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function acquireLedgerLock(path) {
  await mkdir(dirname(path), { recursive: true });
  const lockPath = `${path}.lock`;
  const deadline = Date.now() + LOCK_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const handle = await open(lockPath, 'wx');
      await handle.writeFile(JSON.stringify({ pid: process.pid, at: new Date().toISOString() }), 'utf8');
      return async () => {
        try { await handle.close(); } catch {}
        try { await unlink(lockPath); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
      };
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      try {
        const info = await stat(lockPath);
        if (Date.now() - info.mtimeMs > LOCK_STALE_MS) {
          await unlink(lockPath);
          continue;
        }
      } catch (statError) {
        if (statError?.code === 'ENOENT') continue;
        throw statError;
      }
      await sleep(10);
    }
  }
  throw new Error('QUEEN_LEDGER_LOCK_TIMEOUT');
}

export async function readQueenEvents(path) {
  let raw = '';
  try {
    raw = await readFile(path, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  const rows = raw.split(/\r?\n/).filter(Boolean);
  const events = [];
  let previous = null;
  for (const row of rows) {
    const event = JSON.parse(row);
    if (event.hash !== hashQueenEvent(event)) throw new Error('QUEEN_LEDGER_HASH_MISMATCH');
    if ((event.prev_hash ?? null) !== previous) throw new Error('QUEEN_LEDGER_CHAIN_MISMATCH');
    previous = event.hash;
    events.push(event);
  }
  return events;
}

export async function appendQueenEvent(path, payload, now = () => new Date()) {
  if (!payload || typeof payload !== 'object' || !payload.type) throw new Error('INVALID_EVENT');
  const release = await acquireLedgerLock(path);
  try {
    const events = await readQueenEvents(path);
    const event = {
      schema: 'BRUTUS-QUEEN-LEDGER-EVENT-v0.1',
      id: randomUUID(),
      at: now().toISOString(),
      prev_hash: events.at(-1)?.hash ?? null,
      proof_ref: null,
      auto_proof_promotion: false,
      ...payload,
    };
    event.hash = hashQueenEvent(event);
    await appendFile(path, `${JSON.stringify(event)}\n`, 'utf8');
    return event;
  } finally {
    await release();
  }
}

export function validateTask(input) {
  const kind = String(input?.kind || '').toUpperCase();
  const target = String(input?.target || '').trim();
  const title = String(input?.title || '').trim();
  const permissions = Array.isArray(input?.permissions) ? input.permissions.map((p) => String(p).toUpperCase()) : ['READ', 'COMPUTE', 'TEST', 'REPORT'];
  if (!TASK_KINDS.has(kind)) throw new Error('INVALID_TASK_KIND');
  if (!target || !title || title.length > 240) throw new Error('INVALID_TASK');
  if (!permissions.length || permissions.some((p) => !TASK_PERMISSIONS.has(p))) throw new Error('INVALID_TASK_PERMISSION');
  return { kind, target, title, permissions, payload: input?.payload ?? null };
}

export function validateCandidate(input) {
  const title = String(input?.title || '').trim();
  const expression = String(input?.expression || '').trim();
  const domain = String(input?.domain || '').trim();
  const origin = String(input?.origin || 'OPERATOR').trim();
  const classification = String(input?.classification || 'CONJECTURE').toUpperCase();
  if (!title || title.length > 240) throw new Error('INVALID_CANDIDATE_TITLE');
  if (!expression || expression.length > 2000) throw new Error('INVALID_CANDIDATE_EXPRESSION');
  if (!domain || domain.length > 1000) throw new Error('INVALID_CANDIDATE_DOMAIN');
  const metadata = input?.metadata && typeof input.metadata === 'object' ? input.metadata : null;
  return { title, expression, domain, origin, classification, metadata };
}

export function candidateReadyForAstra(candidate) {
  return evaluateCandidate(candidate).ready_for_astra;
}

export function reduceQueenState(events) {
  const state = { observations: [], tasks: {}, candidates: {}, mailbox: {} };
  for (const event of events) {
    if (event.type === 'OBSERVATION') state.observations.push(event);
    if (event.type === 'TASK_CREATED') state.tasks[event.task_id] = { ...event, status: 'OPEN', reports: [] };
    if (event.type === 'ANT_REPORT' && state.tasks[event.task_id]) {
      state.tasks[event.task_id].reports.push(event);
      state.tasks[event.task_id].status = event.status || state.tasks[event.task_id].status;
    }
    if (event.type === 'CANDIDATE_CREATED') {
      state.candidates[event.candidate_id] = { ...event, gates: {
        OBSERVED: false, REPRODUCED: false, COUNTER_TESTED: false,
        PROVENANCE: false, PRIOR_ART_CHECKED: false, NOVELTY_CLEARED: false, COUNTEREXAMPLE_FOUND: false,
      }, notes: [] };
    }
    if (event.type === 'CANDIDATE_GATE' && state.candidates[event.candidate_id]) {
      state.candidates[event.candidate_id].gates[event.gate] = event.value;
      if (event.note) state.candidates[event.candidate_id].notes.push(event.note);
    }
    if (event.type === 'QUEST_CREATED') state.mailbox[event.quest_id] = { ...event, status: 'NEW' };
    if (event.type === 'QUEST_STATUS' && state.mailbox[event.quest_id]) state.mailbox[event.quest_id].status = event.status;
  }
  const observationCount = state.observations.length;
  state.observations = state.observations.slice(-30).reverse();
  state.tasks = Object.values(state.tasks).sort((a, b) => b.at.localeCompare(a.at));
  state.candidates = Object.values(state.candidates).map((c) => { const evaluation = evaluateCandidate(c); return { ...c, evaluation, ready_for_astra: evaluation.ready_for_astra }; }).sort((a, b) => b.at.localeCompare(a.at));
  state.mailbox = Object.values(state.mailbox).sort((a, b) => b.at.localeCompare(a.at));
  state.counts = {
    observations: observationCount,
    tasks: state.tasks.length,
    candidates: state.candidates.length,
    mailbox: state.mailbox.length,
  };
  return state;
}

export async function createTask(path, input) {
  const task = validateTask(input);
  const task_id = `TASK-${randomUUID()}`;
  return appendQueenEvent(path, { type: 'TASK_CREATED', task_id, source: 'BRUTUS_QUEEN', ...task });
}

export async function reportTask(path, input) {
  const task_id = String(input?.task_id || '').trim();
  const ant_id = String(input?.ant_id || '').trim();
  const status = String(input?.status || '').toUpperCase();
  if (!task_id || !ant_id || !['RUNNING', 'COMPLETE', 'FAILED', 'BLOCKED'].includes(status)) throw new Error('INVALID_ANT_REPORT');
  return appendQueenEvent(path, { type: 'ANT_REPORT', task_id, ant_id, status, result: input?.result ?? null, source: 'ANT' });
}

export async function createCandidate(path, input) {
  const candidate = validateCandidate(input);
  const candidate_id = `FORMULA-${randomUUID()}`;
  return appendQueenEvent(path, { type: 'CANDIDATE_CREATED', candidate_id, source: candidate.origin, ...candidate });
}

export async function setCandidateGate(path, input) {
  const candidate_id = String(input?.candidate_id || '').trim();
  const gate = String(input?.gate || '').toUpperCase();
  if (!candidate_id || !GATES.has(gate)) throw new Error('INVALID_CANDIDATE_GATE');
  const value = Boolean(input?.value);
  const note = String(input?.note || '').trim().slice(0, 1000);
  if (value && gate !== 'OBSERVED' && !note) throw new Error('GATE_EVIDENCE_REQUIRED');
  return appendQueenEvent(path, { type: 'CANDIDATE_GATE', candidate_id, gate, value, note, source: 'ASTRA_OR_COLONY_REVIEW' });
}

export async function sendCandidateToAstra(path, candidate_id) {
  const state = reduceQueenState(await readQueenEvents(path));
  const candidate = state.candidates.find((c) => c.candidate_id === candidate_id);
  if (!candidate) throw new Error('CANDIDATE_NOT_FOUND');
  if (!candidateReadyForAstra(candidate)) throw new Error('CANDIDATE_NOT_READY_FOR_ASTRA');
  if (state.mailbox.some((q) => q.candidate_id === candidate_id && q.status !== 'REJECTED')) throw new Error('QUEST_ALREADY_EXISTS');
  return appendQueenEvent(path, {
    type: 'QUEST_CREATED',
    quest_id: `QUEST-${randomUUID()}`,
    candidate_id,
    title: `Revue publication Â· ${candidate.title}`,
    message: 'Brutus estime ce candidat prÃªt pour une revue Astra. Aucun envoi externe ni publication automatique n\'a Ã©tÃ© effectuÃ©.',
    source: 'BRUTUS_QUEEN',
  });
}

export async function setQuestStatus(path, input) {
  const quest_id = String(input?.quest_id || '').trim();
  const status = String(input?.status || '').toUpperCase();
  if (!quest_id || !QUEST_STATUS.has(status)) throw new Error('INVALID_QUEST_STATUS');
  return appendQueenEvent(path, { type: 'QUEST_STATUS', quest_id, status, source: 'ASTRA' });
}

