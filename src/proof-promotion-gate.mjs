import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const PROMOTION_SCHEMA = "BRUTUS-PROOF-PROMOTION-v0.1";
const RECORD_SCHEMA = "BRUTUS-ANCHOR-RECORD-v0.1";
const FIXED_ANCHOR_ID = "ANCHOR-0001";
const COUNTER_TEST_PROTOTYPE = "BRUTUS-PROTOTYPE-COUNTER-TEST-BENCH-0001";
const COUNTER_TEST_EVIDENCE_LEVEL = "COUNTER_TEST_RESULT";
const REQUIRED_FIELDS = [
  "SCHEMA",
  "PROMOTION_ID",
  "RECORD_ID",
  "VERSION",
  "ANCHOR_ID",
  "RESULT_RECORD_ID",
  "PROOF_REF",
  "EXPECTED_PROOF_H256",
  "REVIEW_STATUS",
  "REVIEW_AUTHORITY",
  "REVIEWED_AT_UTC",
  "SCOPE",
  "LIMITATIONS",
  "AUTO_PROMOTION",
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
  throw new Error("PROOF_PROMOTION_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function normalizedKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function assertDataOnly(value, pathLabel = "promotion") {
  if (value === null) return;
  const type = typeof value;

  if (type === "string" || type === "boolean") return;
  if (type === "number") {
    if (!Number.isFinite(value)) reject(pathLabel + " contains a non-finite number");
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertDataOnly(item, pathLabel + "[" + index + "]"));
    return;
  }
  if (type === "object" && isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (FORBIDDEN_CREDENTIAL_KEYS.has(normalizedKey(key))) {
        reject(pathLabel + " contains forbidden credential field " + key);
      }
      assertDataOnly(item, pathLabel + "." + key);
    }
    return;
  }
  reject(pathLabel + " must contain data only");
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

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function isInside(parent, child) {
  return child === parent || child.startsWith(parent + path.sep);
}

function resolveProofPath(repositoryRoot, proofRef) {
  const root = path.resolve(repositoryRoot);
  const proofsRoot = path.resolve(root, "proofs");
  const resolved = path.resolve(root, proofRef);

  if (!isInside(proofsRoot, resolved)) {
    reject("PROOF_REF must stay inside proofs/");
  }
  if (!fs.existsSync(proofsRoot)) reject("proofs directory does not exist");

  const proofsRootLstat = fs.lstatSync(proofsRoot);
  if (proofsRootLstat.isSymbolicLink()) {
    reject("proofs directory must not be a symbolic link");
  }

  if (!fs.existsSync(resolved)) reject("proof artifact does not exist");

  const artifactLstat = fs.lstatSync(resolved);
  if (artifactLstat.isSymbolicLink()) {
    reject("proof artifact must not be a symbolic link");
  }

  const realProofsRoot = fs.realpathSync(proofsRoot);
  const realResolved = fs.realpathSync(resolved);
  if (!isInside(realProofsRoot, realResolved)) {
    reject("proof artifact real path escapes proofs/");
  }

  return realResolved;
}

function validatePromotion(input, ledger, repositoryRoot) {
  assertDataOnly(input);
  if (!isPlainObject(input)) reject("promotion must be a plain object");

  for (const key of Object.keys(input)) {
    if (!ALLOWED_FIELDS.has(key)) reject("unknown promotion field " + key);
  }
  for (const field of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) {
      reject("missing promotion field " + field);
    }
  }

  if (input.SCHEMA !== PROMOTION_SCHEMA) reject("unsupported SCHEMA");
  if (input.VERSION !== "0.1") reject("unsupported VERSION");
  if (input.ANCHOR_ID !== FIXED_ANCHOR_ID) reject("promotion must belong to ANCHOR-0001");

  assertString(input.PROMOTION_ID, "PROMOTION_ID");
  if (!/^BRUTUS-PROOF-PROMOTION-[A-Z0-9-]+$/.test(input.PROMOTION_ID)) {
    reject("invalid PROMOTION_ID");
  }

  assertString(input.RECORD_ID, "RECORD_ID");
  if (!/^BRUTUS-RECORD-[A-Z0-9-]+$/.test(input.RECORD_ID)) {
    reject("invalid RECORD_ID");
  }

  assertString(input.RESULT_RECORD_ID, "RESULT_RECORD_ID");
  const resultEntry = ledger.get(input.RESULT_RECORD_ID);
  if (resultEntry === null) reject("unknown RESULT_RECORD_ID " + input.RESULT_RECORD_ID);
  if (resultEntry.RECORD.RECORD_TYPE !== "RESULT") {
    reject("RESULT_RECORD_ID must reference a RESULT record");
  }
  if (resultEntry.RECORD.PROOF_REF !== null) {
    reject("source RESULT already carries a proof reference");
  }
  if (resultEntry.RECORD.PROTOTYPE_ID !== COUNTER_TEST_PROTOTYPE) {
    reject("source RESULT must belong to Counter-Test Bench");
  }

  const resultData = resultEntry.RECORD.DATA;
  if (!isPlainObject(resultData)) {
    reject("source RESULT DATA must be a plain object");
  }
  if (resultData.evidence_level !== COUNTER_TEST_EVIDENCE_LEVEL) {
    reject("source RESULT must be qualified by Counter-Test Result Gate");
  }
  if (resultData.auto_proof_promotion !== false) {
    reject("source RESULT must preserve auto_proof_promotion=false");
  }
  assertString(resultData.result_id, "source RESULT result_id");
  assertString(resultData.plan_id, "source RESULT plan_id");
  assertString(resultData.protocol_version, "source RESULT protocol_version");
  assertString(resultData.summary, "source RESULT summary");
  if (!Array.isArray(resultData.check_results) || resultData.check_results.length === 0) {
    reject("source RESULT must contain qualified check_results");
  }
  const expectedSourcePrefix = "COUNTER_TEST:" + resultData.plan_id + ":";
  if (
    typeof resultEntry.RECORD.SOURCE_REF !== "string" ||
    !resultEntry.RECORD.SOURCE_REF.startsWith(expectedSourcePrefix)
  ) {
    reject("source RESULT provenance does not match qualified plan");
  }

  const verdict = resultData.verdict ?? null;
  if (!["PASS", "FAIL"].includes(verdict)) {
    reject("source RESULT must have PASS or FAIL verdict before proof promotion");
  }

  assertString(input.PROOF_REF, "PROOF_REF");
  if (!/^proofs\/[A-Za-z0-9._/-]+$/.test(input.PROOF_REF)) {
    reject("invalid PROOF_REF");
  }

  assertString(input.EXPECTED_PROOF_H256, "EXPECTED_PROOF_H256");
  if (!/^[0-9a-f]{64}$/.test(input.EXPECTED_PROOF_H256)) {
    reject("EXPECTED_PROOF_H256 must be a lowercase SHA-256 hex digest");
  }

  const proofPath = resolveProofPath(repositoryRoot, input.PROOF_REF);
  const stat = fs.statSync(proofPath);
  if (!stat.isFile()) reject("PROOF_REF must resolve to a file");

  const actualH256 = sha256(fs.readFileSync(proofPath));
  if (actualH256 !== input.EXPECTED_PROOF_H256) {
    reject("proof artifact SHA-256 mismatch");
  }

  if (input.REVIEW_STATUS !== "APPROVED") reject("REVIEW_STATUS must be APPROVED");
  assertString(input.REVIEW_AUTHORITY, "REVIEW_AUTHORITY");
  assertString(input.REVIEWED_AT_UTC, "REVIEWED_AT_UTC");
  if (!Number.isFinite(Date.parse(input.REVIEWED_AT_UTC))) {
    reject("REVIEWED_AT_UTC must be a valid date-time");
  }
  assertString(input.SCOPE, "SCOPE");
  assertStringArray(input.LIMITATIONS, "LIMITATIONS");
  if (input.AUTO_PROMOTION !== false) reject("AUTO_PROMOTION must be false");
  assertStringArray(input.NOTES, "NOTES");

  return {
    promotion: deepFreeze(JSON.parse(JSON.stringify(input))),
    resultEntry,
    actualH256
  };
}

export function createProofPromotionGate({ ledger, repositoryRoot }) {
  if (!ledger || typeof ledger.get !== "function" || typeof ledger.verify !== "function") {
    reject("Anchor ledger runtime is required");
  }
  if (ledger.verify().VALID !== true) {
    reject("Anchor ledger must verify before proof promotion");
  }
  assertString(repositoryRoot, "repositoryRoot");

  return Object.freeze({
    qualify(input) {
      const { promotion, resultEntry, actualH256 } = validatePromotion(
        input,
        ledger,
        repositoryRoot
      );

      return deepFreeze({
        SCHEMA: RECORD_SCHEMA,
        RECORD_ID: promotion.RECORD_ID,
        VERSION: "0.1",
        ANCHOR_ID: FIXED_ANCHOR_ID,
        PROTOTYPE_ID: resultEntry.RECORD.PROTOTYPE_ID,
        RECORD_TYPE: "PROOF_REF",
        CARD_ID: null,
        SOURCE_REF: "PROOF_PROMOTION:" + promotion.PROMOTION_ID,
        OBSERVED_AT_UTC: promotion.REVIEWED_AT_UTC,
        DATA: {
          result_record_id: promotion.RESULT_RECORD_ID,
          result_verdict: resultEntry.RECORD.DATA.verdict,
          proof_h256: actualH256,
          review_status: promotion.REVIEW_STATUS,
          review_authority: promotion.REVIEW_AUTHORITY,
          scope: promotion.SCOPE,
          limitations: promotion.LIMITATIONS,
          auto_promotion: false
        },
        PROOF_REF: promotion.PROOF_REF,
        NOTES: [
          ...promotion.NOTES,
          "Proof artifact existence and SHA-256 were verified locally.",
          "This gate links a reviewed artifact to a result; it does not determine mathematical or scientific truth by itself."
        ]
      });
    }
  });
}

export const BRUTUS_PROOF_PROMOTION_SCHEMA = PROMOTION_SCHEMA;
