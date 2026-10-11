import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appendTeaching, readTeachings, summarizeTeachings, validateTeaching } from '../src/memory.mjs';

test('validation fail-closed', () => {
  assert.throws(() => validateTeaching({ kind: 'PROOF', module: 'BRUTUS', text: 'x' }), /INVALID_KIND/);
  assert.throws(() => validateTeaching({ kind: 'FACT', module: 'UNKNOWN', text: 'x' }), /INVALID_MODULE/);
  assert.throws(() => validateTeaching({ kind: 'FACT', module: 'BRUTUS', text: '' }), /INVALID_TEXT/);
});

test('append-only teaching persists and verifies hash', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'brutus-memory-'));
  const path = join(dir, 'memory.jsonl');
  const fixed = () => new Date('2026-10-11T20:00:00.000Z');
  const event = await appendTeaching(path, { kind: 'FACT', module: 'BROTOCULATEUR', text: 'test' }, fixed);
  assert.equal(event.proof_ref, null);
  assert.equal(event.auto_proof_promotion, false);
  assert.equal(event.executable, false);
  const events = await readTeachings(path);
  assert.equal(events.length, 1);
  assert.equal(events[0].text, 'test');
  const raw = await readFile(path, 'utf8');
  assert.equal(raw.trim().split('\n').length, 1);
});

test('summary groups events', () => {
  const events = [
    { kind: 'FACT', module: 'BRUTUS' },
    { kind: 'FACT', module: 'BRUTUS' },
    { kind: 'DECISION', module: 'ZELSTEREOS' },
  ];
  const s = summarizeTeachings(events);
  assert.equal(s.total, 3);
  assert.equal(s.by_kind.FACT, 2);
  assert.equal(s.by_module.BRUTUS, 2);
});
