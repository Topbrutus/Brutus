const CARD_SOURCE = "ASTRA_STATION";
const CARD_TARGET = "QUEEN_CLOCK";
const ALLOWED_READ = new Set(["queen.clock"]);
const ALLOWED_MEASURE = new Set([
  "identity_continuity",
  "freshness_status",
  "integrity_match"
]);
const ALLOWED_RETURN = new Set([
  "entity_id",
  "tick",
  "generation",
  "queen_mode",
  "reference_h256",
  "observed_at_utc",
  "freshness_ms",
  "status",
  "condition"
]);

function reject(reason) {
  throw new Error("VERSO_QUEEN_CLOCK_REJECTED: " + reason);
}

function assertStringArray(value, field, allowed) {
  if (!Array.isArray(value)) reject(field + " must be an array");
  for (const item of value) {
    if (!allowed.has(item)) reject(field + " contains unsupported item " + String(item));
  }
}

function pickClock(clock, requested) {
  const map = {
    entity_id: clock.ENTITY_ID,
    tick: clock.TICK,
    generation: clock.GENERATION,
    queen_mode: clock.QUEEN_MODE,
    reference_h256: clock.REFERENCE_H256,
    observed_at_utc: clock.OBSERVED_AT_UTC,
    freshness_ms: clock.FRESHNESS_MS,
    status: clock.STATUS,
    condition: clock.CONDITION
  };

  const out = {};
  for (const key of requested) out[key] = map[key];
  return Object.freeze(out);
}

export function createVersoQueenClockAdapter({
  ingress,
  readObservation,
  retryPolicy = {}
}) {
  if (!ingress || typeof ingress.readUsable !== "function") {
    reject("QueenObservationIngress is required");
  }
  if (typeof readObservation !== "function") {
    reject("readObservation function is required");
  }

  return async function versoQueenClockAdapter(request) {
    if (!request || typeof request !== "object") reject("request is required");
    if (request.source !== CARD_SOURCE) reject("unexpected source");
    if (request.target !== CARD_TARGET) reject("unexpected target");
    if (request.values === null || typeof request.values !== "object" || Array.isArray(request.values)) {
      reject("values must be a plain data object");
    }
    if (Object.keys(request.values).length !== 0) {
      reject("v0.1 Queen clock card accepts no mutable VALUES");
    }

    assertStringArray(request.read, "READ", ALLOWED_READ);
    assertStringArray(request.measure, "MEASURE", ALLOWED_MEASURE);
    assertStringArray(request.returnData, "RETURN_DATA", ALLOWED_RETURN);

    if (!request.read.includes("queen.clock")) reject("READ must include queen.clock");
    if (!request.measure.includes("integrity_match")) reject("MEASURE must include integrity_match");
    if (!request.measure.includes("identity_continuity")) reject("MEASURE must include identity_continuity");
    if (!request.measure.includes("freshness_status")) reject("MEASURE must include freshness_status");

    const accepted = await ingress.readUsable(readObservation, retryPolicy);
    const clock = accepted.CLOCK;

    return Object.freeze({
      SOURCE: CARD_SOURCE,
      TARGET: CARD_TARGET,
      INGRESS_SCHEMA: accepted.SCHEMA,
      ATTEMPTS: accepted.ATTEMPTS,
      USABLE: true,
      DATA: pickClock(clock, request.returnData),
      PROOF: Object.freeze({
        identity_continuity: true,
        freshness_status: clock.STATUS,
        integrity_match: clock.INTEGRITY_MATCH,
        source_endpoint: clock.SOURCE_ENDPOINT
      })
    });
  };
}

export const BRUTUS_VERSO_QUEEN_CLOCK_TARGET = CARD_TARGET;
