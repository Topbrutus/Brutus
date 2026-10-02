import { createHash } from "node:crypto";

const MACHINE_SCHEMA = "BRUTUS-LOCAL-MACHINE-v0.1";
const JOB_SCHEMA = "BRUTUS-LOCAL-MACHINE-JOB-v0.1";
const SIGNATURE_METHOD = "BRUTUS-CANONICAL-JSON-SHA256-v0.1";
const CLOCK_AUTHORITY = "QUEEN_SERVER_V0_2";

const PART_TYPES = new Set([
  "BRIN",
  "FIBRE",
  "TIMBRE",
  "BLOC",
  "CRISTAL",
  "FRAGMENT"
]);

const ADMITTED_OPERATIONS = new Set([
  "ASSEMBLE",
  "RECYCLE_HANDOFF"
]);

const REQUIRED_MACHINE_FIELDS = [
  "SCHEMA",
  "VERSION",
  "MACHINE_ID",
  "OWNER",
  "STATE",
  "CONTRACT_PINS",
  "ADMITTED_PART_TYPES",
  "ADMITTED_OPERATIONS",
  "INPUT_POLICY",
  "WORKSPACE",
  "OUTPUT_POLICY",
  "TRACE_REQUIRED",
  "SIGNATURE_METHOD",
  "SIGNATURE_H256",
  "IMMUTABLE",
  "EXECUTABLE",
  "PROOF_CLAIM",
  "GATE_AUTHORITY",
  "ROUTING_AUTHORIZATION"
];

const REQUIRED_JOB_FIELDS = [
  "SCHEMA",
  "VERSION",
  "JOB_ID",
  "JOB_CLASS",
  "MACHINE_ID",
  "ANT_ID",
  "WORLD_MODEL_ID",
  "TICK",
  "CLOCK_AUTHORITY",
  "OPERATION",
  "INPUTS",
  "LAYOUT",
  "OUTPUT_PLAN",
  "RECYCLE_HANDOFF",
  "TRACE_REQUIRED",
  "PROOF_REF",
  "SIGNATURE_METHOD",
  "SIGNATURE_H256",
  "EXECUTABLE",
  "PROOF_CLAIM",
  "GATE_AUTHORITY",
  "ROUTING_AUTHORIZATION"
];

const MACHINE_FIELDS = new Set(REQUIRED_MACHINE_FIELDS);
const JOB_FIELDS = new Set(REQUIRED_JOB_FIELDS);

const PINS = Object.freeze({
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
  }),
  LOCAL_WORLD_MODEL: Object.freeze({
    REF: "contracts/local-world-model.v0.schema.json",
    BLOB_SHA: "289a89530a605d70b0ed70f248f8646d69980885"
  })
});

const MACHINE_ID_PATTERN = /^M:[A-Z0-9-]{1,32}$/;
const ANT_ID_PATTERN = /^ANT-[0-9A-F]{12}$/;
const QUEEN_ID_PATTERN = /^FOURMINIZER-QUEEN-[0-9]{4}$/;
const MODEL_ID_PATTERN = /^LWM-FMIN-Q[0-9]{4}-[0-9]{4}$/;
const JOB_ID_PATTERN = /^LMJ-[A-Z0-9-]{4,64}$/;
const PART_ID_PATTERN = /^P:[A-Z0-9-]{1,32}$/;

function reject(reason) {
  throw new Error("LOCAL_MACHINE_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function assertDataOnly(value, path = "value") {
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

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

function assertFields(input, required, allowed, label) {
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) reject("unknown " + label + " field " + key);
  }
  for (const field of required) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) {
      reject("missing " + label + " field " + field);
    }
  }
}

function assertExactKeys(value, keys, label) {
  if (!isPlainObject(value)) reject(label + " must be a plain object");
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    reject(label + " has unsupported fields");
  }
}

function validateOwner(value) {
  assertExactKeys(value, ["QUEEN_ID", "ANT_ID"], "OWNER");
  if (!QUEEN_ID_PATTERN.test(value.QUEEN_ID)) reject("invalid OWNER.QUEEN_ID");
  if (!ANT_ID_PATTERN.test(value.ANT_ID)) reject("invalid OWNER.ANT_ID");
}

function validatePin(value, expected, label) {
  assertExactKeys(value, ["REF", "BLOB_SHA"], label);
  if (value.REF !== expected.REF) reject(label + ".REF mismatch");
  if (value.BLOB_SHA !== expected.BLOB_SHA) reject(label + ".BLOB_SHA mismatch");
}

function validatePins(value) {
  assertExactKeys(
    value,
    ["BRUTUS_CODE", "QUEEN_CRYSTAL", "TRACE", "LOCAL_WORLD_MODEL"],
    "CONTRACT_PINS"
  );
  validatePin(value.BRUTUS_CODE, PINS.BRUTUS_CODE, "CONTRACT_PINS.BRUTUS_CODE");
  validatePin(value.QUEEN_CRYSTAL, PINS.QUEEN_CRYSTAL, "CONTRACT_PINS.QUEEN_CRYSTAL");
  validatePin(value.TRACE, PINS.TRACE, "CONTRACT_PINS.TRACE");
  validatePin(
    value.LOCAL_WORLD_MODEL,
    PINS.LOCAL_WORLD_MODEL,
    "CONTRACT_PINS.LOCAL_WORLD_MODEL"
  );
}

function validateEnumArray(value, allowed, label, { min = 1, max = 32 } = {}) {
  if (!Array.isArray(value)) reject(label + " must be an array");
  if (value.length < min || value.length > max) {
    reject(label + " size outside v0.1 bounds");
  }
  const seen = new Set();
  for (const item of value) {
    if (!allowed.has(item)) reject(label + " contains unsupported value " + String(item));
    if (seen.has(item)) reject(label + " cannot contain duplicates");
    seen.add(item);
  }
}

function validateInputPolicy(value) {
  assertExactKeys(value, ["MAX_PARTS", "KNOWN_ONLY", "PRESERVE_PEDIGREE"], "INPUT_POLICY");
  if (!Number.isInteger(value.MAX_PARTS) || value.MAX_PARTS < 1 || value.MAX_PARTS > 16) {
    reject("INPUT_POLICY.MAX_PARTS must be 1..16");
  }
  if (value.KNOWN_ONLY !== true) reject("INPUT_POLICY.KNOWN_ONLY must be true");
  if (value.PRESERVE_PEDIGREE !== true) reject("INPUT_POLICY.PRESERVE_PEDIGREE must be true");
}

function validateWorkspace(value) {
  assertExactKeys(
    value,
    ["MODE", "DIMENSIONS_ALLOWED", "MAX_SIDE", "MAX_CELLS"],
    "WORKSPACE"
  );
  if (value.MODE !== "MATRIX_OR_CUBE") reject("WORKSPACE.MODE must be MATRIX_OR_CUBE");
  if (
    !Array.isArray(value.DIMENSIONS_ALLOWED) ||
    value.DIMENSIONS_ALLOWED.length !== 2 ||
    value.DIMENSIONS_ALLOWED[0] !== 2 ||
    value.DIMENSIONS_ALLOWED[1] !== 3
  ) {
    reject("WORKSPACE.DIMENSIONS_ALLOWED must be [2,3]");
  }
  if (value.MAX_SIDE !== 7) reject("WORKSPACE.MAX_SIDE must be 7");
  if (value.MAX_CELLS !== 343) reject("WORKSPACE.MAX_CELLS must be 343");
}

function validateOutputPolicy(value) {
  assertExactKeys(
    value,
    ["NEW_OBJECT_REQUIRED", "PARENT_SET_REQUIRED", "PEDIGREE_RULE"],
    "OUTPUT_POLICY"
  );
  if (value.NEW_OBJECT_REQUIRED !== true) reject("OUTPUT_POLICY.NEW_OBJECT_REQUIRED must be true");
  if (value.PARENT_SET_REQUIRED !== true) reject("OUTPUT_POLICY.PARENT_SET_REQUIRED must be true");
  if (value.PEDIGREE_RULE !== "DERIVE_ALL_INPUT_PARENTS") {
    reject("OUTPUT_POLICY.PEDIGREE_RULE must be DERIVE_ALL_INPUT_PARENTS");
  }
}

function validateMachineSignature(input) {
  if (input.SIGNATURE_METHOD !== SIGNATURE_METHOD) reject("unsupported SIGNATURE_METHOD");
  if (!/^[a-f0-9]{64}$/i.test(input.SIGNATURE_H256)) reject("SIGNATURE_H256 must be SHA-256 hex");
  if (input.SIGNATURE_H256.toLowerCase() !== h256(signaturePayload(input))) {
    reject("SIGNATURE_H256 mismatch");
  }
}

export function computeLocalMachineSignature(input) {
  assertDataOnly(input);
  if (!isPlainObject(input)) reject("machine must be a plain object");
  return h256(signaturePayload(input));
}

export function validateLocalMachine(input) {
  assertDataOnly(input);
  if (!isPlainObject(input)) reject("machine must be a plain object");
  assertFields(input, REQUIRED_MACHINE_FIELDS, MACHINE_FIELDS, "machine");

  if (input.SCHEMA !== MACHINE_SCHEMA) reject("unsupported machine SCHEMA");
  if (input.VERSION !== "0.1") reject("unsupported machine VERSION");
  if (!MACHINE_ID_PATTERN.test(input.MACHINE_ID)) reject("invalid MACHINE_ID");

  validateOwner(input.OWNER);

  if (input.STATE !== "DORMANT") reject("STATE must begin at DORMANT");
  validatePins(input.CONTRACT_PINS);
  validateEnumArray(input.ADMITTED_PART_TYPES, PART_TYPES, "ADMITTED_PART_TYPES", { min: 1, max: 6 });
  validateEnumArray(input.ADMITTED_OPERATIONS, ADMITTED_OPERATIONS, "ADMITTED_OPERATIONS", { min: 1, max: 2 });
  validateInputPolicy(input.INPUT_POLICY);
  validateWorkspace(input.WORKSPACE);
  validateOutputPolicy(input.OUTPUT_POLICY);

  if (input.TRACE_REQUIRED !== true) reject("TRACE_REQUIRED must be true");
  validateMachineSignature(input);

  if (input.IMMUTABLE !== true) reject("IMMUTABLE must be true");
  if (input.EXECUTABLE !== false) reject("EXECUTABLE must be false");
  if (input.PROOF_CLAIM !== false) reject("PROOF_CLAIM must be false");
  if (input.GATE_AUTHORITY !== false) reject("GATE_AUTHORITY must be false");
  if (input.ROUTING_AUTHORIZATION !== "UNDECIDED") {
    reject("ROUTING_AUTHORIZATION must be UNDECIDED");
  }

  return deepFreeze(JSON.parse(JSON.stringify(input)));
}

function validateInputs(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 16) {
    reject("INPUTS must contain 1..16 items");
  }
  const ids = new Set();
  for (const item of value) {
    assertExactKeys(item, ["PART_ID", "PART_TYPE"], "INPUTS item");
    if (!PART_ID_PATTERN.test(item.PART_ID)) reject("invalid INPUTS.PART_ID");
    if (!PART_TYPES.has(item.PART_TYPE)) reject("unsupported INPUTS.PART_TYPE");
    if (ids.has(item.PART_ID)) reject("INPUTS cannot contain duplicate PART_ID");
    ids.add(item.PART_ID);
  }
  return ids;
}

function validateLayout(value, inputIds) {
  assertExactKeys(value, ["DIMENSIONS", "SIDE", "CELLS"], "LAYOUT");
  if (value.DIMENSIONS !== 2 && value.DIMENSIONS !== 3) {
    reject("LAYOUT.DIMENSIONS must be 2 or 3");
  }
  if (!Number.isInteger(value.SIDE) || value.SIDE < 1 || value.SIDE > 7) {
    reject("LAYOUT.SIDE must be 1..7");
  }
  const capacity = value.SIDE ** value.DIMENSIONS;
  if (!Array.isArray(value.CELLS) || value.CELLS.length !== inputIds.size) {
    reject("LAYOUT.CELLS must place every input exactly once");
  }
  if (value.CELLS.length > capacity) reject("LAYOUT exceeds workspace capacity");

  const placedIds = new Set();
  const coordinates = new Set();

  for (const cell of value.CELLS) {
    assertExactKeys(cell, ["PART_ID", "COORD"], "LAYOUT.CELLS item");
    if (!inputIds.has(cell.PART_ID)) reject("LAYOUT references a non-input part");
    if (placedIds.has(cell.PART_ID)) reject("LAYOUT cannot place a part twice");
    placedIds.add(cell.PART_ID);

    if (!Array.isArray(cell.COORD) || cell.COORD.length !== value.DIMENSIONS) {
      reject("LAYOUT.COORD dimensionality mismatch");
    }
    for (const axis of cell.COORD) {
      if (!Number.isInteger(axis) || axis < 0 || axis >= value.SIDE) {
        reject("LAYOUT.COORD outside workspace");
      }
    }
    const key = cell.COORD.join(",");
    if (coordinates.has(key)) reject("LAYOUT cannot overlap parts");
    coordinates.add(key);
  }
}

function validateOutputPlan(value, inputIds) {
  assertExactKeys(
    value,
    ["OUTPUT_ID", "OUTPUT_TYPE", "PARENT_PARTS", "PEDIGREE_RULE"],
    "OUTPUT_PLAN"
  );
  if (!PART_ID_PATTERN.test(value.OUTPUT_ID)) reject("invalid OUTPUT_PLAN.OUTPUT_ID");
  if (inputIds.has(value.OUTPUT_ID)) reject("OUTPUT_PLAN.OUTPUT_ID must be new");
  if (!PART_TYPES.has(value.OUTPUT_TYPE)) reject("unsupported OUTPUT_PLAN.OUTPUT_TYPE");
  if (!Array.isArray(value.PARENT_PARTS) || value.PARENT_PARTS.length !== inputIds.size) {
    reject("OUTPUT_PLAN.PARENT_PARTS must include every input");
  }
  const parentSet = new Set(value.PARENT_PARTS);
  if (parentSet.size !== value.PARENT_PARTS.length) {
    reject("OUTPUT_PLAN.PARENT_PARTS cannot contain duplicates");
  }
  if (parentSet.size !== inputIds.size || [...inputIds].some(id => !parentSet.has(id))) {
    reject("OUTPUT_PLAN.PARENT_PARTS must equal the input set");
  }
  if (value.PEDIGREE_RULE !== "DERIVE_ALL_INPUT_PARENTS") {
    reject("OUTPUT_PLAN.PEDIGREE_RULE must be DERIVE_ALL_INPUT_PARENTS");
  }
}

export function computeLocalMachineJobSignature(input) {
  assertDataOnly(input);
  if (!isPlainObject(input)) reject("job must be a plain object");
  return h256(signaturePayload(input));
}

export function validateLocalMachineJob(input) {
  assertDataOnly(input);
  if (!isPlainObject(input)) reject("job must be a plain object");
  assertFields(input, REQUIRED_JOB_FIELDS, JOB_FIELDS, "job");

  if (input.SCHEMA !== JOB_SCHEMA) reject("unsupported job SCHEMA");
  if (input.VERSION !== "0.1") reject("unsupported job VERSION");
  if (!JOB_ID_PATTERN.test(input.JOB_ID)) reject("invalid JOB_ID");
  if (input.JOB_CLASS !== "SYNTHETIC_FIXTURE" && input.JOB_CLASS !== "RUNTIME") {
    reject("unsupported JOB_CLASS");
  }
  if (!MACHINE_ID_PATTERN.test(input.MACHINE_ID)) reject("invalid job MACHINE_ID");
  if (!ANT_ID_PATTERN.test(input.ANT_ID)) reject("invalid job ANT_ID");
  if (!MODEL_ID_PATTERN.test(input.WORLD_MODEL_ID)) reject("invalid WORLD_MODEL_ID");
  if (!Number.isSafeInteger(input.TICK) || input.TICK < 0) {
    reject("TICK must be a non-negative safe integer");
  }
  if (input.CLOCK_AUTHORITY !== CLOCK_AUTHORITY) {
    reject("CLOCK_AUTHORITY must be QUEEN_SERVER_V0_2");
  }
  if (!ADMITTED_OPERATIONS.has(input.OPERATION)) reject("unsupported OPERATION");

  const inputIds = validateInputs(input.INPUTS);
  validateLayout(input.LAYOUT, inputIds);
  validateOutputPlan(input.OUTPUT_PLAN, inputIds);

  if (input.RECYCLE_HANDOFF !== (input.OPERATION === "RECYCLE_HANDOFF")) {
    reject("RECYCLE_HANDOFF flag must match OPERATION");
  }
  if (input.TRACE_REQUIRED !== true) reject("job TRACE_REQUIRED must be true");
  if (input.PROOF_REF !== null) reject("PROOF_REF must be null at LOCAL_MACHINE v0.1");

  validateMachineSignature(input);

  if (input.EXECUTABLE !== false) reject("job EXECUTABLE must be false");
  if (input.PROOF_CLAIM !== false) reject("job PROOF_CLAIM must be false");
  if (input.GATE_AUTHORITY !== false) reject("job GATE_AUTHORITY must be false");
  if (input.ROUTING_AUTHORIZATION !== "UNDECIDED") {
    reject("job ROUTING_AUTHORIZATION must be UNDECIDED");
  }

  return deepFreeze(JSON.parse(JSON.stringify(input)));
}

export const BRUTUS_LOCAL_MACHINE_SCHEMA = MACHINE_SCHEMA;
export const BRUTUS_LOCAL_MACHINE_JOB_SCHEMA = JOB_SCHEMA;
export const BRUTUS_LOCAL_MACHINE_PART_TYPES = Object.freeze([...PART_TYPES]);
export const BRUTUS_LOCAL_MACHINE_PINS = PINS;
