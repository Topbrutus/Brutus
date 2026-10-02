import { sha256HexUtf8 } from "./sha256-utf8.mjs";
import { validateMathInputPacket } from "./math-input-bus.mjs";

const SCHEMA = "BRUTUS-MATH-CRYSTAL-CANDIDATE-v0.1";
const VERSION = "0.1";
const SIGNATURE_METHOD = "BRUTUS-CANONICAL-JSON-SHA256-v0.1";
const EXPRESSION_HASH_METHOD = "UTF8-SHA256-v0.1";

function reject(reason) {
  throw new Error("MATH_CRYSTAL_CANDIDATE_REJECTED: " + reason);
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

function h256(value) {
  return sha256HexUtf8(JSON.stringify(canonicalize(value)));
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function assertExactKeys(value, keys, label) {
  if (!isPlainObject(value)) reject(label + " must be a plain object");
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    reject(label + " has unsupported fields");
  }
}

function assertBoundedString(value, label, min = 1, max = 4096) {
  if (typeof value !== "string" || value.length < min || value.length > max) {
    reject(label + " must be a bounded string");
  }
}

function assertSha256(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) {
    reject(label + " must be SHA-256 hex");
  }
}

function assertNonNegativeSafeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    reject(label + " must be a non-negative safe integer");
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function unsignedCrystal(input) {
  const copy = clone(input);
  delete copy.CRYSTAL_H256;
  return copy;
}

function contentPayload(item) {
  return {
    EXPRESSION: item.EXPRESSION,
    EXPRESSION_HASH_METHOD,
    EXPRESSION_H256: sha256HexUtf8(item.EXPRESSION),
    SOURCE_STATUS: item.SOURCE_STATUS,
    BINDINGS: clone(item.BINDINGS),
    EVIDENCE: clone(item.EVIDENCE),
    PROVENANCE: clone(item.PROVENANCE)
  };
}

export function computeMathInputItemH256(item) {
  if (!isPlainObject(item)) reject("item must be a plain object");
  return h256(item);
}

export function computeMathCrystalContentH256(content) {
  if (!isPlainObject(content)) reject("CONTENT must be a plain object");
  return h256(content);
}

export function computeMathCrystalH256(input) {
  if (!isPlainObject(input)) reject("crystal must be a plain object");
  return h256(unsignedCrystal(input));
}

function validateEvidence(value) {
  assertExactKeys(
    value,
    [
      "SOURCE_TRACE_REF",
      "SOURCE_PROOF_REF",
      "SOURCE_HASH_REF",
      "SUPPORT_COUNT",
      "TEST_COUNT",
      "REPLAY_STATUS"
    ],
    "CONTENT.EVIDENCE"
  );

  for (const key of ["SOURCE_TRACE_REF", "SOURCE_PROOF_REF", "SOURCE_HASH_REF"]) {
    if (value[key] !== null) {
      assertBoundedString(value[key], "CONTENT.EVIDENCE." + key, 1, 256);
    }
  }

  assertNonNegativeSafeInteger(value.SUPPORT_COUNT, "CONTENT.EVIDENCE.SUPPORT_COUNT");
  assertNonNegativeSafeInteger(value.TEST_COUNT, "CONTENT.EVIDENCE.TEST_COUNT");
  assertBoundedString(value.REPLAY_STATUS, "CONTENT.EVIDENCE.REPLAY_STATUS", 1, 80);
}

function validateProvenance(value) {
  if (!isPlainObject(value)) reject("CONTENT.PROVENANCE must be a plain object");
  const keys = Object.keys(value);
  if (keys.length > 32) reject("CONTENT.PROVENANCE exceeds v0.1 field limit");

  for (const [key, item] of Object.entries(value)) {
    assertBoundedString(key, "CONTENT.PROVENANCE key", 1, 80);
    if (
      item !== null &&
      typeof item !== "string" &&
      typeof item !== "number" &&
      typeof item !== "boolean"
    ) {
      reject("CONTENT.PROVENANCE values must be scalar or null");
    }
    if (typeof item === "number" && !Number.isFinite(item)) {
      reject("CONTENT.PROVENANCE contains non-finite number");
    }
    if (typeof item === "string" && item.length > 1024) {
      reject("CONTENT.PROVENANCE string too long");
    }
  }
}

function validateContent(value) {
  assertExactKeys(
    value,
    [
      "EXPRESSION",
      "EXPRESSION_HASH_METHOD",
      "EXPRESSION_H256",
      "SOURCE_STATUS",
      "BINDINGS",
      "EVIDENCE",
      "PROVENANCE"
    ],
    "CONTENT"
  );

  assertBoundedString(value.EXPRESSION, "CONTENT.EXPRESSION", 1, 4096);
  if (value.EXPRESSION_HASH_METHOD !== EXPRESSION_HASH_METHOD) {
    reject("unsupported CONTENT.EXPRESSION_HASH_METHOD");
  }
  assertSha256(value.EXPRESSION_H256, "CONTENT.EXPRESSION_H256");
  if (value.EXPRESSION_H256.toLowerCase() !== sha256HexUtf8(value.EXPRESSION)) {
    reject("CONTENT.EXPRESSION_H256 mismatch");
  }

  assertBoundedString(value.SOURCE_STATUS, "CONTENT.SOURCE_STATUS", 1, 80);

  if (!Array.isArray(value.BINDINGS) || value.BINDINGS.length > 64) {
    reject("CONTENT.BINDINGS must contain 0..64 items");
  }
  for (let index = 0; index < value.BINDINGS.length; index += 1) {
    assertBoundedString(value.BINDINGS[index], `CONTENT.BINDINGS[${index}]`, 1, 512);
  }

  validateEvidence(value.EVIDENCE);
  validateProvenance(value.PROVENANCE);
}

function validatePedigree(value) {
  assertExactKeys(
    value,
    [
      "PACKET_ID",
      "PACKET_H256",
      "SOURCE_SNAPSHOT_H256",
      "SOURCE_SYSTEM",
      "SOURCE_RUN_ID",
      "ITEM_ID",
      "ITEM_KIND",
      "SOURCE_ITEM_H256"
    ],
    "PEDIGREE"
  );

  if (
    typeof value.PACKET_ID !== "string" ||
    !/^MIP-[A-Z0-9-]{4,96}$/.test(value.PACKET_ID)
  ) {
    reject("invalid PEDIGREE.PACKET_ID");
  }
  assertSha256(value.PACKET_H256, "PEDIGREE.PACKET_H256");
  assertSha256(value.SOURCE_SNAPSHOT_H256, "PEDIGREE.SOURCE_SNAPSHOT_H256");
  assertBoundedString(value.SOURCE_SYSTEM, "PEDIGREE.SOURCE_SYSTEM", 1, 80);
  assertBoundedString(value.SOURCE_RUN_ID, "PEDIGREE.SOURCE_RUN_ID", 1, 200);
  assertBoundedString(value.ITEM_ID, "PEDIGREE.ITEM_ID", 1, 160);

  if (
    ![
      "FORMULA_OBSERVATION",
      "FORMULA_CAPSULE",
      "RELATION_OBSERVATION"
    ].includes(value.ITEM_KIND)
  ) {
    reject("unsupported PEDIGREE.ITEM_KIND");
  }
  assertSha256(value.SOURCE_ITEM_H256, "PEDIGREE.SOURCE_ITEM_H256");
}

function validateCrystallization(value) {
  assertExactKeys(
    value,
    [
      "BOUND_TO_QUEEN",
      "QUEEN_TICK",
      "CLOCK_AUTHORITY",
      "SOURCE_PACKET_BOUND_TO_QUEEN"
    ],
    "CRYSTALLIZATION"
  );

  if (typeof value.BOUND_TO_QUEEN !== "boolean") {
    reject("CRYSTALLIZATION.BOUND_TO_QUEEN must be boolean");
  }
  if (typeof value.SOURCE_PACKET_BOUND_TO_QUEEN !== "boolean") {
    reject("CRYSTALLIZATION.SOURCE_PACKET_BOUND_TO_QUEEN must be boolean");
  }
  if (value.BOUND_TO_QUEEN !== value.SOURCE_PACKET_BOUND_TO_QUEEN) {
    reject("crystal cannot silently change Queen binding state");
  }

  if (value.BOUND_TO_QUEEN) {
    assertNonNegativeSafeInteger(value.QUEEN_TICK, "CRYSTALLIZATION.QUEEN_TICK");
    if (value.CLOCK_AUTHORITY !== "QUEEN_SERVER_V0_2") {
      reject("Queen-bound crystal requires QUEEN_SERVER_V0_2");
    }
  } else {
    if (value.QUEEN_TICK !== null || value.CLOCK_AUTHORITY !== null) {
      reject("unbound crystal cannot invent Queen time");
    }
  }
}

export function validateMathCrystalCandidate(input) {
  assertExactKeys(
    input,
    [
      "SCHEMA",
      "VERSION",
      "CRYSTAL_ID",
      "MATERIAL_CLASS",
      "STATE",
      "BRUTUS_EVIDENCE_CLASS",
      "BRUTUS_TRUTH_STATUS",
      "PEDIGREE",
      "CONTENT",
      "CONTENT_H256",
      "CRYSTALLIZATION",
      "PROOF_REF",
      "IMMUTABLE",
      "EXECUTABLE",
      "AUTO_PROOF_PROMOTION",
      "GATE_AUTHORITY",
      "ROUTING_AUTHORIZATION",
      "TRANSPORT_AUTHORIZATION",
      "SIGNATURE_METHOD",
      "CRYSTAL_H256"
    ],
    "crystal"
  );

  if (input.SCHEMA !== SCHEMA) reject("unsupported SCHEMA");
  if (input.VERSION !== VERSION) reject("unsupported VERSION");
  if (
    typeof input.CRYSTAL_ID !== "string" ||
    !/^MATH-CRYSTAL-[A-F0-9]{24}$/.test(input.CRYSTAL_ID)
  ) {
    reject("invalid CRYSTAL_ID");
  }
  if (input.MATERIAL_CLASS !== "MATH_CRYSTAL_CANDIDATE") {
    reject("MATERIAL_CLASS must be MATH_CRYSTAL_CANDIDATE");
  }
  if (input.STATE !== "CANDIDATE") reject("STATE must be CANDIDATE");
  if (input.BRUTUS_EVIDENCE_CLASS !== "CANDIDAT") {
    reject("BRUTUS_EVIDENCE_CLASS must be CANDIDAT");
  }
  if (input.BRUTUS_TRUTH_STATUS !== "UNVERIFIED_BY_BRUTUS") {
    reject("BRUTUS_TRUTH_STATUS must be UNVERIFIED_BY_BRUTUS");
  }

  validatePedigree(input.PEDIGREE);
  validateContent(input.CONTENT);

  assertSha256(input.CONTENT_H256, "CONTENT_H256");
  if (input.CONTENT_H256.toLowerCase() !== computeMathCrystalContentH256(input.CONTENT)) {
    reject("CONTENT_H256 mismatch");
  }

  validateCrystallization(input.CRYSTALLIZATION);

  if (input.PROOF_REF !== null) reject("PROOF_REF must be null");
  if (input.IMMUTABLE !== true) reject("IMMUTABLE must be true");
  if (input.EXECUTABLE !== false) reject("EXECUTABLE must be false");
  if (input.AUTO_PROOF_PROMOTION !== false) reject("AUTO_PROOF_PROMOTION must be false");
  if (input.GATE_AUTHORITY !== false) reject("GATE_AUTHORITY must be false");
  if (input.ROUTING_AUTHORIZATION !== "UNDECIDED") {
    reject("ROUTING_AUTHORIZATION must be UNDECIDED");
  }
  if (input.TRANSPORT_AUTHORIZATION !== false) {
    reject("TRANSPORT_AUTHORIZATION must be false at v0.1");
  }
  if (input.SIGNATURE_METHOD !== SIGNATURE_METHOD) {
    reject("unsupported SIGNATURE_METHOD");
  }

  assertSha256(input.CRYSTAL_H256, "CRYSTAL_H256");
  if (input.CRYSTAL_H256.toLowerCase() !== computeMathCrystalH256(input)) {
    reject("CRYSTAL_H256 mismatch");
  }

  return deepFreeze(clone(input));
}

export function crystallizeMathInputItem(packetInput, itemId) {
  const packet = validateMathInputPacket(packetInput);

  assertBoundedString(itemId, "itemId", 1, 160);
  const item = packet.ITEMS.find(candidate => candidate.ITEM_ID === itemId);
  if (!item) reject("ITEM_ID not found in validated packet");

  const sourceItemH256 = computeMathInputItemH256(item);
  const content = contentPayload(item);
  const contentH256 = computeMathCrystalContentH256(content);

  const crystalSeed = h256({
    PACKET_H256: packet.PACKET_H256,
    SOURCE_SNAPSHOT_H256: packet.SOURCE_SNAPSHOT_H256,
    ITEM_ID: item.ITEM_ID,
    SOURCE_ITEM_H256: sourceItemH256,
    CONTENT_H256: contentH256
  });

  const crystal = {
    SCHEMA,
    VERSION,
    CRYSTAL_ID: `MATH-CRYSTAL-${crystalSeed.slice(0, 24).toUpperCase()}`,
    MATERIAL_CLASS: "MATH_CRYSTAL_CANDIDATE",
    STATE: "CANDIDATE",
    BRUTUS_EVIDENCE_CLASS: "CANDIDAT",
    BRUTUS_TRUTH_STATUS: "UNVERIFIED_BY_BRUTUS",
    PEDIGREE: {
      PACKET_ID: packet.PACKET_ID,
      PACKET_H256: packet.PACKET_H256,
      SOURCE_SNAPSHOT_H256: packet.SOURCE_SNAPSHOT_H256,
      SOURCE_SYSTEM: packet.SOURCE.SYSTEM,
      SOURCE_RUN_ID: packet.SOURCE.SOURCE_RUN_ID,
      ITEM_ID: item.ITEM_ID,
      ITEM_KIND: item.KIND,
      SOURCE_ITEM_H256: sourceItemH256
    },
    CONTENT: content,
    CONTENT_H256: contentH256,
    CRYSTALLIZATION: {
      BOUND_TO_QUEEN: packet.INGESTION.BOUND_TO_QUEEN,
      QUEEN_TICK: packet.INGESTION.QUEEN_TICK,
      CLOCK_AUTHORITY: packet.INGESTION.CLOCK_AUTHORITY,
      SOURCE_PACKET_BOUND_TO_QUEEN: packet.INGESTION.BOUND_TO_QUEEN
    },
    PROOF_REF: null,
    IMMUTABLE: true,
    EXECUTABLE: false,
    AUTO_PROOF_PROMOTION: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "UNDECIDED",
    TRANSPORT_AUTHORIZATION: false,
    SIGNATURE_METHOD,
    CRYSTAL_H256: "0".repeat(64)
  };

  crystal.CRYSTAL_H256 = computeMathCrystalH256(crystal);
  return validateMathCrystalCandidate(crystal);
}

export function verifyMathCrystalAgainstPacket(crystalInput, packetInput) {
  const crystal = validateMathCrystalCandidate(crystalInput);
  const packet = validateMathInputPacket(packetInput);

  if (crystal.PEDIGREE.PACKET_ID !== packet.PACKET_ID) {
    reject("packet ID ancestry mismatch");
  }
  if (crystal.PEDIGREE.PACKET_H256.toLowerCase() !== packet.PACKET_H256.toLowerCase()) {
    reject("packet hash ancestry mismatch");
  }
  if (
    crystal.PEDIGREE.SOURCE_SNAPSHOT_H256.toLowerCase() !==
    packet.SOURCE_SNAPSHOT_H256.toLowerCase()
  ) {
    reject("source snapshot ancestry mismatch");
  }
  if (crystal.PEDIGREE.SOURCE_SYSTEM !== packet.SOURCE.SYSTEM) {
    reject("source system ancestry mismatch");
  }
  if (crystal.PEDIGREE.SOURCE_RUN_ID !== packet.SOURCE.SOURCE_RUN_ID) {
    reject("source run ancestry mismatch");
  }

  const item = packet.ITEMS.find(candidate => candidate.ITEM_ID === crystal.PEDIGREE.ITEM_ID);
  if (!item) reject("source item absent from packet");

  if (crystal.PEDIGREE.ITEM_KIND !== item.KIND) {
    reject("source item kind ancestry mismatch");
  }
  const sourceItemH256 = computeMathInputItemH256(item);
  if (crystal.PEDIGREE.SOURCE_ITEM_H256.toLowerCase() !== sourceItemH256) {
    reject("source item hash ancestry mismatch");
  }

  const expectedContent = contentPayload(item);
  if (JSON.stringify(canonicalize(crystal.CONTENT)) !== JSON.stringify(canonicalize(expectedContent))) {
    reject("crystal content no longer matches source item");
  }

  if (
    crystal.CRYSTALLIZATION.BOUND_TO_QUEEN !== packet.INGESTION.BOUND_TO_QUEEN ||
    crystal.CRYSTALLIZATION.QUEEN_TICK !== packet.INGESTION.QUEEN_TICK ||
    crystal.CRYSTALLIZATION.CLOCK_AUTHORITY !== packet.INGESTION.CLOCK_AUTHORITY
  ) {
    reject("crystallization clock ancestry mismatch");
  }

  return deepFreeze({
    SCHEMA: "BRUTUS-MATH-CRYSTAL-ANCESTRY-VERIFICATION-v0.1",
    VERSION,
    CRYSTAL_ID: crystal.CRYSTAL_ID,
    PACKET_ID: packet.PACKET_ID,
    ITEM_ID: item.ITEM_ID,
    VERDICT: "PASS",
    CONTENT_MATCH: true,
    PACKET_MATCH: true,
    ITEM_MATCH: true,
    CLOCK_MATCH: true,
    PROOF_CREATED: false,
    PROOF_REF: null
  });
}

export const BRUTUS_MATH_CRYSTAL_CANDIDATE_SCHEMA = SCHEMA;
export const BRUTUS_MATH_CRYSTAL_EXPRESSION_HASH_METHOD = EXPRESSION_HASH_METHOD;
