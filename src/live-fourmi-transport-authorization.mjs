import { sha256HexUtf8 } from "./sha256-utf8.mjs";
import { normalizeAntIdentity } from "./adapters/ant-birth-identity.mjs";
import { validateFourmiMathMaterial } from "./fourmi-math-material-admission.mjs";

const SCHEMA = "BRUTUS-LIVE-FOURMI-TRANSPORT-AUTHORIZATION-v0.1";
const VERDICT_SCHEMA = "BRUTUS-LIVE-FOURMI-TRANSPORT-VERDICT-v0.1";
const VERSION = "0.1";
const CLOCK_AUTHORITY = "QUEEN_SERVER_V0_2";
const SIGNATURE_METHOD = "BRUTUS-CANONICAL-JSON-SHA256-v0.1";
const MAX_VALIDITY_SPAN_TICKS = 65536;

function reject(reason) {
  throw new Error("LIVE_FOURMI_TRANSPORT_AUTH_REJECTED: " + reason);
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

function assertWorldRef(value, label) {
  if (typeof value !== "string" || !/^W:[A-Z0-9-]{1,32}$/.test(value)) {
    reject(label + " must be a W: reference");
  }
}

function unsigned(input) {
  const copy = clone(input);
  delete copy.SIGNATURE_H256;
  return copy;
}

export function computeLiveFourmiTransportAuthorizationH256(input) {
  if (!isPlainObject(input)) reject("authorization must be a plain object");
  return h256(unsigned(input));
}

function normalizedAntH256(receipt) {
  return h256(normalizeAntIdentity(receipt));
}

function validateScope(value) {
  assertExactKeys(
    value,
    [
      "PURPOSE",
      "FROM",
      "TO",
      "MATERIAL_CLASS",
      "REQUIRED_ANT_ROLE",
      "REQUIRED_ANT_STATE",
      "MAX_MOVES"
    ],
    "SCOPE"
  );
  if (value.PURPOSE !== "MATERIAL_TRANSPORT") {
    reject("SCOPE.PURPOSE must be MATERIAL_TRANSPORT");
  }
  assertWorldRef(value.FROM, "SCOPE.FROM");
  assertWorldRef(value.TO, "SCOPE.TO");
  if (value.FROM === value.TO) reject("SCOPE route requires changed position");
  if (value.MATERIAL_CLASS !== "FOURMI_MATH_MATERIAL") {
    reject("SCOPE.MATERIAL_CLASS must be FOURMI_MATH_MATERIAL");
  }
  if (value.REQUIRED_ANT_ROLE !== "SYNAPSE") {
    reject("SCOPE.REQUIRED_ANT_ROLE must be SYNAPSE");
  }
  if (
    typeof value.REQUIRED_ANT_STATE !== "string" ||
    value.REQUIRED_ANT_STATE.length < 1 ||
    value.REQUIRED_ANT_STATE.length > 80
  ) {
    reject("SCOPE.REQUIRED_ANT_STATE invalid");
  }
  if (value.MAX_MOVES !== 1) reject("SCOPE.MAX_MOVES must be 1");
}

function validateDecision(value) {
  assertExactKeys(
    value,
    ["POLICY", "DECISION", "APPROVER"],
    "AUTHORIZATION"
  );
  if (value.POLICY !== "BRUTUS-LIVE-FOURMI-TRANSPORT-v0.1") {
    reject("AUTHORIZATION.POLICY mismatch");
  }
  if (value.DECISION !== "APPROVED") {
    reject("AUTHORIZATION.DECISION must be APPROVED");
  }
  if (value.APPROVER !== "BRUTUS_CONTROL_PLANE") {
    reject("AUTHORIZATION.APPROVER must be BRUTUS_CONTROL_PLANE");
  }
}

export function validateLiveFourmiTransportAuthorization(input) {
  assertExactKeys(
    input,
    [
      "SCHEMA",
      "VERSION",
      "AUTHORIZATION_ID",
      "ANT_ID",
      "ANT_IDENTITY_H256",
      "MATERIAL_ID",
      "MATERIAL_H256",
      "ISSUED_AT_TICK",
      "VALID_FROM_TICK",
      "EXPIRES_AT_TICK",
      "CLOCK_AUTHORITY",
      "SCOPE",
      "AUTHORIZATION",
      "TRACE_ID",
      "PROOF_REF",
      "SINGLE_USE",
      "EXECUTABLE",
      "GATE_AUTHORITY",
      "ROUTING_AUTHORIZATION",
      "SIGNATURE_METHOD",
      "SIGNATURE_H256"
    ],
    "authorization"
  );

  if (input.SCHEMA !== SCHEMA) reject("unsupported SCHEMA");
  if (input.VERSION !== VERSION) reject("unsupported VERSION");
  if (
    typeof input.AUTHORIZATION_ID !== "string" ||
    !/^LTA-T[0-9]{1,16}-[A-F0-9]{20}$/.test(input.AUTHORIZATION_ID)
  ) {
    reject("invalid AUTHORIZATION_ID");
  }
  if (
    typeof input.ANT_ID !== "string" ||
    !/^ANT-[0-9A-F]{12}$/.test(input.ANT_ID)
  ) {
    reject("invalid ANT_ID");
  }
  assertSha256(input.ANT_IDENTITY_H256, "ANT_IDENTITY_H256");
  if (
    typeof input.MATERIAL_ID !== "string" ||
    !/^MAT-MATH-[A-F0-9]{24}$/.test(input.MATERIAL_ID)
  ) {
    reject("invalid MATERIAL_ID");
  }
  assertSha256(input.MATERIAL_H256, "MATERIAL_H256");

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
  if (input.PROOF_REF !== null) reject("PROOF_REF must be null");
  if (input.SINGLE_USE !== true) reject("SINGLE_USE must be true");
  if (input.EXECUTABLE !== false) reject("EXECUTABLE must be false");
  if (input.GATE_AUTHORITY !== false) reject("GATE_AUTHORITY must be false");
  if (input.ROUTING_AUTHORIZATION !== "AUTHORIZED") {
    reject("ROUTING_AUTHORIZATION must be AUTHORIZED");
  }
  if (input.SIGNATURE_METHOD !== SIGNATURE_METHOD) {
    reject("unsupported SIGNATURE_METHOD");
  }
  assertSha256(input.SIGNATURE_H256, "SIGNATURE_H256");
  if (
    input.SIGNATURE_H256.toLowerCase() !==
    computeLiveFourmiTransportAuthorizationH256(input)
  ) {
    reject("SIGNATURE_H256 mismatch");
  }

  return deepFreeze(clone(input));
}

export function createLiveFourmiTransportAuthorization({
  antBirthReceipt,
  material,
  issuedAtTick,
  validFromTick = issuedAtTick,
  expiresAtTick,
  from,
  to,
  traceId,
  authorization
}) {
  const ant = normalizeAntIdentity(antBirthReceipt);
  const validMaterial = validateFourmiMathMaterial(material);

  if (ant.ANT_ID !== validMaterial.CARRIER.ANT_ID) {
    reject("live ant identity does not match material carrier");
  }
  if (issuedAtTick < validMaterial.CREATED_AT_TICK) {
    reject("authorization cannot be issued before material admission");
  }
  if (ant.ROLE !== "SYNAPSE") reject("live ant role must be SYNAPSE");

  assertTick(issuedAtTick, "issuedAtTick");
  assertTick(validFromTick, "validFromTick");
  assertTick(expiresAtTick, "expiresAtTick");
  assertWorldRef(from, "from");
  assertWorldRef(to, "to");

  const identityH256 = h256(ant);
  const seed = h256({
    ANT_ID: ant.ANT_ID,
    ANT_IDENTITY_H256: identityH256,
    MATERIAL_ID: validMaterial.MATERIAL_ID,
    MATERIAL_H256: validMaterial.MATERIAL_H256,
    ISSUED_AT_TICK: issuedAtTick,
    VALID_FROM_TICK: validFromTick,
    EXPIRES_AT_TICK: expiresAtTick,
    FROM: from,
    TO: to,
    TRACE_ID: traceId
  });

  const grant = {
    SCHEMA,
    VERSION,
    AUTHORIZATION_ID:
      `LTA-T${issuedAtTick}-${seed.slice(0, 20).toUpperCase()}`,
    ANT_ID: ant.ANT_ID,
    ANT_IDENTITY_H256: identityH256,
    MATERIAL_ID: validMaterial.MATERIAL_ID,
    MATERIAL_H256: validMaterial.MATERIAL_H256,
    ISSUED_AT_TICK: issuedAtTick,
    VALID_FROM_TICK: validFromTick,
    EXPIRES_AT_TICK: expiresAtTick,
    CLOCK_AUTHORITY,
    SCOPE: {
      PURPOSE: "MATERIAL_TRANSPORT",
      FROM: from,
      TO: to,
      MATERIAL_CLASS: "FOURMI_MATH_MATERIAL",
      REQUIRED_ANT_ROLE: ant.ROLE,
      REQUIRED_ANT_STATE: ant.STATE,
      MAX_MOVES: 1
    },
    AUTHORIZATION: clone(authorization),
    TRACE_ID: traceId,
    PROOF_REF: null,
    SINGLE_USE: true,
    EXECUTABLE: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "AUTHORIZED",
    SIGNATURE_METHOD,
    SIGNATURE_H256: "0".repeat(64)
  };

  grant.SIGNATURE_H256 =
    computeLiveFourmiTransportAuthorizationH256(grant);

  return validateLiveFourmiTransportAuthorization(grant);
}

export function assertLiveMaterialTransportAuthorized({
  authorization,
  antBirthReceipt,
  material,
  tick,
  from,
  to,
  consumed = false
}) {
  const grant = validateLiveFourmiTransportAuthorization(authorization);
  const ant = normalizeAntIdentity(antBirthReceipt);
  const validMaterial = validateFourmiMathMaterial(material);

  assertTick(tick, "tick");
  assertWorldRef(from, "from");
  assertWorldRef(to, "to");

  if (consumed !== false) reject("single-use authorization already consumed");
  if (ant.ANT_ID !== grant.ANT_ID) reject("grant ANT_ID mismatch");
  if (h256(ant) !== grant.ANT_IDENTITY_H256.toLowerCase()) {
    reject("grant ANT identity hash mismatch");
  }
  if (ant.ROLE !== grant.SCOPE.REQUIRED_ANT_ROLE) {
    reject("grant ANT role mismatch");
  }
  if (ant.STATE !== grant.SCOPE.REQUIRED_ANT_STATE) {
    reject("grant ANT state mismatch");
  }

  if (validMaterial.MATERIAL_ID !== grant.MATERIAL_ID) {
    reject("grant material ID mismatch");
  }
  if (
    validMaterial.MATERIAL_H256.toLowerCase() !==
    grant.MATERIAL_H256.toLowerCase()
  ) {
    reject("grant material hash mismatch");
  }
  if (validMaterial.CARRIER.ANT_ID !== ant.ANT_ID) {
    reject("material carrier does not match live ANT");
  }
  if (validMaterial.TRANSPORT_AUTHORIZATION !== true) {
    reject("material is not transport-authorized");
  }
  if (validMaterial.TRANSPORT_STATE !== "ADMITTED_NOT_MOVED") {
    reject("material is not in ADMITTED_NOT_MOVED state");
  }

  if (tick < grant.VALID_FROM_TICK) reject("authorization is not active yet");
  if (tick > grant.EXPIRES_AT_TICK) reject("authorization has expired");
  if (tick < validMaterial.CREATED_AT_TICK) {
    reject("transport tick cannot precede material admission");
  }

  if (from !== grant.SCOPE.FROM || to !== grant.SCOPE.TO) {
    reject("requested route is outside authorization scope");
  }

  return deepFreeze({
    SCHEMA: VERDICT_SCHEMA,
    VERSION,
    AUTHORIZATION_ID: grant.AUTHORIZATION_ID,
    AUTHORIZATION_H256: grant.SIGNATURE_H256,
    ANT_ID: ant.ANT_ID,
    MATERIAL_ID: validMaterial.MATERIAL_ID,
    TICK: tick,
    FROM: from,
    TO: to,
    DECISION: "AUTHORIZED",
    SINGLE_USE: true,
    CONSUMED: false,
    PROOF_REF: null,
    EXECUTABLE: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "AUTHORIZED"
  });
}

export const BRUTUS_LIVE_FOURMI_TRANSPORT_AUTHORIZATION_SCHEMA = SCHEMA;
export const BRUTUS_LIVE_FOURMI_TRANSPORT_VERDICT_SCHEMA = VERDICT_SCHEMA;
export const BRUTUS_LIVE_FOURMI_TRANSPORT_MAX_VALIDITY_SPAN_TICKS =
  MAX_VALIDITY_SPAN_TICKS;
