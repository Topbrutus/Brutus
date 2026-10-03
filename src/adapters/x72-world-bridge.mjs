const QUEEN_SOURCE = "QUEEN_SERVER_V0_2";
const CLOCK_SCHEMA = "BRUTUS-CLOCK-OBSERVATION-v0.1";
const STATE_ENDPOINTS = new Set([
  "/api/state",
  "/ws",
  "/api/live-transport/state"
]);

function reject(reason) {
  throw new Error("X72_WORLD_BRIDGE_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isSha256(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function validUtc(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function normalizeClockObservation(envelope) {
  if (!isPlainObject(envelope)) reject("ObservationEnvelope must be a plain object");

  if (!["FRESH", "STALE"].includes(envelope.status)) {
    reject("observation status must be FRESH or STALE");
  }
  if (envelope.source_schema !== QUEEN_SOURCE) reject("unexpected source_schema");
  if (!STATE_ENDPOINTS.has(envelope.source_endpoint)) reject("unsupported source_endpoint");
  if (typeof envelope.entity_id !== "string" || envelope.entity_id.length === 0) {
    reject("missing entity_id");
  }
  if (!Number.isInteger(envelope.freshness_ms) || envelope.freshness_ms < 0) {
    reject("freshness_ms must be a non-negative integer");
  }
  if (!validUtc(envelope.observed_at_utc)) reject("invalid observed_at_utc");
  if (typeof envelope.condition !== "string" || envelope.condition.length === 0) {
    reject("missing condition");
  }

  const payload = envelope.payload;
  if (!isPlainObject(payload)) reject("state payload is required");
  if (payload.source !== QUEEN_SOURCE) reject("unexpected payload source");
  if (payload.entity_id !== envelope.entity_id) reject("entity_id mismatch");
  if (!Number.isInteger(payload.tick_count) || payload.tick_count < 0) {
    reject("tick_count must be a non-negative integer");
  }
  if (!Number.isInteger(payload.generation) || payload.generation < 0) {
    reject("generation must be a non-negative integer");
  }
  if (typeof payload.queen_mode !== "string" || payload.queen_mode.length === 0) {
    reject("missing queen_mode");
  }
  if (typeof payload.integrity_match !== "boolean") reject("missing integrity_match");
  if (!isSha256(payload.reference_h256)) reject("invalid reference_h256");

  return Object.freeze({
    SCHEMA: CLOCK_SCHEMA,
    SOURCE_SCHEMA: QUEEN_SOURCE,
    SOURCE_ENDPOINT: envelope.source_endpoint,
    ENTITY_ID: envelope.entity_id,
    TICK: payload.tick_count,
    GENERATION: payload.generation,
    QUEEN_MODE: payload.queen_mode,
    INTEGRITY_MATCH: payload.integrity_match,
    REFERENCE_H256: payload.reference_h256,
    OBSERVED_AT_UTC: envelope.observed_at_utc,
    FRESHNESS_MS: envelope.freshness_ms,
    STATUS: envelope.status,
    CONDITION: envelope.condition
  });
}

export function buildWorldTransportRequest({
  observation,
  antId,
  from,
  to,
  state = null,
  proofRef,
  echo = null
}) {
  if (!isPlainObject(observation) || observation.SCHEMA !== CLOCK_SCHEMA) {
    reject("normalized clock observation is required");
  }
  if (observation.STATUS !== "FRESH") {
    reject("world transport requires a FRESH clock observation");
  }
  if (observation.INTEGRITY_MATCH !== true) {
    reject("world transport requires Queen integrity_match=true");
  }
  if (typeof antId !== "string" || antId.length === 0) reject("explicit antId is required");
  if (antId === observation.ENTITY_ID) {
    reject("antId must not reuse Queen ENTITY_ID");
  }
  if (typeof from !== "string" || from.length === 0) reject("from is required");
  if (typeof to !== "string" || to.length === 0) reject("to is required");
  if (typeof proofRef !== "string" || proofRef.length === 0) reject("proofRef is required");

  return Object.freeze({
    antId,
    from,
    to,
    tick: observation.TICK,
    state,
    proofRef,
    echo
  });
}

export const BRUTUS_CLOCK_SCHEMA = CLOCK_SCHEMA;
