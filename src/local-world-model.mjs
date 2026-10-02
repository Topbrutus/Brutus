import { createHash } from "node:crypto";

const MODEL_SCHEMA = "BRUTUS-LOCAL-WORLD-MODEL-v0.1";
const SIGNATURE_METHOD = "BRUTUS-CANONICAL-JSON-SHA256-v0.1";
const CLOCK_AUTHORITY = "QUEEN_SERVER_V0_2";

const PINNED_CONTRACTS = Object.freeze({
  BRUTUS_CODE: Object.freeze({
    REF: "contracts/brutus-code.v0.schema.json",
    BLOB_SHA: "9427c97c95d2b5307f650a188a510c424118acf2"
  }),
  QUEEN_CRYSTAL: Object.freeze({
    REF: "contracts/fourminizer-queen-crystal.v0.schema.json",
    BLOB_SHA: "9c918bc2a70e376671aaf25f716bac0f0287a5a6"
  }),
  TRACE: Object.freeze({
    REF: "contracts/brutus-trace.v0.schema.json",
    BLOB_SHA: "41d6db0d6a0003c0ec0e73cb4e0e8fe361a44586"
  })
});

const REQUIRED_FIELDS = [
  "SCHEMA",
  "VERSION",
  "MODEL_ID",
  "SNAPSHOT_CLASS",
  "SELF",
  "POSITION",
  "OBSERVED_AT_TICK",
  "CLOCK_AUTHORITY",
  "CONTRACT_PINS",
  "KNOWN_OBJECTS",
  "KNOWN_TRACES",
  "KNOWN_PATHS",
  "UNKNOWN_ZONES",
  "AVAILABLE_PARTS",
  "GATE_STATES",
  "LOCAL_MACHINE",
  "OBJECTIVES",
  "UNCERTAINTY",
  "PARENT_MODEL",
  "PROOF_REF",
  "SIGNATURE_METHOD",
  "SIGNATURE_H256",
  "IMMUTABLE",
  "EXECUTABLE",
  "PROOF_CLAIM",
  "GATE_AUTHORITY",
  "ROUTING_AUTHORIZATION",
  "OMNISCIENT",
  "RAW_EXTERNAL_READ"
];

const ALLOWED_FIELDS = new Set(REQUIRED_FIELDS);
const ALLOWED_SNAPSHOT_CLASSES = new Set(["SYNTHETIC_FIXTURE", "RUNTIME"]);
const ALLOWED_OBJECTIVES = new Set([
  "OBSERVE",
  "READ_TRACE",
  "IDENTIFY_PART",
  "WAIT",
  "RETURN_BASIN"
]);
const ALLOWED_PATH_STATES = new Set(["OBSERVED_OPEN", "OBSERVED_BLOCKED"]);
const ALLOWED_GATE_STATES = new Set(["CLOSED", "UNKNOWN"]);

const MODEL_ID_PATTERN = /^LWM-FMIN-Q[0-9]{4}-[0-9]{4}$/;
const QUEEN_ID_PATTERN = /^FOURMINIZER-QUEEN-[0-9]{4}$/;
const ANT_ID_PATTERN = /^ANT-[0-9A-F]{12}$/;
const WORLD_REF_PATTERN = /^W:[A-Z0-9-]{1,32}$/;
const OBJECT_REF_PATTERN = /^(P|C|L|G|T|M|Z|W|A):[A-Z0-9-]{1,32}$/;
const PART_REF_PATTERN = /^P:[A-Z0-9-]{1,32}$/;
const TRACE_ID_PATTERN = /^TRACE-[A-Z0-9-]{4,64}$/;
const GATE_REF_PATTERN = /^G:L(?:8|9|10|11|12|13)$/;

function reject(reason) {
  throw new Error("LOCAL_WORLD_MODEL_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function assertDataOnly(value, path = "localWorldModel") {
  if (value === null) return;
  const type = typeof value;

  if (type === "string" || type === "boolean") return;
  if (type === "number") {
    if (!Number.isFinite(value)) reject(path + " contains a non-finite number");
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

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
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

function h256(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function signaturePayload(input) {
  const copy = JSON.parse(JSON.stringify(input));
  delete copy.SIGNATURE_H256;
  return copy;
}

function assertExactKeys(value, expected, field) {
  if (!isPlainObject(value)) reject(field + " must be a plain object");
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    reject(field + " has unsupported fields");
  }
}

function validateStringArray(value, pattern, field, maxItems) {
  if (!Array.isArray(value)) reject(field + " must be an array");
  if (value.length > maxItems) reject(field + " exceeds v0.1 limit");

  const seen = new Set();
  for (const item of value) {
    if (typeof item !== "string" || !pattern.test(item)) {
      reject(field + " contains invalid reference");
    }
    if (seen.has(item)) reject(field + " cannot contain duplicates");
    seen.add(item);
  }
}

function validateSelf(value) {
  assertExactKeys(value, ["QUEEN_ID", "ANT_ID", "ROLE"], "SELF");
  if (typeof value.QUEEN_ID !== "string" || !QUEEN_ID_PATTERN.test(value.QUEEN_ID)) {
    reject("invalid SELF.QUEEN_ID");
  }
  if (typeof value.ANT_ID !== "string" || !ANT_ID_PATTERN.test(value.ANT_ID)) {
    reject("invalid SELF.ANT_ID");
  }
  if (value.ROLE !== "FOURMINIZER_QUEEN") reject("SELF.ROLE must be FOURMINIZER_QUEEN");
}

function validateContractPin(value, expected, field) {
  assertExactKeys(value, ["REF", "BLOB_SHA"], field);
  if (value.REF !== expected.REF) reject(field + ".REF does not match pinned contract");
  if (value.BLOB_SHA !== expected.BLOB_SHA) reject(field + ".BLOB_SHA does not match pinned contract");
}

function validateContractPins(value) {
  assertExactKeys(value, ["BRUTUS_CODE", "QUEEN_CRYSTAL", "TRACE"], "CONTRACT_PINS");
  validateContractPin(value.BRUTUS_CODE, PINNED_CONTRACTS.BRUTUS_CODE, "CONTRACT_PINS.BRUTUS_CODE");
  validateContractPin(value.QUEEN_CRYSTAL, PINNED_CONTRACTS.QUEEN_CRYSTAL, "CONTRACT_PINS.QUEEN_CRYSTAL");
  validateContractPin(value.TRACE, PINNED_CONTRACTS.TRACE, "CONTRACT_PINS.TRACE");
}

function validateKnownPaths(value) {
  if (!Array.isArray(value)) reject("KNOWN_PATHS must be an array");
  if (value.length > 32) reject("KNOWN_PATHS exceeds v0.1 limit");

  const seen = new Set();
  for (const path of value) {
    assertExactKeys(path, ["FROM", "TO", "STATE"], "KNOWN_PATHS item");
    if (!WORLD_REF_PATTERN.test(path.FROM) || !WORLD_REF_PATTERN.test(path.TO)) {
      reject("KNOWN_PATHS endpoints must be W: references");
    }
    if (path.FROM === path.TO) reject("KNOWN_PATHS cannot self-loop");
    if (!ALLOWED_PATH_STATES.has(path.STATE)) reject("unsupported KNOWN_PATHS state");
    const key = path.FROM + "->" + path.TO;
    if (seen.has(key)) reject("KNOWN_PATHS cannot contain duplicate directed paths");
    seen.add(key);
  }
}

function validateGateStates(value) {
  if (!Array.isArray(value)) reject("GATE_STATES must be an array");
  if (value.length > 6) reject("GATE_STATES exceeds L8-L13 range");

  const seen = new Set();
  for (const gate of value) {
    assertExactKeys(gate, ["GATE_ID", "STATE"], "GATE_STATES item");
    if (typeof gate.GATE_ID !== "string" || !GATE_REF_PATTERN.test(gate.GATE_ID)) {
      reject("GATE_STATES contains invalid gate");
    }
    if (!ALLOWED_GATE_STATES.has(gate.STATE)) reject("unsupported GATE_STATES state");
    if (seen.has(gate.GATE_ID)) reject("GATE_STATES cannot contain duplicate gates");
    seen.add(gate.GATE_ID);
  }
}

function validateLocalMachine(value) {
  assertExactKeys(value, ["ID", "STATE"], "LOCAL_MACHINE");
  if (value.ID !== null) reject("LOCAL_MACHINE.ID must remain null in v0.1");
  if (value.STATE !== "UNBOUND") reject("LOCAL_MACHINE.STATE must remain UNBOUND in v0.1");
}

function validateObjectives(value) {
  if (!Array.isArray(value)) reject("OBJECTIVES must be an array");
  if (value.length > 5) reject("OBJECTIVES exceeds v0.1 limit");

  const seen = new Set();
  for (const item of value) {
    if (!ALLOWED_OBJECTIVES.has(item)) reject("unsupported OBJECTIVES value " + String(item));
    if (seen.has(item)) reject("OBJECTIVES cannot contain duplicates");
    seen.add(item);
  }
}

function validateUncertainty(value, unknownZones) {
  assertExactKeys(value, ["LEVEL", "BASIS", "UNKNOWN_ZONE_COUNT"], "UNCERTAINTY");
  if (!Number.isInteger(value.LEVEL) || value.LEVEL < 0 || value.LEVEL > 100) {
    reject("UNCERTAINTY.LEVEL must be an integer from 0 to 100");
  }
  if (value.BASIS !== "LOCAL_OBSERVATION_ONLY") {
    reject("UNCERTAINTY.BASIS must be LOCAL_OBSERVATION_ONLY");
  }
  if (value.UNKNOWN_ZONE_COUNT !== unknownZones.length) {
    reject("UNCERTAINTY.UNKNOWN_ZONE_COUNT must equal UNKNOWN_ZONES length");
  }
}

export function computeLocalWorldModelSignature(input) {
  assertDataOnly(input);
  if (!isPlainObject(input)) reject("local world model must be a plain object");
  return h256(signaturePayload(input));
}

export function validateLocalWorldModel(input) {
  assertDataOnly(input);
  if (!isPlainObject(input)) reject("local world model must be a plain object");

  for (const key of Object.keys(input)) {
    if (!ALLOWED_FIELDS.has(key)) reject("unknown local world model field " + key);
  }
  for (const field of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) {
      reject("missing local world model field " + field);
    }
  }

  if (input.SCHEMA !== MODEL_SCHEMA) reject("unsupported SCHEMA");
  if (input.VERSION !== "0.1") reject("unsupported VERSION");
  if (typeof input.MODEL_ID !== "string" || !MODEL_ID_PATTERN.test(input.MODEL_ID)) {
    reject("invalid MODEL_ID");
  }
  if (!ALLOWED_SNAPSHOT_CLASSES.has(input.SNAPSHOT_CLASS)) reject("unsupported SNAPSHOT_CLASS");

  validateSelf(input.SELF);

  if (typeof input.POSITION !== "string" || !WORLD_REF_PATTERN.test(input.POSITION)) {
    reject("POSITION must be a W: reference");
  }
  if (!Number.isSafeInteger(input.OBSERVED_AT_TICK) || input.OBSERVED_AT_TICK < 0) {
    reject("OBSERVED_AT_TICK must be a non-negative safe integer");
  }
  if (input.CLOCK_AUTHORITY !== CLOCK_AUTHORITY) {
    reject("CLOCK_AUTHORITY must be QUEEN_SERVER_V0_2");
  }

  validateContractPins(input.CONTRACT_PINS);
  validateStringArray(input.KNOWN_OBJECTS, OBJECT_REF_PATTERN, "KNOWN_OBJECTS", 64);
  validateStringArray(input.KNOWN_TRACES, TRACE_ID_PATTERN, "KNOWN_TRACES", 64);
  validateKnownPaths(input.KNOWN_PATHS);
  validateStringArray(input.UNKNOWN_ZONES, WORLD_REF_PATTERN, "UNKNOWN_ZONES", 64);
  validateStringArray(input.AVAILABLE_PARTS, PART_REF_PATTERN, "AVAILABLE_PARTS", 32);
  validateGateStates(input.GATE_STATES);
  validateLocalMachine(input.LOCAL_MACHINE);
  validateObjectives(input.OBJECTIVES);
  validateUncertainty(input.UNCERTAINTY, input.UNKNOWN_ZONES);

  if (input.UNKNOWN_ZONES.includes(input.POSITION)) {
    reject("POSITION cannot simultaneously be an UNKNOWN_ZONE");
  }

  const knownObjects = new Set(input.KNOWN_OBJECTS);
  for (const part of input.AVAILABLE_PARTS) {
    if (!knownObjects.has(part)) reject("AVAILABLE_PARTS must be a subset of KNOWN_OBJECTS");
  }

  if (
    input.PARENT_MODEL !== null &&
    (typeof input.PARENT_MODEL !== "string" || !MODEL_ID_PATTERN.test(input.PARENT_MODEL))
  ) {
    reject("invalid PARENT_MODEL");
  }

  if (input.PROOF_REF !== null) reject("PROOF_REF must be null at LOCAL_WORLD_MODEL v0.1");
  if (input.SIGNATURE_METHOD !== SIGNATURE_METHOD) reject("unsupported SIGNATURE_METHOD");
  if (
    typeof input.SIGNATURE_H256 !== "string" ||
    !/^[a-f0-9]{64}$/i.test(input.SIGNATURE_H256)
  ) {
    reject("SIGNATURE_H256 must be SHA-256 hex");
  }

  const expectedSignature = computeLocalWorldModelSignature(input);
  if (input.SIGNATURE_H256.toLowerCase() !== expectedSignature) {
    reject("SIGNATURE_H256 mismatch");
  }

  if (input.IMMUTABLE !== true) reject("IMMUTABLE must be true");
  if (input.EXECUTABLE !== false) reject("EXECUTABLE must be false");
  if (input.PROOF_CLAIM !== false) reject("PROOF_CLAIM must be false");
  if (input.GATE_AUTHORITY !== false) reject("GATE_AUTHORITY must be false");
  if (input.ROUTING_AUTHORIZATION !== "UNDECIDED") {
    reject("ROUTING_AUTHORIZATION must be UNDECIDED");
  }
  if (input.OMNISCIENT !== false) reject("OMNISCIENT must be false");
  if (input.RAW_EXTERNAL_READ !== false) reject("RAW_EXTERNAL_READ must be false");

  return deepFreeze(JSON.parse(JSON.stringify(input)));
}

export const BRUTUS_LOCAL_WORLD_MODEL_SCHEMA = MODEL_SCHEMA;
export const BRUTUS_LOCAL_WORLD_MODEL_SIGNATURE_METHOD = SIGNATURE_METHOD;
export const BRUTUS_LOCAL_WORLD_MODEL_CLOCK_AUTHORITY = CLOCK_AUTHORITY;
export const BRUTUS_LOCAL_WORLD_MODEL_PINS = PINNED_CONTRACTS;
