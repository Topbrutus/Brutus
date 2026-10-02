import { createHash } from "node:crypto";

const CRYSTAL_SCHEMA = "BRUTUS-CRYSTAL-v0.1";
const FIXED_ANCHOR_ID = "ANCHOR-0001";
const FIXED_RECONSTRUCTION_METHOD = "BRUTUS-CANONICAL-JSON-SHA256-v0.1";
const ALLOWED_EVIDENCE_LABELS = new Set([
  "SOURCE",
  "MESURE",
  "CALCUL",
  "CANDIDAT",
  "HYPOTHESE",
  "INTERPRETATION"
]);
const ALLOWED_SOURCE_KINDS = new Set([
  "GIT_BLOB",
  "GIT_COMMIT",
  "BRUTUS_RECORD",
  "BRUTUS_PROOF",
  "RUNTIME_TRACE",
  "EXTERNAL_REPORT"
]);
const REQUIRED_FIELDS = [
  "SCHEMA",
  "CRYSTAL_ID",
  "VERSION",
  "ANCHOR_ID",
  "EVIDENCE_LABEL",
  "SOURCE_REFS",
  "PAYLOAD",
  "PAYLOAD_H256",
  "RECONSTRUCTION",
  "PROOF_REFS",
  "IMMUTABLE",
  "EXECUTABLE",
  "AUTO_PROOF_PROMOTION",
  "NOTES"
];
const ALLOWED_FIELDS = new Set(REQUIRED_FIELDS);
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
  throw new Error("CRYSTAL_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function normalizedKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function assertDataOnly(value, path = "crystal") {
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

function assertString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    reject(field + " must be a non-empty string");
  }
}

function assertStringArray(value, field) {
  if (!Array.isArray(value)) reject(field + " must be an array");
  for (const item of value) {
    if (typeof item !== "string") reject(field + " must contain strings only");
  }
}

function validateSourceRefs(sourceRefs) {
  if (!Array.isArray(sourceRefs) || sourceRefs.length === 0) {
    reject("SOURCE_REFS requires at least one source");
  }

  for (const source of sourceRefs) {
    if (!isPlainObject(source)) reject("SOURCE_REFS items must be plain objects");
    const keys = Object.keys(source).sort();
    const expected = ["DIGEST", "DIGEST_ALGORITHM", "KIND", "REF"];
    if (JSON.stringify(keys) !== JSON.stringify(expected)) {
      reject("SOURCE_REFS item has unsupported fields");
    }
    if (!ALLOWED_SOURCE_KINDS.has(source.KIND)) reject("unsupported SOURCE_REFS KIND");
    assertString(source.REF, "SOURCE_REFS.REF");

    if (source.DIGEST_ALGORITHM === "NONE") {
      if (source.DIGEST !== null) reject("NONE digest algorithm requires DIGEST=null");
      continue;
    }

    assertString(source.DIGEST, "SOURCE_REFS.DIGEST");
    if (source.DIGEST_ALGORITHM === "SHA256") {
      if (!/^[a-f0-9]{64}$/i.test(source.DIGEST)) reject("invalid SHA256 digest");
      continue;
    }
    if (source.DIGEST_ALGORITHM === "GIT_SHA1") {
      if (!/^[a-f0-9]{40}$/i.test(source.DIGEST)) reject("invalid GIT_SHA1 digest");
      continue;
    }
    reject("unsupported DIGEST_ALGORITHM");
  }
}

function validateReconstruction(value) {
  if (!isPlainObject(value)) reject("RECONSTRUCTION must be a plain object");
  const keys = Object.keys(value).sort();
  const expected = ["CANONICALIZATION", "METHOD", "PAYLOAD_FORMAT"];
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    reject("RECONSTRUCTION has unsupported fields");
  }
  if (value.METHOD !== FIXED_RECONSTRUCTION_METHOD) reject("unsupported RECONSTRUCTION.METHOD");
  if (value.PAYLOAD_FORMAT !== "JSON") reject("RECONSTRUCTION.PAYLOAD_FORMAT must be JSON");
  if (value.CANONICALIZATION !== "RECURSIVE_SORTED_OBJECT_KEYS") {
    reject("unsupported RECONSTRUCTION.CANONICALIZATION");
  }
}

export function computeCrystalPayloadH256(payload) {
  assertDataOnly(payload, "PAYLOAD");
  if (!isPlainObject(payload)) reject("PAYLOAD must be a plain object");
  return h256(payload);
}

export function validateCrystal(input) {
  assertDataOnly(input);
  if (!isPlainObject(input)) reject("crystal must be a plain object");

  for (const key of Object.keys(input)) {
    if (!ALLOWED_FIELDS.has(key)) reject("unknown crystal field " + key);
  }
  for (const field of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) reject("missing crystal field " + field);
  }

  if (input.SCHEMA !== CRYSTAL_SCHEMA) reject("unsupported SCHEMA");
  if (input.VERSION !== "0.1") reject("unsupported VERSION");
  if (input.ANCHOR_ID !== FIXED_ANCHOR_ID) reject("crystal must belong to ANCHOR-0001");

  assertString(input.CRYSTAL_ID, "CRYSTAL_ID");
  if (!/^BRUTUS-CRYSTAL-[A-Z0-9-]+$/.test(input.CRYSTAL_ID)) reject("invalid CRYSTAL_ID");
  if (!ALLOWED_EVIDENCE_LABELS.has(input.EVIDENCE_LABEL)) reject("unsupported EVIDENCE_LABEL");

  validateSourceRefs(input.SOURCE_REFS);
  if (!isPlainObject(input.PAYLOAD)) reject("PAYLOAD must be a plain object");

  assertString(input.PAYLOAD_H256, "PAYLOAD_H256");
  if (!/^[a-f0-9]{64}$/i.test(input.PAYLOAD_H256)) reject("PAYLOAD_H256 must be SHA-256 hex");
  const expectedHash = computeCrystalPayloadH256(input.PAYLOAD);
  if (input.PAYLOAD_H256.toLowerCase() !== expectedHash) reject("PAYLOAD_H256 mismatch");

  validateReconstruction(input.RECONSTRUCTION);
  assertStringArray(input.PROOF_REFS, "PROOF_REFS");
  if (input.IMMUTABLE !== true) reject("IMMUTABLE must be true");
  if (input.EXECUTABLE !== false) reject("EXECUTABLE must be false");
  if (input.AUTO_PROOF_PROMOTION !== false) reject("AUTO_PROOF_PROMOTION must be false");
  assertStringArray(input.NOTES, "NOTES");

  return deepFreeze(JSON.parse(JSON.stringify(input)));
}

export const BRUTUS_CRYSTAL_SCHEMA = CRYSTAL_SCHEMA;
export const BRUTUS_CRYSTAL_RECONSTRUCTION_METHOD = FIXED_RECONSTRUCTION_METHOD;
