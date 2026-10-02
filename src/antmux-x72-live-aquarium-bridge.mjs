import {
  computeRealMechanismEventSignature,
  validateRealMechanismEvent
} from "./real-mechanism-event.mjs";

const SOURCE_SCHEMA = "QUEEN_SERVER_V0_2";
const NOYAU_AUTHORITY = "NOYAU_ENGINE_HEADLESS";
const NOYAU_SCHEMA = "ANTMUX-X72-NOYAU-DYNAMIC-v0.2";
const DEFAULT_ENDPOINT = "/laboratoire/embryon-x72/ws";
const TAU = Math.PI * 2;

function reject(reason) {
  throw new Error("ANTMUX_X72_LIVE_BRIDGE_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isH256(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value);
}

function radToDeg(value) {
  const raw = (value * 180) / Math.PI;
  const normalized = ((raw % 360) + 360) % 360;
  return Number(normalized.toFixed(9));
}

function validateFrame(frame) {
  if (!isPlainObject(frame)) reject("frame must be a plain object");
  if (frame.source !== SOURCE_SCHEMA) reject("unexpected frame source");
  if (frame.integrity_match !== true) reject("integrity_match must be true");

  if (!Number.isSafeInteger(frame.tick_count) || frame.tick_count < 0) {
    reject("tick_count must be a non-negative safe integer");
  }
  if (typeof frame.entity_id !== "string" || frame.entity_id.length === 0) {
    reject("entity_id is required");
  }

  const wrap = frame.noyau_runtime;
  if (!isPlainObject(wrap)) reject("noyau_runtime is required");
  if (wrap.authority !== NOYAU_AUTHORITY) reject("unexpected noyau authority");

  const noyau = wrap.noyau;
  if (!isPlainObject(noyau)) reject("noyau_runtime.noyau is required");
  if (noyau.schema !== NOYAU_SCHEMA) reject("unexpected noyau schema");
  if (!Number.isSafeInteger(noyau.tick) || noyau.tick < 0) {
    reject("noyau.tick must be a non-negative safe integer");
  }
  if (noyau.tick !== frame.tick_count) {
    reject("Queen tick and noyau tick must match exactly");
  }
  if (!isH256(noyau.whole_h256)) reject("noyau.whole_h256 must be SHA-256 hex");

  for (const [name, value] of [
    ["phase_left", noyau.phase_left],
    ["phase_right", noyau.phase_right]
  ]) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      reject(name + " must be finite");
    }
    if (value < 0 || value >= TAU + 1e-9) {
      reject(name + " must be in [0,2π)");
    }
  }

  return {
    source: frame.source,
    entityId: frame.entity_id,
    tick: frame.tick_count,
    wholeH256: noyau.whole_h256.toLowerCase(),
    phaseLeftRad: noyau.phase_left,
    phaseRightRad: noyau.phase_right,
    phaseLeftDeg: radToDeg(noyau.phase_left),
    phaseRightDeg: radToDeg(noyau.phase_right),
    worldIndex: Number.isInteger(noyau.world_index) ? noyau.world_index : null,
    worldName: typeof noyau.world_name === "string" ? noyau.world_name : null
  };
}

function eventId(tick, side) {
  return "RME-T" + tick + "-X72-" + side + "-WHEEL";
}

function traceId(tick, side) {
  return "TRACE-X72-NOYAU-" + side + "-T" + tick;
}

function makeObservationId(current, side) {
  return (
    "OBS-X72-T" + current.tick +
    "-" + side +
    "-" + current.wholeH256.slice(0, 12).toUpperCase()
  );
}

function buildWheelEvent({
  previous,
  current,
  side,
  sourceEndpoint,
  observedAtUtc
}) {
  const left = side === "LEFT";
  const fromDeg = left ? previous.phaseLeftDeg : previous.phaseRightDeg;
  const toDeg = left ? current.phaseLeftDeg : current.phaseRightDeg;
  const subjectId = left ? "M:LEFT-WHEEL" : "M:RIGHT-WHEEL";

  if (fromDeg === toDeg) return null;

  const event = {
    SCHEMA: "BRUTUS-REAL-MECHANISM-EVENT-v0.1",
    VERSION: "0.1",
    EVENT_ID: eventId(current.tick, side),
    EVENT_CLASS: "RUNTIME_OBSERVATION",
    EVENT_TYPE: "WHEEL_PHASE",
    TICK: current.tick,
    CLOCK_AUTHORITY: "QUEEN_SERVER_V0_2",
    SOURCE: {
      OBSERVATION_ID: makeObservationId(current, side),
      SOURCE_SCHEMA: SOURCE_SCHEMA,
      SOURCE_ENDPOINT: sourceEndpoint,
      OBSERVED_AT_UTC: observedAtUtc,
      INTEGRITY_MATCH: true
    },
    SUBJECT: {
      TYPE: "WHEEL",
      ID: subjectId
    },
    PAYLOAD: {
      FROM_DEG: fromDeg,
      TO_DEG: toDeg
    },
    TRACE_ID: traceId(current.tick, side),
    PROOF_REF: null,
    SIGNATURE_METHOD: "BRUTUS-CANONICAL-JSON-SHA256-v0.1",
    SIGNATURE_H256: "",
    EXECUTABLE: false,
    PROOF_CLAIM: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "UNDECIDED"
  };

  event.SIGNATURE_H256 = computeRealMechanismEventSignature(event);
  return validateRealMechanismEvent(event);
}

export function createAntmuxX72LiveAquariumBridge({
  sourceEndpoint = DEFAULT_ENDPOINT
} = {}) {
  if (typeof sourceEndpoint !== "string" || sourceEndpoint.length === 0) {
    reject("sourceEndpoint must be a non-empty string");
  }

  let previous = null;

  function acceptFrame(frame, {
    observedAtUtc = new Date().toISOString()
  } = {}) {
    if (
      typeof observedAtUtc !== "string" ||
      !Number.isFinite(Date.parse(observedAtUtc))
    ) {
      reject("observedAtUtc must be a valid date-time");
    }

    const current = validateFrame(frame);

    if (previous === null) {
      previous = current;
      return deepFreeze({
        SCHEMA: "BRUTUS-ANTMUX-X72-LIVE-BRIDGE-RESULT-v0.1",
        VERSION: "0.1",
        BASELINE_ONLY: true,
        SOURCE_ENTITY_ID: current.entityId,
        TICK: current.tick,
        WORLD_INDEX: current.worldIndex,
        WORLD_NAME: current.worldName,
        EVENTS: []
      });
    }

    if (current.entityId !== previous.entityId) {
      reject(
        "entity continuity violation: " +
        previous.entityId + " -> " + current.entityId
      );
    }

    if (current.tick < previous.tick) {
      reject("backward Queen tick");
    }

    if (current.tick === previous.tick) {
      if (current.wholeH256 !== previous.wholeH256) {
        reject("same Queen tick with changed noyau whole_h256");
      }

      return deepFreeze({
        SCHEMA: "BRUTUS-ANTMUX-X72-LIVE-BRIDGE-RESULT-v0.1",
        VERSION: "0.1",
        BASELINE_ONLY: false,
        SOURCE_ENTITY_ID: current.entityId,
        TICK: current.tick,
        WORLD_INDEX: current.worldIndex,
        WORLD_NAME: current.worldName,
        EVENTS: []
      });
    }

    const events = [];

    for (const side of ["LEFT", "RIGHT"]) {
      const event = buildWheelEvent({
        previous,
        current,
        side,
        sourceEndpoint,
        observedAtUtc
      });
      if (event !== null) events.push(event);
    }

    previous = current;

    return deepFreeze({
      SCHEMA: "BRUTUS-ANTMUX-X72-LIVE-BRIDGE-RESULT-v0.1",
      VERSION: "0.1",
      BASELINE_ONLY: false,
      SOURCE_ENTITY_ID: current.entityId,
      TICK: current.tick,
      WORLD_INDEX: current.worldIndex,
      WORLD_NAME: current.worldName,
      EVENTS: events.map(clone)
    });
  }

  return Object.freeze({
    SCHEMA: "BRUTUS-ANTMUX-X72-LIVE-BRIDGE-v0.1",
    VERSION: "0.1",
    SOURCE_SCHEMA,
    NOYAU_AUTHORITY,
    NOYAU_SCHEMA,
    SOURCE_ENDPOINT: sourceEndpoint,
    acceptFrame,
    get hasBaseline() {
      return previous !== null;
    },
    get lastTick() {
      return previous?.tick ?? null;
    },
    get entityId() {
      return previous?.entityId ?? null;
    }
  });
}

export const BRUTUS_ANTMUX_X72_SOURCE_SCHEMA = SOURCE_SCHEMA;
export const BRUTUS_ANTMUX_X72_NOYAU_AUTHORITY = NOYAU_AUTHORITY;
export const BRUTUS_ANTMUX_X72_NOYAU_SCHEMA = NOYAU_SCHEMA;
export const BRUTUS_ANTMUX_X72_DEFAULT_ENDPOINT = DEFAULT_ENDPOINT;
