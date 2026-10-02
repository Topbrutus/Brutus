import { sha256HexUtf8 } from "./sha256-utf8.mjs";
import { createQueenObservationIngress } from "./ingestion/queen-observation-ingress.mjs";
import { normalizeAntIdentity } from "./adapters/ant-birth-identity.mjs";
import { validateFourmiMathMaterial } from "./fourmi-math-material-admission.mjs";
import {
  validateLiveFourmiTransportAuthorization,
  assertLiveMaterialTransportAuthorized
} from "./live-fourmi-transport-authorization.mjs";
import {
  computeMathMaterialCarrierObservationH256,
  validateMathMaterialCarrierObservation,
  bindFourmiMathMaterialMove
} from "./fourmi-math-material-move.mjs";
import {
  computeRealMechanismEventSignature,
  validateRealMechanismEvent
} from "./real-mechanism-event.mjs";

const STATE_SCHEMA = "BRUTUS-LIVE-FOURMI-TRANSPORT-STATE-v0.1";
const CONSUMPTION_SCHEMA = "BRUTUS-LIVE-FOURMI-TRANSPORT-CONSUMPTION-v0.1";
const RUNTIME_SCHEMA = "BRUTUS-ONE-STEP-LIVE-TRANSPORT-RUNTIME-v0.1";
const RESULT_SCHEMA = "BRUTUS-ONE-STEP-LIVE-TRANSPORT-RESULT-v0.1";
const VERSION = "0.1";
const CLOCK_AUTHORITY = "QUEEN_SERVER_V0_2";
const SIGNATURE_METHOD = "BRUTUS-CANONICAL-JSON-SHA256-v0.1";

function reject(reason) {
  throw new Error("ONE_STEP_LIVE_TRANSPORT_REJECTED: " + reason);
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

function assertUtc(value, label) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    reject(label + " must be a valid date-time");
  }
}

function unsigned(input, signatureField) {
  const copy = clone(input);
  delete copy[signatureField];
  return copy;
}

export function computeLiveFourmiTransportStateH256(input) {
  if (!isPlainObject(input)) reject("transport state must be a plain object");
  return h256(unsigned(input, "SIGNATURE_H256"));
}

export function computeLiveFourmiTransportConsumptionH256(input) {
  if (!isPlainObject(input)) reject("consumption must be a plain object");
  return h256(unsigned(input, "SIGNATURE_H256"));
}

function validateStateSource(value) {
  assertExactKeys(
    value,
    ["SOURCE_SCHEMA", "SOURCE_ENDPOINT", "OBSERVED_AT_UTC", "INTEGRITY_MATCH"],
    "SOURCE"
  );
  if (
    typeof value.SOURCE_SCHEMA !== "string" ||
    value.SOURCE_SCHEMA.length < 3 ||
    value.SOURCE_SCHEMA.length > 160
  ) {
    reject("SOURCE.SOURCE_SCHEMA invalid");
  }
  if (
    typeof value.SOURCE_ENDPOINT !== "string" ||
    value.SOURCE_ENDPOINT.length < 1 ||
    value.SOURCE_ENDPOINT.length > 256
  ) {
    reject("SOURCE.SOURCE_ENDPOINT invalid");
  }
  assertUtc(value.OBSERVED_AT_UTC, "SOURCE.OBSERVED_AT_UTC");
  if (value.INTEGRITY_MATCH !== true) {
    reject("SOURCE.INTEGRITY_MATCH must be true");
  }
}

export function validateLiveFourmiTransportState(input) {
  assertExactKeys(
    input,
    [
      "SCHEMA",
      "VERSION",
      "OBSERVATION_ID",
      "TICK",
      "CLOCK_AUTHORITY",
      "SOURCE",
      "ANT_ID",
      "POSITION",
      "MATERIAL",
      "TRACE_ID",
      "PROOF_REF",
      "SIGNATURE_METHOD",
      "SIGNATURE_H256",
      "EXECUTABLE",
      "PROOF_CLAIM",
      "GATE_AUTHORITY",
      "ROUTING_AUTHORIZATION"
    ],
    "transport state"
  );

  if (input.SCHEMA !== STATE_SCHEMA) reject("unsupported transport state SCHEMA");
  if (input.VERSION !== VERSION) reject("unsupported transport state VERSION");
  if (
    typeof input.OBSERVATION_ID !== "string" ||
    !/^LTS-T[0-9]{1,16}-[A-Z0-9-]{4,64}$/.test(input.OBSERVATION_ID)
  ) {
    reject("invalid OBSERVATION_ID");
  }
  assertTick(input.TICK, "TICK");
  if (input.CLOCK_AUTHORITY !== CLOCK_AUTHORITY) {
    reject("CLOCK_AUTHORITY must be QUEEN_SERVER_V0_2");
  }
  validateStateSource(input.SOURCE);

  if (
    typeof input.ANT_ID !== "string" ||
    !/^ANT-[0-9A-F]{12}$/.test(input.ANT_ID)
  ) {
    reject("invalid ANT_ID");
  }
  assertWorldRef(input.POSITION, "POSITION");

  assertExactKeys(
    input.MATERIAL,
    ["MATERIAL_ID", "MATERIAL_H256", "BINDING_STATE"],
    "MATERIAL"
  );
  if (
    typeof input.MATERIAL.MATERIAL_ID !== "string" ||
    !/^MAT-MATH-[A-F0-9]{24}$/.test(input.MATERIAL.MATERIAL_ID)
  ) {
    reject("invalid MATERIAL.MATERIAL_ID");
  }
  assertSha256(input.MATERIAL.MATERIAL_H256, "MATERIAL.MATERIAL_H256");
  if (input.MATERIAL.BINDING_STATE !== "ATTACHED") {
    reject("MATERIAL.BINDING_STATE must be ATTACHED");
  }

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
    computeLiveFourmiTransportStateH256(input)
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

export function validateLiveFourmiTransportConsumption(input) {
  assertExactKeys(
    input,
    [
      "SCHEMA",
      "VERSION",
      "CONSUMPTION_ID",
      "AUTHORIZATION_ID",
      "AUTHORIZATION_H256",
      "ANT_ID",
      "MATERIAL_ID",
      "COMMAND_ID",
      "ANT_MOVE_EVENT_ID",
      "ANT_MOVE_H256",
      "MATERIAL_MOVE_ID",
      "MATERIAL_MOVE_H256",
      "CONSUMED_AT_TICK",
      "CLOCK_AUTHORITY",
      "SINGLE_USE",
      "CONSUMED",
      "PROOF_REF",
      "EXECUTABLE",
      "GATE_AUTHORITY",
      "ROUTING_AUTHORIZATION",
      "SIGNATURE_METHOD",
      "SIGNATURE_H256"
    ],
    "consumption"
  );

  if (input.SCHEMA !== CONSUMPTION_SCHEMA) {
    reject("unsupported consumption SCHEMA");
  }
  if (input.VERSION !== VERSION) reject("unsupported consumption VERSION");
  if (
    typeof input.CONSUMPTION_ID !== "string" ||
    !/^LTAC-T[0-9]{1,16}-[A-F0-9]{20}$/.test(input.CONSUMPTION_ID)
  ) {
    reject("invalid CONSUMPTION_ID");
  }
  if (
    typeof input.AUTHORIZATION_ID !== "string" ||
    !/^LTA-T[0-9]{1,16}-[A-F0-9]{20}$/.test(input.AUTHORIZATION_ID)
  ) {
    reject("invalid AUTHORIZATION_ID");
  }
  assertSha256(input.AUTHORIZATION_H256, "AUTHORIZATION_H256");
  if (
    typeof input.ANT_ID !== "string" ||
    !/^ANT-[0-9A-F]{12}$/.test(input.ANT_ID)
  ) {
    reject("invalid ANT_ID");
  }
  if (
    typeof input.MATERIAL_ID !== "string" ||
    !/^MAT-MATH-[A-F0-9]{24}$/.test(input.MATERIAL_ID)
  ) {
    reject("invalid MATERIAL_ID");
  }
  if (
    typeof input.COMMAND_ID !== "string" ||
    !/^LTC-T[0-9]{1,16}-[A-F0-9]{20}$/.test(input.COMMAND_ID)
  ) {
    reject("invalid COMMAND_ID");
  }
  if (
    typeof input.ANT_MOVE_EVENT_ID !== "string" ||
    !/^RME-T[0-9]{1,16}-[A-Z0-9-]{4,64}$/.test(input.ANT_MOVE_EVENT_ID)
  ) {
    reject("invalid ANT_MOVE_EVENT_ID");
  }
  assertSha256(input.ANT_MOVE_H256, "ANT_MOVE_H256");
  if (
    typeof input.MATERIAL_MOVE_ID !== "string" ||
    !/^MMOVE-T[0-9]{1,16}-[A-F0-9]{20}$/.test(input.MATERIAL_MOVE_ID)
  ) {
    reject("invalid MATERIAL_MOVE_ID");
  }
  assertSha256(input.MATERIAL_MOVE_H256, "MATERIAL_MOVE_H256");
  assertTick(input.CONSUMED_AT_TICK, "CONSUMED_AT_TICK");

  if (input.CLOCK_AUTHORITY !== CLOCK_AUTHORITY) {
    reject("consumption CLOCK_AUTHORITY mismatch");
  }
  if (input.SINGLE_USE !== true) reject("SINGLE_USE must be true");
  if (input.CONSUMED !== true) reject("CONSUMED must be true");
  if (input.PROOF_REF !== null) reject("PROOF_REF must be null");
  if (input.EXECUTABLE !== false) reject("EXECUTABLE must be false");
  if (input.GATE_AUTHORITY !== false) reject("GATE_AUTHORITY must be false");
  if (input.ROUTING_AUTHORIZATION !== "CONSUMED") {
    reject("ROUTING_AUTHORIZATION must be CONSUMED");
  }
  if (input.SIGNATURE_METHOD !== SIGNATURE_METHOD) {
    reject("unsupported SIGNATURE_METHOD");
  }
  assertSha256(input.SIGNATURE_H256, "SIGNATURE_H256");
  if (
    input.SIGNATURE_H256.toLowerCase() !==
    computeLiveFourmiTransportConsumptionH256(input)
  ) {
    reject("consumption SIGNATURE_H256 mismatch");
  }

  return deepFreeze(clone(input));
}

function buildCommand({ grant, material, ant, clock, from, to }) {
  const seed = h256({
    AUTHORIZATION_ID: grant.AUTHORIZATION_ID,
    AUTHORIZATION_H256: grant.SIGNATURE_H256,
    ANT_ID: ant.ANT_ID,
    MATERIAL_ID: material.MATERIAL_ID,
    MATERIAL_H256: material.MATERIAL_H256,
    TICK: clock.TICK,
    FROM: from,
    TO: to
  });

  return deepFreeze({
    SCHEMA: "BRUTUS-LIVE-FOURMI-TRANSPORT-COMMAND-v0.1",
    VERSION,
    COMMAND_ID: `LTC-T${clock.TICK}-${seed.slice(0, 20).toUpperCase()}`,
    AUTHORIZATION_ID: grant.AUTHORIZATION_ID,
    AUTHORIZATION_H256: grant.SIGNATURE_H256,
    ANT_ID: ant.ANT_ID,
    MATERIAL_ID: material.MATERIAL_ID,
    MATERIAL_H256: material.MATERIAL_H256,
    REQUESTED_AT_TICK: clock.TICK,
    CLOCK_AUTHORITY,
    FROM: from,
    TO: to,
    MAX_MOVES: 1,
    SINGLE_USE: true,
    PROOF_REF: null,
    EXECUTABLE: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "AUTHORIZED"
  });
}

function validateActionAck(value, command) {
  assertExactKeys(
    value,
    [
      "STATUS",
      "COMMAND_ID",
      "AUTHORIZATION_ID",
      "ANT_ID",
      "MATERIAL_ID",
      "FROM",
      "TO"
    ],
    "action acknowledgment"
  );
  if (value.STATUS !== "ACCEPTED") reject("external action was not ACCEPTED");
  for (const key of ["COMMAND_ID", "AUTHORIZATION_ID", "ANT_ID", "MATERIAL_ID", "FROM", "TO"]) {
    if (value[key] !== command[key]) {
      reject("action acknowledgment " + key + " mismatch");
    }
  }
  return deepFreeze(clone(value));
}

function buildCarrierObservation({ preState, material }) {
  const suffix = h256({
    OBSERVATION_ID: preState.OBSERVATION_ID,
    MATERIAL_H256: material.MATERIAL_H256
  }).slice(0, 16).toUpperCase();

  const observation = {
    SCHEMA: "BRUTUS-MATH-MATERIAL-CARRIER-OBSERVATION-v0.1",
    VERSION,
    OBSERVATION_ID: `MMCO-T${preState.TICK}-${suffix}`,
    TICK: preState.TICK,
    CLOCK_AUTHORITY,
    MATERIAL_ID: material.MATERIAL_ID,
    MATERIAL_H256: material.MATERIAL_H256,
    ANT_ID: preState.ANT_ID,
    BINDING_STATE: "ATTACHED",
    SOURCE: clone(preState.SOURCE),
    TRACE_ID: `TRACE-LTR-CARRIER-T${preState.TICK}`,
    PROOF_REF: null,
    SIGNATURE_METHOD,
    SIGNATURE_H256: "0".repeat(64),
    EXECUTABLE: false,
    PROOF_CLAIM: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "UNDECIDED"
  };
  observation.SIGNATURE_H256 =
    computeMathMaterialCarrierObservationH256(observation);
  return validateMathMaterialCarrierObservation(observation);
}

function buildAntMove({ preState, postState, antId }) {
  const suffix = h256({
    PRE: preState.OBSERVATION_ID,
    POST: postState.OBSERVATION_ID,
    ANT_ID: antId,
    FROM: preState.POSITION,
    TO: postState.POSITION
  }).slice(0, 16).toUpperCase();

  const event = {
    SCHEMA: "BRUTUS-REAL-MECHANISM-EVENT-v0.1",
    VERSION,
    EVENT_ID: `RME-T${postState.TICK}-ANT-MOVE-${suffix}`,
    EVENT_CLASS: "RUNTIME_OBSERVATION",
    EVENT_TYPE: "ANT_MOVE",
    TICK: postState.TICK,
    CLOCK_AUTHORITY,
    SOURCE: {
      OBSERVATION_ID: postState.OBSERVATION_ID,
      SOURCE_SCHEMA: postState.SOURCE.SOURCE_SCHEMA,
      SOURCE_ENDPOINT: postState.SOURCE.SOURCE_ENDPOINT,
      OBSERVED_AT_UTC: postState.SOURCE.OBSERVED_AT_UTC,
      INTEGRITY_MATCH: postState.SOURCE.INTEGRITY_MATCH
    },
    SUBJECT: {
      TYPE: "ANT",
      ID: antId
    },
    PAYLOAD: {
      FROM: preState.POSITION,
      TO: postState.POSITION
    },
    TRACE_ID: `TRACE-LTR-ANT-MOVE-T${postState.TICK}`,
    PROOF_REF: null,
    SIGNATURE_METHOD,
    SIGNATURE_H256: "",
    EXECUTABLE: false,
    PROOF_CLAIM: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "UNDECIDED"
  };
  event.SIGNATURE_H256 = computeRealMechanismEventSignature(event);
  return validateRealMechanismEvent(event);
}

function buildConsumption({ grant, command, antMove, materialMove }) {
  const seed = h256({
    AUTHORIZATION_ID: grant.AUTHORIZATION_ID,
    AUTHORIZATION_H256: grant.SIGNATURE_H256,
    COMMAND_ID: command.COMMAND_ID,
    ANT_MOVE_H256: antMove.SIGNATURE_H256,
    MATERIAL_MOVE_H256: materialMove.MOVE_H256
  });

  const consumption = {
    SCHEMA: CONSUMPTION_SCHEMA,
    VERSION,
    CONSUMPTION_ID:
      `LTAC-T${antMove.TICK}-${seed.slice(0, 20).toUpperCase()}`,
    AUTHORIZATION_ID: grant.AUTHORIZATION_ID,
    AUTHORIZATION_H256: grant.SIGNATURE_H256,
    ANT_ID: antMove.SUBJECT.ID,
    MATERIAL_ID: materialMove.MATERIAL_REF.MATERIAL_ID,
    COMMAND_ID: command.COMMAND_ID,
    ANT_MOVE_EVENT_ID: antMove.EVENT_ID,
    ANT_MOVE_H256: antMove.SIGNATURE_H256,
    MATERIAL_MOVE_ID: materialMove.MOVE_ID,
    MATERIAL_MOVE_H256: materialMove.MOVE_H256,
    CONSUMED_AT_TICK: antMove.TICK,
    CLOCK_AUTHORITY,
    SINGLE_USE: true,
    CONSUMED: true,
    PROOF_REF: null,
    EXECUTABLE: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "CONSUMED",
    SIGNATURE_METHOD,
    SIGNATURE_H256: "0".repeat(64)
  };
  consumption.SIGNATURE_H256 =
    computeLiveFourmiTransportConsumptionH256(consumption);
  return validateLiveFourmiTransportConsumption(consumption);
}

export function createOneStepLiveTransportRuntime({
  readObservation,
  readAntBirthReceipt,
  readTransportState,
  performAuthorizedMove,
  retryPolicy = {}
}) {
  if (typeof readObservation !== "function") {
    reject("readObservation function is required");
  }
  if (typeof readAntBirthReceipt !== "function") {
    reject("readAntBirthReceipt function is required");
  }
  if (typeof readTransportState !== "function") {
    reject("readTransportState function is required");
  }
  if (typeof performAuthorizedMove !== "function") {
    reject("performAuthorizedMove function is required");
  }
  if (!isPlainObject(retryPolicy)) reject("retryPolicy must be a plain object");

  const ingress = createQueenObservationIngress();
  let spent = false;

  return Object.freeze({
    SCHEMA: RUNTIME_SCHEMA,
    VERSION,
    MODE: "ONE_AUTHORIZED_MOVE_FAIL_CLOSED",

    async runCycle({ authorization, material }) {
      if (spent) reject("v0.1 runtime permits one action attempt only");

      const grant = validateLiveFourmiTransportAuthorization(authorization);
      const validMaterial = validateFourmiMathMaterial(material);
      const receipt = await readAntBirthReceipt();
      const ant = normalizeAntIdentity(receipt);

      const preAccepted = await ingress.readUsable(readObservation, retryPolicy);
      const preClock = preAccepted.CLOCK;
      const preState = validateLiveFourmiTransportState(
        await readTransportState()
      );

      if (preState.TICK !== preClock.TICK) {
        reject("pre-state tick must exactly equal Queen clock tick");
      }
      if (preState.ANT_ID !== ant.ANT_ID) {
        reject("pre-state ANT_ID does not match live ant identity");
      }
      if (preState.MATERIAL.MATERIAL_ID !== validMaterial.MATERIAL_ID) {
        reject("pre-state material ID mismatch");
      }
      if (
        preState.MATERIAL.MATERIAL_H256.toLowerCase() !==
        validMaterial.MATERIAL_H256.toLowerCase()
      ) {
        reject("pre-state material hash mismatch");
      }
      if (preState.POSITION !== grant.SCOPE.FROM) {
        reject("pre-state position does not match authorized FROM");
      }

      const verdict = assertLiveMaterialTransportAuthorized({
        authorization: grant,
        antBirthReceipt: receipt,
        material: validMaterial,
        tick: preClock.TICK,
        from: preState.POSITION,
        to: grant.SCOPE.TO,
        consumed: false
      });

      const command = buildCommand({
        grant,
        material: validMaterial,
        ant,
        clock: preClock,
        from: preState.POSITION,
        to: grant.SCOPE.TO
      });

      // Critical side-effect boundary: once the external action is attempted,
      // this runtime instance is permanently spent even if the adapter throws.
      spent = true;

      const acknowledgment = validateActionAck(
        await performAuthorizedMove(command),
        command
      );

      const postAccepted = await ingress.readUsable(readObservation, retryPolicy);
      const postClock = postAccepted.CLOCK;
      if (postClock.TICK <= preClock.TICK) {
        reject("post-action Queen tick must advance");
      }

      const postState = validateLiveFourmiTransportState(
        await readTransportState()
      );

      if (postState.TICK !== postClock.TICK) {
        reject("post-state tick must exactly equal Queen clock tick");
      }
      if (
        postState.SOURCE.SOURCE_SCHEMA !== preState.SOURCE.SOURCE_SCHEMA ||
        postState.SOURCE.SOURCE_ENDPOINT !== preState.SOURCE.SOURCE_ENDPOINT
      ) {
        reject("transport state source continuity violation");
      }
      if (postState.ANT_ID !== ant.ANT_ID) {
        reject("post-state ANT_ID does not match live ant identity");
      }
      if (postState.MATERIAL.MATERIAL_ID !== validMaterial.MATERIAL_ID) {
        reject("post-state material ID mismatch");
      }
      if (
        postState.MATERIAL.MATERIAL_H256.toLowerCase() !==
        validMaterial.MATERIAL_H256.toLowerCase()
      ) {
        reject("post-state material hash mismatch");
      }
      if (postState.POSITION !== grant.SCOPE.TO) {
        reject("post-state position does not match authorized TO");
      }

      const carrierObservation = buildCarrierObservation({
        preState,
        material: validMaterial
      });
      const antMove = buildAntMove({
        preState,
        postState,
        antId: ant.ANT_ID
      });
      const materialMove = bindFourmiMathMaterialMove({
        material: validMaterial,
        antBirthReceipt: receipt,
        carrierObservation,
        antMoveEvent: antMove
      });
      const consumption = buildConsumption({
        grant,
        command,
        antMove,
        materialMove
      });

      return deepFreeze({
        SCHEMA: RESULT_SCHEMA,
        VERSION,
        STATUS: "COMPLETED_ONE_AUTHORIZED_MOVE",
        ACTION_ATTEMPTED: true,
        ACTION_ACKNOWLEDGED: true,
        PRE_CLOCK_TICK: preClock.TICK,
        POST_CLOCK_TICK: postClock.TICK,
        PRE_STATE: preState,
        POST_STATE: postState,
        AUTHORIZATION_VERDICT: verdict,
        COMMAND: command,
        ACTION_ACKNOWLEDGMENT: acknowledgment,
        CARRIER_OBSERVATION: carrierObservation,
        ANT_MOVE: antMove,
        MATERIAL_MOVE: materialMove,
        AUTHORIZATION_CONSUMPTION: consumption,
        PROOF_REF: null,
        PROOF_CLAIM: false,
        GATE_AUTHORITY: false,
        ROUTING_AUTHORIZATION: "CONSUMED"
      });
    }
  });
}

export const BRUTUS_LIVE_FOURMI_TRANSPORT_STATE_SCHEMA = STATE_SCHEMA;
export const BRUTUS_LIVE_FOURMI_TRANSPORT_CONSUMPTION_SCHEMA =
  CONSUMPTION_SCHEMA;
export const BRUTUS_ONE_STEP_LIVE_TRANSPORT_RUNTIME_SCHEMA = RUNTIME_SCHEMA;
