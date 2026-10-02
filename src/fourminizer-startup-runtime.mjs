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
import { validateFourminizerLiveEvent } from "./fourminizer-live-event.mjs";

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

const QUEEN_ID_PATTERN = /^FOURMINIZER-QUEEN-[0-9]{4}$/;


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

export { validateFourminizerLiveEvent };

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
