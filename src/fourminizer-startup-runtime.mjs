import { createQueenObservationIngress } from "./ingestion/queen-observation-ingress.mjs";
import { normalizeAntIdentity } from "./adapters/ant-birth-identity.mjs";
import {
  validateFourminizerQueenCrystal
} from "./fourminizer-queen-crystal.mjs";
import {
  validateLocalWorldModel
} from "./local-world-model.mjs";
import {
  validateLocalMachine
} from "./local-machine.mjs";
import {
  computeBrutusTraceSignature,
  validateBrutusTrace
} from "./brutus-trace.mjs";

const RUNTIME_SCHEMA = "BRUTUS-FOURMINIZER-STARTUP-RUNTIME-v0.1";
const LIVE_EVENT_SCHEMA = "BRUTUS-LIVE-EVENT-v0.1";
const CLOCK_AUTHORITY = "QUEEN_SERVER_V0_2";

const RUNTIME_PINS = Object.freeze({
  QUEEN_CRYSTAL: Object.freeze({
    REF: "contracts/fourminizer-queen-crystal.v0.schema.json",
    BLOB_SHA: "9c918bc2a70e376671aaf25f716bac0f0287a5a6"
  }),
  LOCAL_WORLD_MODEL: Object.freeze({
    REF: "contracts/local-world-model.v0.schema.json",
    BLOB_SHA: "289a89530a605d70b0ed70f248f8646d69980885"
  }),
  LOCAL_MACHINE: Object.freeze({
    REF: "contracts/local-machine.v0.schema.json",
    BLOB_SHA: "224ea8b6736a9cb8da5a24a4050fe06ffa2db067"
  }),
  TRACE: Object.freeze({
    REF: "contracts/brutus-trace.v0.schema.json",
    BLOB_SHA: "41d6db0d6a0003c0ec0e73cb4e0e8fe361a44586"
  }),
  CLOCK_OBSERVATION: Object.freeze({
    REF: "contracts/clock-observation.v0.schema.json",
    BLOB_SHA: "a86770851aa8745de8758b1719437cfcd2bf6cb9"
  })
});

const EVENT_FIELDS = new Set([
  "SCHEMA",
  "VERSION",
  "EVENT_ID",
  "EVENT_CLASS",
  "EVENT_TYPE",
  "TICK",
  "CLOCK_AUTHORITY",
  "SOURCE_ENDPOINT",
  "CLOCK_ENTITY_ID",
  "QUEEN_ID",
  "ANT_ID",
  "POSITION",
  "QUEEN_MODE",
  "GENERATION",
  "CONDITION",
  "TRACE_ID",
  "MOTION",
  "PROOF_REF",
  "PROOF_CLAIM",
  "GATE_AUTHORITY",
  "ROUTING_AUTHORIZATION"
]);

const EVENT_ID_PATTERN = /^EVT-FMIN-Q[0-9]{4}-STARTUP-T[0-9]{1,16}$/;
const QUEEN_ID_PATTERN = /^FOURMINIZER-QUEEN-[0-9]{4}$/;
const ANT_ID_PATTERN = /^ANT-[0-9A-F]{12}$/;
const WORLD_REF_PATTERN = /^W:[A-Z0-9-]{1,32}$/;
const TRACE_ID_PATTERN = /^TRACE-[A-Z0-9-]{4,64}$/;

function reject(reason) {
  throw new Error("FOURMINIZER_STARTUP_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
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

function assertExactKeys(value, expected, label) {
  if (!isPlainObject(value)) reject(label + " must be a plain object");
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    reject(label + " has unsupported fields");
  }
}

function queenSequence(queenId) {
  if (!QUEEN_ID_PATTERN.test(queenId)) reject("invalid QUEEN_ID");
  return queenId.slice(-4);
}

function buildTrace({ queen, world, clock }) {
  const q = queenSequence(queen.QUEEN_ID);
  const trace = {
    SCHEMA: "BRUTUS-TRACE-v0.1",
    VERSION: "0.1",
    TRACE_ID: `TRACE-FMIN-Q${q}-STARTUP-T${clock.TICK}`,
    TRACE_CLASS: "RUNTIME",
    ANT_ID: queen.ANT_ID,
    ACTOR_CLASS: "FOURMINIZER_QUEEN",
    POSITION: world.POSITION,
    TICK: clock.TICK,
    CLOCK_AUTHORITY,
    ACTION: "READ",
    INPUT_OBJECTS: [world.POSITION],
    OUTPUT_OBJECTS: [],
    RESULT: "SUCCESS",
    SUCCESS_LEVEL: 100,
    CONFIDENCE: 100,
    PARENT_TRACE: null,
    MESSAGE_ID: null,
    PROOF_REF: null,
    SIGNATURE_METHOD: "BRUTUS-CANONICAL-JSON-SHA256-v0.1",
    SIGNATURE_H256: "",
    IMMUTABLE: true,
    EXECUTABLE: false,
    PROOF_CLAIM: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "UNDECIDED"
  };

  trace.SIGNATURE_H256 = computeBrutusTraceSignature(trace);
  return validateBrutusTrace(trace);
}

function buildLiveEvent({ queen, world, clock, trace }) {
  const q = queenSequence(queen.QUEEN_ID);

  return validateFourminizerLiveEvent({
    SCHEMA: LIVE_EVENT_SCHEMA,
    VERSION: "0.1",
    EVENT_ID: `EVT-FMIN-Q${q}-STARTUP-T${clock.TICK}`,
    EVENT_CLASS: "RUNTIME",
    EVENT_TYPE: "STARTUP_OBSERVED",
    TICK: clock.TICK,
    CLOCK_AUTHORITY,
    SOURCE_ENDPOINT: clock.SOURCE_ENDPOINT,
    CLOCK_ENTITY_ID: clock.ENTITY_ID,
    QUEEN_ID: queen.QUEEN_ID,
    ANT_ID: queen.ANT_ID,
    POSITION: world.POSITION,
    QUEEN_MODE: clock.QUEEN_MODE,
    GENERATION: clock.GENERATION,
    CONDITION: clock.CONDITION,
    TRACE_ID: trace.TRACE_ID,
    MOTION: null,
    PROOF_REF: null,
    PROOF_CLAIM: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "UNDECIDED"
  });
}

export function validateFourminizerLiveEvent(input) {
  if (!isPlainObject(input)) reject("live event must be a plain object");

  for (const key of Object.keys(input)) {
    if (!EVENT_FIELDS.has(key)) reject("unknown live event field " + key);
  }
  for (const key of EVENT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) {
      reject("missing live event field " + key);
    }
  }

  if (input.SCHEMA !== LIVE_EVENT_SCHEMA) reject("unsupported live event SCHEMA");
  if (input.VERSION !== "0.1") reject("unsupported live event VERSION");
  if (!EVENT_ID_PATTERN.test(input.EVENT_ID)) reject("invalid EVENT_ID");
  if (input.EVENT_CLASS !== "RUNTIME") reject("EVENT_CLASS must be RUNTIME");
  if (input.EVENT_TYPE !== "STARTUP_OBSERVED") {
    reject("EVENT_TYPE must be STARTUP_OBSERVED in v0.1");
  }
  if (!Number.isSafeInteger(input.TICK) || input.TICK < 0) {
    reject("TICK must be a non-negative safe integer");
  }
  if (input.CLOCK_AUTHORITY !== CLOCK_AUTHORITY) {
    reject("CLOCK_AUTHORITY must be QUEEN_SERVER_V0_2");
  }
  if (input.SOURCE_ENDPOINT !== "/api/state" && input.SOURCE_ENDPOINT !== "/ws") {
    reject("unsupported SOURCE_ENDPOINT");
  }
  if (typeof input.CLOCK_ENTITY_ID !== "string" || input.CLOCK_ENTITY_ID.length === 0) {
    reject("CLOCK_ENTITY_ID is required");
  }
  if (!QUEEN_ID_PATTERN.test(input.QUEEN_ID)) reject("invalid QUEEN_ID");
  if (!ANT_ID_PATTERN.test(input.ANT_ID)) reject("invalid ANT_ID");
  if (!WORLD_REF_PATTERN.test(input.POSITION)) reject("invalid POSITION");
  if (typeof input.QUEEN_MODE !== "string" || input.QUEEN_MODE.length === 0) {
    reject("QUEEN_MODE is required");
  }
  if (!Number.isSafeInteger(input.GENERATION) || input.GENERATION < 0) {
    reject("GENERATION must be a non-negative safe integer");
  }
  if (typeof input.CONDITION !== "string" || input.CONDITION.length === 0) {
    reject("CONDITION is required");
  }
  if (!TRACE_ID_PATTERN.test(input.TRACE_ID)) reject("invalid TRACE_ID");

  if (input.MOTION !== null) {
    reject("MOTION must remain null until a real motion contract exists");
  }
  if (input.PROOF_REF !== null) reject("PROOF_REF must be null");
  if (input.PROOF_CLAIM !== false) reject("PROOF_CLAIM must be false");
  if (input.GATE_AUTHORITY !== false) reject("GATE_AUTHORITY must be false");
  if (input.ROUTING_AUTHORIZATION !== "UNDECIDED") {
    reject("ROUTING_AUTHORIZATION must be UNDECIDED");
  }

  return deepFreeze(clone(input));
}

export function createFourminizerStartupRuntime({
  readObservation,
  readAntBirthReceipt,
  readWorldModel,
  retryPolicy = {}
}) {
  if (typeof readObservation !== "function") reject("readObservation function is required");
  if (typeof readAntBirthReceipt !== "function") {
    reject("readAntBirthReceipt function is required");
  }
  if (typeof readWorldModel !== "function") reject("readWorldModel function is required");
  if (!isPlainObject(retryPolicy)) reject("retryPolicy must be a plain object");

  const ingress = createQueenObservationIngress();
  let consumed = false;

  return Object.freeze({
    SCHEMA: RUNTIME_SCHEMA,
    VERSION: "0.1",
    MODE: "ONE_REAL_CYCLE_FAIL_CLOSED",
    CONTRACT_PINS: RUNTIME_PINS,

    async runCycle({ queenCrystal, localMachine }) {
      if (consumed) reject("v0.1 runtime permits one cycle only");

      const queen = validateFourminizerQueenCrystal(queenCrystal);
      const machine = validateLocalMachine(localMachine);

      if (queen.BIRTH_STATE !== "DORMANT") {
        reject("Queen crystal must begin from DORMANT");
      }
      if (queen.EXECUTABLE !== false) reject("Queen crystal must remain non-executable");
      if (machine.STATE !== "DORMANT") reject("local machine must remain DORMANT");
      if (machine.EXECUTABLE !== false) reject("local machine must remain non-executable");

      if (
        machine.OWNER.QUEEN_ID !== queen.QUEEN_ID ||
        machine.OWNER.ANT_ID !== queen.ANT_ID
      ) {
        reject("local machine owner does not match Queen identity");
      }

      const receipt = await readAntBirthReceipt();
      const identity = normalizeAntIdentity(receipt);

      if (identity.ANT_ID !== queen.ANT_ID) {
        reject("live ant identity does not match Queen crystal ANT_ID");
      }

      const accepted = await ingress.readUsable(readObservation, retryPolicy);
      const clock = accepted.CLOCK;

      const worldRaw = await readWorldModel();
      const world = validateLocalWorldModel(worldRaw);

      if (world.SNAPSHOT_CLASS !== "RUNTIME") {
        reject("world model must be a RUNTIME snapshot");
      }
      if (
        world.SELF.QUEEN_ID !== queen.QUEEN_ID ||
        world.SELF.ANT_ID !== queen.ANT_ID
      ) {
        reject("runtime world SELF does not match Queen identity");
      }
      if (world.OBSERVED_AT_TICK !== clock.TICK) {
        reject("world snapshot tick must exactly equal Queen clock tick");
      }
      if (world.CLOCK_AUTHORITY !== CLOCK_AUTHORITY) {
        reject("world clock authority mismatch");
      }
      if (
        world.LOCAL_MACHINE.ID !== null ||
        world.LOCAL_MACHINE.STATE !== "UNBOUND"
      ) {
        reject("Local World Model v0.1 must remain machine-unbound");
      }

      const trace = buildTrace({ queen, world, clock });
      const liveEvent = buildLiveEvent({ queen, world, clock, trace });

      consumed = true;

      return deepFreeze({
        SCHEMA: "BRUTUS-FOURMINIZER-STARTUP-RESULT-v0.1",
        VERSION: "0.1",
        STATUS: "STOPPED_AFTER_ONE_REAL_CYCLE",
        REAL_INPUT_REQUIRED: true,
        QUEEN: {
          QUEEN_ID: queen.QUEEN_ID,
          ANT_ID: queen.ANT_ID,
          BIRTH_RECEIPT_VALIDATED: true
        },
        CLOCK: {
          ENTITY_ID: clock.ENTITY_ID,
          TICK: clock.TICK,
          GENERATION: clock.GENERATION,
          QUEEN_MODE: clock.QUEEN_MODE,
          SOURCE_ENDPOINT: clock.SOURCE_ENDPOINT,
          INTEGRITY_MATCH: clock.INTEGRITY_MATCH,
          STATUS: clock.STATUS
        },
        WORLD: {
          MODEL_ID: world.MODEL_ID,
          POSITION: world.POSITION,
          SNAPSHOT_CLASS: world.SNAPSHOT_CLASS,
          OBSERVED_AT_TICK: world.OBSERVED_AT_TICK
        },
        LOCAL_MACHINE: {
          MACHINE_ID: machine.MACHINE_ID,
          STATE: machine.STATE,
          BOUND: false,
          EXECUTED: false
        },
        TRACE: trace,
        LIVE_EVENTS: [liveEvent],
        PROOF_REF: null,
        PROOF_CLAIM: false,
        GATE_AUTHORITY: false,
        ROUTING_AUTHORIZATION: "UNDECIDED"
      });
    }
  });
}

export const BRUTUS_FOURMINIZER_STARTUP_RUNTIME_SCHEMA = RUNTIME_SCHEMA;
export const BRUTUS_FOURMINIZER_LIVE_EVENT_SCHEMA = LIVE_EVENT_SCHEMA;
export const BRUTUS_FOURMINIZER_STARTUP_PINS = RUNTIME_PINS;
