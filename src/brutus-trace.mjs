import { createHash } from "node:crypto";
import { BRUTUS_CODE_ACTIONS } from "./brutus-code.mjs";

const TRACE_SCHEMA = "BRUTUS-TRACE-v0.1";
const SIGNATURE_METHOD = "BRUTUS-CANONICAL-JSON-SHA256-v0.1";
const CLOCK_AUTHORITY = "QUEEN_SERVER_V0_2";

const ALLOWED_ACTIONS = new Set(BRUTUS_CODE_ACTIONS);
const ALLOWED_TRACE_CLASSES = new Set(["SYNTHETIC_FIXTURE", "RUNTIME"]);
const ALLOWED_ACTOR_CLASSES = new Set(["FOURMINIZER_QUEEN", "ANT"]);
const ALLOWED_RESULTS = new Set([
  "UNKNOWN",
  "SUCCESS",
  "FAILURE",
  "PARTIAL",
  "INCONCLUSIVE"
]);

const REQUIRED_FIELDS = [
  "SCHEMA",
  "VERSION",
  "TRACE_ID",
  "TRACE_CLASS",
  "ANT_ID",
  "ACTOR_CLASS",
  "POSITION",
  "TICK",
  "CLOCK_AUTHORITY",
  "ACTION",
  "INPUT_OBJECTS",
  "OUTPUT_OBJECTS",
  "RESULT",
  "SUCCESS_LEVEL",
  "CONFIDENCE",
  "PARENT_TRACE",
  "MESSAGE_ID",
  "PROOF_REF",
  "SIGNATURE_METHOD",
  "SIGNATURE_H256",
  "IMMUTABLE",
  "EXECUTABLE",
  "PROOF_CLAIM",
  "GATE_AUTHORITY",
  "ROUTING_AUTHORIZATION"
];

const ALLOWED_FIELDS = new Set(REQUIRED_FIELDS);

const TRACE_ID_PATTERN = /^TRACE-[A-Z0-9-]{4,64}$/;
const ANT_ID_PATTERN = /^ANT-[0-9A-F]{12}$/;
const WORLD_REF_PATTERN = /^W:[A-Z0-9-]{1,32}$/;
const OBJECT_REF_PATTERN = /^(P|C|L|G|T|M|Z|W|A):[A-Z0-9-]{1,32}$/;
const MESSAGE_ID_PATTERN = /^BCM-[A-Z0-9-]{4,64}$/;

function reject(reason) {
  throw new Error("BRUTUS_TRACE_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function assertDataOnly(value, path = "trace") {
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

function validateObjectRefs(value, field) {
  if (!Array.isArray(value)) reject(field + " must be an array");
  if (value.length > 16) reject(field + " exceeds v0.1 limit");

  const seen = new Set();
  for (const item of value) {
    if (typeof item !== "string" || !OBJECT_REF_PATTERN.test(item)) {
      reject(field + " contains invalid object reference");
    }
    if (seen.has(item)) reject(field + " cannot contain duplicates");
    seen.add(item);
  }
}

export function computeBrutusTraceSignature(input) {
  assertDataOnly(input);
  if (!isPlainObject(input)) reject("trace must be a plain object");
  return h256(signaturePayload(input));
}

export function validateBrutusTrace(input) {
  assertDataOnly(input);
  if (!isPlainObject(input)) reject("trace must be a plain object");

  for (const key of Object.keys(input)) {
    if (!ALLOWED_FIELDS.has(key)) reject("unknown trace field " + key);
  }
  for (const field of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) {
      reject("missing trace field " + field);
    }
  }

  if (input.SCHEMA !== TRACE_SCHEMA) reject("unsupported SCHEMA");
  if (input.VERSION !== "0.1") reject("unsupported VERSION");
  if (typeof input.TRACE_ID !== "string" || !TRACE_ID_PATTERN.test(input.TRACE_ID)) {
    reject("invalid TRACE_ID");
  }
  if (!ALLOWED_TRACE_CLASSES.has(input.TRACE_CLASS)) reject("unsupported TRACE_CLASS");
  if (typeof input.ANT_ID !== "string" || !ANT_ID_PATTERN.test(input.ANT_ID)) {
    reject("invalid ANT_ID");
  }
  if (!ALLOWED_ACTOR_CLASSES.has(input.ACTOR_CLASS)) reject("unsupported ACTOR_CLASS");
  if (typeof input.POSITION !== "string" || !WORLD_REF_PATTERN.test(input.POSITION)) {
    reject("POSITION must be a W: reference");
  }
  if (!Number.isSafeInteger(input.TICK) || input.TICK < 0) {
    reject("TICK must be a non-negative safe integer");
  }
  if (input.CLOCK_AUTHORITY !== CLOCK_AUTHORITY) {
    reject("CLOCK_AUTHORITY must be QUEEN_SERVER_V0_2");
  }
  if (!ALLOWED_ACTIONS.has(input.ACTION)) reject("ACTION must exist in Brutus Code v0.1");

  validateObjectRefs(input.INPUT_OBJECTS, "INPUT_OBJECTS");
  validateObjectRefs(input.OUTPUT_OBJECTS, "OUTPUT_OBJECTS");

  if (!ALLOWED_RESULTS.has(input.RESULT)) reject("unsupported RESULT");
  if (!Number.isInteger(input.SUCCESS_LEVEL) || input.SUCCESS_LEVEL < 0 || input.SUCCESS_LEVEL > 100) {
    reject("SUCCESS_LEVEL must be an integer from 0 to 100");
  }
  if (!Number.isInteger(input.CONFIDENCE) || input.CONFIDENCE < 0 || input.CONFIDENCE > 100) {
    reject("CONFIDENCE must be an integer from 0 to 100");
  }

  if (
    input.PARENT_TRACE !== null &&
    (typeof input.PARENT_TRACE !== "string" || !TRACE_ID_PATTERN.test(input.PARENT_TRACE))
  ) {
    reject("invalid PARENT_TRACE");
  }
  if (
    input.MESSAGE_ID !== null &&
    (typeof input.MESSAGE_ID !== "string" || !MESSAGE_ID_PATTERN.test(input.MESSAGE_ID))
  ) {
    reject("invalid MESSAGE_ID");
  }

  if (input.PROOF_REF !== null) reject("PROOF_REF must be null at TRACE v0.1");
  if (input.SIGNATURE_METHOD !== SIGNATURE_METHOD) reject("unsupported SIGNATURE_METHOD");
  if (
    typeof input.SIGNATURE_H256 !== "string" ||
    !/^[a-f0-9]{64}$/i.test(input.SIGNATURE_H256)
  ) {
    reject("SIGNATURE_H256 must be SHA-256 hex");
  }

  const expected = computeBrutusTraceSignature(input);
  if (input.SIGNATURE_H256.toLowerCase() !== expected) reject("SIGNATURE_H256 mismatch");

  if (input.IMMUTABLE !== true) reject("IMMUTABLE must be true");
  if (input.EXECUTABLE !== false) reject("EXECUTABLE must be false");
  if (input.PROOF_CLAIM !== false) reject("PROOF_CLAIM must be false");
  if (input.GATE_AUTHORITY !== false) reject("GATE_AUTHORITY must be false");
  if (input.ROUTING_AUTHORIZATION !== "UNDECIDED") {
    reject("ROUTING_AUTHORIZATION must be UNDECIDED");
  }

  return deepFreeze(JSON.parse(JSON.stringify(input)));
}

export const BRUTUS_TRACE_SCHEMA = TRACE_SCHEMA;
export const BRUTUS_TRACE_SIGNATURE_METHOD = SIGNATURE_METHOD;
export const BRUTUS_TRACE_CLOCK_AUTHORITY = CLOCK_AUTHORITY;
