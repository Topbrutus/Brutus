import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverRelations, runDiscoveryCycle } from '../src/discovery.mjs';
import { readQueenEvents, reduceQueenState, createCandidate, setCandidateGate } from '../src/queen-ledger.mjs';

function crystal(formula_id, hash, fn) {
  return {
    formula_id,
    crystal_id: `${formula_id}-${hash}`,
    hash,
    samples: Array.from({ length: 12 }, (_, index) => {
      const n = BigInt(index + 1);
      return {
        input: n.toString(),
        output: fn(n).toString(),
        validation_state: 'EXACT',
      };
    }),
  };
}

function source(version = 'A') {
  return {
    reachable: true,
    latest_crystals: [
      crystal('PLUS1', `plus-${version}`, (n) => n + 1n),
      crystal('DOUBLE', `double-${version}`, (n) => 2n * n),
      crystal('SQUARE', `square-${version}`, (n) => n * n),
    ],
  };
}

async function tempLedger() {
  const dir = await mkdtemp(join(tmpdir(), 'brutus-discovery-'));
  return join(dir, 'queen.jsonl');
}

test('bounded miner discovers cross-formula relations on held-out inputs', () => {
  const relations = discoverRelations(source(), { maxSuggestions: 10 });
  const expressions = relations.map((r) => r.expression);
  assert.ok(expressions.includes('DOUBLE(n) = 2*PLUS1(n) - 2'));
  assert.ok(expressions.includes('SQUARE(n) = (PLUS1(n) - 1)^2'));
  const square = relations.find((r) => r.expression === 'SQUARE(n) = (PLUS1(n) - 1)^2');
  assert.ok(square.train_inputs.length >= 3);
  assert.ok(square.holdout_inputs.length >= 3);
});

test('discovery cycle creates candidate, bounded counter-test and keeps publication locked', async () => {
  const path = await tempLedger();
  const first = await runDiscoveryCycle(path, { readSource: async () => source('A'), maxNew: 2, maxSuggestions: 2 });
  assert.equal(first.status, 'OK');
  assert.ok(first.created.length >= 1);
  let state = reduceQueenState(await readQueenEvents(path));
  assert.ok(state.candidates.length >= 1);
  const candidate = state.candidates[0];
  assert.equal(candidate.gates.OBSERVED, true);
  assert.equal(candidate.gates.PROVENANCE, true);
  assert.equal(candidate.gates.COUNTER_TESTED, true);
  assert.equal(candidate.gates.REPRODUCED, false);
  assert.equal(candidate.gates.PRIOR_ART_CHECKED, false);
  assert.equal(candidate.gates.NOVELTY_CLEARED, false);
  assert.equal(candidate.ready_for_astra, false);
  assert.ok(state.tasks.some((task) => task.target === candidate.candidate_id && task.status === 'COMPLETE'));

  const second = await runDiscoveryCycle(path, { readSource: async () => source('B'), maxNew: 0, maxSuggestions: 4 });
  assert.ok(second.reproduced.length >= 1);
  state = reduceQueenState(await readQueenEvents(path));
  const reproduced = state.candidates.find((item) => item.candidate_id === candidate.candidate_id);
  assert.equal(reproduced.gates.REPRODUCED, true);
  assert.equal(reproduced.gates.PRIOR_ART_CHECKED, false);
  assert.equal(reproduced.gates.NOVELTY_CLEARED, false);
  assert.equal(reproduced.ready_for_astra, false);
});

test('discovery cycle repairs an incomplete existing candidate without duplicating it', async () => {
  const path = await tempLedger();
  const relation = discoverRelations(source('A'), { maxSuggestions: 1 })[0];
  const created = await createCandidate(path, {
    title: 'Interrupted relation',
    expression: relation.expression,
    domain: 'test domain',
    classification: 'RELATION_CANDIDATE',
    origin: 'BRUTUS_DISCOVERY',
    metadata: {
      fingerprint: relation.fingerprint,
      source_hashes: relation.source_hashes,
      source_crystal_ids: relation.source_crystal_ids,
      method: relation.method,
    },
  });
  await setCandidateGate(path, { candidate_id: created.candidate_id, gate: 'OBSERVED', value: true, note: 'initial observation' });
  await setCandidateGate(path, { candidate_id: created.candidate_id, gate: 'PROVENANCE', value: true, note: 'initial provenance' });

  await runDiscoveryCycle(path, { readSource: async () => source('A'), maxNew: 0, maxSuggestions: 1 });
  const state = reduceQueenState(await readQueenEvents(path));
  assert.equal(state.candidates.length, 1);
  assert.equal(state.candidates[0].gates.COUNTER_TESTED, true);
  assert.equal(state.tasks.filter((task) => task.target === created.candidate_id).length, 1);
  assert.equal(state.tasks[0].status, 'COMPLETE');
});
