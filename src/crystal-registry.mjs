import { createHash } from "node:crypto";
import {
  computeCrystalH256,
  validateCrystal
} from "./crystal-contract.mjs";
import { BRUTUS_CRYSTAL_ADMISSION_SCHEMA } from "./crystal-admission-gate.mjs";

const ENTRY_SCHEMA = "BRUTUS-CRYSTAL-REGISTRY-ENTRY-v0.1";
const REGISTRY_SCHEMA = "BRUTUS-CRYSTAL-REGISTRY-v0.1";

const ADMISSION_FIELDS = new Set([
  "SCHEMA",
  "VERSION",
  "CRYSTAL_ID",
  "CRYSTAL_H256",
  "PAYLOAD_H256",
  "EVIDENCE_LABEL",
  "SOURCE_INTEGRITY_SCHEMA",
  "SOURCE_INTEGRITY_VERDICT",
  "VERIFIED_SOURCE_COUNT",
  "STATUS",
  "REGISTRY_WRITE_PERFORMED",
  "MUTATION_PERFORMED",
  "NETWORK_USED",
  "PROCESS_EXECUTION_USED",
  "WORLD_ROUTER_INVOKED",
  "PROOF_PROMOTION"
]);

function reject(reason) {
  throw new Error("CRYSTAL_REGISTRY_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
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

function assertHex256(value, field) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) {
    reject(field + " must be SHA-256 hex");
  }
}

function validateAdmission(admissionInput, crystal) {
  if (!isPlainObject(admissionInput)) reject("admission must be a plain object");

  const keys = Object.keys(admissionInput);
  if (keys.length !== ADMISSION_FIELDS.size) {
    reject("admission field set mismatch");
  }
  for (const key of keys) {
    if (!ADMISSION_FIELDS.has(key)) reject("unsupported admission field " + key);
  }
  for (const field of ADMISSION_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(admissionInput, field)) {
      reject("missing admission field " + field);
    }
  }

  if (admissionInput.SCHEMA !== BRUTUS_CRYSTAL_ADMISSION_SCHEMA) {
    reject("unsupported admission SCHEMA");
  }
  if (admissionInput.VERSION !== "0.1") reject("unsupported admission VERSION");
  if (admissionInput.STATUS !== "ADMISSIBLE") reject("crystal must be ADMISSIBLE before registration");
  if (admissionInput.SOURCE_INTEGRITY_VERDICT !== "PASS") {
    reject("admission source integrity must PASS");
  }
  if (!Number.isInteger(admissionInput.VERIFIED_SOURCE_COUNT) || admissionInput.VERIFIED_SOURCE_COUNT < 1) {
    reject("invalid VERIFIED_SOURCE_COUNT");
  }
  if (admissionInput.VERIFIED_SOURCE_COUNT !== crystal.SOURCE_REFS.length) {
    reject("admission verified-source count mismatch");
  }

  if (
    admissionInput.REGISTRY_WRITE_PERFORMED !== false ||
    admissionInput.MUTATION_PERFORMED !== false ||
    admissionInput.NETWORK_USED !== false ||
    admissionInput.PROCESS_EXECUTION_USED !== false ||
    admissionInput.WORLD_ROUTER_INVOKED !== false ||
    admissionInput.PROOF_PROMOTION !== false
  ) {
    reject("admission boundary flags invalid");
  }

  const crystalH256 = computeCrystalH256(crystal);
  assertHex256(admissionInput.CRYSTAL_H256, "admission.CRYSTAL_H256");

  if (admissionInput.CRYSTAL_ID !== crystal.CRYSTAL_ID) {
    reject("admission CRYSTAL_ID mismatch");
  }
  if (admissionInput.CRYSTAL_H256.toLowerCase() !== crystalH256) {
    reject("admission CRYSTAL_H256 mismatch");
  }
  if (admissionInput.PAYLOAD_H256.toLowerCase() !== crystal.PAYLOAD_H256.toLowerCase()) {
    reject("admission PAYLOAD_H256 mismatch");
  }
  if (admissionInput.EVIDENCE_LABEL !== crystal.EVIDENCE_LABEL) {
    reject("admission EVIDENCE_LABEL mismatch");
  }

  return deepFreeze(JSON.parse(JSON.stringify(admissionInput)));
}

function validateRegistrationContext({ queenTick = null, observedAtUtc = null } = {}) {
  if (queenTick !== null && (!Number.isInteger(queenTick) || queenTick < 0)) {
    reject("queenTick must be a non-negative integer or null");
  }
  if (observedAtUtc !== null) {
    if (typeof observedAtUtc !== "string" || !Number.isFinite(Date.parse(observedAtUtc))) {
      reject("observedAtUtc must be a valid date-time string or null");
    }
  }
  return Object.freeze({ queenTick, observedAtUtc });
}

function buildEntry({ sequence, previousH256, crystal, admission, context }) {
  const body = {
    SCHEMA: ENTRY_SCHEMA,
    VERSION: "0.1",
    SEQUENCE: sequence,
    PREVIOUS_H256: previousH256,
    CRYSTAL_ID: crystal.CRYSTAL_ID,
    CRYSTAL_H256: admission.CRYSTAL_H256.toLowerCase(),
    PAYLOAD_H256: crystal.PAYLOAD_H256.toLowerCase(),
    ADMISSION_SCHEMA: admission.SCHEMA,
    ADMISSION_H256: h256(admission),
    EVIDENCE_LABEL: crystal.EVIDENCE_LABEL,
    SOURCE_REFS: crystal.SOURCE_REFS,
    PROOF_REFS: crystal.PROOF_REFS,
    VERIFIED_SOURCE_COUNT: admission.VERIFIED_SOURCE_COUNT,
    STATUS: "REGISTERED",
    REGISTERED_AT_QUEEN_TICK: context.queenTick,
    REGISTERED_AT_UTC: context.observedAtUtc,
    REGISTRY_WRITE_PERFORMED: true,
    MUTATION_PERFORMED: false,
    NETWORK_USED: false,
    PROCESS_EXECUTION_USED: false,
    WORLD_ROUTER_INVOKED: false,
    PROOF_PROMOTION: false
  };

  return deepFreeze({
    ...body,
    ENTRY_H256: h256(body)
  });
}

function rebuildEntry(entry) {
  const { ENTRY_H256: ignored, ...body } = entry;
  return deepFreeze({ ...body, ENTRY_H256: h256(body) });
}

export function createCrystalRegistry() {
  const entries = [];
  const byCrystalId = new Map();
  const byCrystalH256 = new Map();

  return Object.freeze({
    register(crystalInput, admissionInput, registrationContext = {}) {
      const crystal = validateCrystal(crystalInput);
      const admission = validateAdmission(admissionInput, crystal);
      const context = validateRegistrationContext(registrationContext);
      const crystalH256 = admission.CRYSTAL_H256.toLowerCase();

      const existingById = byCrystalId.get(crystal.CRYSTAL_ID) ?? null;
      if (existingById !== null) {
        if (
          existingById.CRYSTAL_H256 === crystalH256 &&
          existingById.ADMISSION_H256 === h256(admission)
        ) {
          return existingById;
        }
        reject("CRYSTAL_ID already registered with different identity or admission");
      }

      if (byCrystalH256.has(crystalH256)) {
        reject("CRYSTAL_H256 already registered under another identity");
      }

      const previousH256 = entries.length === 0 ? null : entries.at(-1).ENTRY_H256;
      const entry = buildEntry({
        sequence: entries.length + 1,
        previousH256,
        crystal,
        admission,
        context
      });

      entries.push(entry);
      byCrystalId.set(entry.CRYSTAL_ID, entry);
      byCrystalH256.set(entry.CRYSTAL_H256, entry);
      return entry;
    },

    getByCrystalId(crystalId) {
      return byCrystalId.get(crystalId) ?? null;
    },

    getByCrystalH256(crystalH256) {
      if (typeof crystalH256 !== "string") return null;
      return byCrystalH256.get(crystalH256.toLowerCase()) ?? null;
    },

    list() {
      return Object.freeze([...entries]);
    },

    verify() {
      let previousH256 = null;
      for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index];
        const expected = rebuildEntry(entry);
        if (
          entry.SEQUENCE !== index + 1 ||
          entry.PREVIOUS_H256 !== previousH256 ||
          entry.ENTRY_H256 !== expected.ENTRY_H256
        ) {
          return deepFreeze({
            SCHEMA: REGISTRY_SCHEMA,
            VALID: false,
            ENTRY_COUNT: entries.length,
            HEAD_H256: entries.length === 0 ? null : entries.at(-1).ENTRY_H256,
            FAILURE_SEQUENCE: index + 1,
            PROOF_PROMOTION: false
          });
        }
        previousH256 = entry.ENTRY_H256;
      }

      return deepFreeze({
        SCHEMA: REGISTRY_SCHEMA,
        VALID: true,
        ENTRY_COUNT: entries.length,
        HEAD_H256: entries.length === 0 ? null : entries.at(-1).ENTRY_H256,
        FAILURE_SEQUENCE: null,
        PROOF_PROMOTION: false
      });
    },

    snapshot() {
      const verification = this.verify();
      return deepFreeze({
        SCHEMA: REGISTRY_SCHEMA,
        VERSION: "0.1",
        MODE: "APPEND_ONLY",
        ENTRY_COUNT: verification.ENTRY_COUNT,
        HEAD_H256: verification.HEAD_H256,
        VALID: verification.VALID,
        NETWORK_USED: false,
        PROCESS_EXECUTION_USED: false,
        WORLD_ROUTER_INVOKED: false,
        PROOF_PROMOTION: false
      });
    }
  });
}

export const BRUTUS_CRYSTAL_REGISTRY_ENTRY_SCHEMA = ENTRY_SCHEMA;
export const BRUTUS_CRYSTAL_REGISTRY_SCHEMA = REGISTRY_SCHEMA;
