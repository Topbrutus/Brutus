import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { adaptBrotoculateurStatus } from "../src/brotoculateur-input-adapter.mjs";
import { crystallizeMathInputItem } from "../src/math-crystal-candidate.mjs";
import {
  admitMathCrystalToFourmi,
  computeMathMaterialAdmissionRequestH256
} from "../src/fourmi-math-material-admission.mjs";
import {
  createLiveFourmiTransportAuthorization
} from "../src/live-fourmi-transport-authorization.mjs";
import {
  createOneStepLiveTransportRuntime,
  computeLiveFourmiTransportStateH256,
  validateLiveFourmiTransportState,
  validateLiveFourmiTransportConsumption
} from "../src/one-step-live-transport-runtime.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(here, relative), "utf8"));
}

function antBirthReceipt(antId = "ANT-000000000001") {
  const receipt = readJson("../fixtures/ants/ant-birth-receipt.json");
  receipt.ant_id = antId;
  receipt.project_soul.memory_id = "MEM-LIVE-ONE-STEP";
  receipt.project_soul.lineage = [antId];
  return receipt;
}

function statusFixture() {
  return {
    run_id: "run-live-one-step",
    state: "RUNNING",
    round_index: 1,
    formula_ids: ["DOUBLE"],
    brutaux_symbolic: {
      seven_fields: ["INPUT","OUTPUT","FORMULE","PARENT","BRANCHE","RONDE","TRACE"],
      canonical_formulas: 1,
      authenticated_formulas: 1,
      testing_formulas: 0,
      rejected_formulas: 0,
      candidate_formulas: 0,
      traces_total: 10,
      proofs_total: 10,
      proofs_valid: 10,
      proofs_invalid: 0,
      reconstructed_supports: 10,
      failed_supports: 0,
      tracker_sources: 10,
      recycle_emitted: 0,
      sample_formula: "(2*A<INPUT>)=B<OUTPUT>",
      sample_hash: "6001b852fd881afc",
      sample_bindings: ["A=1, B=2"],
      last_trace: {
        INPUT: "1",
        OUTPUT: "2",
        FORMULE: "DOUBLE",
        PARENT: "root",
        BRANCHE: "ROOT",
        RONDE: 1,
        TRACE: "trace-1"
      },
      last_proof: {
        trace_id: "trace-1",
        proof_id: "proof-1",
        valid: true,
        reason: "EXACT_REPLAY",
        expected_output: "2"
      }
    },
    zel_bridge: null
  };
}

function admittedMaterial(createdAtTick = 100) {
  const packet = adaptBrotoculateurStatus(statusFixture());
  const item = packet.ITEMS[0];
  const crystal = crystallizeMathInputItem(packet, item.ITEM_ID);

  const request = {
    SCHEMA: "BRUTUS-MATH-MATERIAL-ADMISSION-REQUEST-v0.1",
    VERSION: "0.1",
    REQUEST_ID: "MMA-ONE-STEP-0001",
    ANT_ID: "ANT-000000000001",
    TICK: createdAtTick,
    CLOCK_AUTHORITY: "QUEEN_SERVER_V0_2",
    PARENT_CRYSTAL_ID: crystal.CRYSTAL_ID,
    PARENT_CRYSTAL_H256: crystal.CRYSTAL_H256,
    PURPOSE: "FOURMI_TRANSPORT_ADMISSION",
    AUTHORIZATION: {
      POLICY: "BRUTUS-MATH-MATERIAL-ADMISSION-v0.1",
      DECISION: "APPROVED",
      APPROVER: "BRUTUS_CONTROL_PLANE"
    },
    TRACE_ID: "TRACE-ONE-STEP-ADMISSION",
    PROOF_REF: null,
    SIGNATURE_METHOD: "BRUTUS-CANONICAL-JSON-SHA256-v0.1",
    SIGNATURE_H256: "0".repeat(64),
    EXECUTABLE: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "UNDECIDED",
    WHEEL_INGRESS_AUTHORIZATION: false
  };
  request.SIGNATURE_H256 = computeMathMaterialAdmissionRequestH256(request);
  return admitMathCrystalToFourmi({ crystal, packet, request });
}

function grantFor(material, {
  issuedAtTick = 110,
  validFromTick = 150,
  expiresAtTick = 500,
  from = "W:START",
  to = "W:GENESIS-A"
} = {}) {
  return createLiveFourmiTransportAuthorization({
    antBirthReceipt: antBirthReceipt(),
    material,
    issuedAtTick,
    validFromTick,
    expiresAtTick,
    from,
    to,
    traceId: "TRACE-ONE-STEP-AUTH",
    authorization: {
      POLICY: "BRUTUS-LIVE-FOURMI-TRANSPORT-v0.1",
      DECISION: "APPROVED",
      APPROVER: "BRUTUS_CONTROL_PLANE"
    }
  });
}

function clockEnvelope(tick, observedAt = "2026-10-02T23:50:00.000Z") {
  return {
    status: "FRESH",
    source_schema: "QUEEN_SERVER_V0_2",
    source_endpoint: "/api/state",
    entity_id: "QUEEN-SERVER-LIVE-0001",
    freshness_ms: 0,
    observed_at_utc: observedAt,
    condition: "READY",
    payload: {
      source: "QUEEN_SERVER_V0_2",
      entity_id: "QUEEN-SERVER-LIVE-0001",
      tick_count: tick,
      generation: 0,
      queen_mode: "LIVE_TRANSPORT",
      integrity_match: true,
      reference_h256: "a".repeat(64)
    }
  };
}

function transportState({
  material,
  tick,
  position,
  observationSuffix,
  endpoint = "/runtime/live-transport",
  sourceSchema = "ANTMUX-LIVE-FOURMI-TRANSPORT-v0.1",
  binding = "ATTACHED",
  antId = "ANT-000000000001"
}) {
  const state = {
    SCHEMA: "BRUTUS-LIVE-FOURMI-TRANSPORT-STATE-v0.1",
    VERSION: "0.1",
    OBSERVATION_ID: `LTS-T${tick}-${observationSuffix}`,
    TICK: tick,
    CLOCK_AUTHORITY: "QUEEN_SERVER_V0_2",
    SOURCE: {
      SOURCE_SCHEMA: sourceSchema,
      SOURCE_ENDPOINT: endpoint,
      OBSERVED_AT_UTC: tick === 200
        ? "2026-10-02T23:50:00.000Z"
        : "2026-10-02T23:50:01.000Z",
      INTEGRITY_MATCH: true
    },
    ANT_ID: antId,
    POSITION: position,
    MATERIAL: {
      MATERIAL_ID: material.MATERIAL_ID,
      MATERIAL_H256: material.MATERIAL_H256,
      BINDING_STATE: binding
    },
    TRACE_ID: `TRACE-LIVE-STATE-T${tick}`,
    PROOF_REF: null,
    SIGNATURE_METHOD: "BRUTUS-CANONICAL-JSON-SHA256-v0.1",
    SIGNATURE_H256: "0".repeat(64),
    EXECUTABLE: false,
    PROOF_CLAIM: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "UNDECIDED"
  };
  state.SIGNATURE_H256 = computeLiveFourmiTransportStateH256(state);
  return state;
}

function successfulHarness({
  grantOptions = {},
  preTick = 200,
  postTick = 201,
  prePosition = "W:START",
  postPosition = "W:GENESIS-A",
  postEndpoint = "/runtime/live-transport",
  postSourceSchema = "ANTMUX-LIVE-FOURMI-TRANSPORT-v0.1",
  ackMutator = null,
  actionThrows = null
} = {}) {
  const material = admittedMaterial();
  const grant = grantFor(material, grantOptions);

  const clocks = [
    clockEnvelope(preTick, "2026-10-02T23:50:00.000Z"),
    clockEnvelope(postTick, "2026-10-02T23:50:01.000Z")
  ];
  const states = [
    transportState({
      material,
      tick: preTick,
      position: prePosition,
      observationSuffix: "PRE-0001"
    }),
    transportState({
      material,
      tick: postTick,
      position: postPosition,
      observationSuffix: "POST-0001",
      endpoint: postEndpoint,
      sourceSchema: postSourceSchema
    })
  ];

  let clockIndex = 0;
  let stateIndex = 0;
  let actionCalls = 0;
  let lastCommand = null;

  const runtime = createOneStepLiveTransportRuntime({
    readObservation: async () => structuredClone(
      clocks[Math.min(clockIndex++, clocks.length - 1)]
    ),
    readAntBirthReceipt: async () => structuredClone(antBirthReceipt()),
    readTransportState: async () => structuredClone(
      states[Math.min(stateIndex++, states.length - 1)]
    ),
    performAuthorizedMove: async (command) => {
      actionCalls += 1;
      lastCommand = structuredClone(command);
      if (actionThrows) throw new Error(actionThrows);
      const ack = {
        STATUS: "ACCEPTED",
        COMMAND_ID: command.COMMAND_ID,
        AUTHORIZATION_ID: command.AUTHORIZATION_ID,
        ANT_ID: command.ANT_ID,
        MATERIAL_ID: command.MATERIAL_ID,
        FROM: command.FROM,
        TO: command.TO
      };
      if (ackMutator) ackMutator(ack);
      return ack;
    },
    retryPolicy: {
      maxAttempts: 1,
      baseDelayMs: 0,
      maxDelayMs: 0,
      sleep: async () => {}
    }
  });

  return {
    material,
    grant,
    runtime,
    get actionCalls() { return actionCalls; },
    get lastCommand() { return lastCommand; }
  };
}

test("one successful cycle creates ANT_MOVE, MATERIAL_MOVE and consumes grant", async () => {
  const h = successfulHarness();
  const result = await h.runtime.runCycle({
    authorization: h.grant,
    material: h.material
  });

  assert.equal(result.STATUS, "COMPLETED_ONE_AUTHORIZED_MOVE");
  assert.equal(h.actionCalls, 1);
  assert.equal(result.PRE_CLOCK_TICK, 200);
  assert.equal(result.POST_CLOCK_TICK, 201);
  assert.equal(result.PRE_STATE.POSITION, "W:START");
  assert.equal(result.POST_STATE.POSITION, "W:GENESIS-A");
  assert.equal(result.ANT_MOVE.EVENT_TYPE, "ANT_MOVE");
  assert.equal(result.ANT_MOVE.PAYLOAD.FROM, "W:START");
  assert.equal(result.ANT_MOVE.PAYLOAD.TO, "W:GENESIS-A");
  assert.equal(result.MATERIAL_MOVE.MOVEMENT.MATERIAL_MOVEMENT_VERIFIED, true);
  assert.equal(result.AUTHORIZATION_CONSUMPTION.CONSUMED, true);
  assert.equal(result.AUTHORIZATION_CONSUMPTION.ROUTING_AUTHORIZATION, "CONSUMED");
  assert.equal(result.PROOF_REF, null);
  assert.equal(result.PROOF_CLAIM, false);
});

test("external command is exact, bounded and contains no autonomous route choice", async () => {
  const h = successfulHarness();
  await h.runtime.runCycle({
    authorization: h.grant,
    material: h.material
  });

  assert.equal(h.lastCommand.FROM, "W:START");
  assert.equal(h.lastCommand.TO, "W:GENESIS-A");
  assert.equal(h.lastCommand.MAX_MOVES, 1);
  assert.equal(h.lastCommand.SINGLE_USE, true);
  assert.equal(h.lastCommand.ROUTING_AUTHORIZATION, "AUTHORIZED");
  assert.equal(h.lastCommand.EXECUTABLE, false);
  assert.equal(h.lastCommand.PROOF_REF, null);
});

test("runtime permits exactly one action attempt after successful cycle", async () => {
  const h = successfulHarness();
  await h.runtime.runCycle({
    authorization: h.grant,
    material: h.material
  });

  await assert.rejects(
    () => h.runtime.runCycle({
      authorization: h.grant,
      material: h.material
    }),
    /permits one action attempt only/
  );
  assert.equal(h.actionCalls, 1);
});

test("external action throw permanently spends runtime instance", async () => {
  const h = successfulHarness({ actionThrows: "link lost after submit" });

  await assert.rejects(
    () => h.runtime.runCycle({
      authorization: h.grant,
      material: h.material
    }),
    /link lost after submit/
  );
  assert.equal(h.actionCalls, 1);

  await assert.rejects(
    () => h.runtime.runCycle({
      authorization: h.grant,
      material: h.material
    }),
    /permits one action attempt only/
  );
  assert.equal(h.actionCalls, 1);
});

test("forged action acknowledgment fails and cannot trigger retry", async () => {
  const h = successfulHarness({
    ackMutator: ack => { ack.TO = "W:GENESIS-B"; }
  });

  await assert.rejects(
    () => h.runtime.runCycle({
      authorization: h.grant,
      material: h.material
    }),
    /action acknowledgment TO mismatch/
  );
  assert.equal(h.actionCalls, 1);

  await assert.rejects(
    () => h.runtime.runCycle({
      authorization: h.grant,
      material: h.material
    }),
    /permits one action attempt only/
  );
});

test("pre-state tick must match authoritative Queen clock before action", async () => {
  const h = successfulHarness({ preTick: 200 });
  const original = h.runtime;

  const material = h.material;
  const grant = h.grant;
  let calls = 0;
  const runtime = createOneStepLiveTransportRuntime({
    readObservation: async () => clockEnvelope(200),
    readAntBirthReceipt: async () => antBirthReceipt(),
    readTransportState: async () => transportState({
      material,
      tick: 199,
      position: "W:START",
      observationSuffix: "PRE-BAD"
    }),
    performAuthorizedMove: async () => {
      calls += 1;
      throw new Error("must not be called");
    },
    retryPolicy: {
      maxAttempts: 1,
      baseDelayMs: 0,
      maxDelayMs: 0,
      sleep: async () => {}
    }
  });

  await assert.rejects(
    () => runtime.runCycle({ authorization: grant, material }),
    /pre-state tick must exactly equal Queen clock tick/
  );
  assert.equal(calls, 0);
  assert.ok(original);
});

test("expired grant fails before external action", async () => {
  const h = successfulHarness({
    grantOptions: { expiresAtTick: 199 }
  });

  await assert.rejects(
    () => h.runtime.runCycle({
      authorization: h.grant,
      material: h.material
    }),
    /authorization has expired/
  );
  assert.equal(h.actionCalls, 0);
});

test("wrong pre-state position fails before external action", async () => {
  const h = successfulHarness({
    prePosition: "W:GENESIS-Z"
  });

  await assert.rejects(
    () => h.runtime.runCycle({
      authorization: h.grant,
      material: h.material
    }),
    /pre-state position does not match authorized FROM/
  );
  assert.equal(h.actionCalls, 0);
});

test("post-action Queen tick must advance", async () => {
  const h = successfulHarness({
    preTick: 200,
    postTick: 200
  });

  await assert.rejects(
    () => h.runtime.runCycle({
      authorization: h.grant,
      material: h.material
    }),
    /post-action Queen tick must advance/
  );
  assert.equal(h.actionCalls, 1);

  await assert.rejects(
    () => h.runtime.runCycle({
      authorization: h.grant,
      material: h.material
    }),
    /permits one action attempt only/
  );
});

test("post-state must exactly reach authorized TO", async () => {
  const h = successfulHarness({
    postPosition: "W:GENESIS-B"
  });

  await assert.rejects(
    () => h.runtime.runCycle({
      authorization: h.grant,
      material: h.material
    }),
    /post-state position does not match authorized TO/
  );
  assert.equal(h.actionCalls, 1);
});

test("transport state source continuity is mandatory after action", async () => {
  const h = successfulHarness({
    postEndpoint: "/runtime/other-source"
  });

  await assert.rejects(
    () => h.runtime.runCycle({
      authorization: h.grant,
      material: h.material
    }),
    /transport state source continuity violation/
  );
  assert.equal(h.actionCalls, 1);
});

test("transport state requires material to remain ATTACHED", () => {
  const material = admittedMaterial();
  const state = transportState({
    material,
    tick: 200,
    position: "W:START",
    observationSuffix: "DETACHED",
    binding: "DETACHED"
  });

  assert.throws(
    () => validateLiveFourmiTransportState(state),
    /BINDING_STATE must be ATTACHED/
  );
});

test("transport state signature detects position mutation", () => {
  const material = admittedMaterial();
  const state = transportState({
    material,
    tick: 200,
    position: "W:START",
    observationSuffix: "SIGNED"
  });
  state.POSITION = "W:GENESIS-A";

  assert.throws(
    () => validateLiveFourmiTransportState(state),
    /SIGNATURE_H256 mismatch/
  );
});

test("consumption signature detects mutation", async () => {
  const h = successfulHarness();
  const result = await h.runtime.runCycle({
    authorization: h.grant,
    material: h.material
  });

  const consumption = structuredClone(result.AUTHORIZATION_CONSUMPTION);
  consumption.MATERIAL_MOVE_H256 = "a".repeat(64);

  assert.throws(
    () => validateLiveFourmiTransportConsumption(consumption),
    /consumption SIGNATURE_H256 mismatch/
  );
});

test("successful runtime output remains non-proof and wheel-agnostic", async () => {
  const h = successfulHarness();
  const result = await h.runtime.runCycle({
    authorization: h.grant,
    material: h.material
  });

  assert.equal(result.MATERIAL_MOVE.PROOF_REF, null);
  assert.equal(result.MATERIAL_MOVE.PROOF_CREATED, false);
  assert.equal(result.MATERIAL_MOVE.WHEEL_INGRESS_AUTHORIZATION, false);
  assert.equal(result.MATERIAL_MOVE.MACHINE_EXECUTION_AUTHORIZATION, false);
  assert.equal(result.MATERIAL_MOVE.BRUTUS_TRUTH_STATUS, "UNVERIFIED_BY_BRUTUS");
});

test("runtime core contains no network, timers, random route choice or process execution", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/one-step-live-transport-runtime.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /fetch\s*\(|WebSocket|XMLHttpRequest/);
  assert.doesNotMatch(source, /setInterval|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /node:child_process|process\.exec/);
  assert.doesNotMatch(source, /chooseRoute|randomRoute|autonomousRoute/);
});
