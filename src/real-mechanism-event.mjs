import { sha256HexUtf8 } from "./sha256-utf8.mjs";

const SCHEMA = "BRUTUS-REAL-MECHANISM-EVENT-v0.1";
const VERSION = "0.1";
const CLOCK_AUTHORITY = "QUEEN_SERVER_V0_2";
const SIGNATURE_METHOD = "BRUTUS-CANONICAL-JSON-SHA256-v0.1";

const EVENT_TYPES = new Set([
  "ANT_MOVE",
  "CRYSTAL_MOVE",
  "WHEEL_PHASE",
  "PINEAL_PHASE",
  "Z_MARK",
  "DISTRIBUTOR_ROUTE",
  "BASIN_TRANSFER"
]);

const REQUIRED_FIELDS = [
  "SCHEMA",
  "VERSION",
  "EVENT_ID",
  "EVENT_CLASS",
  "EVENT_TYPE",
  "TICK",
  "CLOCK_AUTHORITY",
  "SOURCE",
  "SUBJECT",
  "PAYLOAD",
  "TRACE_ID",
  "PROOF_REF",
  "SIGNATURE_METHOD",
  "SIGNATURE_H256",
  "EXECUTABLE",
  "PROOF_CLAIM",
  "GATE_AUTHORITY",
  "ROUTING_AUTHORIZATION"
];

const ALLOWED_FIELDS = new Set(REQUIRED_FIELDS);
const EVENT_ID_RE = /^RME-T[0-9]{1,16}-[A-Z0-9-]{4,64}$/;
const TRACE_ID_RE = /^TRACE-[A-Z0-9-]{4,64}$/;
const ANT_ID_RE = /^ANT-[0-9A-F]{12}$/;
const OBJECT_REF_RE = /^(C|M|Z|W|P):[A-Z0-9-]{1,32}$/;
const WORLD_REF_RE = /^W:[A-Z0-9-]{1,32}$/;

function reject(reason) {
  throw new Error("REAL_MECHANISM_EVENT_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function assertDataOnly(value, path = "event") {
  if (value === null) return;
  const type = typeof value;
  if (type === "string" || type === "boolean") return;
  if (type === "number") {
    if (!Number.isFinite(value)) reject(path + " contains non-finite number");
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertDataOnly(item, path + "[" + index + "]"));
    return;
  }
  if (type === "object" && isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      assertDataOnly(item, path + "." + key);
    }
    return;
  }
  reject(path + " must contain data only");
}

function assertExactKeys(value, expected, label) {
  if (!isPlainObject(value)) reject(label + " must be a plain object");
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    reject(label + " has unsupported fields");
  }
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

function signaturePayload(input) {
  const copy = JSON.parse(JSON.stringify(input));
  delete copy.SIGNATURE_H256;
  return copy;
}

function h256(value) {
  return sha256HexUtf8(JSON.stringify(canonicalize(value)));
}

function validateSource(source) {
  assertExactKeys(
    source,
    ["OBSERVATION_ID", "SOURCE_SCHEMA", "SOURCE_ENDPOINT", "OBSERVED_AT_UTC", "INTEGRITY_MATCH"],
    "SOURCE"
  );

  if (typeof source.OBSERVATION_ID !== "string" || source.OBSERVATION_ID.length < 4) {
    reject("SOURCE.OBSERVATION_ID is required");
  }
  if (typeof source.SOURCE_SCHEMA !== "string" || source.SOURCE_SCHEMA.length < 3) {
    reject("SOURCE.SOURCE_SCHEMA is required");
  }
  if (typeof source.SOURCE_ENDPOINT !== "string" || source.SOURCE_ENDPOINT.length < 1) {
    reject("SOURCE.SOURCE_ENDPOINT is required");
  }
  if (
    typeof source.OBSERVED_AT_UTC !== "string" ||
    !Number.isFinite(Date.parse(source.OBSERVED_AT_UTC))
  ) {
    reject("SOURCE.OBSERVED_AT_UTC must be a valid date-time");
  }
  if (source.INTEGRITY_MATCH !== true) {
    reject("SOURCE.INTEGRITY_MATCH must be true");
  }
}

function validateSubject(subject, eventType) {
  assertExactKeys(subject, ["TYPE", "ID"], "SUBJECT");

  const expectedType = {
    ANT_MOVE: "ANT",
    CRYSTAL_MOVE: "CRYSTAL",
    WHEEL_PHASE: "WHEEL",
    PINEAL_PHASE: "PINEAL",
    Z_MARK: "Z_MARKER",
    DISTRIBUTOR_ROUTE: "DISTRIBUTOR",
    BASIN_TRANSFER: "BASIN"
  }[eventType];

  if (subject.TYPE !== expectedType) {
    reject("SUBJECT.TYPE does not match EVENT_TYPE");
  }

  if (subject.TYPE === "ANT") {
    if (!ANT_ID_RE.test(subject.ID)) reject("invalid ANT subject ID");
    return;
  }

  if (typeof subject.ID !== "string" || !OBJECT_REF_RE.test(subject.ID)) {
    reject("invalid mechanism/object subject ID");
  }

  if (subject.TYPE === "CRYSTAL" && !subject.ID.startsWith("C:")) {
    reject("CRYSTAL subject ID must use C:");
  }
  if (
    ["WHEEL", "PINEAL", "DISTRIBUTOR", "BASIN"].includes(subject.TYPE) &&
    !subject.ID.startsWith("M:")
  ) {
    reject(subject.TYPE + " subject ID must use M:");
  }
  if (subject.TYPE === "Z_MARKER" && !subject.ID.startsWith("Z:")) {
    reject("Z_MARKER subject ID must use Z:");
  }
}

function validateMovePayload(payload) {
  assertExactKeys(payload, ["FROM", "TO"], "PAYLOAD");
  if (!WORLD_REF_RE.test(payload.FROM) || !WORLD_REF_RE.test(payload.TO)) {
    reject("movement endpoints must be W: references");
  }
  if (payload.FROM === payload.TO) reject("movement requires a changed position");
}

function validatePhasePayload(payload) {
  assertExactKeys(payload, ["FROM_DEG", "TO_DEG"], "PAYLOAD");
  for (const key of ["FROM_DEG", "TO_DEG"]) {
    if (
      typeof payload[key] !== "number" ||
      payload[key] < 0 ||
      payload[key] >= 360
    ) {
      reject("phase values must be numbers in [0,360)");
    }
  }
  if (payload.FROM_DEG === payload.TO_DEG) {
    reject("phase event requires a changed phase");
  }
}

function validateZPayload(payload) {
  assertExactKeys(payload, ["OBJECT_REF", "FROM_STATE", "TO_STATE"], "PAYLOAD");
  if (typeof payload.OBJECT_REF !== "string" || !OBJECT_REF_RE.test(payload.OBJECT_REF)) {
    reject("Z payload OBJECT_REF is invalid");
  }
  if (payload.FROM_STATE !== "UNMARKED") reject("Z FROM_STATE must be UNMARKED");
  if (payload.TO_STATE !== "Z_MARKED") reject("Z TO_STATE must be Z_MARKED");
}

function validateRoutePayload(payload, eventType) {
  assertExactKeys(payload, ["OBJECT_REF", "FROM", "TO"], "PAYLOAD");
  if (typeof payload.OBJECT_REF !== "string" || !OBJECT_REF_RE.test(payload.OBJECT_REF)) {
    reject("route OBJECT_REF is invalid");
  }
  if (!WORLD_REF_RE.test(payload.FROM) || !WORLD_REF_RE.test(payload.TO)) {
    reject("route endpoints must be W: references");
  }
  if (payload.FROM === payload.TO) reject("route requires a changed position");
  if (eventType === "BASIN_TRANSFER" && payload.TO !== "W:RETURN-BASIN") {
    reject("BASIN_TRANSFER must terminate at W:RETURN-BASIN");
  }
}

function validatePayload(payload, eventType) {
  if (!isPlainObject(payload)) reject("PAYLOAD must be a plain object");

  if (eventType === "ANT_MOVE" || eventType === "CRYSTAL_MOVE") {
    validateMovePayload(payload);
  } else if (eventType === "WHEEL_PHASE" || eventType === "PINEAL_PHASE") {
    validatePhasePayload(payload);
  } else if (eventType === "Z_MARK") {
    validateZPayload(payload);
  } else if (eventType === "DISTRIBUTOR_ROUTE" || eventType === "BASIN_TRANSFER") {
    validateRoutePayload(payload, eventType);
  } else {
    reject("unsupported EVENT_TYPE");
  }
}

export function computeRealMechanismEventSignature(input) {
  assertDataOnly(input);
  if (!isPlainObject(input)) reject("event must be a plain object");
  return h256(signaturePayload(input));
}

export function validateRealMechanismEvent(input) {
  assertDataOnly(input);
  if (!isPlainObject(input)) reject("event must be a plain object");

  for (const key of Object.keys(input)) {
    if (!ALLOWED_FIELDS.has(key)) reject("unknown event field " + key);
  }
  for (const field of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) {
      reject("missing event field " + field);
    }
  }

  if (input.SCHEMA !== SCHEMA) reject("unsupported SCHEMA");
  if (input.VERSION !== VERSION) reject("unsupported VERSION");
  if (!EVENT_ID_RE.test(input.EVENT_ID)) reject("invalid EVENT_ID");
  if (input.EVENT_CLASS !== "RUNTIME_OBSERVATION") {
    reject("EVENT_CLASS must be RUNTIME_OBSERVATION");
  }
  if (!EVENT_TYPES.has(input.EVENT_TYPE)) reject("unsupported EVENT_TYPE");
  if (!Number.isSafeInteger(input.TICK) || input.TICK < 0) {
    reject("TICK must be a non-negative safe integer");
  }
  if (input.CLOCK_AUTHORITY !== CLOCK_AUTHORITY) {
    reject("CLOCK_AUTHORITY must be QUEEN_SERVER_V0_2");
  }

  validateSource(input.SOURCE);
  validateSubject(input.SUBJECT, input.EVENT_TYPE);
  validatePayload(input.PAYLOAD, input.EVENT_TYPE);

  if (!TRACE_ID_RE.test(input.TRACE_ID)) reject("invalid TRACE_ID");
  if (input.PROOF_REF !== null) reject("PROOF_REF must be null");
  if (input.SIGNATURE_METHOD !== SIGNATURE_METHOD) {
    reject("unsupported SIGNATURE_METHOD");
  }
  if (
    typeof input.SIGNATURE_H256 !== "string" ||
    !/^[a-f0-9]{64}$/i.test(input.SIGNATURE_H256)
  ) {
    reject("SIGNATURE_H256 must be SHA-256 hex");
  }

  const expected = computeRealMechanismEventSignature(input);
  if (input.SIGNATURE_H256.toLowerCase() !== expected) {
    reject("SIGNATURE_H256 mismatch");
  }

  if (input.EXECUTABLE !== false) reject("EXECUTABLE must be false");
  if (input.PROOF_CLAIM !== false) reject("PROOF_CLAIM must be false");
  if (input.GATE_AUTHORITY !== false) reject("GATE_AUTHORITY must be false");
  if (input.ROUTING_AUTHORIZATION !== "UNDECIDED") {
    reject("ROUTING_AUTHORIZATION must be UNDECIDED");
  }

  return deepFreeze(JSON.parse(JSON.stringify(input)));
}

export const BRUTUS_REAL_MECHANISM_EVENT_SCHEMA = SCHEMA;
export const BRUTUS_REAL_MECHANISM_EVENT_TYPES = Object.freeze([...EVENT_TYPES]);
export const BRUTUS_REAL_MECHANISM_EVENT_CLOCK_AUTHORITY = CLOCK_AUTHORITY;
