import { sha256HexUtf8 } from "./sha256-utf8.mjs";

const PACKET_SCHEMA = "BRUTUS-MATH-INPUT-PACKET-v0.1";
const VERSION = "0.1";
const SIGNATURE_METHOD = "BRUTUS-CANONICAL-JSON-SHA256-v0.1";

const ITEM_KINDS = new Set([
  "FORMULA_OBSERVATION",
  "FORMULA_CAPSULE",
  "RELATION_OBSERVATION"
]);

function reject(reason) {
  throw new Error("MATH_INPUT_PACKET_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
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

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function h256(value) {
  return sha256HexUtf8(JSON.stringify(canonicalize(value)));
}

function assertExactKeys(value, keys, label) {
  if (!isPlainObject(value)) reject(label + " must be a plain object");
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    reject(label + " has unsupported fields");
  }
}

function assertBoundedString(value, label, min = 1, max = 512) {
  if (typeof value !== "string" || value.length < min || value.length > max) {
    reject(label + " must be a bounded string");
  }
}

function assertCount(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    reject(label + " must be a non-negative safe integer");
  }
}

function assertSha256(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) {
    reject(label + " must be SHA-256 hex");
  }
}

function validateSource(source) {
  assertExactKeys(
    source,
    [
      "SYSTEM",
      "ADAPTER",
      "ADAPTER_VERSION",
      "SOURCE_RUN_ID",
      "SOURCE_ENDPOINT",
      "ACCESS_MODE",
      "SOURCE_STATE"
    ],
    "SOURCE"
  );
  assertBoundedString(source.SYSTEM, "SOURCE.SYSTEM", 1, 80);
  assertBoundedString(source.ADAPTER, "SOURCE.ADAPTER", 1, 120);
  if (source.ADAPTER_VERSION !== "0.1") reject("SOURCE.ADAPTER_VERSION must be 0.1");
  assertBoundedString(source.SOURCE_RUN_ID, "SOURCE.SOURCE_RUN_ID", 1, 200);
  assertBoundedString(source.SOURCE_ENDPOINT, "SOURCE.SOURCE_ENDPOINT", 1, 256);
  if (source.ACCESS_MODE !== "READ_ONLY") reject("SOURCE.ACCESS_MODE must be READ_ONLY");
  assertBoundedString(source.SOURCE_STATE, "SOURCE.SOURCE_STATE", 1, 40);
}

function validateSummary(summary) {
  assertExactKeys(
    summary,
    [
      "CANONICAL_FORMULAS",
      "AUTHENTICATED_FORMULAS",
      "TESTING_FORMULAS",
      "REJECTED_FORMULAS",
      "CANDIDATE_FORMULAS",
      "TRACES_TOTAL",
      "PROOFS_TOTAL",
      "PROOFS_VALID",
      "PROOFS_INVALID",
      "RECONSTRUCTED_SUPPORTS",
      "FAILED_SUPPORTS",
      "TRACKER_SOURCES",
      "RECYCLE_EMITTED"
    ],
    "SUMMARY"
  );
  for (const [key, value] of Object.entries(summary)) assertCount(value, "SUMMARY." + key);
  if (summary.AUTHENTICATED_FORMULAS > summary.CANONICAL_FORMULAS) {
    reject("AUTHENTICATED_FORMULAS cannot exceed CANONICAL_FORMULAS");
  }
  if (
    summary.TESTING_FORMULAS +
      summary.REJECTED_FORMULAS +
      summary.CANDIDATE_FORMULAS >
    summary.CANONICAL_FORMULAS
  ) {
    reject("formula status counts exceed canonical formula count");
  }
  if (summary.PROOFS_VALID + summary.PROOFS_INVALID > summary.PROOFS_TOTAL) {
    reject("proof outcome counts exceed PROOFS_TOTAL");
  }
  if (summary.RECONSTRUCTED_SUPPORTS + summary.FAILED_SUPPORTS > summary.TRACES_TOTAL) {
    reject("support outcome counts exceed TRACES_TOTAL");
  }
}

function validateEvidence(evidence, label) {
  assertExactKeys(
    evidence,
    [
      "SOURCE_TRACE_REF",
      "SOURCE_PROOF_REF",
      "SOURCE_HASH_REF",
      "SUPPORT_COUNT",
      "TEST_COUNT",
      "REPLAY_STATUS"
    ],
    label
  );
  for (const key of ["SOURCE_TRACE_REF", "SOURCE_PROOF_REF", "SOURCE_HASH_REF"]) {
    if (evidence[key] !== null) assertBoundedString(evidence[key], label + "." + key, 1, 256);
  }
  assertCount(evidence.SUPPORT_COUNT, label + ".SUPPORT_COUNT");
  assertCount(evidence.TEST_COUNT, label + ".TEST_COUNT");
  assertBoundedString(evidence.REPLAY_STATUS, label + ".REPLAY_STATUS", 1, 80);
}

function validateItem(item, index) {
  const label = `ITEMS[${index}]`;
  assertExactKeys(
    item,
    [
      "ITEM_ID",
      "KIND",
      "EXPRESSION",
      "SOURCE_STATUS",
      "BINDINGS",
      "EVIDENCE",
      "PROVENANCE"
    ],
    label
  );
  assertBoundedString(item.ITEM_ID, label + ".ITEM_ID", 1, 160);
  if (!ITEM_KINDS.has(item.KIND)) reject(label + ".KIND unsupported");
  assertBoundedString(item.EXPRESSION, label + ".EXPRESSION", 1, 4096);
  assertBoundedString(item.SOURCE_STATUS, label + ".SOURCE_STATUS", 1, 80);

  if (!Array.isArray(item.BINDINGS) || item.BINDINGS.length > 64) {
    reject(label + ".BINDINGS must contain 0..64 bounded strings");
  }
  for (let i = 0; i < item.BINDINGS.length; i += 1) {
    assertBoundedString(item.BINDINGS[i], label + `.BINDINGS[${i}]`, 1, 512);
  }

  validateEvidence(item.EVIDENCE, label + ".EVIDENCE");

  if (!isPlainObject(item.PROVENANCE)) reject(label + ".PROVENANCE must be a plain object");
  const provenanceKeys = Object.keys(item.PROVENANCE);
  if (provenanceKeys.length > 32) reject(label + ".PROVENANCE exceeds v0.1 field limit");
  for (const [key, value] of Object.entries(item.PROVENANCE)) {
    assertBoundedString(key, label + ".PROVENANCE key", 1, 80);
    if (
      value !== null &&
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      reject(label + ".PROVENANCE values must be scalar or null");
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      reject(label + ".PROVENANCE contains non-finite number");
    }
    if (typeof value === "string" && value.length > 1024) {
      reject(label + ".PROVENANCE string too long");
    }
  }
}

function unsigned(input) {
  const copy = JSON.parse(JSON.stringify(input));
  delete copy.PACKET_H256;
  return copy;
}

export function computeMathInputPacketH256(input) {
  if (!isPlainObject(input)) reject("packet must be a plain object");
  return h256(unsigned(input));
}

export function validateMathInputPacket(input) {
  assertExactKeys(
    input,
    [
      "SCHEMA",
      "VERSION",
      "PACKET_ID",
      "SOURCE",
      "SOURCE_SNAPSHOT_H256",
      "SUMMARY",
      "ITEMS",
      "INGESTION",
      "PROOF_REF",
      "EXECUTABLE",
      "AUTO_PROOF_PROMOTION",
      "ROUTING_AUTHORIZATION",
      "SIGNATURE_METHOD",
      "PACKET_H256"
    ],
    "packet"
  );

  if (input.SCHEMA !== PACKET_SCHEMA) reject("unsupported SCHEMA");
  if (input.VERSION !== VERSION) reject("unsupported VERSION");
  if (
    typeof input.PACKET_ID !== "string" ||
    !/^MIP-[A-Z0-9-]{4,96}$/.test(input.PACKET_ID)
  ) {
    reject("invalid PACKET_ID");
  }

  validateSource(input.SOURCE);
  assertSha256(input.SOURCE_SNAPSHOT_H256, "SOURCE_SNAPSHOT_H256");
  validateSummary(input.SUMMARY);

  if (!Array.isArray(input.ITEMS) || input.ITEMS.length > 256) {
    reject("ITEMS must contain 0..256 items");
  }
  const ids = new Set();
  input.ITEMS.forEach((item, index) => {
    validateItem(item, index);
    if (ids.has(item.ITEM_ID)) reject("ITEM_ID values must be unique");
    ids.add(item.ITEM_ID);
  });

  assertExactKeys(
    input.INGESTION,
    ["QUEEN_TICK", "CLOCK_AUTHORITY", "BOUND_TO_QUEEN"],
    "INGESTION"
  );
  if (input.INGESTION.QUEEN_TICK !== null) {
    if (!Number.isSafeInteger(input.INGESTION.QUEEN_TICK) || input.INGESTION.QUEEN_TICK < 0) {
      reject("INGESTION.QUEEN_TICK invalid");
    }
  }
  if (
    input.INGESTION.CLOCK_AUTHORITY !== null &&
    input.INGESTION.CLOCK_AUTHORITY !== "QUEEN_SERVER_V0_2"
  ) {
    reject("unsupported INGESTION.CLOCK_AUTHORITY");
  }
  if (input.INGESTION.BOUND_TO_QUEEN === true) {
    if (
      input.INGESTION.QUEEN_TICK === null ||
      input.INGESTION.CLOCK_AUTHORITY !== "QUEEN_SERVER_V0_2"
    ) {
      reject("Queen-bound input requires authoritative Queen tick");
    }
  } else if (input.INGESTION.BOUND_TO_QUEEN !== false) {
    reject("INGESTION.BOUND_TO_QUEEN must be boolean");
  } else if (
    input.INGESTION.QUEEN_TICK !== null ||
    input.INGESTION.CLOCK_AUTHORITY !== null
  ) {
    reject("unbound input cannot invent Queen time");
  }

  if (input.PROOF_REF !== null) reject("PROOF_REF must be null");
  if (input.EXECUTABLE !== false) reject("EXECUTABLE must be false");
  if (input.AUTO_PROOF_PROMOTION !== false) reject("AUTO_PROOF_PROMOTION must be false");
  if (input.ROUTING_AUTHORIZATION !== "UNDECIDED") {
    reject("ROUTING_AUTHORIZATION must be UNDECIDED");
  }
  if (input.SIGNATURE_METHOD !== SIGNATURE_METHOD) reject("unsupported SIGNATURE_METHOD");
  assertSha256(input.PACKET_H256, "PACKET_H256");
  if (input.PACKET_H256.toLowerCase() !== computeMathInputPacketH256(input)) {
    reject("PACKET_H256 mismatch");
  }

  return deepFreeze(JSON.parse(JSON.stringify(input)));
}

export function createMathInputPacket({
  packetId,
  source,
  sourceSnapshot,
  summary,
  items,
  queenTick = null
}) {
  if (!isPlainObject(sourceSnapshot)) reject("sourceSnapshot must be a plain object");
  const boundToQueen = queenTick !== null;

  const packet = {
    SCHEMA: PACKET_SCHEMA,
    VERSION,
    PACKET_ID: packetId,
    SOURCE: JSON.parse(JSON.stringify(source)),
    SOURCE_SNAPSHOT_H256: h256(sourceSnapshot),
    SUMMARY: JSON.parse(JSON.stringify(summary)),
    ITEMS: JSON.parse(JSON.stringify(items)),
    INGESTION: {
      QUEEN_TICK: queenTick,
      CLOCK_AUTHORITY: boundToQueen ? "QUEEN_SERVER_V0_2" : null,
      BOUND_TO_QUEEN: boundToQueen
    },
    PROOF_REF: null,
    EXECUTABLE: false,
    AUTO_PROOF_PROMOTION: false,
    ROUTING_AUTHORIZATION: "UNDECIDED",
    SIGNATURE_METHOD,
    PACKET_H256: "0".repeat(64)
  };

  packet.PACKET_H256 = computeMathInputPacketH256(packet);
  return validateMathInputPacket(packet);
}

export const BRUTUS_MATH_INPUT_PACKET_SCHEMA = PACKET_SCHEMA;
export const BRUTUS_MATH_INPUT_ITEM_KINDS = Object.freeze([...ITEM_KINDS]);
