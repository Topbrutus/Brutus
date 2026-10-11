import test from 'node:test';
import assert from 'node:assert/strict';
import { readPellArchive, readZelArchive } from '../src/archive-sources.mjs';

test('Pell archive adapter preserves counter-test and proof boundaries', async () => {
  const pell = await readPellArchive();
  assert.equal(pell.available, true);
  assert.equal(pell.source_mode, 'ARCHIVE_READ_ONLY');
  assert.equal(pell.relation, 'P_(q^2) / P_q');
  assert.equal(pell.domain, 'odd prime');
  assert.equal(pell.verdict, 'PASS');
  assert.equal(pell.evidence_level, 'COUNTER_TEST_RESULT');
  assert.equal(pell.proof_ref, null);
  assert.equal(pell.auto_proof_promotion, false);
  assert.equal(pell.witness.q, 47);
  assert.equal(pell.witness.exact_rank, 2209);
  assert.equal(pell.witness.expected_rank, 2209);
  assert.equal(pell.witness.primality_verified, true);
});

test('ZEL archive adapter exposes recorded machine result without proof promotion', async () => {
  const zel = await readZelArchive();
  assert.equal(zel.available, true);
  assert.equal(zel.source_mode, 'ARCHIVE_READ_ONLY');
  assert.deepEqual(zel.inputs, [369, 396]);
  assert.equal(zel.verdict, 'PASS');
  assert.equal(zel.evidence_level, 'COUNTER_TEST_RESULT');
  assert.equal(zel.proof_ref, null);
  assert.equal(zel.auto_proof_promotion, false);
  assert.equal(zel.comparison.branches_equal, 0);
  assert.equal(zel.comparison.branches_different, 1296);
  assert.equal(zel.comparison.total, 1296);
  assert.equal(zel.machine.inverse_369, '1296/1296');
  assert.equal(zel.machine.inverse_396, '1296/1296');
});
