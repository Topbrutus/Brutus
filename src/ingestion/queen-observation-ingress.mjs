import { normalizeClockObservation } from "../adapters/x72-world-bridge.mjs";

const INGRESS_SCHEMA = "BRUTUS-QUEEN-INGRESS-v0.1";
const QUEEN_SOURCE = "QUEEN_SERVER_V0_2";
const STATE_ENDPOINTS = new Set(["/api/state", "/ws"]);
const RETRYABLE_STATUS = new Set(["STALE", "UNKNOWN"]);

function reject(reason) {
  throw new Error("QUEEN_INGRESS_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function freezeResult(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) freezeResult(item);
  }
  return value;
}

function validateUnknownEnvelope(envelope) {
  if (!isPlainObject(envelope)) reject("ObservationEnvelope must be a plain object");
  if (envelope.status !== "UNKNOWN") reject("expected UNKNOWN status");
  if (envelope.source_schema !== QUEEN_SOURCE) reject("unexpected source_schema");
  if (!STATE_ENDPOINTS.has(envelope.source_endpoint)) reject("unsupported source_endpoint");
  if (envelope.entity_id !== null && envelope.entity_id !== undefined) {
    if (typeof envelope.entity_id !== "string" || envelope.entity_id.length === 0) {
      reject("invalid entity_id");
    }
  }
  if (typeof envelope.condition !== "string" || envelope.condition.length === 0) {
    reject("missing condition");
  }
}

function retryDelay(attempt, baseDelayMs, maxDelayMs) {
  return Math.min(maxDelayMs, baseDelayMs * (2 ** Math.max(0, attempt - 1)));
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createQueenObservationIngress() {
  let entityId = null;
  let lastObservation = null;

  function enforceIdentity(candidate) {
    if (candidate === null || candidate === undefined) return;
    if (entityId !== null && entityId !== candidate) {
      reject(`ENTITY_CONTINUITY_VIOLATION: ${entityId} -> ${candidate}`);
    }
    if (entityId === null) entityId = candidate;
  }

  function accept(envelope) {
    if (!isPlainObject(envelope)) reject("ObservationEnvelope must be a plain object");

    if (envelope.status === "UNKNOWN") {
      validateUnknownEnvelope(envelope);
      enforceIdentity(envelope.entity_id ?? null);

      const result = freezeResult({
        SCHEMA: INGRESS_SCHEMA,
        STATUS: "UNKNOWN",
        CONDITION: envelope.condition,
        ENTITY_ID: entityId,
        SOURCE_ENDPOINT: envelope.source_endpoint,
        USABLE: false,
        REASON: "UNKNOWN",
        CLOCK: null
      });
      lastObservation = result;
      return result;
    }

    const clock = normalizeClockObservation(envelope);
    enforceIdentity(clock.ENTITY_ID);

    let usable = false;
    let reason = "STALE";
    if (clock.STATUS === "FRESH" && clock.INTEGRITY_MATCH === true) {
      usable = true;
      reason = "READY";
    } else if (clock.STATUS === "FRESH") {
      reason = "INTEGRITY_MISMATCH";
    }

    const result = freezeResult({
      SCHEMA: INGRESS_SCHEMA,
      STATUS: clock.STATUS,
      CONDITION: clock.CONDITION,
      ENTITY_ID: clock.ENTITY_ID,
      SOURCE_ENDPOINT: clock.SOURCE_ENDPOINT,
      USABLE: usable,
      REASON: reason,
      CLOCK: clock
    });
    lastObservation = result;
    return result;
  }

  async function readUsable(
    readObservation,
    {
      maxAttempts = 3,
      baseDelayMs = 50,
      maxDelayMs = 250,
      sleep = defaultSleep
    } = {}
  ) {
    if (typeof readObservation !== "function") reject("readObservation function is required");
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
      reject("maxAttempts must be an integer from 1 to 10");
    }
    if (!Number.isInteger(baseDelayMs) || baseDelayMs < 0) {
      reject("baseDelayMs must be a non-negative integer");
    }
    if (!Number.isInteger(maxDelayMs) || maxDelayMs < baseDelayMs) {
      reject("maxDelayMs must be an integer >= baseDelayMs");
    }
    if (typeof sleep !== "function") reject("sleep function is required");

    let lastError = null;
    let lastResult = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const envelope = await readObservation();
        lastResult = accept(envelope);

        if (lastResult.USABLE) {
          return freezeResult({ ...lastResult, ATTEMPTS: attempt });
        }

        if (lastResult.REASON === "INTEGRITY_MISMATCH") {
          throw new Error("QUEEN_INGRESS_DENIED: integrity_match=false");
        }

        if (!RETRYABLE_STATUS.has(lastResult.STATUS)) {
          throw new Error(`QUEEN_INGRESS_DENIED: non-retryable status ${lastResult.STATUS}`);
        }
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.startsWith("QUEEN_INGRESS_REJECTED:") ||
            error.message.startsWith("QUEEN_INGRESS_DENIED:"))
        ) {
          throw error;
        }
        lastError = error;
      }

      if (attempt < maxAttempts) {
        await sleep(retryDelay(attempt, baseDelayMs, maxDelayMs));
      }
    }

    if (lastResult !== null) {
      throw new Error(
        `QUEEN_INGRESS_NOT_USABLE: status=${lastResult.STATUS} reason=${lastResult.REASON} attempts=${maxAttempts}`
      );
    }

    const detail = lastError instanceof Error ? lastError.message : String(lastError ?? "unknown read failure");
    throw new Error(`QUEEN_INGRESS_UNAVAILABLE: attempts=${maxAttempts} last_error=${detail}`);
  }

  return Object.freeze({
    accept,
    readUsable,
    get entityId() {
      return entityId;
    },
    get lastObservation() {
      return lastObservation;
    }
  });
}

export const BRUTUS_QUEEN_INGRESS_SCHEMA = INGRESS_SCHEMA;
