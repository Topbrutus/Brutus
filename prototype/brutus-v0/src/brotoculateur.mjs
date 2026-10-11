const DEFAULT_ENDPOINTS = [
  'http://127.0.0.1:8781/api/status',
  'http://127.0.0.1:8778/api/status',
];

function normalizeStatus(raw, endpoint) {
  const counters = raw?.counters || raw?.stats || raw || {};
  return {
    reachable: true,
    endpoint,
    state: raw?.state || raw?.status || 'ONLINE',
    processed_packets: counters.processed_packets ?? counters.processed ?? null,
    crystals: counters.crystals ?? counters.crystal_count ?? null,
    canonical_formulas: counters.canonical_formulas ?? counters.formulas_canonical ?? null,
    authenticated_formulas: counters.authenticated_formulas ?? counters.authenticated_formula_scopes ?? null,
    latest_formula_id: raw?.latest_formula_id ?? raw?.zel?.latest_formula_id ?? null,
    relation: raw?.relation ?? raw?.zel?.relation ?? null,
    provenance_hash: raw?.provenance_hash ?? raw?.zel?.provenance_hash ?? null,
    raw,
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
    processed_packets: null,
    crystals: null,
    canonical_formulas: null,
    authenticated_formulas: null,
    latest_formula_id: null,
    relation: null,
    provenance_hash: null,
  };
}
