import test from 'node:test';
import assert from 'node:assert/strict';
import { readBrotoculateur } from '../src/brotoculateur.mjs';

test('reads and normalizes a read-only Brotoculateur source', async () => {
  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({ state: 'RUNNING', counters: { processed_packets: 12, crystals: 7, canonical_formulas: 3 } }),
  });
  const result = await readBrotoculateur({ fetchImpl: fakeFetch, endpoints: ['http://example.test/api/status'] });
  assert.equal(result.reachable, true);
  assert.equal(result.state, 'RUNNING');
  assert.equal(result.processed_packets, 12);
  assert.equal(result.crystals, 7);
});

test('normalizes current Brotoculateur nested crystal, Papillon and sentinel data', async () => {
  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({
      run_id: 'run-test',
      state: 'RUNNING',
      seeds: ['343', '703', '2701', '6337', '11611'],
      processed_packets: 1226140,
      papillon: {
        enabled: true,
        cache_hit_rate: 0.996297,
        overall_logical_to_physical_ratio: 270.018719,
        equivalent_heavy_work_avoided: 273054,
        trace_preserved: true,
        proof_promotion: false,
      },
      brutomagique: { total_crystals: 715705 },
      sentinels: {
        targets: [
          { label: 'q=47', hits: 1502, survived: true },
          { label: 'q=71', hits: 4785, survived: true },
          { label: 'q=83', hits: 288, survived: true },
        ],
      },
    }),
  });
  const result = await readBrotoculateur({ fetchImpl: fakeFetch, endpoints: ['http://example.test/api/status'] });
  assert.equal(result.crystals, 715705);
  assert.equal(result.active_seeds, 5);
  assert.equal(result.papillon.enabled, true);
  assert.equal(result.papillon.cache_hit_rate, 0.996297);
  assert.equal(result.papillon.logical_to_physical_ratio, 270.018719);
  assert.deepEqual(result.sentinels, { total: 3, survived: 3, hits: 6575 });
});

test('source failure stays offline rather than inventing values', async () => {
  const fakeFetch = async () => { throw new Error('offline'); };
  const result = await readBrotoculateur({ fetchImpl: fakeFetch, endpoints: ['http://example.test/api/status'] });
  assert.equal(result.reachable, false);
  assert.equal(result.state, 'OFFLINE');
  assert.equal(result.crystals, null);
  assert.equal(result.papillon.enabled, null);
  assert.deepEqual(result.sentinels, { total: 0, survived: 0, hits: 0 });
});
