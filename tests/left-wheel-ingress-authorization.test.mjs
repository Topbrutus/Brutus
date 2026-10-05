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
  createLeftWheelIngressAuthorization,
  validateLeftWheelIngressAuthorization,
  assertLeftWheelIngressAuthorized
} from "../src/left-wheel-ingress-authorization.mjs";

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

function approval(decision = "APPROVED") {
  return {
    POLICY: "BRUTUS-LEFT-WHEEL-INGRESS-v0.1",
    DECISION: decision,
    APPROVER: "BRUTUS_CONTROL_PLANE"
  };
}

function grantFixture({
  move = materialMove(),
  consumption = null,
  issuedAtTick = 210,
  validFromTick = 211,
  expiresAtTick = 600
} = {}) {
  const usedConsumption = consumption ?? transportConsumption(move);
  return createLeftWheelIngressAuthorization({
    materialMove: move,
    transportConsumption: usedConsumption,
    issuedAtTick,
    validFromTick,
    expiresAtTick,
    traceId: "TRACE-LEFT-WHEEL-INGRESS-AUTH",
    authorization: approval()
  });
}

test("creates explicit one-shot left-wheel ingress authorization", () => {
  const grant = grantFixture();

  assert.equal(grant.SCHEMA, "BRUTUS-LEFT-WHEEL-INGRESS-AUTHORIZATION-v0.1");
  assert.equal(grant.SCOPE.PURPOSE, "LEFT_WHEEL_INGRESS");
  assert.equal(grant.SCOPE.WHEEL, "LEFT");
  assert.equal(grant.SCOPE.SOURCE_POSITION, "W:GENESIS-B");
  assert.equal(grant.SCOPE.MAX_INGRESS_ATTEMPTS, 1);
  assert.equal(grant.SINGLE_USE, true);
  assert.equal(grant.WHEEL_INGRESS_AUTHORIZATION, true);
  assert.equal(grant.GATE_AUTHORITY, true);
  assert.equal(grant.AUTOMATIC_RETRY_ALLOWED, false);
});

test("gate does not promote transport success into proof or execution authority", () => {
  const grant = grantFixture();

  assert.equal(grant.BRUTUS_TRUTH_STATUS, "UNVERIFIED_BY_BRUTUS");
  assert.equal(grant.PROOF_REF, null);
  assert.equal(grant.PROOF_CLAIM, false);
  assert.equal(grant.MACHINE_EXECUTION_AUTHORIZATION, false);
  assert.equal(grant.EXECUTABLE, false);
});

test("same verified inputs produce deterministic authorization", () => {
  const move = materialMove();
  const consumption = transportConsumption(move);
  const a = grantFixture({ move, consumption });
  const b = grantFixture({ move, consumption });

  assert.equal(a.AUTHORIZATION_ID, b.AUTHORIZATION_ID);
  assert.equal(a.SIGNATURE_H256, b.SIGNATURE_H256);
  assert.deepEqual(a, b);
});

test("exact authorized ingress request returns non-executable verdict", () => {
  const move = materialMove();
  const consumption = transportConsumption(move);
  const grant = grantFixture({ move, consumption });

  const verdict = assertLeftWheelIngressAuthorized({
    authorization: grant,
    materialMove: move,
    transportConsumption: consumption,
    tick: 300,
    currentPosition: "W:GENESIS-B"
  });

  assert.equal(verdict.DECISION, "AUTHORIZED");
  assert.equal(verdict.WHEEL, "LEFT");
  assert.equal(verdict.WHEEL_INGRESS_AUTHORIZATION, true);
  assert.equal(verdict.MACHINE_EXECUTION_AUTHORIZATION, false);
  assert.equal(verdict.EXECUTABLE, false);
  assert.equal(verdict.PROOF_REF, null);
  assert.equal(verdict.AUTOMATIC_RETRY_ALLOWED, false);
});

test("a moved material without consumed transport grant cannot mint ingress authorization", () => {
  const move = materialMove();
  const consumption = structuredClone(transportConsumption(move));
  consumption.CONSUMED = false;
  consumption.SIGNATURE_H256 =
    computeLiveFourmiTransportConsumptionH256(consumption);

  assert.throws(
    () => createLeftWheelIngressAuthorization({
      materialMove: move,
      transportConsumption: consumption,
      issuedAtTick: 210,
      validFromTick: 211,
      expiresAtTick: 600,
      traceId: "TRACE-LEFT-WHEEL-INGRESS-AUTH",
      authorization: approval()
    }),
    /CONSUMED must be true/
  );
});

test("ingress authorization is bound to exact material move", () => {
  const move = materialMove();
  const consumption = transportConsumption(move);
  const grant = grantFixture({ move, consumption });
  const otherMove = structuredClone(move);
  otherMove.MOVE_ID = "MMOVE-T200-FFFFFFFFFFFFFFFFFFFF";
  otherMove.MOVE_H256 = computeFourmiMathMaterialMoveH256(otherMove);

  assert.throws(
    () => assertLeftWheelIngressAuthorized({
      authorization: grant,
      materialMove: otherMove,
      transportConsumption: consumption,
      tick: 300,
      currentPosition: "W:GENESIS-B"
    }),
    /MOVE_ID mismatch|MOVE_H256 mismatch/
  );
});

test("ingress authorization is bound to exact consumed transport receipt", () => {
  const move = materialMove();
  const consumption = transportConsumption(move);
  const grant = grantFixture({ move, consumption });
  const otherConsumption = structuredClone(consumption);
  otherConsumption.CONSUMPTION_ID = "LTAC-T201-EEEEEEEEEEEEEEEEEEEE";
  otherConsumption.SIGNATURE_H256 =
    computeLiveFourmiTransportConsumptionH256(otherConsumption);

  assert.throws(
    () => assertLeftWheelIngressAuthorized({
      authorization: grant,
      materialMove: move,
      transportConsumption: otherConsumption,
      tick: 300,
      currentPosition: "W:GENESIS-B"
    }),
    /transport consumption ID mismatch/
  );
});

test("wrong current position is outside exact gate scope", () => {
  const move = materialMove();
  const consumption = transportConsumption(move);
  const grant = grantFixture({ move, consumption });

  assert.throws(
    () => assertLeftWheelIngressAuthorized({
      authorization: grant,
      materialMove: move,
      transportConsumption: consumption,
      tick: 300,
      currentPosition: "W:GENESIS-A"
    }),
    /outside ingress authorization scope/
  );
});

test("single-use gate rejects consumed authorization", () => {
  const move = materialMove();
  const consumption = transportConsumption(move);
  const grant = grantFixture({ move, consumption });

  assert.throws(
    () => assertLeftWheelIngressAuthorized({
      authorization: grant,
      materialMove: move,
      transportConsumption: consumption,
      tick: 300,
      currentPosition: "W:GENESIS-B",
      consumed: true
    }),
    /already consumed/
  );
});

test("started ingress attempt is fail-closed and cannot be automatically retried", () => {
  const move = materialMove();
  const consumption = transportConsumption(move);
  const grant = grantFixture({ move, consumption });

  assert.throws(
    () => assertLeftWheelIngressAuthorized({
      authorization: grant,
      materialMove: move,
      transportConsumption: consumption,
      tick: 300,
      currentPosition: "W:GENESIS-B",
      attemptStarted: true
    }),
    /automatic retry is forbidden/
  );
});

test("authorization expires at finite Queen tick", () => {
  const move = materialMove();
  const consumption = transportConsumption(move);
  const grant = grantFixture({ move, consumption, expiresAtTick: 250 });

  assert.throws(
    () => assertLeftWheelIngressAuthorized({
      authorization: grant,
      materialMove: move,
      transportConsumption: consumption,
      tick: 251,
      currentPosition: "W:GENESIS-B"
    }),
    /authorization has expired/
  );
});

test("denied Control Plane decision cannot create ingress grant", () => {
  const move = materialMove();
  const consumption = transportConsumption(move);

  assert.throws(
    () => createLeftWheelIngressAuthorization({
      materialMove: move,
      transportConsumption: consumption,
      issuedAtTick: 210,
      validFromTick: 211,
      expiresAtTick: 600,
      traceId: "TRACE-LEFT-WHEEL-INGRESS-AUTH",
      authorization: approval("DENIED")
    }),
    /DECISION must be APPROVED/
  );
});

test("tampered ingress authorization fails signature validation", () => {
  const grant = structuredClone(grantFixture());
  grant.SCOPE.SOURCE_POSITION = "W:GENESIS-C";

  assert.throws(
    () => validateLeftWheelIngressAuthorization(grant),
    /SIGNATURE_H256 mismatch/
  );
});

test("gate core contains no network timers random or process execution", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/left-wheel-ingress-authorization.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /fetch\s*\(|WebSocket|XMLHttpRequest/);
  assert.doesNotMatch(source, /setInterval|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /node:child_process|process\.exec/);
});
