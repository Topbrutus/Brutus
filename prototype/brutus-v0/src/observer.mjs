import { appendQueenEvent, readQueenEvents } from './queen-ledger.mjs';
import { readBrotoculateur } from './brotoculateur.mjs';

function snapshot(b) {
  return {
    state: b.state,
    processed_packets: b.processed_packets,
    crystals: b.crystals,
    active_seeds: b.active_seeds,
    papillon_cache_hit_rate: b.papillon?.cache_hit_rate ?? null,
    papillon_ratio: b.papillon?.logical_to_physical_ratio ?? null,
    sentinels_total: b.sentinels?.total ?? 0,
    sentinels_survived: b.sentinels?.survived ?? 0,
    sentinel_hits: b.sentinels?.hits ?? 0,
    run_id: b.run_id ?? null,
  };
}

function delta(current, previous, key) {
  const a = Number(current?.[key]);
  const b = Number(previous?.[key]);
  return Number.isFinite(a) && Number.isFinite(b) ? a - b : null;
}

export async function observeOnce(path, { readSource = readBrotoculateur } = {}) {
  const source = await readSource();
  if (!source.reachable) return { recorded: false, reason: 'SOURCE_OFFLINE', source };

  const events = await readQueenEvents(path);
  const last = [...events].reverse().find((event) => event.type === 'OBSERVATION' && event.module === 'BROTOCULATEUR');
  const current = snapshot(source);
  const previous = last?.snapshot ?? null;
  if (previous && current.run_id === previous.run_id && current.processed_packets === previous.processed_packets && current.crystals === previous.crystals && current.sentinel_hits === previous.sentinel_hits) {
    return { recorded: false, reason: 'NO_SIGNIFICANT_CHANGE', source };
  }

  const event = await appendQueenEvent(path, {
    type: 'OBSERVATION',
    module: 'BROTOCULATEUR',
    source: 'LIVE_READ_ONLY',
    evidence_class: 'LIVE_OBSERVATION',
    endpoint: source.endpoint,
    snapshot: current,
    deltas: previous ? {
      processed_packets: delta(current, previous, 'processed_packets'),
      crystals: delta(current, previous, 'crystals'),
      sentinel_hits: delta(current, previous, 'sentinel_hits'),
    } : null,
  });
  return { recorded: true, event, source };
}

export function startQueenObserver(path, { intervalMs = 30_000, readSource = readBrotoculateur, onError = console.error } = {}) {
  let busy = false;
  const run = async () => {
    if (busy) return;
    busy = true;
    try { await observeOnce(path, { readSource }); }
    catch (error) { onError(error); }
    finally { busy = false; }
  };
  run();
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
