import { sha256HexUtf8 } from "./sha256-utf8.mjs";
import { normalizeAntIdentity } from "./adapters/ant-birth-identity.mjs";
import { validateRealMechanismEvent } from "./real-mechanism-event.mjs";
import { validateFourmiMathMaterial } from "./fourmi-math-material-admission.mjs";

const CARRIER_OBSERVATION_SCHEMA =
  "BRUTUS-MATH-MATERIAL-CARRIER-OBSERVATION-v0.1";
const MOVE_SCHEMA =
  "BRUTUS-FOURMI-MATH-MATERIAL-MOVE-v0.1";
const VERSION = "0.1";
const CLOCK_AUTHORITY = "QUEEN_SERVER_V0_2";
const SIGNATURE_METHOD = "BRUTUS-CANONICAL-JSON-SHA256-v0.1";

function reject(reason) {
  throw new Error("FOURMI_MATH_MATERIAL_MOVE_REJECTED: " + reason);
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
    for (const key of Object.keys(value).sort()) {
      out[key] = canonicalize(value[key]);
    }
    return out;
  }
  return value;
}

function h256(value) {
  return sha256HexUtf8(JSON.stringify(canonicalize(value)));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

function assertSha256(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) {
    reject(label + " must be SHA-256 hex");
  }
}

function assertTick(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    reject(label + " must be a non-negative safe integer");
  }
}

function assertBoundedString(value, label, min = 1, max = 256) {
  if (typeof value !== "string" || value.length < min || value.length > max) {
    reject(label + " must be a bounded string");
  }
}

function unsignedCarrierObservation(input) {
  const copy = clone(input);
  delete copy.SIGNATURE_H256;
  return copy;
}

function unsignedMove(input) {
  const copy = clone(input);
  delete copy.MOVE_H256;
  return copy;
}

export function computeMathMaterialCarrierObservationH256(input) {
  if (!isPlainObject(input)) reject("carrier observation must be a plain object");
  return h256(unsignedCarrierObservation(input));
}

export function computeFourmiMathMaterialMoveH256(input) {
  if (!isPlainObject(input)) reject("material move must be a plain object");
  return h256(unsignedMove(input));
}

function validateObservationSource(value) {
  assertExactKeys(
    value,
    [
      "SOURCE_SCHEMA",
      "SOURCE_ENDPOINT",
      "OBSERVED_AT_UTC",
      "INTEGRITY_MATCH"
    ],
    "SOURCE"
  );
  assertBoundedString(value.SOURCE_SCHEMA, "SOURCE.SOURCE_SCHEMA", 3, 160);
  assertBoundedString(value.SOURCE_ENDPOINT, "SOURCE.SOURCE_ENDPOINT", 1, 256);
  if (
    typeof value.OBSERVED_AT_UTC !== "string" ||
    !Number.isFinite(Date.parse(value.OBSERVED_AT_UTC))
  ) {
    reject("SOURCE.OBSERVED_AT_UTC must be a valid date-time");
  }
  if (value.INTEGRITY_MATCH !== true) {
    reject("SOURCE.INTEGRITY_MATCH must be true");
  }
}

export function validateMathMaterialCarrierObservation(input) {
  assertExactKeys(
    input,
    [
      "SCHEMA",
      "VERSION",
      "OBSERVATION_ID",
      "TICK",
      "CLOCK_AUTHORITY",
      "MATERIAL_ID",
      "MATERIAL_H256",
      "ANT_ID",
      "BINDING_STATE",
      "SOURCE",
      "TRACE_ID",
      "PROOF_REF",
      "SIGNATURE_METHOD",
      "SIGNATURE_H256",
      "EXECUTABLE",
      "PROOF_CLAIM",
      "GATE_AUTHORITY",
      "ROUTING_AUTHORIZATION"
    ],
    "carrier observation"
  );

  if (input.SCHEMA !== CARRIER_OBSERVATION_SCHEMA) {
    reject("unsupported carrier observation SCHEMA");
  }
  if (input.VERSION !== VERSION) reject("unsupported carrier observation VERSION");
  if (
    typeof input.OBSERVATION_ID !== "string" ||
    !/^MMCO-T[0-9]{1,16}-[A-Z0-9-]{4,64}$/.test(input.OBSERVATION_ID)
  ) {
    reject("invalid OBSERVATION_ID");
  }
  assertTick(input.TICK, "TICK");
  if (input.CLOCK_AUTHORITY !== CLOCK_AUTHORITY) {
    reject("CLOCK_AUTHORITY must be QUEEN_SERVER_V0_2");
  }
  if (
    typeof input.MATERIAL_ID !== "string" ||
    !/^MAT-MATH-[A-F0-9]{24}$/.test(input.MATERIAL_ID)
  ) {
    reject("invalid MATERIAL_ID");
  }
  assertSha256(input.MATERIAL_H256, "MATERIAL_H256");
  if (
    typeof input.ANT_ID !== "string" ||
    !/^ANT-[0-9A-F]{12}$/.test(input.ANT_ID)
  ) {
    reject("invalid ANT_ID");
  }
  if (input.BINDING_STATE !== "ATTACHED") {
    reject("BINDING_STATE must be ATTACHED");
  }

  validateObservationSource(input.SOURCE);

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
    computeMathMaterialCarrierObservationH256(input)
  ) {
    reject("SIGNATURE_H256 mismatch");
  }

  if (input.EXECUTABLE !== false) reject("EXECUTABLE must be false");
  if (input.PROOF_CLAIM !== false) reject("PROOF_CLAIM must be false");
  if (input.GATE_AUTHORITY !== false) reject("GATE_AUTHORITY must be false");
  if (input.ROUTING_AUTHORIZATION !== "UNDECIDED") {
    reject("ROUTING_AUTHORIZATION must be UNDECIDED");
  }

  return deepFreeze(clone(input));
}

function validateMaterialRef(value) {
  assertExactKeys(
    value,
    [
      "MATERIAL_ID",
      "MATERIAL_H256",
      "PARENT_CRYSTAL_ID",
      "PARENT_CRYSTAL_H256",
      "CONTENT_H256",
      "EXPRESSION_H256"
    ],
    "MATERIAL_REF"
  );
  if (
    typeof value.MATERIAL_ID !== "string" ||
    !/^MAT-MATH-[A-F0-9]{24}$/.test(value.MATERIAL_ID)
  ) {
    reject("invalid MATERIAL_REF.MATERIAL_ID");
  }
  if (
    typeof value.PARENT_CRYSTAL_ID !== "string" ||
    !/^MATH-CRYSTAL-[A-F0-9]{24}$/.test(value.PARENT_CRYSTAL_ID)
  ) {
    reject("invalid MATERIAL_REF.PARENT_CRYSTAL_ID");
  }
  for (const key of [
    "MATERIAL_H256",
    "PARENT_CRYSTAL_H256",
    "CONTENT_H256",
    "EXPRESSION_H256"
  ]) {
    assertSha256(value[key], "MATERIAL_REF." + key);
  }
}

function validateCarrier(value) {
  assertExactKeys(
    value,
    [
      "ANT_ID",
      "ANT_IDENTITY_H256",
      "CARRIER_OBSERVATION_ID",
      "CARRIER_OBSERVATION_H256",
      "RUNTIME_VERIFIED"
    ],
    "CARRIER"
  );
  if (
    typeof value.ANT_ID !== "string" ||
    !/^ANT-[0-9A-F]{12}$/.test(value.ANT_ID)
  ) {
    reject("invalid CARRIER.ANT_ID");
  }
  assertSha256(value.ANT_IDENTITY_H256, "CARRIER.ANT_IDENTITY_H256");
  if (
    typeof value.CARRIER_OBSERVATION_ID !== "string" ||
    !/^MMCO-T[0-9]{1,16}-[A-Z0-9-]{4,64}$/.test(value.CARRIER_OBSERVATION_ID)
  ) {
    reject("invalid CARRIER.CARRIER_OBSERVATION_ID");
  }
  assertSha256(
    value.CARRIER_OBSERVATION_H256,
    "CARRIER.CARRIER_OBSERVATION_H256"
  );
  if (value.RUNTIME_VERIFIED !== true) {
    reject("CARRIER.RUNTIME_VERIFIED must be true");
  }
}

function validateAntMoveRef(value) {
  assertExactKeys(
    value,
    [
      "EVENT_ID",
      "EVENT_SIGNATURE_H256",
      "TRACE_ID",
      "FROM",
      "TO",
      "SOURCE_OBSERVATION_ID",
      "SOURCE_SCHEMA",
      "SOURCE_ENDPOINT"
    ],
    "ANT_MOVE_REF"
  );
  if (
    typeof value.EVENT_ID !== "string" ||
    !/^RME-T[0-9]{1,16}-[A-Z0-9-]{4,64}$/.test(value.EVENT_ID)
  ) {
    reject("invalid ANT_MOVE_REF.EVENT_ID");
  }
  assertSha256(value.EVENT_SIGNATURE_H256, "ANT_MOVE_REF.EVENT_SIGNATURE_H256");
  if (
    typeof value.TRACE_ID !== "string" ||
    !/^TRACE-[A-Z0-9-]{4,64}$/.test(value.TRACE_ID)
  ) {
    reject("invalid ANT_MOVE_REF.TRACE_ID");
  }
  for (const key of ["FROM", "TO"]) {
    if (
      typeof value[key] !== "string" ||
      !/^W:[A-Z0-9-]{1,32}$/.test(value[key])
    ) {
      reject("invalid ANT_MOVE_REF." + key);
    }
  }
  if (value.FROM === value.TO) reject("ANT_MOVE_REF requires changed position");
  assertBoundedString(
    value.SOURCE_OBSERVATION_ID,
    "ANT_MOVE_REF.SOURCE_OBSERVATION_ID",
    4,
    256
  );
  assertBoundedString(value.SOURCE_SCHEMA, "ANT_MOVE_REF.SOURCE_SCHEMA", 3, 160);
  assertBoundedString(value.SOURCE_ENDPOINT, "ANT_MOVE_REF.SOURCE_ENDPOINT", 1, 256);
}

function validateMovement(value) {
  assertExactKeys(
    value,
    [
      "FROM",
      "TO",
      "MATERIAL_STATE_BEFORE",
      "MATERIAL_STATE_AFTER",
      "ANT_MOVED",
      "MATERIAL_BOUND_AT_MOVE",
      "MATERIAL_MOVEMENT_VERIFIED"
    ],
    "MOVEMENT"
  );
  for (const key of ["FROM", "TO"]) {
    if (
      typeof value[key] !== "string" ||
      !/^W:[A-Z0-9-]{1,32}$/.test(value[key])
    ) {
      reject("invalid MOVEMENT." + key);
    }
  }
  if (value.FROM === value.TO) reject("MOVEMENT requires changed position");
  if (value.MATERIAL_STATE_BEFORE !== "ADMITTED_NOT_MOVED") {
    reject("MOVEMENT.MATERIAL_STATE_BEFORE mismatch");
  }
  if (value.MATERIAL_STATE_AFTER !== "MOVED_OBSERVED") {
    reject("MOVEMENT.MATERIAL_STATE_AFTER mismatch");
  }
  if (value.ANT_MOVED !== true) reject("MOVEMENT.ANT_MOVED must be true");
  if (value.MATERIAL_BOUND_AT_MOVE !== true) {
    reject("MOVEMENT.MATERIAL_BOUND_AT_MOVE must be true");
  }
  if (value.MATERIAL_MOVEMENT_VERIFIED !== true) {
    reject("MOVEMENT.MATERIAL_MOVEMENT_VERIFIED must be true");
  }
}

export function validateFourmiMathMaterialMove(input) {
  assertExactKeys(
    input,
    [
      "SCHEMA",
      "VERSION",
      "MOVE_ID",
      "EVENT_TYPE",
      "TICK",
      "CLOCK_AUTHORITY",
      "MATERIAL_REF",
      "CARRIER",
      "ANT_MOVE_REF",
      "MOVEMENT",
      "BRUTUS_TRUTH_STATUS",
      "PROOF_REF",
      "PROOF_CREATED",
      "PROOF_CLAIM",
      "MATERIAL_MUTATED",
      "PARENT_CRYSTAL_MUTATED",
      "TRANSPORT_AUTHORIZATION",
      "WHEEL_INGRESS_AUTHORIZATION",
      "MACHINE_EXECUTION_AUTHORIZATION",
      "ROUTING_AUTHORIZATION",
      "EXECUTABLE",
      "GATE_AUTHORITY",
      "SIGNATURE_METHOD",
      "MOVE_H256"
    ],
    "material move"
  );

  if (input.SCHEMA !== MOVE_SCHEMA) reject("unsupported material move SCHEMA");
  if (input.VERSION !== VERSION) reject("unsupported material move VERSION");
  if (
    typeof input.MOVE_ID !== "string" ||
    !/^MMOVE-T[0-9]{1,16}-[A-F0-9]{20}$/.test(input.MOVE_ID)
  ) {
    reject("invalid MOVE_ID");
  }
  if (input.EVENT_TYPE !== "MATERIAL_MOVE") {
    reject("EVENT_TYPE must be MATERIAL_MOVE");
  }
  assertTick(input.TICK, "TICK");
  if (input.CLOCK_AUTHORITY !== CLOCK_AUTHORITY) {
    reject("CLOCK_AUTHORITY must be QUEEN_SERVER_V0_2");
  }

  validateMaterialRef(input.MATERIAL_REF);
  validateCarrier(input.CARRIER);
  validateAntMoveRef(input.ANT_MOVE_REF);
  validateMovement(input.MOVEMENT);

  if (
    input.MOVEMENT.FROM !== input.ANT_MOVE_REF.FROM ||
    input.MOVEMENT.TO !== input.ANT_MOVE_REF.TO
  ) {
    reject("movement endpoints must exactly match ANT_MOVE");
  }

  if (input.BRUTUS_TRUTH_STATUS !== "UNVERIFIED_BY_BRUTUS") {
    reject("BRUTUS_TRUTH_STATUS must remain UNVERIFIED_BY_BRUTUS");
  }
  if (input.PROOF_REF !== null) reject("PROOF_REF must be null");
  if (input.PROOF_CREATED !== false) reject("PROOF_CREATED must be false");
  if (input.PROOF_CLAIM !== false) reject("PROOF_CLAIM must be false");
  if (input.MATERIAL_MUTATED !== false) reject("MATERIAL_MUTATED must be false");
  if (input.PARENT_CRYSTAL_MUTATED !== false) {
    reject("PARENT_CRYSTAL_MUTATED must be false");
  }
  if (input.TRANSPORT_AUTHORIZATION !== true) {
    reject("TRANSPORT_AUTHORIZATION must remain true");
  }
  if (input.WHEEL_INGRESS_AUTHORIZATION !== false) {
    reject("WHEEL_INGRESS_AUTHORIZATION must be false");
  }
  if (input.MACHINE_EXECUTION_AUTHORIZATION !== false) {
    reject("MACHINE_EXECUTION_AUTHORIZATION must be false");
  }
  if (input.ROUTING_AUTHORIZATION !== "UNDECIDED") {
    reject("ROUTING_AUTHORIZATION must be UNDECIDED");
  }
  if (input.EXECUTABLE !== false) reject("EXECUTABLE must be false");
  if (input.GATE_AUTHORITY !== false) reject("GATE_AUTHORITY must be false");
  if (input.SIGNATURE_METHOD !== SIGNATURE_METHOD) {
    reject("unsupported SIGNATURE_METHOD");
  }
  assertSha256(input.MOVE_H256, "MOVE_H256");
  if (input.MOVE_H256.toLowerCase() !== computeFourmiMathMaterialMoveH256(input)) {
    reject("MOVE_H256 mismatch");
  }

  return deepFreeze(clone(input));
}

export function bindFourmiMathMaterialMove({
  material,
  antBirthReceipt,
  carrierObservation,
  antMoveEvent
}) {
  const validMaterial = validateFourmiMathMaterial(material);
  const antIdentity = normalizeAntIdentity(antBirthReceipt);
  const validCarrierObservation =
    validateMathMaterialCarrierObservation(carrierObservation);
  const validAntMove = validateRealMechanismEvent(antMoveEvent);

  if (validAntMove.EVENT_TYPE !== "ANT_MOVE") {
    reject("real mechanism event must be ANT_MOVE");
  }

  if (antIdentity.ANT_ID !== validMaterial.CARRIER.ANT_ID) {
    reject("live ant identity does not match material carrier");
  }
  if (validCarrierObservation.ANT_ID !== antIdentity.ANT_ID) {
    reject("carrier observation ANT_ID does not match live ant identity");
  }
  if (validCarrierObservation.MATERIAL_ID !== validMaterial.MATERIAL_ID) {
    reject("carrier observation material ID mismatch");
  }
  if (
    validCarrierObservation.MATERIAL_H256.toLowerCase() !==
    validMaterial.MATERIAL_H256.toLowerCase()
  ) {
    reject("carrier observation material hash mismatch");
  }
  if (validCarrierObservation.TICK < validMaterial.CREATED_AT_TICK) {
    reject("carrier observation cannot precede material admission");
  }

  if (validAntMove.SUBJECT.ID !== antIdentity.ANT_ID) {
    reject("ANT_MOVE subject does not match live carrier");
  }
  if (validAntMove.TICK < validCarrierObservation.TICK) {
    reject("ANT_MOVE cannot precede carrier attachment observation");
  }
  if (validAntMove.CLOCK_AUTHORITY !== CLOCK_AUTHORITY) {
    reject("ANT_MOVE clock authority mismatch");
  }

  const antIdentityH256 = h256(antIdentity);
  const moveSeed = h256({
    MATERIAL_H256: validMaterial.MATERIAL_H256,
    ANT_IDENTITY_H256: antIdentityH256,
    CARRIER_OBSERVATION_H256: validCarrierObservation.SIGNATURE_H256,
    ANT_MOVE_H256: validAntMove.SIGNATURE_H256,
    TICK: validAntMove.TICK,
    FROM: validAntMove.PAYLOAD.FROM,
    TO: validAntMove.PAYLOAD.TO
  });

  const output = {
    SCHEMA: MOVE_SCHEMA,
    VERSION,
    MOVE_ID:
      `MMOVE-T${validAntMove.TICK}-${moveSeed.slice(0, 20).toUpperCase()}`,
    EVENT_TYPE: "MATERIAL_MOVE",
    TICK: validAntMove.TICK,
    CLOCK_AUTHORITY,
    MATERIAL_REF: {
      MATERIAL_ID: validMaterial.MATERIAL_ID,
      MATERIAL_H256: validMaterial.MATERIAL_H256,
      PARENT_CRYSTAL_ID: validMaterial.PEDIGREE.PARENT_CRYSTAL_ID,
      PARENT_CRYSTAL_H256: validMaterial.PEDIGREE.PARENT_CRYSTAL_H256,
      CONTENT_H256: validMaterial.CONTENT_H256,
      EXPRESSION_H256: validMaterial.PEDIGREE.EXPRESSION_H256
    },
    CARRIER: {
      ANT_ID: antIdentity.ANT_ID,
      ANT_IDENTITY_H256: antIdentityH256,
      CARRIER_OBSERVATION_ID: validCarrierObservation.OBSERVATION_ID,
      CARRIER_OBSERVATION_H256: validCarrierObservation.SIGNATURE_H256,
      RUNTIME_VERIFIED: true
    },
    ANT_MOVE_REF: {
      EVENT_ID: validAntMove.EVENT_ID,
      EVENT_SIGNATURE_H256: validAntMove.SIGNATURE_H256,
      TRACE_ID: validAntMove.TRACE_ID,
      FROM: validAntMove.PAYLOAD.FROM,
      TO: validAntMove.PAYLOAD.TO,
      SOURCE_OBSERVATION_ID: validAntMove.SOURCE.OBSERVATION_ID,
      SOURCE_SCHEMA: validAntMove.SOURCE.SOURCE_SCHEMA,
      SOURCE_ENDPOINT: validAntMove.SOURCE.SOURCE_ENDPOINT
    },
    MOVEMENT: {
      FROM: validAntMove.PAYLOAD.FROM,
      TO: validAntMove.PAYLOAD.TO,
      MATERIAL_STATE_BEFORE: "ADMITTED_NOT_MOVED",
      MATERIAL_STATE_AFTER: "MOVED_OBSERVED",
      ANT_MOVED: true,
      MATERIAL_BOUND_AT_MOVE: true,
      MATERIAL_MOVEMENT_VERIFIED: true
    },
    BRUTUS_TRUTH_STATUS: "UNVERIFIED_BY_BRUTUS",
    PROOF_REF: null,
    PROOF_CREATED: false,
    PROOF_CLAIM: false,
    MATERIAL_MUTATED: false,
    PARENT_CRYSTAL_MUTATED: false,
    TRANSPORT_AUTHORIZATION: true,
    WHEEL_INGRESS_AUTHORIZATION: false,
    MACHINE_EXECUTION_AUTHORIZATION: false,
    ROUTING_AUTHORIZATION: "UNDECIDED",
    EXECUTABLE: false,
    GATE_AUTHORITY: false,
    SIGNATURE_METHOD,
    MOVE_H256: "0".repeat(64)
  };

  output.MOVE_H256 = computeFourmiMathMaterialMoveH256(output);
  return validateFourmiMathMaterialMove(output);
}

export const BRUTUS_MATH_MATERIAL_CARRIER_OBSERVATION_SCHEMA =
  CARRIER_OBSERVATION_SCHEMA;
export const BRUTUS_FOURMI_MATH_MATERIAL_MOVE_SCHEMA = MOVE_SCHEMA;
