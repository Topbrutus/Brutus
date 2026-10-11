import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readQueenEvents, reduceQueenState, createTask, reportTask,
  createCandidate, setCandidateGate, sendCandidateToAstra,
} from '../src/queen-ledger.mjs';
import { observeOnce } from '../src/observer.mjs';

async function tempLedger() {
  const dir = await mkdtemp(join(tmpdir(), 'brutus-queen-'));
  return join(dir, 'queen.jsonl');
}

test('queen ledger chains hashes and fails closed on tamper', async () => {
  const path = await tempLedger();
  await createTask(path, { kind: 'TEST', target: 'PELL q=73', title: 'Verify rank witness' });
  await createTask(path, { kind: 'VERIFY', target: 'TRACE', title: 'Verify provenance' });
  const events = await readQueenEvents(path);
  assert.equal(events.length, 2);
  assert.equal(events[1].prev_hash, events[0].hash);
  const raw = await readFile(path, 'utf8');
  await writeFile(path, raw.replace('Verify provenance', 'Verify provenance!'), 'utf8');
  await assert.rejects(() => readQueenEvents(path), /QUEEN_LEDGER_HASH_MISMATCH/);
});

test('ants can report to queen tasks', async () => {
  const path = await tempLedger();
  const task = await createTask(path, { kind: 'COUNTER_TEST', target: 'FORMULA-X', title: 'Try to break candidate' });
  await reportTask(path, { task_id: task.task_id, ant_id: 'ANT-001', status: 'COMPLETE', result: { pass: true } });
  const state = reduceQueenState(await readQueenEvents(path));
  assert.equal(state.tasks[0].status, 'COMPLETE');
  assert.equal(state.tasks[0].reports[0].ant_id, 'ANT-001');
});

test('candidate reaches Astra mailbox only after all review gates', async () => {
  const path = await tempLedger();
  const created = await createCandidate(path, { title: 'Test relation', expression: 'f(n)=n+1', domain: 'n entier', classification: 'CONJECTURE' });
  await assert.rejects(() => sendCandidateToAstra(path, created.candidate_id), /CANDIDATE_NOT_READY/);
  for (const gate of ['OBSERVED', 'REPRODUCED', 'COUNTER_TESTED', 'PROVENANCE', 'PRIOR_ART_CHECKED', 'NOVELTY_CLEARED']) {
    await setCandidateGate(path, {
      candidate_id: created.candidate_id,
      gate,
      value: true,
      note: gate === 'OBSERVED' ? '' : ('trace-' + gate),
    });
  }
  const quest = await sendCandidateToAstra(path, created.candidate_id);
  const state = reduceQueenState(await readQueenEvents(path));
  assert.equal(state.candidates[0].ready_for_astra, true);
  assert.equal(state.mailbox[0].quest_id, quest.quest_id);
  assert.equal(state.mailbox[0].status, 'NEW');
});

test('candidate gates require evidence notes when asserted', async () => {
  const path = await tempLedger();
  const created = await createCandidate(path, { title: 'Evidence relation', expression: 'g(n)=n', domain: 'n entier' });
  await assert.rejects(
    () => setCandidateGate(path, { candidate_id: created.candidate_id, gate: 'COUNTER_TESTED', value: true }),
    /GATE_EVIDENCE_REQUIRED/,
  );
});

test('counterexample blocks Astra readiness', async () => {
  const path = await tempLedger();
  const created = await createCandidate(path, { title: 'Bad relation', expression: 'f(n)=0', domain: 'n entier' });
  for (const gate of ['OBSERVED', 'REPRODUCED', 'COUNTER_TESTED', 'PROVENANCE', 'PRIOR_ART_CHECKED', 'NOVELTY_CLEARED', 'COUNTEREXAMPLE_FOUND']) {
    await setCandidateGate(path, {
      candidate_id: created.candidate_id,
      gate,
      value: true,
      note: gate === 'OBSERVED' ? '' : ('trace-' + gate),
    });
  }
  const state = reduceQueenState(await readQueenEvents(path));
  assert.equal(state.candidates[0].ready_for_astra, false);
});

test('observer records changing Brotoculateur snapshots as live observations', async () => {
  const path = await tempLedger();
  let packets = 10;
  const readSource = async () => ({
    reachable: true, endpoint: 'http://example.test', state: 'RUNNING', run_id: 'run-1',
    processed_packets: packets, crystals: packets * 2, active_seeds: 5,
    papillon: { cache_hit_rate: .9, logical_to_physical_ratio: 12 },
    sentinels: { total: 3, survived: 3, hits: packets },
  });
  assert.equal((await observeOnce(path, { readSource })).recorded, true);
  assert.equal((await observeOnce(path, { readSource })).recorded, false);
  packets = 14;
  const second = await observeOnce(path, { readSource });
  assert.equal(second.recorded, true);
  assert.equal(second.event.deltas.processed_packets, 4);
  assert.equal(second.event.proof_ref, null);
});

test('concurrent queen writes stay on one hash chain', async () => {
  const path = await tempLedger();
  await Promise.all(Array.from({ length: 20 }, (_, index) => createTask(path, {
    kind: 'TEST',
    target: `CONCURRENT-${index}`,
    title: `Concurrent task ${index}`,
  })));
  const events = await readQueenEvents(path);
  assert.equal(events.length, 20);
  assert.equal(new Set(events.map((event) => event.id)).size, 20);
});
