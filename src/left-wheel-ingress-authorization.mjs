import { sha256HexUtf8 } from "./sha256-utf8.mjs";
import { validateFourmiMathMaterialMove } from "./fourmi-math-material-move.mjs";
import { validateLiveFourmiTransportConsumption } from "./one-step-live-transport-runtime.mjs";

const SCHEMA = "BRUTUS-LEFT-WHEEL-INGRESS-AUTHORIZATION-v0.1";
const VERDICT_SCHEMA = "BRUTUS-LEFT-WHEEL-INGRESS-VERDICT-v0.1";
const VERSION = "0.1";
const CLOCK_AUTHORITY = "QUEEN_SERVER_V0_2";
const SIGNATURE_METHOD = "BRUTUS-CANONICAL-JSON-SHA256-v0.1";
const POLICY = "BRUTUS-LEFT-WHEEL-INGRESS-v0.1";
const MAX_VALIDITY_SPAN_TICKS = 65536;
const UNKNOWN_EXTERNAL_OUTCOME_POLICY =
  "NO_AUTOMATIC_RETRY_AFTER_ATTEMPT_START";

function reject(reason) {
  throw new Error("LEFT_WHEEL_INGRESS_AUTH_REJECTED: " + reason);
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

function h256(value) {
  return sha256HexUtf8(JSON.stringify(canonicalize(value)));
}

function unsigned(input) {
  const copy = clone(input);
  delete copy.SIGNATURE_H256;
  return copy;
}

function assertExactKeys(value, keys, label) {
  if (!isPlainObject(value)) reject(label + " must be a plain object");
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    reject(label + " has unsupported fields");
  }
}

function assertTick(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    reject(label + " must be a non-negative safe integer");
  }
}

function assertSha256(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) {
    reject(label + " must be SHA-256 hex");
  }
}

function assertWorldRef(value, label) {
  if (typeof value !== "string" || !/^W:[A-Z0-9-]{1,32}$/.test(value)) {
    reject(label + " must be a W: reference");
  }
}

function validateScope(value) {
  assertExactKeys(
    value,
    [
      "PURPOSE",
      "WHEEL",
      "SOURCE_POSITION",
      "MATERIAL_CLASS",
      "REQUIRED_MOVE_STATE",
      "MAX_INGRESS_ATTEMPTS"
    ],
    "SCOPE"
  );
  if (value.PURPOSE !== "LEFT_WHEEL_INGRESS") {
    reject("SCOPE.PURPOSE must be LEFT_WHEEL_INGRESS");
  }
  if (value.WHEEL !== "LEFT") reject("SCOPE.WHEEL must be LEFT");
  assertWorldRef(value.SOURCE_POSITION, "SCOPE.SOURCE_POSITION");
  if (value.MATERIAL_CLASS !== "FOURMI_MATH_MATERIAL") {
    reject("SCOPE.MATERIAL_CLASS must be FOURMI_MATH_MATERIAL");
  }
  if (value.REQUIRED_MOVE_STATE !== "MOVED_OBSERVED") {
    reject("SCOPE.REQUIRED_MOVE_STATE must be MOVED_OBSERVED");
  }
  if (value.MAX_INGRESS_ATTEMPTS !== 1) {
    reject("SCOPE.MAX_INGRESS_ATTEMPTS must be 1");
  }
}

function validateDecision(value) {
  assertExactKeys(value, ["POLICY", "DECISION", "APPROVER"], "AUTHORIZATION");
  if (value.POLICY !== POLICY) reject("AUTHORIZATION.POLICY mismatch");
  if (value.DECISION !== "APPROVED") {
    reject("AUTHORIZATION.DECISION must be APPROVED");
  }
  if (value.APPROVER !== "BRUTUS_CONTROL_PLANE") {
    reject("AUTHORIZATION.APPROVER must be BRUTUS_CONTROL_PLANE");
  }
}

export function computeLeftWheelIngressAuthorizationH256(input) {
  if (!isPlainObject(input)) reject("authorization must be a plain object");
  return h256(unsigned(input));
}

export function validateLeftWheelIngressAuthorization(input) {
  assertExactKeys(
    input,
    [
      "SCHEMA",
      "VERSION",
      "AUTHORIZATION_ID",
      "MATERIAL_ID",
      "MATERIAL_H256",
      "MOVE_ID",
      "MOVE_H256",
      "TRANSPORT_CONSUMPTION_ID",
      "TRANSPORT_CONSUMPTION_H256",
      "ANT_ID",
      "ISSUED_AT_TICK",
      "VALID_FROM_TICK",
      "EXPIRES_AT_TICK",
      "CLOCK_AUTHORITY",
      "SCOPE",
      "AUTHORIZATION",
      "TRACE_ID",
      "BRUTUS_TRUTH_STATUS",
      "PROOF_REF",
      "PROOF_CLAIM",
      "SINGLE_USE",
      "WHEEL_INGRESS_AUTHORIZATION",
      "MACHINE_EXECUTION_AUTHORIZATION",
      "EXECUTABLE",
      "GATE_AUTHORITY",
      "AUTOMATIC_RETRY_ALLOWED",
      "UNKNOWN_EXTERNAL_OUTCOME_POLICY",
      "SIGNATURE_METHOD",
      "SIGNATURE_H256"
    ],
    "authorization"
  );

  if (input.SCHEMA !== SCHEMA) reject("unsupported SCHEMA");
  if (input.VERSION !== VERSION) reject("unsupported VERSION");
  if (
    typeof input.AUTHORIZATION_ID !== "string" ||
    !/^LWIA-T[0-9]{1,16}-[A-F0-9]{20}$/.test(input.AUTHORIZATION_ID)
  ) {
    reject("invalid AUTHORIZATION_ID");
  }
  if (
    typeof input.MATERIAL_ID !== "string" ||
    !/^MAT-MATH-[A-F0-9]{24}$/.test(input.MATERIAL_ID)
  ) {
    reject("invalid MATERIAL_ID");
  }
  assertSha256(input.MATERIAL_H256, "MATERIAL_H256");
  if (
    typeof input.MOVE_ID !== "string" ||
    !/^MMOVE-T[0-9]{1,16}-[A-F0-9]{20}$/.test(input.MOVE_ID)
  ) {
    reject("invalid MOVE_ID");
  }
  assertSha256(input.MOVE_H256, "MOVE_H256");
  if (
    typeof input.TRANSPORT_CONSUMPTION_ID !== "string" ||
    !/^LTAC-T[0-9]{1,16}-[A-F0-9]{20}$/.test(input.TRANSPORT_CONSUMPTION_ID)
  ) {
    reject("invalid TRANSPORT_CONSUMPTION_ID");
  }
  assertSha256(input.TRANSPORT_CONSUMPTION_H256, "TRANSPORT_CONSUMPTION_H256");
  if (
    typeof input.ANT_ID !== "string" ||
    !/^ANT-[0-9A-F]{12}$/.test(input.ANT_ID)
  ) {
    reject("invalid ANT_ID");
  }

  assertTick(input.ISSUED_AT_TICK, "ISSUED_AT_TICK");
  assertTick(input.VALID_FROM_TICK, "VALID_FROM_TICK");
  assertTick(input.EXPIRES_AT_TICK, "EXPIRES_AT_TICK");
  if (input.VALID_FROM_TICK < input.ISSUED_AT_TICK) {
    reject("VALID_FROM_TICK cannot precede ISSUED_AT_TICK");
  }
  if (input.EXPIRES_AT_TICK < input.VALID_FROM_TICK) {
    reject("EXPIRES_AT_TICK cannot precede VALID_FROM_TICK");
  }
  if (
    input.EXPIRES_AT_TICK - input.VALID_FROM_TICK >
    MAX_VALIDITY_SPAN_TICKS
  ) {
    reject("authorization validity span exceeds v0.1 bound");
  }
  if (input.CLOCK_AUTHORITY !== CLOCK_AUTHORITY) {
    reject("CLOCK_AUTHORITY must be QUEEN_SERVER_V0_2");
  }

  validateScope(input.SCOPE);
  validateDecision(input.AUTHORIZATION);

  if (
    typeof input.TRACE_ID !== "string" ||
    !/^TRACE-[A-Z0-9-]{4,64}$/.test(input.TRACE_ID)
  ) {
    reject("invalid TRACE_ID");
  }
  if (input.BRUTUS_TRUTH_STATUS !== "UNVERIFIED_BY_BRUTUS") {
    reject("BRUTUS_TRUTH_STATUS must remain UNVERIFIED_BY_BRUTUS");
  }
  if (input.PROOF_REF !== null) reject("PROOF_REF must be null");
  if (input.PROOF_CLAIM !== false) reject("PROOF_CLAIM must be false");
  if (input.SINGLE_USE !== true) reject("SINGLE_USE must be true");
  if (input.WHEEL_INGRESS_AUTHORIZATION !== true) {
    reject("WHEEL_INGRESS_AUTHORIZATION must be true");
  }
  if (input.MACHINE_EXECUTION_AUTHORIZATION !== false) {
    reject("MACHINE_EXECUTION_AUTHORIZATION must be false");
  }
  if (input.EXECUTABLE !== false) reject("EXECUTABLE must be false");
  if (input.GATE_AUTHORITY !== true) reject("GATE_AUTHORITY must be true");
  if (input.AUTOMATIC_RETRY_ALLOWED !== false) {
    reject("AUTOMATIC_RETRY_ALLOWED must be false");
  }
  if (input.UNKNOWN_EXTERNAL_OUTCOME_POLICY !== UNKNOWN_EXTERNAL_OUTCOME_POLICY) {
    reject("UNKNOWN_EXTERNAL_OUTCOME_POLICY mismatch");
  }
  if (input.SIGNATURE_METHOD !== SIGNATURE_METHOD) {
    reject("unsupported SIGNATURE_METHOD");
  }
  assertSha256(input.SIGNATURE_H256, "SIGNATURE_H256");
  if (
    input.SIGNATURE_H256.toLowerCase() !==
    computeLeftWheelIngressAuthorizationH256(input)
  ) {
    reject("SIGNATURE_H256 mismatch");
  }

  return deepFreeze(clone(input));
}

function assertMoveConsumptionBinding(move, consumption) {
  if (consumption.MATERIAL_ID !== move.MATERIAL_REF.MATERIAL_ID) {
    reject("transport consumption material ID mismatch");
  }
  if (consumption.ANT_ID !== move.CARRIER.ANT_ID) {
    reject("transport consumption ANT_ID mismatch");
  }
  if (consumption.MATERIAL_MOVE_ID !== move.MOVE_ID) {
    reject("transport consumption MOVE_ID mismatch");
  }
  if (
    consumption.MATERIAL_MOVE_H256.toLowerCase() !==
    move.MOVE_H256.toLowerCase()
  ) {
    reject("transport consumption MOVE_H256 mismatch");
  }
  if (consumption.CONSUMED_AT_TICK < move.TICK) {
    reject("transport consumption cannot precede material move");
  }
}

export function createLeftWheelIngressAuthorization({
  materialMove,
  transportConsumption,
  issuedAtTick,
  validFromTick = issuedAtTick,
  expiresAtTick,
  traceId,
  authorization
}) {
  const move = validateFourmiMathMaterialMove(materialMove);
  const consumption = validateLiveFourmiTransportConsumption(transportConsumption);
  assertMoveConsumptionBinding(move, consumption);

  assertTick(issuedAtTick, "issuedAtTick");
  assertTick(validFromTick, "validFromTick");
  assertTick(expiresAtTick, "expiresAtTick");
  if (issuedAtTick < consumption.CONSUMED_AT_TICK) {
    reject("ingress authorization cannot be issued before transport consumption");
  }

  const seed = h256({
    MATERIAL_ID: move.MATERIAL_REF.MATERIAL_ID,
    MATERIAL_H256: move.MATERIAL_REF.MATERIAL_H256,
    MOVE_ID: move.MOVE_ID,
    MOVE_H256: move.MOVE_H256,
    TRANSPORT_CONSUMPTION_ID: consumption.CONSUMPTION_ID,
    TRANSPORT_CONSUMPTION_H256: consumption.SIGNATURE_H256,
    ANT_ID: move.CARRIER.ANT_ID,
    ISSUED_AT_TICK: issuedAtTick,
    VALID_FROM_TICK: validFromTick,
    EXPIRES_AT_TICK: expiresAtTick,
    SOURCE_POSITION: move.MOVEMENT.TO,
    TRACE_ID: traceId
  });

  const grant = {
    SCHEMA,
    VERSION,
    AUTHORIZATION_ID:
      `LWIA-T${issuedAtTick}-${seed.slice(0, 20).toUpperCase()}`,
    MATERIAL_ID: move.MATERIAL_REF.MATERIAL_ID,
    MATERIAL_H256: move.MATERIAL_REF.MATERIAL_H256,
    MOVE_ID: move.MOVE_ID,
    MOVE_H256: move.MOVE_H256,
    TRANSPORT_CONSUMPTION_ID: consumption.CONSUMPTION_ID,
    TRANSPORT_CONSUMPTION_H256: consumption.SIGNATURE_H256,
    ANT_ID: move.CARRIER.ANT_ID,
    ISSUED_AT_TICK: issuedAtTick,
    VALID_FROM_TICK: validFromTick,
    EXPIRES_AT_TICK: expiresAtTick,
    CLOCK_AUTHORITY,
    SCOPE: {
      PURPOSE: "LEFT_WHEEL_INGRESS",
      WHEEL: "LEFT",
      SOURCE_POSITION: move.MOVEMENT.TO,
      MATERIAL_CLASS: "FOURMI_MATH_MATERIAL",
      REQUIRED_MOVE_STATE: "MOVED_OBSERVED",
      MAX_INGRESS_ATTEMPTS: 1
    },
    AUTHORIZATION: clone(authorization),
    TRACE_ID: traceId,
    BRUTUS_TRUTH_STATUS: "UNVERIFIED_BY_BRUTUS",
    PROOF_REF: null,
    PROOF_CLAIM: false,
    SINGLE_USE: true,
    WHEEL_INGRESS_AUTHORIZATION: true,
    MACHINE_EXECUTION_AUTHORIZATION: false,
    EXECUTABLE: false,
    GATE_AUTHORITY: true,
    AUTOMATIC_RETRY_ALLOWED: false,
    UNKNOWN_EXTERNAL_OUTCOME_POLICY,
    SIGNATURE_METHOD,
    SIGNATURE_H256: "0".repeat(64)
  };

  grant.SIGNATURE_H256 = computeLeftWheelIngressAuthorizationH256(grant);
  return validateLeftWheelIngressAuthorization(grant);
}

export function assertLeftWheelIngressAuthorized({
  authorization,
  materialMove,
  transportConsumption,
  tick,
  currentPosition,
  consumed = false,
  attemptStarted = false
}) {
  const grant = validateLeftWheelIngressAuthorization(authorization);
  const move = validateFourmiMathMaterialMove(materialMove);
  const consumption = validateLiveFourmiTransportConsumption(transportConsumption);
  assertMoveConsumptionBinding(move, consumption);

  assertTick(tick, "tick");
  assertWorldRef(currentPosition, "currentPosition");

  if (consumed !== false) reject("single-use ingress authorization already consumed");
  if (attemptStarted !== false) {
    reject("ingress attempt already started; automatic retry is forbidden");
  }
  if (tick < grant.VALID_FROM_TICK) reject("authorization is not active yet");
  if (tick > grant.EXPIRES_AT_TICK) reject("authorization has expired");
  if (grant.MATERIAL_ID !== move.MATERIAL_REF.MATERIAL_ID) {
    reject("grant material ID mismatch");
  }
  if (
    grant.MATERIAL_H256.toLowerCase() !==
    move.MATERIAL_REF.MATERIAL_H256.toLowerCase()
  ) {
    reject("grant material hash mismatch");
  }
  if (grant.MOVE_ID !== move.MOVE_ID) reject("grant MOVE_ID mismatch");
  if (grant.MOVE_H256.toLowerCase() !== move.MOVE_H256.toLowerCase()) {
    reject("grant MOVE_H256 mismatch");
  }
  if (grant.TRANSPORT_CONSUMPTION_ID !== consumption.CONSUMPTION_ID) {
    reject("grant transport consumption ID mismatch");
  }
  if (
    grant.TRANSPORT_CONSUMPTION_H256.toLowerCase() !==
    consumption.SIGNATURE_H256.toLowerCase()
  ) {
    reject("grant transport consumption hash mismatch");
  }
  if (grant.ANT_ID !== move.CARRIER.ANT_ID) reject("grant ANT_ID mismatch");
  if (grant.SCOPE.SOURCE_POSITION !== move.MOVEMENT.TO) {
    reject("grant source position does not match material move destination");
  }
  if (currentPosition !== grant.SCOPE.SOURCE_POSITION) {
    reject("current position is outside ingress authorization scope");
  }

  return deepFreeze({
    SCHEMA: VERDICT_SCHEMA,
    VERSION,
    AUTHORIZATION_ID: grant.AUTHORIZATION_ID,
    AUTHORIZATION_H256: grant.SIGNATURE_H256,
    MATERIAL_ID: grant.MATERIAL_ID,
    MOVE_ID: grant.MOVE_ID,
    TRANSPORT_CONSUMPTION_ID: grant.TRANSPORT_CONSUMPTION_ID,
    TICK: tick,
    CURRENT_POSITION: currentPosition,
    WHEEL: "LEFT",
    DECISION: "AUTHORIZED",
    SINGLE_USE: true,
    CONSUMED: false,
    ATTEMPT_STARTED: false,
    WHEEL_INGRESS_AUTHORIZATION: true,
    MACHINE_EXECUTION_AUTHORIZATION: false,
    EXECUTABLE: false,
    GATE_AUTHORITY: true,
    PROOF_REF: null,
    PROOF_CLAIM: false,
    AUTOMATIC_RETRY_ALLOWED: false,
    UNKNOWN_EXTERNAL_OUTCOME_POLICY
  });
}

export const BRUTUS_LEFT_WHEEL_INGRESS_AUTHORIZATION_SCHEMA = SCHEMA;
export const BRUTUS_LEFT_WHEEL_INGRESS_VERDICT_SCHEMA = VERDICT_SCHEMA;
export const BRUTUS_LEFT_WHEEL_INGRESS_MAX_VALIDITY_SPAN_TICKS =
  MAX_VALIDITY_SPAN_TICKS;
