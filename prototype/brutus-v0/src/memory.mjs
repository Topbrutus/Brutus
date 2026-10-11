import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, appendFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const ALLOWED_KINDS = new Set(['FACT', 'HYPOTHESIS', 'DECISION', 'FEEDBACK']);
const ALLOWED_MODULES = new Set(['BRUTUS', 'BROTOCULATEUR', 'BRUTUS-PELL', 'ZELSTEREOS', 'FOURMIS', 'WORLD']);

function canonicalEvent(event) {
  const { hash, ...withoutHash } = event;
  return JSON.stringify(withoutHash);
}

export function hashEvent(event) {
  return createHash('sha256').update(canonicalEvent(event)).digest('hex');
}

export function validateTeaching(input) {
  if (!input || typeof input !== 'object') throw new Error('INVALID_INPUT');
  const kind = String(input.kind || '').toUpperCase();
  const module = String(input.module || '').toUpperCase();
  const text = String(input.text || '').trim();
  if (!ALLOWED_KINDS.has(kind)) throw new Error('INVALID_KIND');
  if (!ALLOWED_MODULES.has(module)) throw new Error('INVALID_MODULE');
  if (!text || text.length > 2000) throw new Error('INVALID_TEXT');
  return { kind, module, text };
}

export async function appendTeaching(path, input, now = () => new Date()) {
  const teaching = validateTeaching(input);
  await mkdir(dirname(path), { recursive: true });
  const event = {
    schema: 'BRUTUS-LEARNING-EVENT-v0.1',
    id: randomUUID(),
    at: now().toISOString(),
    source: 'OPERATOR_INPUT',
    proof_ref: null,
    auto_proof_promotion: false,
    executable: false,
    ...teaching,
  };
  event.hash = hashEvent(event);
  await appendFile(path, `${JSON.stringify(event)}\n`, 'utf8');
  return event;
}

export async function readTeachings(path) {
  let raw = '';
  try {
    raw = await readFile(path, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  const rows = raw.split(/\r?\n/).filter(Boolean);
  const events = [];
  for (const row of rows) {
    const event = JSON.parse(row);
    if (event.hash !== hashEvent(event)) throw new Error('MEMORY_HASH_MISMATCH');
    events.push(event);
  }
  return events;
}

export function summarizeTeachings(events) {
  const summary = {
    total: events.length,
    by_kind: {},
    by_module: {},
    latest: events.slice(-10).reverse(),
  };
  for (const event of events) {
    summary.by_kind[event.kind] = (summary.by_kind[event.kind] || 0) + 1;
    summary.by_module[event.module] = (summary.by_module[event.module] || 0) + 1;
  }
  return summary;
}
