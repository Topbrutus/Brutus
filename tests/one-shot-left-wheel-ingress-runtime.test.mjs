import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  computeFourmiMathMaterialMoveH256,
  validateFourmiMathMaterialMove
} from "../src/fourmi-math-material-move.mjs";
import {
  computeLiveFourmiTransportConsumptionH256,
  validateLiveFourmiTransportConsumption
} from "../src/one-step-live-transport-runtime.mjs";
import {
  createLeftWheelIngressAuthorization
} from "../src/left-wheel-ingress-authorization.mjs";
import {
  createOneShotLeftWheelIngressRuntime,
  computeLeftWheelIngressStateH256,
  validateLeftWheelIngressConsumption
} from "../src/one-shot-left-wheel-ingress-runtime.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function materialMove() {
  const move = {
    SCHEMA: "BRUTUS-FOURMI-MATH-MATERIAL-MOVE-v0.1",
    VERSION: "0.1",
    MOVE_ID: "MMOVE-T200-AAAAAAAAAAAAAAAAAAAA",
    EVENT_TYPE: "MATERIAL_MOVE",
    TICK: 200,
    CLOCK_AUTHORITY: "QUEEN_SERVER_V0_2",
    MATERIAL_REF: {
      MATERIAL_ID: "MAT-MATH-AAAAAAAAAAAAAAAAAAAAAAAA",
      MATERIAL_H256: "a".repeat(64),
      PARENT_CRYSTAL_ID: "MATH-CRYSTAL-BBBBBBBBBBBBBBBBBBBBBBBB",
      PARENT_CRYSTAL_H256: "b".repeat(64),
      CONTENT_H256: "c".repeat(64),
      EXPRESSION_H256: "d".repeat(64)
    },
    CARRIER: {
      ANT_ID: "ANT-000000000001",
      ANT_IDENTITY_H256: "e".repeat(64),
      CARRIER_OBSERVATION_ID: "MMCO-T199-CARRIER-0001",
      CARRIER_OBSERVATION_H256: "f".repeat(64),
      RUNTIME_VERIFIED: true
    },
    ANT_MOVE_REF: {
      EVENT_ID: "RME-T200-ANT-MOVE-0001",
      EVENT_SIGNATURE_H256: "1".repeat(64),
      TRACE_ID: "TRACE-LEFT-WHEEL-MOVE",
      FROM: "W:GENESIS-A",
      TO: "W:GENESIS-B",
      SOURCE_OBSERVATION_ID: "OBS-LIVE-TRANSPORT-0001",
      SOURCE_SCHEMA: "ANTMUX-LIVE-FOURMI-TRANSPORT-v0.1",
      SOURCE_ENDPOINT: "/api/live-transport/state"
    },
    MOVEMENT: {
      FROM: "W:GENESIS-A",
      TO: "W:GENESIS-B",
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
    SIGNATURE_METHOD: "BRUTUS-CANONICAL-JSON-SHA256-v0.1",
    MOVE_H256: "0".repeat(64)
  };
  move.MOVE_H256 = computeFourmiMathMaterialMoveH256(move);
  return validateFourmiMathMaterialMove(move);
}

function transportConsumption(move = materialMove()) {
  const consumption = {
    SCHEMA: "BRUTUS-LIVE-FOURMI-TRANSPORT-CONSUMPTION-v0.1",
    VERSION: "0.1",
    CONSUMPTION_ID: "LTAC-T201-CCCCCCCCCCCCCCCCCCCC",
    AUTHORIZATION_ID: "LTA-T150-BBBBBBBBBBBBBBBBBBBB",
    AUTHORIZATION_H256: "2".repeat(64),
    ANT_ID: move.CARRIER.ANT_ID,
    MATERIAL_ID: move.MATERIAL_REF.MATERIAL_ID,
    COMMAND_ID: "LTC-T150-DDDDDDDDDDDDDDDDDDDD",
    ANT_MOVE_EVENT_ID: move.ANT_MOVE_REF.EVENT_ID,
    ANT_MOVE_H256: move.ANT_MOVE_REF.EVENT_SIGNATURE_H256,
    MATERIAL_MOVE_ID: move.MOVE_ID,
    MATERIAL_MOVE_H256: move.MOVE_H256,
    CONSUMED_AT_TICK: 201,
    CLOCK_AUTHORITY: "QUEEN_SERVER_V0_2",
    SINGLE_USE: true,
    CONSUMED: true,
    PROOF_REF: null,
    EXECUTABLE: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "CONSUMED",
    SIGNATURE_METHOD: "BRUTUS-CANONICAL-JSON-SHA256-v0.1",
    SIGNATURE_H256: "0".repeat(64)
  };
  consumption.SIGNATURE_H256 =
    computeLiveFourmiTransportConsumptionH256(consumption);
  return validateLiveFourmiTransportConsumption(consumption);
}

function grantFixture(move = materialMove(), consumption = transportConsumption(move)) {
  return createLeftWheelIngressAuthorization({
    materialMove: move,
    transportConsumption: consumption,
    issuedAtTick: 210,
    validFromTick: 211,
    expiresAtTick: 600,
    traceId: "TRACE-LEFT-WHEEL-RUNTIME-AUTH",
    authorization: {
      POLICY: "BRUTUS-LEFT-WHEEL-INGRESS-v0.1",
      DECISION: "APPROVED",
      APPROVER: "BRUTUS_CONTROL_PLANE"
    }
  });
}

function ingressState({
  move,
  tick,
  ingressState,
  suffix,
  sourcePosition = "W:GENESIS-B",
  sourceSchema = "ANTMUX-LEFT-WHEEL-INGRESS-v0.1",
  sourceEndpoint = "/api/left-wheel/ingress-state"
}) {
  const state = {
    SCHEMA: "BRUTUS-LEFT-WHEEL-INGRESS-STATE-v0.1",
    VERSION: "0.1",
    OBSERVATION_ID: `LWIS-T${tick}-${suffix}`,
    TICK: tick,
    CLOCK_AUTHORITY: "QUEEN_SERVER_V0_2",
    SOURCE: {
      SOURCE_SCHEMA: sourceSchema,
      SOURCE_ENDPOINT: sourceEndpoint,
      OBSERVED_AT_UTC:
        tick === 300
          ? "2026-10-05T07:50:00.000Z"
          : "2026-10-05T07:50:01.000Z",
      INTEGRITY_MATCH: true
    },
    ANT_ID: move.CARRIER.ANT_ID,
    MATERIAL_ID: move.MATERIAL_REF.MATERIAL_ID,
    MATERIAL_H256: move.MATERIAL_REF.MATERIAL_H256,
    MOVE_ID: move.MOVE_ID,
    SOURCE_POSITION: sourcePosition,
    WHEEL: "LEFT",
    INGRESS_STATE: ingressState,
    TRACE_ID: `TRACE-LWI-STATE-T${tick}`,
    PROOF_REF: null,
    PROOF_CLAIM: false,
    EXECUTABLE: false,
    MACHINE_EXECUTION_AUTHORIZATION: false,
    SIGNATURE_METHOD: "BRUTUS-CANONICAL-JSON-SHA256-v0.1",
    SIGNATURE_H256: "0".repeat(64)
  };
  state.SIGNATURE_H256 = computeLeftWheelIngressStateH256(state);
  return state;
}

function harness({
  ackStatus = "SUCCEEDED",
  actionThrows = false,
  postIngressState = "INSIDE_LEFT_WHEEL",
  postSourceSchema = "ANTMUX-LEFT-WHEEL-INGRESS-v0.1",
  preSourcePosition = "W:GENESIS-B"
} = {}) {
  const move = materialMove();
  const priorConsumption = transportConsumption(move);
  const grant = grantFixture(move, priorConsumption);

  const states = [
    ingressState({
      move,
      tick: 300,
      ingressState: "OUTSIDE_LEFT_WHEEL",
      suffix: "PRE-0001",
      sourcePosition: preSourcePosition
    }),
    ingressState({
      move,
      tick: 301,
      ingressState: postIngressState,
      suffix: "POST-0001",
      sourceSchema: postSourceSchema
    })
  ];

  let stateIndex = 0;
  let actionCalls = 0;
  let lastCommand = null;
  let consumptionSeenByAdapter = null;

  const runtime = createOneShotLeftWheelIngressRuntime({
    readIngressState: async () =>
      structuredClone(states[Math.min(stateIndex++, states.length - 1)]),
    performAuthorizedIngress: async (command, consumption) => {
      actionCalls += 1;
      lastCommand = structuredClone(command);
      consumptionSeenByAdapter = structuredClone(consumption);
      if (actionThrows) throw new Error("external outcome unavailable");
      return {
        STATUS: ackStatus,
        COMMAND_ID: command.COMMAND_ID,
        AUTHORIZATION_ID: command.AUTHORIZATION_ID,
        MATERIAL_ID: command.MATERIAL_ID,
        MOVE_ID: command.MOVE_ID,
        WHEEL: "LEFT"
      };
    }
  });

  return {
    move,
    priorConsumption,
    grant,
    runtime,
    get actionCalls() {
      return actionCalls;
    },
    get lastCommand() {
      return lastCommand;
    },
    get consumptionSeenByAdapter() {
      return consumptionSeenByAdapter;
    }
  };
}

test("successful one-shot ingress consumes grant before action and requires post confirmation", async () => {
  const h = harness();
  const result = await h.runtime.runCycle({
    authorization: h.grant,
    materialMove: h.move,
    transportConsumption: h.priorConsumption
  });

  assert.equal(result.STATUS, "SUCCESS");
  assert.equal(result.INGRESS_CONFIRMED, true);
  assert.equal(h.actionCalls, 1);
  assert.equal(h.consumptionSeenByAdapter.CONSUMED, true);
  assert.equal(
    h.consumptionSeenByAdapter.CONSUMPTION_REASON,
    "ATTEMPT_STARTED"
  );
  assert.equal(result.POST_STATE.INGRESS_STATE, "INSIDE_LEFT_WHEEL");
  assert.equal(result.PROOF_REF, null);
  assert.equal(result.PROOF_CLAIM, false);
  assert.equal(result.MACHINE_EXECUTION_AUTHORIZATION, false);
});

test("external command is exact, bounded, non-proof and non-retriable", async () => {
  const h = harness();
  await h.runtime.runCycle({
    authorization: h.grant,
    materialMove: h.move,
    transportConsumption: h.priorConsumption
  });

  assert.equal(h.lastCommand.WHEEL, "LEFT");
  assert.equal(h.lastCommand.SOURCE_POSITION, "W:GENESIS-B");
  assert.equal(h.lastCommand.MAX_INGRESS_ATTEMPTS, 1);
  assert.equal(h.lastCommand.SINGLE_USE, true);
  assert.equal(h.lastCommand.WHEEL_INGRESS_AUTHORIZATION, true);
  assert.equal(h.lastCommand.MACHINE_EXECUTION_AUTHORIZATION, false);
  assert.equal(h.lastCommand.EXECUTABLE, false);
  assert.equal(h.lastCommand.PROOF_REF, null);
  assert.equal(h.lastCommand.PROOF_CLAIM, false);
  assert.equal(h.lastCommand.AUTOMATIC_RETRY_ALLOWED, false);
});

test("explicit external failure is terminal FAIL and consumes the one-shot gate", async () => {
  const h = harness({ ackStatus: "FAILED" });
  const result = await h.runtime.runCycle({
    authorization: h.grant,
    materialMove: h.move,
    transportConsumption: h.priorConsumption
  });

  assert.equal(result.STATUS, "FAIL");
  assert.equal(result.INGRESS_CONFIRMED, false);
  assert.equal(result.ACTION_ACKNOWLEDGED, true);
  assert.equal(result.AUTHORIZATION_CONSUMPTION.CONSUMED, true);
  assert.equal(h.actionCalls, 1);

  await assert.rejects(
    () =>
      h.runtime.runCycle({
        authorization: h.grant,
        materialMove: h.move,
        transportConsumption: h.priorConsumption
      }),
    /permits one ingress attempt only/
  );
  assert.equal(h.actionCalls, 1);
});

test("adapter throw becomes UNKNOWN_OUTCOME and is never automatically retried", async () => {
  const h = harness({ actionThrows: true });
  const result = await h.runtime.runCycle({
    authorization: h.grant,
    materialMove: h.move,
    transportConsumption: h.priorConsumption
  });

  assert.equal(result.STATUS, "UNKNOWN_OUTCOME");
  assert.equal(result.INGRESS_CONFIRMED, false);
  assert.equal(result.ACTION_ATTEMPTED, true);
  assert.equal(result.ACTION_ACKNOWLEDGED, false);
  assert.equal(result.UNKNOWN_OUTCOME_CLASS, "ADAPTER_THROW_OR_INVALID_ACK");
  assert.equal(result.AUTOMATIC_RETRY_ALLOWED, false);
  assert.equal(h.actionCalls, 1);

  await assert.rejects(
    () =>
      h.runtime.runCycle({
        authorization: h.grant,
        materialMove: h.move,
        transportConsumption: h.priorConsumption
      }),
    /permits one ingress attempt only/
  );
  assert.equal(h.actionCalls, 1);
});

test("successful ack without post confirmation becomes UNKNOWN_OUTCOME", async () => {
  const h = harness({ postIngressState: "OUTSIDE_LEFT_WHEEL" });
  const result = await h.runtime.runCycle({
    authorization: h.grant,
    materialMove: h.move,
    transportConsumption: h.priorConsumption
  });

  assert.equal(result.STATUS, "UNKNOWN_OUTCOME");
  assert.equal(result.ACTION_ACKNOWLEDGED, true);
  assert.equal(result.UNKNOWN_OUTCOME_CLASS, "POST_CONFIRMATION_FAILED");
  assert.equal(result.AUTOMATIC_RETRY_ALLOWED, false);
  assert.equal(h.actionCalls, 1);
});

test("post-state source continuity violation becomes UNKNOWN_OUTCOME", async () => {
  const h = harness({ postSourceSchema: "OTHER-SOURCE-v0.1" });
  const result = await h.runtime.runCycle({
    authorization: h.grant,
    materialMove: h.move,
    transportConsumption: h.priorConsumption
  });

  assert.equal(result.STATUS, "UNKNOWN_OUTCOME");
  assert.equal(result.UNKNOWN_OUTCOME_CLASS, "POST_CONFIRMATION_FAILED");
  assert.equal(h.actionCalls, 1);
});

test("wrong pre-state position fails before the side-effect boundary", async () => {
  const h = harness({ preSourcePosition: "W:GENESIS-A" });

  await assert.rejects(
    () =>
      h.runtime.runCycle({
        authorization: h.grant,
        materialMove: h.move,
        transportConsumption: h.priorConsumption
      }),
    /state source position mismatch/
  );
  assert.equal(h.actionCalls, 0);
});

test("ingress consumption receipt is deterministic and validates", async () => {
  const a = harness();
  const b = harness();

  const resultA = await a.runtime.runCycle({
    authorization: a.grant,
    materialMove: a.move,
    transportConsumption: a.priorConsumption
  });
  const resultB = await b.runtime.runCycle({
    authorization: b.grant,
    materialMove: b.move,
    transportConsumption: b.priorConsumption
  });

  assert.deepEqual(
    resultA.AUTHORIZATION_CONSUMPTION,
    resultB.AUTHORIZATION_CONSUMPTION
  );
  validateLeftWheelIngressConsumption(resultA.AUTHORIZATION_CONSUMPTION);
});

test("runtime core contains no network timers random or process execution", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/one-shot-left-wheel-ingress-runtime.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /fetch\s*\(|WebSocket|XMLHttpRequest/);
  assert.doesNotMatch(source, /setInterval|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /node:child_process|process\.exec/);
});
