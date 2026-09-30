const PLAN_SCHEMA = "BRUTUS-COUNTER-TEST-PLAN-v0.1";
const FIXED_ANCHOR_ID = "ANCHOR-0001";
const COUNTER_TEST_PROTOTYPE = "BRUTUS-PROTOTYPE-COUNTER-TEST-BENCH-0001";
const ALLOWED_PRIORITY = new Set(["P0", "P1", "P2", "P3"]);
const ALLOWED_STATUS = new Set(["READY", "BLOCKED"]);
const ALLOWED_KINDS = new Set([
  "EXACT_ARITHMETIC",
  "MACHINE_REPRODUCTION",
  "SOURCE_AUDIT",
  "BOUNDED_SCAN",
  "FACTORIZATION",
  "RANK_VERIFICATION",
  "INVARIANT"
]);
const REQUIRED_FIELDS = [
  "SCHEMA",
  "PLAN_ID",
  "VERSION",
  "ANCHOR_ID",
  "PROTOTYPE_ID",
  "SOURCE_RECORD_IDS",
  "TITLE",
  "QUESTION",
  "PRIORITY",
  "STATUS",
  "CHECKS",
  "CONFIRMATION_CRITERIA",
  "CONTRADICTION_CRITERIA",
  "OUTPUT_RECORD_TYPE",
  "AUTO_EXECUTE",
  "PROOF_PROMOTION",
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
  throw new Error("COUNTER_TEST_QUEUE_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function normalizedKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function assertDataOnly(value, path = "plan") {
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

function assertStringArray(value, field, { minItems = 0 } = {}) {
  if (!Array.isArray(value)) reject(field + " must be an array");
  if (value.length < minItems) reject(field + " requires at least " + minItems + " item(s)");
  const seen = new Set();
  for (const item of value) {
    assertString(item, field);
    if (seen.has(item)) reject(field + " contains duplicate item " + item);
    seen.add(item);
  }
}

function validateChecks(checks) {
  if (!Array.isArray(checks) || checks.length === 0) {
    reject("CHECKS requires at least one check");
  }

  const ids = new Set();
  for (const check of checks) {
    if (!isPlainObject(check)) reject("CHECKS items must be plain objects");
    const keys = Object.keys(check);
    if (
      keys.length !== 3 ||
      !keys.includes("CHECK_ID") ||
      !keys.includes("KIND") ||
      !keys.includes("DESCRIPTION")
    ) {
      reject("CHECKS item has unsupported fields");
    }
    assertString(check.CHECK_ID, "CHECK_ID");
    if (!/^CT-[0-9]{2}$/.test(check.CHECK_ID)) reject("invalid CHECK_ID " + check.CHECK_ID);
    if (ids.has(check.CHECK_ID)) reject("duplicate CHECK_ID " + check.CHECK_ID);
    ids.add(check.CHECK_ID);
    if (!ALLOWED_KINDS.has(check.KIND)) reject("unsupported check KIND " + check.KIND);
    assertString(check.DESCRIPTION, "DESCRIPTION");
  }
}

function validatePlan(input, station, ledger) {
  assertDataOnly(input);
  if (!isPlainObject(input)) reject("plan must be a plain object");

  for (const key of Object.keys(input)) {
    if (!ALLOWED_FIELDS.has(key)) reject("unknown plan field " + key);
  }
  for (const field of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) {
      reject("missing plan field " + field);
    }
  }

  if (input.SCHEMA !== PLAN_SCHEMA) reject("unsupported SCHEMA");
  if (input.VERSION !== "0.1") reject("unsupported VERSION");
  if (input.ANCHOR_ID !== FIXED_ANCHOR_ID) reject("plan must belong to ANCHOR-0001");
  if (input.PROTOTYPE_ID !== COUNTER_TEST_PROTOTYPE) {
    reject("plan must belong to Counter-Test Bench");
  }
  if (station.getPrototype(COUNTER_TEST_PROTOTYPE) === null) {
    reject("Counter-Test Bench prototype is not registered");
  }

  assertString(input.PLAN_ID, "PLAN_ID");
  if (!/^BRUTUS-COUNTER-TEST-[A-Z0-9-]+$/.test(input.PLAN_ID)) reject("invalid PLAN_ID");

  assertStringArray(input.SOURCE_RECORD_IDS, "SOURCE_RECORD_IDS", { minItems: 1 });
  for (const recordId of input.SOURCE_RECORD_IDS) {
    if (ledger.get(recordId) === null) reject("unknown SOURCE_RECORD_ID " + recordId);
  }

  assertString(input.TITLE, "TITLE");
  assertString(input.QUESTION, "QUESTION");
  if (!ALLOWED_PRIORITY.has(input.PRIORITY)) reject("unsupported PRIORITY");
  if (!ALLOWED_STATUS.has(input.STATUS)) reject("unsupported STATUS");
  validateChecks(input.CHECKS);
  assertStringArray(input.CONFIRMATION_CRITERIA, "CONFIRMATION_CRITERIA", { minItems: 1 });
  assertStringArray(input.CONTRADICTION_CRITERIA, "CONTRADICTION_CRITERIA", { minItems: 1 });

  if (input.OUTPUT_RECORD_TYPE !== "RESULT") reject("OUTPUT_RECORD_TYPE must be RESULT");
  if (input.AUTO_EXECUTE !== false) reject("AUTO_EXECUTE must be false");
  if (input.PROOF_PROMOTION !== "MANUAL_AFTER_VERIFICATION") {
    reject("PROOF_PROMOTION must be MANUAL_AFTER_VERIFICATION");
  }
  assertStringArray(input.NOTES, "NOTES");

  return deepFreeze(JSON.parse(JSON.stringify(input)));
}

export function createCounterTestQueue({ station, ledger }) {
  if (!station || station.anchorId !== FIXED_ANCHOR_ID || typeof station.getPrototype !== "function") {
    reject("ASTRA STATION runtime is required");
  }
  if (!ledger || typeof ledger.get !== "function" || typeof ledger.verify !== "function") {
    reject("Anchor ledger runtime is required");
  }
  if (ledger.verify().VALID !== true) {
    reject("Anchor ledger must verify before plans are registered");
  }

  const plans = new Map();

  return Object.freeze({
    register(planInput) {
      const plan = validatePlan(planInput, station, ledger);
      if (plans.has(plan.PLAN_ID)) reject("duplicate PLAN_ID " + plan.PLAN_ID);
      plans.set(plan.PLAN_ID, plan);
      return plan;
    },

    get(planId) {
      return plans.get(planId) ?? null;
    },

    list({ priority = null, status = null } = {}) {
      return Object.freeze(
        [...plans.values()]
          .filter((plan) => {
            if (priority !== null && plan.PRIORITY !== priority) return false;
            if (status !== null && plan.STATUS !== status) return false;
            return true;
          })
          .sort((a, b) => a.PLAN_ID.localeCompare(b.PLAN_ID))
      );
    },

    snapshot() {
      return deepFreeze({
        SCHEMA: "BRUTUS-COUNTER-TEST-QUEUE-SNAPSHOT-v0.1",
        ANCHOR_ID: FIXED_ANCHOR_ID,
        MODE: "PLAN_ONLY",
        PLAN_COUNT: plans.size,
        READY_COUNT: [...plans.values()].filter((plan) => plan.STATUS === "READY").length,
        BLOCKED_COUNT: [...plans.values()].filter((plan) => plan.STATUS === "BLOCKED").length,
        PLAN_IDS: [...plans.keys()].sort(),
        AUTO_EXECUTE: false,
        PROOF_PROMOTION: "MANUAL_AFTER_VERIFICATION"
      });
    }
  });
}

export const BRUTUS_COUNTER_TEST_PLAN_SCHEMA = PLAN_SCHEMA;
