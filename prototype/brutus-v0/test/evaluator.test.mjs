import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  evaluateCandidate, evaluateCrystal, summarizeEvaluations,
} from '../src/evaluator.mjs';
import {
  createCandidate, setCandidateGate, readQueenEvents, reduceQueenState,
} from '../src/queen-ledger.mjs';
import { dispatchEvaluationTasks } from '../src/evaluation-worker.mjs';

async function tempLedger() {
  const dir = await mkdtemp(join(tmpdir(), 'brutus-evaluator-'));
  return join(dir, 'queen.jsonl');
}

function candidate(gates = {}) {
  return {
    candidate_id: 'FORMULA-TEST',
    source: 'TEST',
    classification: 'RELATION_CANDIDATE',
    gates: {
      OBSERVED: false, PROVENANCE: false, COUNTER_TESTED: false,
      REPRODUCED: false, PRIOR_ART_CHECKED: false, NOVELTY_CLEARED: false,
      COUNTEREXAMPLE_FOUND: false, ...gates,
    },
  };
}

test('evaluator names the next missing gate without inventing proof', () => {
  const evaluation = evaluateCandidate(candidate({ OBSERVED: true, PROVENANCE: true }));
  assert.equal(evaluation.measured, true);
  assert.equal(evaluation.next_action.gate, 'COUNTER_TESTED');
  assert.equal(evaluation.next_action.kind, 'COUNTER_TEST');
  assert.equal(evaluation.publication_state, 'BLOCKED');
  assert.equal(evaluation.proof_ref, null);
  assert.equal(evaluation.auto_proof_promotion, false);
  assert.match(evaluation.evaluation_hash, /^[0-9a-f]{64}$/);
});

test('counterexample blocks publication even when all positive gates pass', () => {
  const evaluation = evaluateCandidate(candidate({
    OBSERVED: true, PROVENANCE: true, COUNTER_TESTED: true,
    REPRODUCED: true, PRIOR_ART_CHECKED: true, NOVELTY_CLEARED: true,
    COUNTEREXAMPLE_FOUND: true,
  }));
  assert.equal(evaluation.ready_for_astra, false);
  assert.equal(evaluation.publication_state, 'BLOCKED_COUNTEREXAMPLE');
});

test('crystal evaluation distinguishes measured trace from proof', () => {
  const evaluation = evaluateCrystal({
    crystal_id: 'CRYSTAL-X', level: 4, coverage: 5764801,
    hash: 'a'.repeat(64), evidence_class: 'PACKAGED_OBSERVATION', proof_ref: null,
  });
  assert.equal(evaluation.measured, true);
  assert.equal(evaluation.provenance, true);
  assert.equal(evaluation.evidence_class, 'PACKAGED_OBSERVATION');
  assert.equal(evaluation.proof_ref, null);
});

test('evaluation worker sends one deduplicated mission for the next gate', async () => {
  const path = await tempLedger();
  const created = await createCandidate(path, {
    title: 'Candidate', expression: 'f(n)=n', domain: 'n entier', classification: 'RELATION_CANDIDATE',
  });
  for (const gate of ['OBSERVED', 'PROVENANCE', 'COUNTER_TESTED', 'REPRODUCED']) {
    await setCandidateGate(path, {
      candidate_id: created.candidate_id,
      gate,
      value: true,
      note: gate === 'OBSERVED' ? '' : `trace-${gate}`,
    });
  }

  const first = await dispatchEvaluationTasks(path, { maxNew: 4 });
  assert.equal(first.created.length, 1);
  const second = await dispatchEvaluationTasks(path, { maxNew: 4 });
  assert.equal(second.created.length, 0);

  const state = reduceQueenState(await readQueenEvents(path));
  const c = state.candidates.find((item) => item.candidate_id === created.candidate_id);
  const task = state.tasks.find((item) => item.target === created.candidate_id);
  assert.equal(c.evaluation.next_action.gate, 'PRIOR_ART_CHECKED');
  assert.equal(task.kind, 'RESEARCH');
  assert.equal(task.payload.evaluation_gate, 'PRIOR_ART_CHECKED');
  assert.equal(task.payload.auto_gate_promotion, false);
  assert.equal(summarizeEvaluations(state.candidates).needing_prior_art, 1);
});
