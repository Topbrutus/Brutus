import { sha256HexUtf8 } from "./sha256-utf8.mjs";
import { createMathInputPacket } from "./math-input-bus.mjs";

const ADAPTER = "BROToculateur_INPUT_ADAPTER";
const ADAPTER_VERSION = "0.1";

function reject(reason) {
  throw new Error("BROTOCULATEUR_INPUT_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function boundedString(value, label, max = 4096) {
  if (typeof value !== "string" || value.length < 1 || value.length > max) {
    reject(label + " must be a bounded string");
  }
  return value;
}

function count(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) reject(label + " must be a non-negative safe integer");
  return value;
}

function scalar(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return value;
  }
  return String(value);
}

function itemId(prefix, seed) {
  const h = sha256HexUtf8(String(seed)).slice(0, 20).toUpperCase();
  return `${prefix}-${h}`;
}

function normalizeLastTrace(value) {
  if (!isPlainObject(value)) return null;
  return {
    INPUT: scalar(value.INPUT ?? null),
    OUTPUT: scalar(value.OUTPUT ?? null),
    FORMULE: scalar(value.FORMULE ?? null),
    PARENT: scalar(value.PARENT ?? null),
    BRANCHE: scalar(value.BRANCHE ?? null),
    RONDE: scalar(value.RONDE ?? null),
    TRACE: scalar(value.TRACE ?? null)
  };
}

function normalizeLastProof(value) {
  if (!isPlainObject(value)) return null;
  return {
    trace_id: scalar(value.trace_id ?? null),
    proof_id: scalar(value.proof_id ?? null),
    valid: scalar(value.valid ?? null),
    reason: scalar(value.reason ?? null),
    expected_output: scalar(value.expected_output ?? null)
  };
}

function sourceSnapshot(status) {
  const b = status.brutaux_symbolic;
  return {
    run_id: status.run_id,
    state: status.state,
    round_index: status.round_index ?? null,
    formula_ids: Array.isArray(status.formula_ids) ? [...status.formula_ids] : [],
    brutaux_symbolic: {
      seven_fields: Array.isArray(b.seven_fields) ? [...b.seven_fields] : [],
      canonical_formulas: b.canonical_formulas,
      authenticated_formulas: b.authenticated_formulas,
      testing_formulas: b.testing_formulas,
      rejected_formulas: b.rejected_formulas,
      candidate_formulas: b.candidate_formulas,
      traces_total: b.traces_total,
      proofs_total: b.proofs_total,
      proofs_valid: b.proofs_valid,
      proofs_invalid: b.proofs_invalid,
      reconstructed_supports: b.reconstructed_supports,
      failed_supports: b.failed_supports,
      tracker_sources: b.tracker_sources,
      recycle_emitted: b.recycle_emitted,
      sample_formula: b.sample_formula ?? null,
      sample_hash: b.sample_hash ?? null,
      sample_bindings: Array.isArray(b.sample_bindings) ? [...b.sample_bindings] : [],
      last_trace: normalizeLastTrace(b.last_trace),
      last_proof: normalizeLastProof(b.last_proof)
    },
    zel_bridge: isPlainObject(status.zel_bridge)
      ? {
          source_url: status.zel_bridge.source_url ?? null,
          latest: isPlainObject(status.zel_bridge.latest)
            ? JSON.parse(JSON.stringify(status.zel_bridge.latest))
            : null,
          remote_write_enabled: status.zel_bridge.remote_write_enabled ?? null
        }
      : null
  };
}

function formulaSampleItem(b) {
  if (typeof b.sample_formula !== "string" || b.sample_formula.length === 0) return null;
  return {
    ITEM_ID: itemId("MATHITEM-SAMPLE", `${b.sample_formula}|${b.sample_hash ?? ""}`),
    KIND: "FORMULA_OBSERVATION",
    EXPRESSION: boundedString(b.sample_formula, "sample_formula"),
    SOURCE_STATUS: "OBSERVED_CANONICAL_SAMPLE",
    BINDINGS: Array.isArray(b.sample_bindings)
      ? b.sample_bindings.slice(0, 64).map(value => boundedString(String(value), "sample_binding", 512))
      : [],
    EVIDENCE: {
      SOURCE_TRACE_REF: isPlainObject(b.last_trace) && b.last_trace.TRACE != null
        ? String(b.last_trace.TRACE)
        : null,
      SOURCE_PROOF_REF: isPlainObject(b.last_proof) && b.last_proof.proof_id != null
        ? String(b.last_proof.proof_id)
        : null,
      SOURCE_HASH_REF: b.sample_hash == null ? null : String(b.sample_hash),
      SUPPORT_COUNT: count(b.reconstructed_supports, "reconstructed_supports"),
      TEST_COUNT: count(b.proofs_valid, "proofs_valid"),
      REPLAY_STATUS: isPlainObject(b.last_proof) && typeof b.last_proof.reason === "string"
        ? b.last_proof.reason
        : "SOURCE_STATUS_ONLY"
    },
    PROVENANCE: {
      source_component: "BRUTOPRESSEUR/BRUTOPREUVEUR",
      source_formula_hash_ref: b.sample_hash == null ? null : String(b.sample_hash),
      authenticated_formula_count: b.authenticated_formulas,
      canonical_formula_count: b.canonical_formulas
    }
  };
}

function zelItem(status) {
  const bridge = status.zel_bridge;
  if (!isPlainObject(bridge) || !isPlainObject(bridge.latest)) return null;
  const latest = bridge.latest;
  if (typeof latest.relation !== "string" || latest.relation.length === 0) return null;

  return {
    ITEM_ID: itemId(
      "MATHITEM-ZEL",
      `${latest.formula_id ?? ""}|${latest.provenance_hash ?? ""}|${latest.relation}`
    ),
    KIND: "FORMULA_CAPSULE",
    EXPRESSION: boundedString(latest.relation, "zel_bridge.latest.relation"),
    SOURCE_STATUS: typeof latest.source_status === "string"
      ? `SOURCE_${latest.source_status}`
      : "SOURCE_STATUS_UNKNOWN",
    BINDINGS: latest.observed_parameter != null
      ? [
          `${String(latest.observed_parameter)}=${String(latest.observed_parameter_value)}`,
          `observed_value=${String(latest.observed_value)}`
        ]
      : [],
    EVIDENCE: {
      SOURCE_TRACE_REF: null,
      SOURCE_PROOF_REF: null,
      SOURCE_HASH_REF: latest.provenance_hash == null ? null : String(latest.provenance_hash),
      SUPPORT_COUNT: 0,
      TEST_COUNT: Number.isSafeInteger(latest.test_count) && latest.test_count >= 0
        ? latest.test_count
        : 0,
      REPLAY_STATUS: typeof bridge.last_status === "string"
        ? bridge.last_status
        : "SOURCE_STATUS_ONLY"
    },
    PROVENANCE: {
      source: scalar(latest.source ?? null),
      formula_id: scalar(latest.formula_id ?? null),
      source_commit: scalar(latest.source_commit ?? null),
      source_mode: scalar(latest.source_mode ?? null),
      source_read_only: scalar(latest.source_read_only ?? null),
      global_error_exact: scalar(latest.global_error_exact ?? null),
      provenance_hash: scalar(latest.provenance_hash ?? null),
      compiler_kind: scalar(latest.compiler_kind ?? null),
      executable_at_source: scalar(latest.executable ?? null)
    }
  };
}

export function adaptBrotoculateurStatus(status, { queenTick = null } = {}) {
  if (!isPlainObject(status)) reject("status must be a plain object");
  boundedString(status.run_id, "run_id", 200);
  if (!isPlainObject(status.brutaux_symbolic)) reject("missing brutaux_symbolic");

  const b = status.brutaux_symbolic;
  const requiredCounts = [
    "canonical_formulas",
    "authenticated_formulas",
    "testing_formulas",
    "rejected_formulas",
    "candidate_formulas",
    "traces_total",
    "proofs_total",
    "proofs_valid",
    "proofs_invalid",
    "reconstructed_supports",
    "failed_supports",
    "tracker_sources",
    "recycle_emitted"
  ];
  for (const key of requiredCounts) count(b[key], "brutaux_symbolic." + key);

  const snapshot = sourceSnapshot(status);
  const items = [formulaSampleItem(b), zelItem(status)].filter(Boolean);

  const packetSeed = sha256HexUtf8(
    JSON.stringify({
      run_id: status.run_id,
      traces_total: b.traces_total,
      proofs_total: b.proofs_total,
      sample_hash: b.sample_hash ?? null,
      zel_provenance_hash: status.zel_bridge?.latest?.provenance_hash ?? null
    })
  ).slice(0, 24).toUpperCase();

  return createMathInputPacket({
    packetId: `MIP-BROTOCULATEUR-${packetSeed}`,
    source: {
      SYSTEM: "BROToculateur",
      ADAPTER,
      ADAPTER_VERSION,
      SOURCE_RUN_ID: status.run_id,
      SOURCE_ENDPOINT: "/api/status",
      ACCESS_MODE: "READ_ONLY",
      SOURCE_STATE: typeof status.state === "string" ? status.state : "UNKNOWN"
    },
    sourceSnapshot: snapshot,
    summary: {
      CANONICAL_FORMULAS: b.canonical_formulas,
      AUTHENTICATED_FORMULAS: b.authenticated_formulas,
      TESTING_FORMULAS: b.testing_formulas,
      REJECTED_FORMULAS: b.rejected_formulas,
      CANDIDATE_FORMULAS: b.candidate_formulas,
      TRACES_TOTAL: b.traces_total,
      PROOFS_TOTAL: b.proofs_total,
      PROOFS_VALID: b.proofs_valid,
      PROOFS_INVALID: b.proofs_invalid,
      RECONSTRUCTED_SUPPORTS: b.reconstructed_supports,
      FAILED_SUPPORTS: b.failed_supports,
      TRACKER_SOURCES: b.tracker_sources,
      RECYCLE_EMITTED: b.recycle_emitted
    },
    items,
    queenTick
  });
}

export const BRUTUS_BROTOCULATEUR_INPUT_ADAPTER = ADAPTER;
export const BRUTUS_BROTOCULATEUR_INPUT_ADAPTER_VERSION = ADAPTER_VERSION;
