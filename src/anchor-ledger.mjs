import { createHash } from "node:crypto";
import { getVersoCardPolicy } from "./verso-card-registry.mjs";

const RECORD_SCHEMA = "BRUTUS-ANCHOR-RECORD-v0.1";
const ENTRY_SCHEMA = "BRUTUS-ANCHOR-LEDGER-ENTRY-v0.1";
const LEDGER_SCHEMA = "BRUTUS-ANCHOR-LEDGER-v0.1";
const FIXED_ANCHOR_ID = "ANCHOR-0001";
const ALLOWED_TYPES = new Set(["OBSERVATION", "RESULT", "PROOF_REF", "NOTE"]);
const REQUIRED_FIELDS = [
  "SCHEMA",
  "RECORD_ID",
  "VERSION",
  "ANCHOR_ID",
  "PROTOTYPE_ID",
  "RECORD_TYPE",
  "CARD_ID",
  "SOURCE_REF",
  "OBSERVED_AT_UTC",
  "DATA",
  "PROOF_REF",
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
  throw new Error("ANCHOR_LEDGER_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function normalizedKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function assertDataOnly(value, path = "record") {
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
    for (const key of Object.keys(value).sort()) {
      out[key] = canonicalize(value[key]);
    }
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

function assertNullableString(value, field) {
  if (value !== null) assertString(value, field);
}

function assertStringArray(value, field) {
  if (!Array.isArray(value)) reject(field + " must be an array");
  for (const item of value) {
    if (typeof item !== "string") reject(field + " must contain strings only");
  }
}

function validateRecord(input, station) {
  assertDataOnly(input);
  if (!isPlainObject(input)) reject("record must be a plain object");

  for (const key of Object.keys(input)) {
    if (!ALLOWED_FIELDS.has(key)) reject("unknown record field " + key);
  }
  for (const field of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) {
      reject("missing record field " + field);
    }
  }

  if (input.SCHEMA !== RECORD_SCHEMA) reject("unsupported SCHEMA");
  if (input.VERSION !== "0.1") reject("unsupported VERSION");
  if (input.ANCHOR_ID !== FIXED_ANCHOR_ID) reject("record must belong to ANCHOR-0001");

  assertString(input.RECORD_ID, "RECORD_ID");
  if (!/^BRUTUS-RECORD-[A-Z0-9-]+$/.test(input.RECORD_ID)) reject("invalid RECORD_ID");

  assertString(input.PROTOTYPE_ID, "PROTOTYPE_ID");
  if (station.getPrototype(input.PROTOTYPE_ID) === null) {
    reject("unknown PROTOTYPE_ID " + input.PROTOTYPE_ID);
  }

  if (!ALLOWED_TYPES.has(input.RECORD_TYPE)) reject("unsupported RECORD_TYPE");

  assertNullableString(input.CARD_ID, "CARD_ID");
  if (input.CARD_ID !== null && getVersoCardPolicy(input.CARD_ID) === null) {
    reject("unknown prepared CARD_ID " + input.CARD_ID);
  }

  assertString(input.SOURCE_REF, "SOURCE_REF");

  if (input.OBSERVED_AT_UTC !== null) {
    assertString(input.OBSERVED_AT_UTC, "OBSERVED_AT_UTC");
    if (!Number.isFinite(Date.parse(input.OBSERVED_AT_UTC))) {
      reject("OBSERVED_AT_UTC must be a valid date-time or null");
    }
  }

  if (!isPlainObject(input.DATA)) reject("DATA must be a plain object");
  assertNullableString(input.PROOF_REF, "PROOF_REF");
  assertStringArray(input.NOTES, "NOTES");

  if (input.RECORD_TYPE === "PROOF_REF" && input.PROOF_REF === null) {
    reject("PROOF_REF record requires PROOF_REF");
  }

  return deepFreeze(JSON.parse(JSON.stringify(input)));
}

function buildEntry(sequence, previousH256, record) {
  const body = {
    SCHEMA: ENTRY_SCHEMA,
    SEQUENCE: sequence,
    PREVIOUS_H256: previousH256,
    RECORD: record
  };
  const entryH256 = h256(body);
  return deepFreeze({
    ...body,
    ENTRY_H256: entryH256
  });
}

export function createAnchorLedger({ station }) {
  if (
    !station ||
    station.anchorId !== FIXED_ANCHOR_ID ||
    typeof station.getPrototype !== "function"
  ) {
    reject("ASTRA STATION runtime is required");
  }

  const entries = [];
  const ids = new Set();

  return Object.freeze({
    append(recordInput) {
      const record = validateRecord(recordInput, station);

      if (ids.has(record.RECORD_ID)) {
        reject("duplicate RECORD_ID " + record.RECORD_ID);
      }

      const previousH256 = entries.length === 0 ? null : entries.at(-1).ENTRY_H256;
      const entry = buildEntry(entries.length + 1, previousH256, record);

      entries.push(entry);
      ids.add(record.RECORD_ID);
      return entry;
    },

    get(recordId) {
      return entries.find((entry) => entry.RECORD.RECORD_ID === recordId) ?? null;
    },

    list({ prototypeId = null, recordType = null } = {}) {
      return Object.freeze(
        entries.filter((entry) => {
          if (prototypeId !== null && entry.RECORD.PROTOTYPE_ID !== prototypeId) return false;
          if (recordType !== null && entry.RECORD.RECORD_TYPE !== recordType) return false;
          return true;
        })
      );
    },

    verify() {
      let previousH256 = null;

      for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index];
        const expected = buildEntry(index + 1, previousH256, entry.RECORD);
        if (
          entry.SEQUENCE !== expected.SEQUENCE ||
          entry.PREVIOUS_H256 !== expected.PREVIOUS_H256 ||
          entry.ENTRY_H256 !== expected.ENTRY_H256
        ) {
          return deepFreeze({
            SCHEMA: LEDGER_SCHEMA,
            VALID: false,
            ENTRY_COUNT: entries.length,
            HEAD_H256: entries.length ? entries.at(-1).ENTRY_H256 : null,
            FAILURE_SEQUENCE: index + 1
          });
        }
        previousH256 = entry.ENTRY_H256;
      }

      return deepFreeze({
        SCHEMA: LEDGER_SCHEMA,
        VALID: true,
        ENTRY_COUNT: entries.length,
        HEAD_H256: entries.length ? entries.at(-1).ENTRY_H256 : null,
        FAILURE_SEQUENCE: null
      });
    },

    snapshot() {
      const verification = this.verify();
      return deepFreeze({
        SCHEMA: LEDGER_SCHEMA,
        ANCHOR_ID: FIXED_ANCHOR_ID,
        MODE: "APPEND_ONLY",
        ENTRY_COUNT: verification.ENTRY_COUNT,
        HEAD_H256: verification.HEAD_H256,
        VALID: verification.VALID
      });
    }
  });
}

export const BRUTUS_ANCHOR_RECORD_SCHEMA = RECORD_SCHEMA;
export const BRUTUS_ANCHOR_LEDGER_SCHEMA = LEDGER_SCHEMA;
