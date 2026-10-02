const LIVE_EVENT_SCHEMA = "BRUTUS-LIVE-EVENT-v0.1";
const CLOCK_AUTHORITY = "QUEEN_SERVER_V0_2";

const EVENT_FIELDS = new Set([
  "SCHEMA",
  "VERSION",
  "EVENT_ID",
  "EVENT_CLASS",
  "EVENT_TYPE",
  "TICK",
  "CLOCK_AUTHORITY",
  "SOURCE_ENDPOINT",
  "CLOCK_ENTITY_ID",
  "QUEEN_ID",
  "ANT_ID",
  "POSITION",
  "QUEEN_MODE",
  "GENERATION",
  "CONDITION",
  "TRACE_ID",
  "MOTION",
  "PROOF_REF",
  "PROOF_CLAIM",
  "GATE_AUTHORITY",
  "ROUTING_AUTHORIZATION"
]);

const EVENT_ID_PATTERN = /^EVT-FMIN-Q[0-9]{4}-STARTUP-T[0-9]{1,16}$/;
const QUEEN_ID_PATTERN = /^FOURMINIZER-QUEEN-[0-9]{4}$/;
const ANT_ID_PATTERN = /^ANT-[0-9A-F]{12}$/;
const WORLD_REF_PATTERN = /^W:[A-Z0-9-]{1,32}$/;
const TRACE_ID_PATTERN = /^TRACE-[A-Z0-9-]{4,64}$/;

function reject(reason) {
  throw new Error("FOURMINIZER_STARTUP_REJECTED: " + reason);
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

export function validateFourminizerLiveEvent(input) {
  if (!isPlainObject(input)) reject("live event must be a plain object");

  for (const key of Object.keys(input)) {
    if (!EVENT_FIELDS.has(key)) reject("unknown live event field " + key);
  }
  for (const key of EVENT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) {
      reject("missing live event field " + key);
    }
  }

  if (input.SCHEMA !== LIVE_EVENT_SCHEMA) reject("unsupported live event SCHEMA");
  if (input.VERSION !== "0.1") reject("unsupported live event VERSION");
  if (!EVENT_ID_PATTERN.test(input.EVENT_ID)) reject("invalid EVENT_ID");
  if (input.EVENT_CLASS !== "RUNTIME") reject("EVENT_CLASS must be RUNTIME");
  if (input.EVENT_TYPE !== "STARTUP_OBSERVED") {
    reject("EVENT_TYPE must be STARTUP_OBSERVED in v0.1");
  }
  if (!Number.isSafeInteger(input.TICK) || input.TICK < 0) {
    reject("TICK must be a non-negative safe integer");
  }
  if (input.CLOCK_AUTHORITY !== CLOCK_AUTHORITY) {
    reject("CLOCK_AUTHORITY must be QUEEN_SERVER_V0_2");
  }
  if (input.SOURCE_ENDPOINT !== "/api/state" && input.SOURCE_ENDPOINT !== "/ws") {
    reject("unsupported SOURCE_ENDPOINT");
  }
  if (typeof input.CLOCK_ENTITY_ID !== "string" || input.CLOCK_ENTITY_ID.length === 0) {
    reject("CLOCK_ENTITY_ID is required");
  }
  if (!QUEEN_ID_PATTERN.test(input.QUEEN_ID)) reject("invalid QUEEN_ID");
  if (!ANT_ID_PATTERN.test(input.ANT_ID)) reject("invalid ANT_ID");
  if (!WORLD_REF_PATTERN.test(input.POSITION)) reject("invalid POSITION");
  if (typeof input.QUEEN_MODE !== "string" || input.QUEEN_MODE.length === 0) {
    reject("QUEEN_MODE is required");
  }
  if (!Number.isSafeInteger(input.GENERATION) || input.GENERATION < 0) {
    reject("GENERATION must be a non-negative safe integer");
  }
  if (typeof input.CONDITION !== "string" || input.CONDITION.length === 0) {
    reject("CONDITION is required");
  }
  if (!TRACE_ID_PATTERN.test(input.TRACE_ID)) reject("invalid TRACE_ID");

  if (input.MOTION !== null) {
    reject("MOTION must remain null until a real motion contract exists");
  }
  if (input.PROOF_REF !== null) reject("PROOF_REF must be null");
  if (input.PROOF_CLAIM !== false) reject("PROOF_CLAIM must be false");
  if (input.GATE_AUTHORITY !== false) reject("GATE_AUTHORITY must be false");
  if (input.ROUTING_AUTHORIZATION !== "UNDECIDED") {
    reject("ROUTING_AUTHORIZATION must be UNDECIDED");
  }

  return deepFreeze(clone(input));
}

export const BRUTUS_FOURMINIZER_LIVE_EVENT_SCHEMA = LIVE_EVENT_SCHEMA;
