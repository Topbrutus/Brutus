const RESULT_SCHEMA = "BRUTUS-COUNTER-TEST-RESULT-v0.1";
const RECORD_SCHEMA = "BRUTUS-ANCHOR-RECORD-v0.1";
const FIXED_ANCHOR_ID = "ANCHOR-0001";
const COUNTER_TEST_PROTOTYPE = "BRUTUS-PROTOTYPE-COUNTER-TEST-BENCH-0001";
const ALLOWED_VERDICTS = new Set(["PASS", "FAIL", "INCONCLUSIVE", "ERROR"]);
const REQUIRED_FIELDS = [
  "SCHEMA",
  "RESULT_ID",
  "RECORD_ID",
  "VERSION",
  "ANCHOR_ID",
  "PLAN_ID",
  "EXECUTION_REF",
  "EXECUTED_AT_UTC",
  "PROTOCOL_VERSION",
  "VERDICT",
  "CHECK_RESULTS",
  "SUMMARY",
  "EVIDENCE_LEVEL",
  "PROOF_REF",
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
  "privatekey",
  "authorization",
  "cookie"
]);

function reject(reason) {
  throw new Error("COUNTER_TEST_RESULT_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function normalizedKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function assertDataOnly(value, path = "result") {
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

function validateVerdictCoherence(verdict, checkResults) {
  const statuses = checkResults.map((item) => item.STATUS);

  if (verdict === "PASS" && !statuses.every((status) => status === "PASS")) {
    reject("PASS verdict requires every check to PASS");
  }

  if (verdict === "FAIL") {
    if (!statuses.includes("FAIL")) reject("FAIL verdict requires at least one FAIL check");
    if (statuses.includes("ERROR")) reject("FAIL verdict cannot hide ERROR check");
  }

  if (verdict === "INCONCLUSIVE") {
    if (!statuses.includes("INCONCLUSIVE")) {
      reject("INCONCLUSIVE verdict requires at least one INCONCLUSIVE check");
    }
    if (statuses.includes("FAIL") || statuses.includes("ERROR")) {
      reject("INCONCLUSIVE verdict cannot hide FAIL or ERROR check");
    }
  }

  if (verdict === "ERROR" && !statuses.includes("ERROR")) {
    reject("ERROR verdict requires at least one ERROR check");
  }
}

function validateResult(input, queue) {
  assertDataOnly(input);
  if (!isPlainObject(input)) reject("result must be a plain object");

  for (const key of Object.keys(input)) {
    if (!ALLOWED_FIELDS.has(key)) reject("unknown result field " + key);
  }
  for (const field of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) {
      reject("missing result field " + field);
    }
  }

  if (input.SCHEMA !== RESULT_SCHEMA) reject("unsupported SCHEMA");
  if (input.VERSION !== "0.1") reject("unsupported VERSION");
  if (input.ANCHOR_ID !== FIXED_ANCHOR_ID) reject("result must belong to ANCHOR-0001");

  assertString(input.RESULT_ID, "RESULT_ID");
  if (!/^BRUTUS-COUNTER-RESULT-[A-Z0-9-]+$/.test(input.RESULT_ID)) {
    reject("invalid RESULT_ID");
  }

  assertString(input.RECORD_ID, "RECORD_ID");
  if (!/^BRUTUS-RECORD-[A-Z0-9-]+$/.test(input.RECORD_ID)) {
    reject("invalid RECORD_ID");
  }

  assertString(input.PLAN_ID, "PLAN_ID");
  const plan = queue.get(input.PLAN_ID);
  if (plan === null) reject("unknown PLAN_ID " + input.PLAN_ID);

  assertString(input.EXECUTION_REF, "EXECUTION_REF");

  if (input.EXECUTED_AT_UTC !== null) {
    assertString(input.EXECUTED_AT_UTC, "EXECUTED_AT_UTC");
    if (!Number.isFinite(Date.parse(input.EXECUTED_AT_UTC))) {
      reject("EXECUTED_AT_UTC must be a valid date-time or null");
    }
  }

  assertString(input.PROTOCOL_VERSION, "PROTOCOL_VERSION");
  if (!ALLOWED_VERDICTS.has(input.VERDICT)) reject("unsupported VERDICT");

  if (!Array.isArray(input.CHECK_RESULTS)) reject("CHECK_RESULTS must be an array");

  const expectedIds = new Set(plan.CHECKS.map((check) => check.CHECK_ID));
  const seenIds = new Set();

  if (input.CHECK_RESULTS.length !== expectedIds.size) {
    reject("CHECK_RESULTS must report every planned check exactly once");
  }

  for (const result of input.CHECK_RESULTS) {
    if (!isPlainObject(result)) reject("CHECK_RESULTS items must be plain objects");
    const keys = Object.keys(result);
    if (
      keys.length !== 4 ||
      !keys.includes("CHECK_ID") ||
      !keys.includes("STATUS") ||
      !keys.includes("OBSERVED") ||
      !keys.includes("NOTES")
    ) {
      reject("CHECK_RESULTS item has unsupported fields");
    }

    assertString(result.CHECK_ID, "CHECK_ID");
    if (!expectedIds.has(result.CHECK_ID)) {
      reject("unexpected CHECK_ID " + result.CHECK_ID);
    }
    if (seenIds.has(result.CHECK_ID)) {
      reject("duplicate CHECK_ID " + result.CHECK_ID);
    }
    seenIds.add(result.CHECK_ID);

    if (!ALLOWED_VERDICTS.has(result.STATUS)) {
      reject("unsupported check STATUS " + result.STATUS);
    }
    if (!isPlainObject(result.OBSERVED)) reject("OBSERVED must be a plain object");
    assertStringArray(result.NOTES, "CHECK_RESULTS.NOTES");
  }

  validateVerdictCoherence(input.VERDICT, input.CHECK_RESULTS);

  assertString(input.SUMMARY, "SUMMARY");
  if (input.EVIDENCE_LEVEL !== "COUNTER_TEST_RESULT") {
    reject("EVIDENCE_LEVEL must be COUNTER_TEST_RESULT");
  }
  if (input.PROOF_REF !== null) reject("PROOF_REF must remain null at result gate");
  if (input.AUTO_PROOF_PROMOTION !== false) reject("AUTO_PROOF_PROMOTION must be false");
  assertStringArray(input.NOTES, "NOTES");

  return {
    result: deepFreeze(JSON.parse(JSON.stringify(input))),
    plan
  };
}

export function createCounterTestResultGate({ queue, station }) {
  if (!queue || typeof queue.get !== "function") {
    reject("Counter-Test Queue runtime is required");
  }
  if (!station || typeof station.getPrototype !== "function") {
    reject("ASTRA STATION runtime is required");
  }
  if (station.getPrototype(COUNTER_TEST_PROTOTYPE) === null) {
    reject("Counter-Test Bench prototype is not registered");
  }

  return Object.freeze({
    qualify(input) {
      const { result, plan } = validateResult(input, queue);

      return deepFreeze({
        SCHEMA: RECORD_SCHEMA,
        RECORD_ID: result.RECORD_ID,
        VERSION: "0.1",
        ANCHOR_ID: FIXED_ANCHOR_ID,
        PROTOTYPE_ID: COUNTER_TEST_PROTOTYPE,
        RECORD_TYPE: "RESULT",
        CARD_ID: null,
        SOURCE_REF: "COUNTER_TEST:" + plan.PLAN_ID + ":" + result.EXECUTION_REF,
        OBSERVED_AT_UTC: result.EXECUTED_AT_UTC,
        DATA: {
          evidence_level: result.EVIDENCE_LEVEL,
          result_id: result.RESULT_ID,
          plan_id: result.PLAN_ID,
          protocol_version: result.PROTOCOL_VERSION,
          verdict: result.VERDICT,
          summary: result.SUMMARY,
          check_results: result.CHECK_RESULTS,
          source_record_ids: plan.SOURCE_RECORD_IDS,
          confirmation_criteria: plan.CONFIRMATION_CRITERIA,
          contradiction_criteria: plan.CONTRADICTION_CRITERIA,
          auto_proof_promotion: false
        },
        PROOF_REF: null,
        NOTES: [
          ...result.NOTES,
          "Qualified by Counter-Test Result Gate.",
          "This RESULT is not a proof and cannot self-promote."
        ]
      });
    }
  });
}

export const BRUTUS_COUNTER_TEST_RESULT_SCHEMA = RESULT_SCHEMA;
