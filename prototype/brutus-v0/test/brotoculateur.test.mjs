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

test('source failure stays offline rather than inventing values', async () => {
  const fakeFetch = async () => { throw new Error('offline'); };
  const result = await readBrotoculateur({ fetchImpl: fakeFetch, endpoints: ['http://example.test/api/status'] });
  assert.equal(result.reachable, false);
  assert.equal(result.state, 'OFFLINE');
  assert.equal(result.crystals, null);
});
