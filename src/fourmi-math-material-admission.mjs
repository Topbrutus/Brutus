import { sha256HexUtf8 } from "./sha256-utf8.mjs";
import {
  validateMathCrystalCandidate,
  verifyMathCrystalAgainstPacket
} from "./math-crystal-candidate.mjs";
import { validateMathInputPacket } from "./math-input-bus.mjs";

const REQUEST_SCHEMA = "BRUTUS-MATH-MATERIAL-ADMISSION-REQUEST-v0.1";
const MATERIAL_SCHEMA = "BRUTUS-FOURMI-MATH-MATERIAL-v0.1";
const VERSION = "0.1";
const CLOCK_AUTHORITY = "QUEEN_SERVER_V0_2";
const SIGNATURE_METHOD = "BRUTUS-CANONICAL-JSON-SHA256-v0.1";

function reject(reason) {
  throw new Error("FOURMI_MATH_MATERIAL_REJECTED: " + reason);
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertExactKeys(value, keys, label) {
  if (!isPlainObject(value)) reject(label + " must be a plain object");
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    reject(label + " has unsupported fields");
  }
}

function assertSha256(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) {
    reject(label + " must be SHA-256 hex");
  }
}

function assertBoundedString(value, label, min = 1, max = 256) {
  if (typeof value !== "string" || value.length < min || value.length > max) {
    reject(label + " must be a bounded string");
  }
}

function assertTick(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    reject(label + " must be a non-negative safe integer");
  }
}

function unsignedRequest(input) {
  const copy = clone(input);
  delete copy.SIGNATURE_H256;
  return copy;
}

function unsignedMaterial(input) {
  const copy = clone(input);
  delete copy.MATERIAL_H256;
  return copy;
}

export function computeMathMaterialAdmissionRequestH256(input) {
  if (!isPlainObject(input)) reject("request must be a plain object");
  return h256(unsignedRequest(input));
}

export function computeFourmiMathMaterialH256(input) {
  if (!isPlainObject(input)) reject("material must be a plain object");
  return h256(unsignedMaterial(input));
}

function validateAuthorization(value) {
  assertExactKeys(value, ["POLICY", "DECISION", "APPROVER"], "AUTHORIZATION");
  if (value.POLICY !== "BRUTUS-MATH-MATERIAL-ADMISSION-v0.1") {
    reject("AUTHORIZATION.POLICY mismatch");
  }
  if (value.DECISION !== "APPROVED") {
    reject("AUTHORIZATION.DECISION must be APPROVED");
  }
  if (value.APPROVER !== "BRUTUS_CONTROL_PLANE") {
    reject("AUTHORIZATION.APPROVER must be BRUTUS_CONTROL_PLANE");
  }
}

export function validateMathMaterialAdmissionRequest(input) {
  assertExactKeys(
    input,
    [
      "SCHEMA",
      "VERSION",
      "REQUEST_ID",
      "ANT_ID",
      "TICK",
      "CLOCK_AUTHORITY",
      "PARENT_CRYSTAL_ID",
      "PARENT_CRYSTAL_H256",
      "PURPOSE",
      "AUTHORIZATION",
      "TRACE_ID",
      "PROOF_REF",
      "SIGNATURE_METHOD",
      "SIGNATURE_H256",
      "EXECUTABLE",
      "GATE_AUTHORITY",
      "ROUTING_AUTHORIZATION",
      "WHEEL_INGRESS_AUTHORIZATION"
    ],
    "request"
  );

  if (input.SCHEMA !== REQUEST_SCHEMA) reject("unsupported request SCHEMA");
  if (input.VERSION !== VERSION) reject("unsupported request VERSION");
  if (
    typeof input.REQUEST_ID !== "string" ||
    !/^MMA-[A-Z0-9-]{4,80}$/.test(input.REQUEST_ID)
  ) {
    reject("invalid REQUEST_ID");
  }
  if (
    typeof input.ANT_ID !== "string" ||
    !/^ANT-[0-9A-F]{12}$/.test(input.ANT_ID)
  ) {
    reject("invalid ANT_ID");
  }
  assertTick(input.TICK, "TICK");
  if (input.CLOCK_AUTHORITY !== CLOCK_AUTHORITY) {
    reject("CLOCK_AUTHORITY must be QUEEN_SERVER_V0_2");
  }
  if (
    typeof input.PARENT_CRYSTAL_ID !== "string" ||
    !/^MATH-CRYSTAL-[A-F0-9]{24}$/.test(input.PARENT_CRYSTAL_ID)
  ) {
    reject("invalid PARENT_CRYSTAL_ID");
  }
  assertSha256(input.PARENT_CRYSTAL_H256, "PARENT_CRYSTAL_H256");
  if (input.PURPOSE !== "FOURMI_TRANSPORT_ADMISSION") {
    reject("PURPOSE must be FOURMI_TRANSPORT_ADMISSION");
  }

  validateAuthorization(input.AUTHORIZATION);

  if (
    typeof input.TRACE_ID !== "string" ||
    !/^TRACE-[A-Z0-9-]{4,64}$/.test(input.TRACE_ID)
  ) {
    reject("invalid TRACE_ID");
  }
  if (input.PROOF_REF !== null) reject("PROOF_REF must be null");
  if (input.SIGNATURE_METHOD !== SIGNATURE_METHOD) {
    reject("unsupported SIGNATURE_METHOD");
  }
  assertSha256(input.SIGNATURE_H256, "SIGNATURE_H256");
  if (
    input.SIGNATURE_H256.toLowerCase() !==
    computeMathMaterialAdmissionRequestH256(input)
  ) {
    reject("SIGNATURE_H256 mismatch");
  }

  if (input.EXECUTABLE !== false) reject("EXECUTABLE must be false");
  if (input.GATE_AUTHORITY !== false) reject("GATE_AUTHORITY must be false");
  if (input.ROUTING_AUTHORIZATION !== "UNDECIDED") {
    reject("ROUTING_AUTHORIZATION must be UNDECIDED");
  }
  if (input.WHEEL_INGRESS_AUTHORIZATION !== false) {
    reject("WHEEL_INGRESS_AUTHORIZATION must be false");
  }

  return deepFreeze(clone(input));
}

function validateCarrier(value) {
  assertExactKeys(
    value,
    ["ANT_ID", "BINDING_STATUS", "RUNTIME_VERIFIED"],
    "CARRIER"
  );
  if (
    typeof value.ANT_ID !== "string" ||
    !/^ANT-[0-9A-F]{12}$/.test(value.ANT_ID)
  ) {
    reject("invalid CARRIER.ANT_ID");
  }
  if (value.BINDING_STATUS !== "CONTROL_PLANE_DECLARED") {
    reject("CARRIER.BINDING_STATUS must be CONTROL_PLANE_DECLARED");
  }
  if (value.RUNTIME_VERIFIED !== false) {
    reject("CARRIER.RUNTIME_VERIFIED must be false at v0.1");
  }
}

function validateAuthorizationRef(value) {
  assertExactKeys(
    value,
    ["REQUEST_ID", "REQUEST_H256", "POLICY", "APPROVER"],
    "AUTHORIZATION_REF"
  );
  if (
    typeof value.REQUEST_ID !== "string" ||
    !/^MMA-[A-Z0-9-]{4,80}$/.test(value.REQUEST_ID)
  ) {
    reject("invalid AUTHORIZATION_REF.REQUEST_ID");
  }
  assertSha256(value.REQUEST_H256, "AUTHORIZATION_REF.REQUEST_H256");
  if (value.POLICY !== "BRUTUS-MATH-MATERIAL-ADMISSION-v0.1") {
    reject("AUTHORIZATION_REF.POLICY mismatch");
  }
  if (value.APPROVER !== "BRUTUS_CONTROL_PLANE") {
    reject("AUTHORIZATION_REF.APPROVER mismatch");
  }
}

function validatePedigree(value) {
  assertExactKeys(
    value,
    [
      "PARENT_CRYSTAL_ID",
      "PARENT_CRYSTAL_H256",
      "PACKET_ID",
      "PACKET_H256",
      "SOURCE_SNAPSHOT_H256",
      "SOURCE_SYSTEM",
      "SOURCE_RUN_ID",
      "ITEM_ID",
      "ITEM_KIND",
      "SOURCE_ITEM_H256",
      "CONTENT_H256",
      "EXPRESSION_H256"
    ],
    "PEDIGREE"
  );

  if (
    typeof value.PARENT_CRYSTAL_ID !== "string" ||
    !/^MATH-CRYSTAL-[A-F0-9]{24}$/.test(value.PARENT_CRYSTAL_ID)
  ) {
    reject("invalid PEDIGREE.PARENT_CRYSTAL_ID");
  }
  assertSha256(value.PARENT_CRYSTAL_H256, "PEDIGREE.PARENT_CRYSTAL_H256");
  if (
    typeof value.PACKET_ID !== "string" ||
    !/^MIP-[A-Z0-9-]{4,96}$/.test(value.PACKET_ID)
  ) {
    reject("invalid PEDIGREE.PACKET_ID");
  }
  for (const key of [
    "PACKET_H256",
    "SOURCE_SNAPSHOT_H256",
    "SOURCE_ITEM_H256",
    "CONTENT_H256",
    "EXPRESSION_H256"
  ]) {
    assertSha256(value[key], "PEDIGREE." + key);
  }
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
}

function validateSourceCrystallization(value) {
  assertExactKeys(
    value,
    ["BOUND_TO_QUEEN", "QUEEN_TICK", "CLOCK_AUTHORITY"],
    "SOURCE_CRYSTALLIZATION"
  );
  if (typeof value.BOUND_TO_QUEEN !== "boolean") {
    reject("SOURCE_CRYSTALLIZATION.BOUND_TO_QUEEN must be boolean");
  }
  if (value.BOUND_TO_QUEEN) {
    assertTick(value.QUEEN_TICK, "SOURCE_CRYSTALLIZATION.QUEEN_TICK");
    if (value.CLOCK_AUTHORITY !== CLOCK_AUTHORITY) {
      reject("SOURCE_CRYSTALLIZATION.CLOCK_AUTHORITY mismatch");
    }
  } else if (
    value.QUEEN_TICK !== null ||
    value.CLOCK_AUTHORITY !== null
  ) {
    reject("unbound SOURCE_CRYSTALLIZATION cannot contain Queen time");
  }
}

function validateContent(value) {
  if (!isPlainObject(value)) reject("CONTENT must be a plain object");
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
  if (value.EXPRESSION_HASH_METHOD !== "UTF8-SHA256-v0.1") {
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

  assertExactKeys(
    value.EVIDENCE,
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
    if (value.EVIDENCE[key] !== null) {
      assertBoundedString(value.EVIDENCE[key], "CONTENT.EVIDENCE." + key, 1, 256);
    }
  }
  for (const key of ["SUPPORT_COUNT", "TEST_COUNT"]) {
    if (!Number.isSafeInteger(value.EVIDENCE[key]) || value.EVIDENCE[key] < 0) {
      reject("CONTENT.EVIDENCE." + key + " invalid");
    }
  }
  assertBoundedString(
    value.EVIDENCE.REPLAY_STATUS,
    "CONTENT.EVIDENCE.REPLAY_STATUS",
    1,
    80
  );

  if (!isPlainObject(value.PROVENANCE)) {
    reject("CONTENT.PROVENANCE must be a plain object");
  }
  if (Object.keys(value.PROVENANCE).length > 32) {
    reject("CONTENT.PROVENANCE exceeds v0.1 field limit");
  }
  for (const [key, item] of Object.entries(value.PROVENANCE)) {
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

export function validateFourmiMathMaterial(input) {
  assertExactKeys(
    input,
    [
      "SCHEMA",
      "VERSION",
      "MATERIAL_ID",
      "MATERIAL_CLASS",
      "MATERIAL_INTENT",
      "CREATED_AT_TICK",
      "CLOCK_AUTHORITY",
      "TRACE_ID",
      "TRANSPORT_STATE",
      "CARRIER",
      "AUTHORIZATION_REF",
      "PEDIGREE",
      "SOURCE_CRYSTALLIZATION",
      "CONTENT",
      "CONTENT_H256",
      "BRUTUS_TRUTH_STATUS",
      "PROOF_REF",
      "PARENT_MUTATED",
      "PARENT_DELETED",
      "MATERIAL_CREATED",
      "MOVEMENT_PERFORMED",
      "IMMUTABLE",
      "EXECUTABLE",
      "AUTO_PROOF_PROMOTION",
      "GATE_AUTHORITY",
      "ROUTING_AUTHORIZATION",
      "TRANSPORT_AUTHORIZATION",
      "WHEEL_INGRESS_AUTHORIZATION",
      "MACHINE_EXECUTION_AUTHORIZATION",
      "SIGNATURE_METHOD",
      "MATERIAL_H256"
    ],
    "material"
  );

  if (input.SCHEMA !== MATERIAL_SCHEMA) reject("unsupported material SCHEMA");
  if (input.VERSION !== VERSION) reject("unsupported material VERSION");
  if (
    typeof input.MATERIAL_ID !== "string" ||
    !/^MAT-MATH-[A-F0-9]{24}$/.test(input.MATERIAL_ID)
  ) {
    reject("invalid MATERIAL_ID");
  }
  if (input.MATERIAL_CLASS !== "FOURMI_MATH_MATERIAL") {
    reject("MATERIAL_CLASS must be FOURMI_MATH_MATERIAL");
  }
  if (input.MATERIAL_INTENT !== "TRANSPORT") {
    reject("MATERIAL_INTENT must be TRANSPORT");
  }
  assertTick(input.CREATED_AT_TICK, "CREATED_AT_TICK");
  if (input.CLOCK_AUTHORITY !== CLOCK_AUTHORITY) {
    reject("material CLOCK_AUTHORITY must be QUEEN_SERVER_V0_2");
  }
  if (
    typeof input.TRACE_ID !== "string" ||
    !/^TRACE-[A-Z0-9-]{4,64}$/.test(input.TRACE_ID)
  ) {
    reject("invalid TRACE_ID");
  }
  if (input.TRANSPORT_STATE !== "ADMITTED_NOT_MOVED") {
    reject("TRANSPORT_STATE must be ADMITTED_NOT_MOVED");
  }

  validateCarrier(input.CARRIER);
  validateAuthorizationRef(input.AUTHORIZATION_REF);
  validatePedigree(input.PEDIGREE);
  validateSourceCrystallization(input.SOURCE_CRYSTALLIZATION);
  validateContent(input.CONTENT);

  assertSha256(input.CONTENT_H256, "CONTENT_H256");
  if (input.CONTENT_H256.toLowerCase() !== h256(input.CONTENT)) {
    reject("CONTENT_H256 mismatch");
  }
  if (input.BRUTUS_TRUTH_STATUS !== "UNVERIFIED_BY_BRUTUS") {
    reject("BRUTUS_TRUTH_STATUS must remain UNVERIFIED_BY_BRUTUS");
  }

  if (input.PROOF_REF !== null) reject("PROOF_REF must be null");
  if (input.PARENT_MUTATED !== false) reject("PARENT_MUTATED must be false");
  if (input.PARENT_DELETED !== false) reject("PARENT_DELETED must be false");
  if (input.MATERIAL_CREATED !== true) reject("MATERIAL_CREATED must be true");
  if (input.MOVEMENT_PERFORMED !== false) reject("MOVEMENT_PERFORMED must be false");
  if (input.IMMUTABLE !== true) reject("IMMUTABLE must be true");
  if (input.EXECUTABLE !== false) reject("EXECUTABLE must be false");
  if (input.AUTO_PROOF_PROMOTION !== false) {
    reject("AUTO_PROOF_PROMOTION must be false");
  }
  if (input.GATE_AUTHORITY !== false) reject("GATE_AUTHORITY must be false");
  if (input.ROUTING_AUTHORIZATION !== "UNDECIDED") {
    reject("ROUTING_AUTHORIZATION must be UNDECIDED");
  }
  if (input.TRANSPORT_AUTHORIZATION !== true) {
    reject("TRANSPORT_AUTHORIZATION must be true");
  }
  if (input.WHEEL_INGRESS_AUTHORIZATION !== false) {
    reject("WHEEL_INGRESS_AUTHORIZATION must be false");
  }
  if (input.MACHINE_EXECUTION_AUTHORIZATION !== false) {
    reject("MACHINE_EXECUTION_AUTHORIZATION must be false");
  }
  if (input.SIGNATURE_METHOD !== SIGNATURE_METHOD) {
    reject("unsupported SIGNATURE_METHOD");
  }
  assertSha256(input.MATERIAL_H256, "MATERIAL_H256");
  if (input.MATERIAL_H256.toLowerCase() !== computeFourmiMathMaterialH256(input)) {
    reject("MATERIAL_H256 mismatch");
  }

  return deepFreeze(clone(input));
}

export function admitMathCrystalToFourmi({ crystal, packet, request }) {
  const validPacket = validateMathInputPacket(packet);
  const validCrystal = validateMathCrystalCandidate(crystal);
  verifyMathCrystalAgainstPacket(validCrystal, validPacket);
  const validRequest = validateMathMaterialAdmissionRequest(request);

  if (validRequest.PARENT_CRYSTAL_ID !== validCrystal.CRYSTAL_ID) {
    reject("request parent crystal ID mismatch");
  }
  if (
    validRequest.PARENT_CRYSTAL_H256.toLowerCase() !==
    validCrystal.CRYSTAL_H256.toLowerCase()
  ) {
    reject("request parent crystal hash mismatch");
  }

  if (
    validCrystal.CRYSTALLIZATION.BOUND_TO_QUEEN &&
    validRequest.TICK < validCrystal.CRYSTALLIZATION.QUEEN_TICK
  ) {
    reject("admission TICK cannot precede source crystal Queen tick");
  }

  const idSeed = h256({
    REQUEST_ID: validRequest.REQUEST_ID,
    REQUEST_H256: validRequest.SIGNATURE_H256,
    PARENT_CRYSTAL_ID: validCrystal.CRYSTAL_ID,
    PARENT_CRYSTAL_H256: validCrystal.CRYSTAL_H256,
    ANT_ID: validRequest.ANT_ID,
    TICK: validRequest.TICK,
    CONTENT_H256: validCrystal.CONTENT_H256
  });

  const material = {
    SCHEMA: MATERIAL_SCHEMA,
    VERSION,
    MATERIAL_ID: `MAT-MATH-${idSeed.slice(0, 24).toUpperCase()}`,
    MATERIAL_CLASS: "FOURMI_MATH_MATERIAL",
    MATERIAL_INTENT: "TRANSPORT",
    CREATED_AT_TICK: validRequest.TICK,
    CLOCK_AUTHORITY,
    TRACE_ID: validRequest.TRACE_ID,
    TRANSPORT_STATE: "ADMITTED_NOT_MOVED",
    CARRIER: {
      ANT_ID: validRequest.ANT_ID,
      BINDING_STATUS: "CONTROL_PLANE_DECLARED",
      RUNTIME_VERIFIED: false
    },
    AUTHORIZATION_REF: {
      REQUEST_ID: validRequest.REQUEST_ID,
      REQUEST_H256: validRequest.SIGNATURE_H256,
      POLICY: validRequest.AUTHORIZATION.POLICY,
      APPROVER: validRequest.AUTHORIZATION.APPROVER
    },
    PEDIGREE: {
      PARENT_CRYSTAL_ID: validCrystal.CRYSTAL_ID,
      PARENT_CRYSTAL_H256: validCrystal.CRYSTAL_H256,
      PACKET_ID: validCrystal.PEDIGREE.PACKET_ID,
      PACKET_H256: validCrystal.PEDIGREE.PACKET_H256,
      SOURCE_SNAPSHOT_H256: validCrystal.PEDIGREE.SOURCE_SNAPSHOT_H256,
      SOURCE_SYSTEM: validCrystal.PEDIGREE.SOURCE_SYSTEM,
      SOURCE_RUN_ID: validCrystal.PEDIGREE.SOURCE_RUN_ID,
      ITEM_ID: validCrystal.PEDIGREE.ITEM_ID,
      ITEM_KIND: validCrystal.PEDIGREE.ITEM_KIND,
      SOURCE_ITEM_H256: validCrystal.PEDIGREE.SOURCE_ITEM_H256,
      CONTENT_H256: validCrystal.CONTENT_H256,
      EXPRESSION_H256: validCrystal.CONTENT.EXPRESSION_H256
    },
    SOURCE_CRYSTALLIZATION: {
      BOUND_TO_QUEEN: validCrystal.CRYSTALLIZATION.BOUND_TO_QUEEN,
      QUEEN_TICK: validCrystal.CRYSTALLIZATION.QUEEN_TICK,
      CLOCK_AUTHORITY: validCrystal.CRYSTALLIZATION.CLOCK_AUTHORITY
    },
    CONTENT: clone(validCrystal.CONTENT),
    CONTENT_H256: validCrystal.CONTENT_H256,
    BRUTUS_TRUTH_STATUS: "UNVERIFIED_BY_BRUTUS",
    PROOF_REF: null,
    PARENT_MUTATED: false,
    PARENT_DELETED: false,
    MATERIAL_CREATED: true,
    MOVEMENT_PERFORMED: false,
    IMMUTABLE: true,
    EXECUTABLE: false,
    AUTO_PROOF_PROMOTION: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "UNDECIDED",
    TRANSPORT_AUTHORIZATION: true,
    WHEEL_INGRESS_AUTHORIZATION: false,
    MACHINE_EXECUTION_AUTHORIZATION: false,
    SIGNATURE_METHOD,
    MATERIAL_H256: "0".repeat(64)
  };

  material.MATERIAL_H256 = computeFourmiMathMaterialH256(material);
  return validateFourmiMathMaterial(material);
}

export const BRUTUS_MATH_MATERIAL_ADMISSION_REQUEST_SCHEMA = REQUEST_SCHEMA;
export const BRUTUS_FOURMI_MATH_MATERIAL_SCHEMA = MATERIAL_SCHEMA;
