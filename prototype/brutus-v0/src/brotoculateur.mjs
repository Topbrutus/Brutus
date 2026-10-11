const DEFAULT_ENDPOINTS = [
  'http://127.0.0.1:8781/api/status',
  'http://127.0.0.1:8778/api/status',
];

function normalizeStatus(raw, endpoint) {
  const counters = raw?.counters || raw?.stats || raw || {};
  const brutomagique = raw?.brutomagique || {};
  const papillon = raw?.papillon || {};
  const sentinelTargets = Array.isArray(raw?.sentinels?.targets) ? raw.sentinels.targets : [];

  return {
    reachable: true,
    endpoint,
    state: raw?.state || raw?.status || 'ONLINE',
    run_id: raw?.run_id ?? null,
    processed_packets: counters.processed_packets ?? counters.processed ?? null,
    crystals: counters.crystals ?? counters.crystal_count ?? brutomagique.total_crystals ?? null,
    active_seeds: Array.isArray(raw?.seeds) ? raw.seeds.length : null,
    canonical_formulas: counters.canonical_formulas ?? counters.formulas_canonical ?? null,
    authenticated_formulas: counters.authenticated_formulas ?? counters.authenticated_formula_scopes ?? null,
    papillon: {
      enabled: papillon.enabled ?? null,
      cache_hit_rate: papillon.cache_hit_rate ?? null,
      logical_to_physical_ratio: papillon.overall_logical_to_physical_ratio ?? papillon.cacheable_logical_to_physical_ratio ?? null,
      heavy_work_avoided: papillon.equivalent_heavy_work_avoided ?? null,
      trace_preserved: papillon.trace_preserved ?? null,
      proof_promotion: papillon.proof_promotion ?? null,
    },
    sentinels: {
      total: sentinelTargets.length,
      survived: sentinelTargets.filter((target) => target?.survived === true).length,
      hits: sentinelTargets.reduce((sum, target) => sum + (Number(target?.hits) || 0), 0),
    },
    latest_formula_id: raw?.latest_formula_id ?? raw?.zel?.latest_formula_id ?? null,
    relation: raw?.relation ?? raw?.zel?.relation ?? null,
    provenance_hash: raw?.provenance_hash ?? raw?.zel?.provenance_hash ?? null,
    last_save: raw?.last_save ?? null,
  };
}

export async function readBrotoculateur({ fetchImpl = fetch, endpoints } = {}) {
  const configured = process.env.BRUTUS_BROTO_URL ? [process.env.BRUTUS_BROTO_URL] : null;
  const candidates = endpoints || configured || DEFAULT_ENDPOINTS;
  const failures = [];
  for (const endpoint of candidates) {
    try {
      const response = await fetchImpl(endpoint, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(1200),
      });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      return normalizeStatus(await response.json(), endpoint);
    } catch (error) {
      failures.push({ endpoint, error: String(error?.message || error) });
    }
  }
  return {
    reachable: false,
    endpoint: null,
    state: 'OFFLINE',
    failures,
    run_id: null,
    processed_packets: null,
    crystals: null,
    active_seeds: null,
    canonical_formulas: null,
    authenticated_formulas: null,
    papillon: {
      enabled: null,
      cache_hit_rate: null,
      logical_to_physical_ratio: null,
      heavy_work_avoided: null,
      trace_preserved: null,
      proof_promotion: null,
    },
    sentinels: { total: 0, survived: 0, hits: 0 },
    latest_formula_id: null,
    relation: null,
    provenance_hash: null,
    last_save: null,
  };
}
