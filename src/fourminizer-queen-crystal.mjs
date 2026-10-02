import { createHash } from "node:crypto";
import { BRUTUS_CODE_ACTIONS } from "./brutus-code.mjs";

const QUEEN_CRYSTAL_SCHEMA = "BRUTUS-FOURMINIZER-QUEEN-CRYSTAL-v0.1";
const BRUTUS_CODE_SCHEMA = "BRUTUS-CODE-MESSAGE-v0.1";
const SIGNATURE_METHOD = "BRUTUS-CANONICAL-JSON-SHA256-v0.1";

const REQUIRED_FIELDS = [
  "SCHEMA",
  "VERSION",
  "CRYSTAL_ID",
  "QUEEN_ID",
  "ANT_ID",
  "ROLE",
  "BIRTH_STATE",
  "BRUTUS_CODE_SCHEMA",
  "BRUTUS_CODE_REF",
  "BRUTUS_CODE_BLOB_SHA",
  "TEACHER",
  "HANDOFF",
  "MATH_CODE",
  "PEDIGREE",
  "TASK_GRAPH",
  "RECEPTORS",
  "TOOL_PORTS",
  "LOCAL_MACHINE_ID",
  "LOCAL_MACHINE_STATE",
  "SELECTION_POLICY",
  "ASSEMBLY_POLICY",
  "RESOURCE_BUDGET",
  "RECYCLE_POLICY",
  "MEMORY_POLICY",
  "SIGNATURE_METHOD",
  "SIGNATURE_H256",
  "IMMUTABLE",
  "EXECUTABLE",
  "AUTO_PROOF_PROMOTION",
  "GATE_AUTHORITY",
  "ROUTING_AUTHORIZATION"
];

const ALLOWED_FIELDS = new Set(REQUIRED_FIELDS);
const ALLOWED_ACTIONS = new Set(BRUTUS_CODE_ACTIONS);
const ALLOWED_RECEPTORS = new Set([
  "BRUTUS_CODE",
  "TRACE",
  "LOCAL_WORLD",
  "PART",
  "CRYSTAL",
  "GATE_STATE"
]);
const ALLOWED_TOOL_PORTS = new Set([
  "LOCAL_MACHINE",
  "RECYCLE_BASIN"
]);
const FORBIDDEN_CREDENTIAL_KEYS = new Set([
  "password",
  "passwd",
  "token",
  "secret",
  "apikey",
  "apitoken",
  "accesstoken",
  "refreshtoken",
  "bearertoken",
  "clientsecret",
  "privatekey",
  "authorization",
  "cookie"
]);

function reject(reason) {
  throw new Error("FOURMINIZER_QUEEN_CRYSTAL_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function normalizedKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function assertDataOnly(value, path = "queenCrystal") {
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
      if (FORBIDDEN_CREDENTIAL_KEYS.has(normalizedKey(key))) {
        reject(path + " contains forbidden credential field " + key);
      }
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

function assertExactKeys(value, expected, field) {
  if (!isPlainObject(value)) reject(field + " must be a plain object");
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    reject(field + " has unsupported fields");
  }
}

function assertUniqueEnumArray(value, allowed, field, { minItems = 0, maxItems = 32 } = {}) {
  if (!Array.isArray(value)) reject(field + " must be an array");
  if (value.length < minItems) reject(field + " requires at least " + minItems + " item(s)");
  if (value.length > maxItems) reject(field + " exceeds v0.1 limit");
  const seen = new Set();
  for (const item of value) {
    if (!allowed.has(item)) reject(field + " contains unsupported value " + String(item));
    if (seen.has(item)) reject(field + " cannot contain duplicates");
    seen.add(item);
  }
}

function validateTeacher(value) {
  assertExactKeys(value, ["ENTITY", "MODE", "NATURAL_LANGUAGE"], "TEACHER");
  if (value.ENTITY !== "@JEV") reject("TEACHER.ENTITY must be @JEV");
  if (value.MODE !== "INITIAL_ONLY") reject("TEACHER.MODE must be INITIAL_ONLY");
  if (value.NATURAL_LANGUAGE !== false) reject("TEACHER.NATURAL_LANGUAGE must be false");
}

function validateHandoff(value) {
  assertExactKeys(
    value,
    ["TARGET", "STATE", "PRESERVE_MEMORY", "PRESERVE_IDENTITY"],
    "HANDOFF"
  );
  if (value.TARGET !== "@BRUTUS") reject("HANDOFF.TARGET must be @BRUTUS");
  if (value.STATE !== "NOT_READY") reject("HANDOFF.STATE must begin at NOT_READY");
  if (value.PRESERVE_MEMORY !== true) reject("HANDOFF.PRESERVE_MEMORY must be true");
  if (value.PRESERVE_IDENTITY !== true) reject("HANDOFF.PRESERVE_IDENTITY must be true");
}

function validateMathCode(value) {
  assertExactKeys(value, ["SCHEMA", "CODE_ID", "TOKENS", "EXECUTABLE"], "MATH_CODE");
  if (value.SCHEMA !== "BRUTUS-MATH-CODE-v0.1") reject("unsupported MATH_CODE.SCHEMA");
  if (!/^MATH:[A-Z0-9-]{4,32}$/.test(value.CODE_ID)) reject("invalid MATH_CODE.CODE_ID");
  if (!Array.isArray(value.TOKENS) || value.TOKENS.length < 1 || value.TOKENS.length > 8) {
    reject("MATH_CODE.TOKENS must contain 1..8 numeric tokens");
  }
  for (const token of value.TOKENS) {
    if (typeof token !== "string" || !/^N:-?(0|[1-9][0-9]{0,15})$/.test(token)) {
      reject("MATH_CODE.TOKENS accepts Brutus numeric tokens only");
    }
  }
  if (value.EXECUTABLE !== false) reject("MATH_CODE.EXECUTABLE must be false");
}

function validatePedigree(value) {
  assertExactKeys(
    value,
    ["ROOT_Z", "EVENT_ID", "LINEAGE", "GENERATION", "PARENT_ID", "RECYCLE_COUNT"],
    "PEDIGREE"
  );

  if (value.ROOT_Z !== null && !/^Z:[A-Z0-9-]{1,32}$/.test(value.ROOT_Z)) {
    reject("invalid PEDIGREE.ROOT_Z");
  }
  if (value.EVENT_ID !== null && !/^EVT-[A-Z0-9-]{4,64}$/.test(value.EVENT_ID)) {
    reject("invalid PEDIGREE.EVENT_ID");
  }
  if (!Array.isArray(value.LINEAGE) || value.LINEAGE.length < 1 || value.LINEAGE.length > 13) {
    reject("PEDIGREE.LINEAGE must contain 1..13 lineage references");
  }
  const seen = new Set();
  for (const lineage of value.LINEAGE) {
    if (typeof lineage !== "string" || !/^L:(?:[1-9]|1[0-3])$/.test(lineage)) {
      reject("invalid PEDIGREE.LINEAGE value");
    }
    if (seen.has(lineage)) reject("PEDIGREE.LINEAGE cannot contain duplicates");
    seen.add(lineage);
  }
  if (!Number.isInteger(value.GENERATION) || value.GENERATION < 0) {
    reject("PEDIGREE.GENERATION must be a non-negative integer");
  }
  if (value.PARENT_ID !== null) reject("founder PEDIGREE.PARENT_ID must be null");
  if (value.RECYCLE_COUNT !== 0) reject("founder PEDIGREE.RECYCLE_COUNT must be 0");
}

function validateTaskGraph(value) {
  assertExactKeys(value, ["SCHEMA", "MODE", "ACTIONS", "MUTATES_ENGINE"], "TASK_GRAPH");
  if (value.SCHEMA !== "BRUTUS-QUEEN-TASK-GRAPH-v0.1") reject("unsupported TASK_GRAPH.SCHEMA");
  if (value.MODE !== "DECLARATIVE_ONLY") reject("TASK_GRAPH.MODE must be DECLARATIVE_ONLY");
  assertUniqueEnumArray(value.ACTIONS, ALLOWED_ACTIONS, "TASK_GRAPH.ACTIONS", {
    minItems: 1,
    maxItems: 18
  });
  if (value.MUTATES_ENGINE !== false) reject("TASK_GRAPH.MUTATES_ENGINE must be false");
}

function validateResourceBudget(value) {
  assertExactKeys(
    value,
    ["MAX_ACTIONS_PER_CYCLE", "MAX_MESSAGE_ARGS", "MAX_MARKERS"],
    "RESOURCE_BUDGET"
  );
  if (!Number.isInteger(value.MAX_ACTIONS_PER_CYCLE) || value.MAX_ACTIONS_PER_CYCLE < 1 || value.MAX_ACTIONS_PER_CYCLE > 16) {
    reject("RESOURCE_BUDGET.MAX_ACTIONS_PER_CYCLE must be 1..16");
  }
  if (value.MAX_MESSAGE_ARGS !== 16) reject("RESOURCE_BUDGET.MAX_MESSAGE_ARGS must match Brutus Code v0.1");
  if (value.MAX_MARKERS !== 4) reject("RESOURCE_BUDGET.MAX_MARKERS must match Brutus Code v0.1");
}

function validateMemoryPolicy(value) {
  assertExactKeys(
    value,
    ["TRACE_WRITE", "EXTERNAL_CRYSTALLIZED_READ_ONLY", "RAW_EXTERNAL_READ"],
    "MEMORY_POLICY"
  );
  if (value.TRACE_WRITE !== true) reject("MEMORY_POLICY.TRACE_WRITE must be true");
  if (value.EXTERNAL_CRYSTALLIZED_READ_ONLY !== true) {
    reject("MEMORY_POLICY.EXTERNAL_CRYSTALLIZED_READ_ONLY must be true");
  }
  if (value.RAW_EXTERNAL_READ !== false) reject("MEMORY_POLICY.RAW_EXTERNAL_READ must be false");
}

function signaturePayload(input) {
  const copy = JSON.parse(JSON.stringify(input));
  delete copy.SIGNATURE_H256;
  return copy;
}

export function computeFourminizerQueenSignature(input) {
  assertDataOnly(input);
  if (!isPlainObject(input)) reject("queen crystal must be a plain object");
  return h256(signaturePayload(input));
}

export function validateFourminizerQueenCrystal(input) {
  assertDataOnly(input);
  if (!isPlainObject(input)) reject("queen crystal must be a plain object");

  for (const key of Object.keys(input)) {
    if (!ALLOWED_FIELDS.has(key)) reject("unknown queen crystal field " + key);
  }
  for (const field of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) {
      reject("missing queen crystal field " + field);
    }
  }

  if (input.SCHEMA !== QUEEN_CRYSTAL_SCHEMA) reject("unsupported SCHEMA");
  if (input.VERSION !== "0.1") reject("unsupported VERSION");
  if (!/^BRUTUS-FOURMINIZER-QUEEN-CRYSTAL-[0-9]{4}$/.test(input.CRYSTAL_ID)) {
    reject("invalid CRYSTAL_ID");
  }
  if (!/^FOURMINIZER-QUEEN-[0-9]{4}$/.test(input.QUEEN_ID)) reject("invalid QUEEN_ID");
  if (!/^ANT-[0-9A-F]{12}$/.test(input.ANT_ID)) reject("invalid ANT_ID");
  if (input.ROLE !== "FOURMINIZER_QUEEN") reject("ROLE must be FOURMINIZER_QUEEN");
  if (input.BIRTH_STATE !== "DORMANT") reject("BIRTH_STATE must begin at DORMANT");

  if (input.BRUTUS_CODE_SCHEMA !== BRUTUS_CODE_SCHEMA) reject("unsupported BRUTUS_CODE_SCHEMA");
  if (input.BRUTUS_CODE_REF !== "contracts/brutus-code.v0.schema.json") {
    reject("BRUTUS_CODE_REF must pin the v0.1 contract");
  }
  if (!/^[a-f0-9]{40}$/i.test(input.BRUTUS_CODE_BLOB_SHA)) {
    reject("BRUTUS_CODE_BLOB_SHA must be a Git SHA-1");
  }

  validateTeacher(input.TEACHER);
  validateHandoff(input.HANDOFF);
  validateMathCode(input.MATH_CODE);
  validatePedigree(input.PEDIGREE);
  validateTaskGraph(input.TASK_GRAPH);

  assertUniqueEnumArray(input.RECEPTORS, ALLOWED_RECEPTORS, "RECEPTORS", {
    minItems: 3,
    maxItems: 6
  });
  for (const required of ["BRUTUS_CODE", "TRACE", "LOCAL_WORLD"]) {
    if (!input.RECEPTORS.includes(required)) reject("RECEPTORS must include " + required);
  }

  assertUniqueEnumArray(input.TOOL_PORTS, ALLOWED_TOOL_PORTS, "TOOL_PORTS", {
    minItems: 1,
    maxItems: 2
  });
  if (!input.TOOL_PORTS.includes("LOCAL_MACHINE")) reject("TOOL_PORTS must include LOCAL_MACHINE");

  if (input.LOCAL_MACHINE_ID !== null) reject("LOCAL_MACHINE_ID must be null until its contract exists");
  if (input.LOCAL_MACHINE_STATE !== "UNBOUND") reject("LOCAL_MACHINE_STATE must begin at UNBOUND");
  if (input.SELECTION_POLICY !== "FAIL_CLOSED") reject("SELECTION_POLICY must be FAIL_CLOSED");
  if (input.ASSEMBLY_POLICY !== "CONTRACT_REQUIRED") reject("ASSEMBLY_POLICY must be CONTRACT_REQUIRED");

  validateResourceBudget(input.RESOURCE_BUDGET);

  if (input.RECYCLE_POLICY !== "PRESERVE_PEDIGREE") reject("RECYCLE_POLICY must be PRESERVE_PEDIGREE");
  validateMemoryPolicy(input.MEMORY_POLICY);

  if (input.SIGNATURE_METHOD !== SIGNATURE_METHOD) reject("unsupported SIGNATURE_METHOD");
  if (typeof input.SIGNATURE_H256 !== "string" || !/^[a-f0-9]{64}$/i.test(input.SIGNATURE_H256)) {
    reject("SIGNATURE_H256 must be SHA-256 hex");
  }
  const expectedSignature = computeFourminizerQueenSignature(input);
  if (input.SIGNATURE_H256.toLowerCase() !== expectedSignature) reject("SIGNATURE_H256 mismatch");

  if (input.IMMUTABLE !== true) reject("IMMUTABLE must be true");
  if (input.EXECUTABLE !== false) reject("EXECUTABLE must be false");
  if (input.AUTO_PROOF_PROMOTION !== false) reject("AUTO_PROOF_PROMOTION must be false");
  if (input.GATE_AUTHORITY !== false) reject("GATE_AUTHORITY must be false");
  if (input.ROUTING_AUTHORIZATION !== "UNDECIDED") {
    reject("ROUTING_AUTHORIZATION must begin at UNDECIDED");
  }

  return deepFreeze(JSON.parse(JSON.stringify(input)));
}

export const FOURMINIZER_QUEEN_CRYSTAL_SCHEMA = QUEEN_CRYSTAL_SCHEMA;
export const FOURMINIZER_QUEEN_SIGNATURE_METHOD = SIGNATURE_METHOD;
