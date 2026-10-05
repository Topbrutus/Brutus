import { sha256HexUtf8 } from "./sha256-utf8.mjs";
import { validateFourmiMathMaterialMove } from "./fourmi-math-material-move.mjs";
import { validateLiveFourmiTransportConsumption } from "./one-step-live-transport-runtime.mjs";
import {
  validateLeftWheelIngressAuthorization,
  assertLeftWheelIngressAuthorized
} from "./left-wheel-ingress-authorization.mjs";

const STATE_SCHEMA = "BRUTUS-LEFT-WHEEL-INGRESS-STATE-v0.1";
const CONSUMPTION_SCHEMA = "BRUTUS-LEFT-WHEEL-INGRESS-CONSUMPTION-v0.1";
const COMMAND_SCHEMA = "BRUTUS-LEFT-WHEEL-INGRESS-COMMAND-v0.1";
const RUNTIME_SCHEMA = "BRUTUS-ONE-SHOT-LEFT-WHEEL-INGRESS-RUNTIME-v0.1";
const RESULT_SCHEMA = "BRUTUS-ONE-SHOT-LEFT-WHEEL-INGRESS-RESULT-v0.1";
const VERSION = "0.1";
const CLOCK_AUTHORITY = "QUEEN_SERVER_V0_2";
const SIGNATURE_METHOD = "BRUTUS-CANONICAL-JSON-SHA256-v0.1";
const UNKNOWN_EXTERNAL_OUTCOME_POLICY =
  "NO_AUTOMATIC_RETRY_AFTER_ATTEMPT_START";

function reject(reason) {
  throw new Error("ONE_SHOT_LEFT_WHEEL_INGRESS_REJECTED: " + reason);
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

function assertUtc(value, label) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    reject(label + " must be a valid date-time");
  }
}

function validateSource(value) {
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

export function computeLeftWheelIngressStateH256(input) {
  if (!isPlainObject(input)) reject("ingress state must be a plain object");
  return h256(unsigned(input));
}

export function validateLeftWheelIngressState(input) {
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
      "MATERIAL_ID",
      "MATERIAL_H256",
      "MOVE_ID",
      "SOURCE_POSITION",
      "WHEEL",
      "INGRESS_STATE",
      "TRACE_ID",
      "PROOF_REF",
      "PROOF_CLAIM",
      "EXECUTABLE",
      "MACHINE_EXECUTION_AUTHORIZATION",
      "SIGNATURE_METHOD",
      "SIGNATURE_H256"
    ],
    "ingress state"
  );

  if (input.SCHEMA !== STATE_SCHEMA) reject("unsupported ingress state SCHEMA");
  if (input.VERSION !== VERSION) reject("unsupported VERSION");
  if (
    typeof input.OBSERVATION_ID !== "string" ||
    !/^LWIS-T[0-9]{1,16}-[A-Z0-9-]{4,64}$/.test(input.OBSERVATION_ID)
  ) {
    reject("invalid OBSERVATION_ID");
  }
  assertTick(input.TICK, "TICK");
  if (input.CLOCK_AUTHORITY !== CLOCK_AUTHORITY) {
    reject("CLOCK_AUTHORITY must be QUEEN_SERVER_V0_2");
  }
  validateSource(input.SOURCE);

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
  assertSha256(input.MATERIAL_H256, "MATERIAL_H256");
  if (
    typeof input.MOVE_ID !== "string" ||
    !/^MMOVE-T[0-9]{1,16}-[A-F0-9]{20}$/.test(input.MOVE_ID)
  ) {
    reject("invalid MOVE_ID");
  }
  assertWorldRef(input.SOURCE_POSITION, "SOURCE_POSITION");
  if (input.WHEEL !== "LEFT") reject("WHEEL must be LEFT");
  if (!["OUTSIDE_LEFT_WHEEL", "INSIDE_LEFT_WHEEL"].includes(input.INGRESS_STATE)) {
    reject("INGRESS_STATE invalid");
  }
  if (
    typeof input.TRACE_ID !== "string" ||
    !/^TRACE-[A-Z0-9-]{4,64}$/.test(input.TRACE_ID)
  ) {
    reject("invalid TRACE_ID");
  }
  if (input.PROOF_REF !== null) reject("PROOF_REF must be null");
  if (input.PROOF_CLAIM !== false) reject("PROOF_CLAIM must be false");
  if (input.EXECUTABLE !== false) reject("EXECUTABLE must be false");
  if (input.MACHINE_EXECUTION_AUTHORIZATION !== false) {
    reject("MACHINE_EXECUTION_AUTHORIZATION must be false");
  }
  if (input.SIGNATURE_METHOD !== SIGNATURE_METHOD) {
    reject("unsupported SIGNATURE_METHOD");
  }
  assertSha256(input.SIGNATURE_H256, "SIGNATURE_H256");
  if (
    input.SIGNATURE_H256.toLowerCase() !==
    computeLeftWheelIngressStateH256(input)
  ) {
    reject("SIGNATURE_H256 mismatch");
  }

  return deepFreeze(clone(input));
}

export function computeLeftWheelIngressConsumptionH256(input) {
  if (!isPlainObject(input)) reject("ingress consumption must be a plain object");
  return h256(unsigned(input));
}

export function validateLeftWheelIngressConsumption(input) {
  assertExactKeys(
    input,
    [
      "SCHEMA",
      "VERSION",
      "CONSUMPTION_ID",
      "AUTHORIZATION_ID",
      "AUTHORIZATION_H256",
      "COMMAND_ID",
      "MATERIAL_ID",
      "MOVE_ID",
      "TRANSPORT_CONSUMPTION_ID",
      "CONSUMED_AT_TICK",
      "CLOCK_AUTHORITY",
      "SINGLE_USE",
      "CONSUMED",
      "CONSUMPTION_REASON",
      "ATTEMPT_STARTED",
      "PROOF_REF",
      "PROOF_CLAIM",
      "AUTOMATIC_RETRY_ALLOWED",
      "UNKNOWN_EXTERNAL_OUTCOME_POLICY",
      "SIGNATURE_METHOD",
      "SIGNATURE_H256"
    ],
    "ingress consumption"
  );

  if (input.SCHEMA !== CONSUMPTION_SCHEMA) {
    reject("unsupported ingress consumption SCHEMA");
  }
  if (input.VERSION !== VERSION) reject("unsupported VERSION");
  if (
    typeof input.CONSUMPTION_ID !== "string" ||
    !/^LWIC-T[0-9]{1,16}-[A-F0-9]{20}$/.test(input.CONSUMPTION_ID)
  ) {
    reject("invalid CONSUMPTION_ID");
  }
  if (
    typeof input.AUTHORIZATION_ID !== "string" ||
    !/^LWIA-T[0-9]{1,16}-[A-F0-9]{20}$/.test(input.AUTHORIZATION_ID)
  ) {
    reject("invalid AUTHORIZATION_ID");
  }
  assertSha256(input.AUTHORIZATION_H256, "AUTHORIZATION_H256");
  if (
    typeof input.COMMAND_ID !== "string" ||
    !/^LWI-CMD-T[0-9]{1,16}-[A-F0-9]{20}$/.test(input.COMMAND_ID)
  ) {
    reject("invalid COMMAND_ID");
  }
  if (
    typeof input.MATERIAL_ID !== "string" ||
    !/^MAT-MATH-[A-F0-9]{24}$/.test(input.MATERIAL_ID)
  ) {
    reject("invalid MATERIAL_ID");
  }
  if (
    typeof input.MOVE_ID !== "string" ||
    !/^MMOVE-T[0-9]{1,16}-[A-F0-9]{20}$/.test(input.MOVE_ID)
  ) {
    reject("invalid MOVE_ID");
  }
  if (
    typeof input.TRANSPORT_CONSUMPTION_ID !== "string" ||
    !/^LTAC-T[0-9]{1,16}-[A-F0-9]{20}$/.test(input.TRANSPORT_CONSUMPTION_ID)
  ) {
    reject("invalid TRANSPORT_CONSUMPTION_ID");
  }
  assertTick(input.CONSUMED_AT_TICK, "CONSUMED_AT_TICK");
  if (input.CLOCK_AUTHORITY !== CLOCK_AUTHORITY) {
    reject("CLOCK_AUTHORITY mismatch");
  }
  if (input.SINGLE_USE !== true) reject("SINGLE_USE must be true");
  if (input.CONSUMED !== true) reject("CONSUMED must be true");
  if (input.CONSUMPTION_REASON !== "ATTEMPT_STARTED") {
    reject("CONSUMPTION_REASON must be ATTEMPT_STARTED");
  }
  if (input.ATTEMPT_STARTED !== true) reject("ATTEMPT_STARTED must be true");
  if (input.PROOF_REF !== null) reject("PROOF_REF must be null");
  if (input.PROOF_CLAIM !== false) reject("PROOF_CLAIM must be false");
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
    computeLeftWheelIngressConsumptionH256(input)
  ) {
    reject("ingress consumption SIGNATURE_H256 mismatch");
  }

  return deepFreeze(clone(input));
}

function buildCommand({ grant, move, transportConsumption, preState }) {
  const seed = h256({
    AUTHORIZATION_ID: grant.AUTHORIZATION_ID,
    AUTHORIZATION_H256: grant.SIGNATURE_H256,
    MATERIAL_ID: move.MATERIAL_REF.MATERIAL_ID,
    MOVE_ID: move.MOVE_ID,
    TRANSPORT_CONSUMPTION_ID: transportConsumption.CONSUMPTION_ID,
    TICK: preState.TICK,
    SOURCE_POSITION: preState.SOURCE_POSITION,
    WHEEL: "LEFT"
  });

  return deepFreeze({
    SCHEMA: COMMAND_SCHEMA,
    VERSION,
    COMMAND_ID: `LWI-CMD-T${preState.TICK}-${seed.slice(0, 20).toUpperCase()}`,
    AUTHORIZATION_ID: grant.AUTHORIZATION_ID,
    AUTHORIZATION_H256: grant.SIGNATURE_H256,
    MATERIAL_ID: move.MATERIAL_REF.MATERIAL_ID,
    MATERIAL_H256: move.MATERIAL_REF.MATERIAL_H256,
    MOVE_ID: move.MOVE_ID,
    MOVE_H256: move.MOVE_H256,
    TRANSPORT_CONSUMPTION_ID: transportConsumption.CONSUMPTION_ID,
    TRANSPORT_CONSUMPTION_H256: transportConsumption.SIGNATURE_H256,
    ANT_ID: move.CARRIER.ANT_ID,
    REQUESTED_AT_TICK: preState.TICK,
    CLOCK_AUTHORITY,
    SOURCE_POSITION: preState.SOURCE_POSITION,
    WHEEL: "LEFT",
    MAX_INGRESS_ATTEMPTS: 1,
    SINGLE_USE: true,
    WHEEL_INGRESS_AUTHORIZATION: true,
    MACHINE_EXECUTION_AUTHORIZATION: false,
    EXECUTABLE: false,
    PROOF_REF: null,
    PROOF_CLAIM: false,
    AUTOMATIC_RETRY_ALLOWED: false,
    UNKNOWN_EXTERNAL_OUTCOME_POLICY
  });
}

function buildConsumption({ grant, command, move, transportConsumption, preState }) {
  const seed = h256({
    AUTHORIZATION_ID: grant.AUTHORIZATION_ID,
    AUTHORIZATION_H256: grant.SIGNATURE_H256,
    COMMAND_ID: command.COMMAND_ID,
    MATERIAL_ID: move.MATERIAL_REF.MATERIAL_ID,
    MOVE_ID: move.MOVE_ID,
    TRANSPORT_CONSUMPTION_ID: transportConsumption.CONSUMPTION_ID,
    CONSUMED_AT_TICK: preState.TICK
  });

  const out = {
    SCHEMA: CONSUMPTION_SCHEMA,
    VERSION,
    CONSUMPTION_ID:
      `LWIC-T${preState.TICK}-${seed.slice(0, 20).toUpperCase()}`,
    AUTHORIZATION_ID: grant.AUTHORIZATION_ID,
    AUTHORIZATION_H256: grant.SIGNATURE_H256,
    COMMAND_ID: command.COMMAND_ID,
    MATERIAL_ID: move.MATERIAL_REF.MATERIAL_ID,
    MOVE_ID: move.MOVE_ID,
    TRANSPORT_CONSUMPTION_ID: transportConsumption.CONSUMPTION_ID,
    CONSUMED_AT_TICK: preState.TICK,
    CLOCK_AUTHORITY,
    SINGLE_USE: true,
    CONSUMED: true,
    CONSUMPTION_REASON: "ATTEMPT_STARTED",
    ATTEMPT_STARTED: true,
    PROOF_REF: null,
    PROOF_CLAIM: false,
    AUTOMATIC_RETRY_ALLOWED: false,
    UNKNOWN_EXTERNAL_OUTCOME_POLICY,
    SIGNATURE_METHOD,
    SIGNATURE_H256: "0".repeat(64)
  };
  out.SIGNATURE_H256 = computeLeftWheelIngressConsumptionH256(out);
  return validateLeftWheelIngressConsumption(out);
}

function validateActionAck(value, command) {
  assertExactKeys(
    value,
    [
      "STATUS",
      "COMMAND_ID",
      "AUTHORIZATION_ID",
      "MATERIAL_ID",
      "MOVE_ID",
      "WHEEL"
    ],
    "action acknowledgment"
  );
  if (!["SUCCEEDED", "FAILED"].includes(value.STATUS)) {
    reject("action acknowledgment STATUS must be SUCCEEDED or FAILED");
  }
  for (const key of ["COMMAND_ID", "AUTHORIZATION_ID", "MATERIAL_ID", "MOVE_ID"]) {
    if (value[key] !== command[key]) {
      reject("action acknowledgment " + key + " mismatch");
    }
  }
  if (value.WHEEL !== "LEFT") reject("action acknowledgment WHEEL mismatch");
  return deepFreeze(clone(value));
}

function assertStateBinding({ state, move, transportConsumption, grant }) {
  if (state.ANT_ID !== move.CARRIER.ANT_ID) reject("state ANT_ID mismatch");
  if (state.MATERIAL_ID !== move.MATERIAL_REF.MATERIAL_ID) {
    reject("state material ID mismatch");
  }
  if (
    state.MATERIAL_H256.toLowerCase() !==
    move.MATERIAL_REF.MATERIAL_H256.toLowerCase()
  ) {
    reject("state material hash mismatch");
  }
  if (state.MOVE_ID !== move.MOVE_ID) reject("state MOVE_ID mismatch");
  if (state.SOURCE_POSITION !== grant.SCOPE.SOURCE_POSITION) {
    reject("state source position mismatch");
  }
  if (transportConsumption.MATERIAL_MOVE_ID !== move.MOVE_ID) {
    reject("transport consumption MOVE_ID mismatch");
  }
}

function buildResult({
  status,
  verdict,
  command,
  consumption,
  preState,
  acknowledgment = null,
  postState = null,
  unknownOutcomeClass = null
}) {
  return deepFreeze({
    SCHEMA: RESULT_SCHEMA,
    VERSION,
    STATUS: status,
    ACTION_ATTEMPTED: true,
    ACTION_ACKNOWLEDGED: acknowledgment !== null,
    INGRESS_CONFIRMED: status === "SUCCESS",
    AUTHORIZATION_VERDICT: verdict,
    COMMAND: command,
    AUTHORIZATION_CONSUMPTION: consumption,
    ACTION_ACKNOWLEDGMENT: acknowledgment,
    PRE_STATE: preState,
    POST_STATE: postState,
    UNKNOWN_OUTCOME_CLASS: unknownOutcomeClass,
    SINGLE_USE: true,
    AUTOMATIC_RETRY_ALLOWED: false,
    UNKNOWN_EXTERNAL_OUTCOME_POLICY,
    PROOF_REF: null,
    PROOF_CLAIM: false,
    MACHINE_EXECUTION_AUTHORIZATION: false,
    EXECUTABLE: false
  });
}

export function createOneShotLeftWheelIngressRuntime({
  readIngressState,
  performAuthorizedIngress
}) {
  if (typeof readIngressState !== "function") {
    reject("readIngressState function is required");
  }
  if (typeof performAuthorizedIngress !== "function") {
    reject("performAuthorizedIngress function is required");
  }

  let spent = false;

  return Object.freeze({
    SCHEMA: RUNTIME_SCHEMA,
    VERSION,
    MODE: "ONE_SHOT_LEFT_WHEEL_INGRESS_FAIL_CLOSED",

    async runCycle({
      authorization,
      materialMove,
      transportConsumption
    }) {
      if (spent) reject("v0.1 runtime permits one ingress attempt only");

      const grant = validateLeftWheelIngressAuthorization(authorization);
      const move = validateFourmiMathMaterialMove(materialMove);
      const priorConsumption =
        validateLiveFourmiTransportConsumption(transportConsumption);

      const preState = validateLeftWheelIngressState(await readIngressState());
      assertStateBinding({
        state: preState,
        move,
        transportConsumption: priorConsumption,
        grant
      });
      if (preState.INGRESS_STATE !== "OUTSIDE_LEFT_WHEEL") {
        reject("pre-state must be OUTSIDE_LEFT_WHEEL");
      }

      const verdict = assertLeftWheelIngressAuthorized({
        authorization: grant,
        materialMove: move,
        transportConsumption: priorConsumption,
        tick: preState.TICK,
        currentPosition: preState.SOURCE_POSITION,
        consumed: false,
        attemptStarted: false
      });

      const command = buildCommand({
        grant,
        move,
        transportConsumption: priorConsumption,
        preState
      });

      // The single-use gate is consumed at attempt start, before crossing
      // the external side-effect boundary. From this point onward the runtime
      // is permanently spent, regardless of SUCCESS, FAIL, or UNKNOWN_OUTCOME.
      const consumption = buildConsumption({
        grant,
        command,
        move,
        transportConsumption: priorConsumption,
        preState
      });
      spent = true;

      let acknowledgment;
      try {
        acknowledgment = validateActionAck(
          await performAuthorizedIngress(command, consumption),
          command
        );
      } catch {
        return buildResult({
          status: "UNKNOWN_OUTCOME",
          verdict,
          command,
          consumption,
          preState,
          unknownOutcomeClass: "ADAPTER_THROW_OR_INVALID_ACK"
        });
      }

      if (acknowledgment.STATUS === "FAILED") {
        return buildResult({
          status: "FAIL",
          verdict,
          command,
          consumption,
          preState,
          acknowledgment
        });
      }

      let postState;
      try {
        postState = validateLeftWheelIngressState(await readIngressState());
        assertStateBinding({
          state: postState,
          move,
          transportConsumption: priorConsumption,
          grant
        });
        if (
          postState.SOURCE.SOURCE_SCHEMA !== preState.SOURCE.SOURCE_SCHEMA ||
          postState.SOURCE.SOURCE_ENDPOINT !== preState.SOURCE.SOURCE_ENDPOINT
        ) {
          reject("ingress state source continuity violation");
        }
        if (postState.TICK <= preState.TICK) {
          reject("post-ingress tick must advance");
        }
        if (postState.INGRESS_STATE !== "INSIDE_LEFT_WHEEL") {
          reject("post-state must confirm INSIDE_LEFT_WHEEL");
        }
      } catch {
        return buildResult({
          status: "UNKNOWN_OUTCOME",
          verdict,
          command,
          consumption,
          preState,
          acknowledgment,
          unknownOutcomeClass: "POST_CONFIRMATION_FAILED"
        });
      }

      return buildResult({
        status: "SUCCESS",
        verdict,
        command,
        consumption,
        preState,
        acknowledgment,
        postState
      });
    }
  });
}

export const BRUTUS_LEFT_WHEEL_INGRESS_STATE_SCHEMA = STATE_SCHEMA;
export const BRUTUS_LEFT_WHEEL_INGRESS_CONSUMPTION_SCHEMA = CONSUMPTION_SCHEMA;
export const BRUTUS_LEFT_WHEEL_INGRESS_COMMAND_SCHEMA = COMMAND_SCHEMA;
export const BRUTUS_ONE_SHOT_LEFT_WHEEL_INGRESS_RUNTIME_SCHEMA = RUNTIME_SCHEMA;
