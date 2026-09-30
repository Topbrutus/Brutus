import { getVersoCardPolicy } from "./verso-card-registry.mjs";

const REQUIRED_FIELDS = [
  "CARD_ID",
  "VERSION",
  "ANCHOR",
  "SOURCE",
  "TARGET",
  "VERSO",
  "READ",
  "MEASURE",
  "RETURN_DATA",
  "WRITE",
  "CODE_CHANGE",
  "CREATE_ROUTE",
  "VALUES",
  "EXPECTED_OUTPUT",
  "PROOF_REQUIRED",
  "AFTER"
];

const ALLOWED_FIELDS = new Set(REQUIRED_FIELDS);
const DEFAULT_STATE = "DEFAULT_LOCKED";
const STATIC_SCALAR_FIELDS = [
  "VERSION",
  "ANCHOR",
  "SOURCE",
  "TARGET",
  "VERSO",
  "WRITE",
  "CODE_CHANGE",
  "CREATE_ROUTE",
  "EXPECTED_OUTPUT",
  "PROOF_REQUIRED",
  "AFTER"
];
const STATIC_ARRAY_FIELDS = ["READ", "MEASURE", "RETURN_DATA"];

function reject(reason) {
  throw new Error("CARD_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function assertDataOnly(value, path = "card") {
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

function assertStringArray(value, field) {
  if (!Array.isArray(value)) reject(field + " must be an array");
  for (const item of value) {
    if (typeof item !== "string" || item.length === 0) {
      reject(field + " must contain non-empty strings only");
    }
  }
}

function sameArray(actual, expected) {
  return (
    Array.isArray(actual) &&
    Array.isArray(expected) &&
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

function assertPreparedCardContract(card, policy) {
  for (const field of STATIC_SCALAR_FIELDS) {
    if (card[field] !== policy[field]) {
      reject("prepared card contract mismatch: " + field);
    }
  }

  for (const field of STATIC_ARRAY_FIELDS) {
    if (!sameArray(card[field], policy[field])) {
      reject("prepared card contract mismatch: " + field);
    }
  }
}

export function guardCard(card, { mutableValues = null } = {}) {
  assertDataOnly(card);

  if (!isPlainObject(card)) reject("card must be a plain object");

  for (const key of Object.keys(card)) {
    if (!ALLOWED_FIELDS.has(key)) reject("unknown field " + key);
  }

  for (const field of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(card, field)) {
      reject("missing field " + field);
    }
  }

  if (typeof card.CARD_ID !== "string" || card.CARD_ID.length === 0) {
    reject("CARD_ID is required");
  }

  const policy = getVersoCardPolicy(card.CARD_ID);
  if (policy === null) {
    reject("unknown CARD_ID " + card.CARD_ID);
  }

  assertStringArray(card.READ, "READ");
  assertStringArray(card.MEASURE, "MEASURE");
  assertStringArray(card.RETURN_DATA, "RETURN_DATA");
  assertPreparedCardContract(card, policy);

  if (!isPlainObject(card.VALUES)) reject("VALUES must be a plain object");

  const policyMutable = new Set(policy.MUTABLE_VALUES);
  let allowedValues = policyMutable;

  if (mutableValues !== null) {
    if (!Array.isArray(mutableValues)) reject("runtime mutableValues must be an array");
    const narrowed = new Set();
    for (const key of mutableValues) {
      if (!policyMutable.has(key)) {
        reject("runtime mutableValues cannot expand prepared card policy: " + key);
      }
      narrowed.add(key);
    }
    allowedValues = narrowed;
  }

  for (const key of Object.keys(card.VALUES)) {
    if (!allowedValues.has(key)) reject("VALUES key is not mutable: " + key);
  }

  const safeCopy = JSON.parse(JSON.stringify(card));
  return deepFreeze(safeCopy);
}

export function createVersoRuntime({ mutableValues = null } = {}) {
  let state = DEFAULT_STATE;
  let sequence = 0;

  return {
    get state() {
      return state;
    },

    async execute(card, adapter) {
      if (state !== DEFAULT_STATE) {
        throw new Error("RUNTIME_BUSY: Verso is not DEFAULT_LOCKED");
      }
      if (typeof adapter !== "function") {
        throw new Error("ADAPTER_REQUIRED");
      }

      const verified = guardCard(card, { mutableValues });
      const trace = [state];

      try {
        state = "CARD_APPLIED";
        trace.push(state);

        state = "QUERY_RUNNING";
        trace.push(state);

        const result = await adapter({
          source: verified.SOURCE,
          target: verified.TARGET,
          read: verified.READ,
          measure: verified.MEASURE,
          returnData: verified.RETURN_DATA,
          values: verified.VALUES
        });

        state = "RESULT_READY";
        trace.push(state);
        sequence += 1;

        return {
          ok: true,
          sequence,
          cardId: verified.CARD_ID,
          proofRequired: true,
          result,
          trace
        };
      } finally {
        state = DEFAULT_STATE;
        trace.push(state);
      }
    }
  };
}

export const VERSO_DEFAULT_STATE = DEFAULT_STATE;
