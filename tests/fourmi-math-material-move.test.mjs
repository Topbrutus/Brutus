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
  bindFourmiMathMaterialMove,
  computeMathMaterialCarrierObservationH256,
  validateFourmiMathMaterialMove,
  validateMathMaterialCarrierObservation
} from "../src/fourmi-math-material-move.mjs";
import {
  computeRealMechanismEventSignature
} from "../src/real-mechanism-event.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(here, relative), "utf8"));
}

function statusFixture() {
  return {
    run_id: "run-20261002T194025-561792Z-continuity",
    state: "RUNNING",
    round_index: 61,
    formula_ids: ["DOUBLE", "PLUS1", "ZEL_F1_8999c20385"],
    brutaux_symbolic: {
      seven_fields: ["INPUT","OUTPUT","FORMULE","PARENT","BRANCHE","RONDE","TRACE"],
      canonical_formulas: 34,
      authenticated_formulas: 26,
      testing_formulas: 4,
      rejected_formulas: 3,
      candidate_formulas: 0,
      traces_total: 382155,
      proofs_total: 382155,
      proofs_valid: 382155,
      proofs_invalid: 0,
      reconstructed_supports: 369000,
      failed_supports: 0,
      tracker_sources: 260000,
      recycle_emitted: 322,
      sample_formula: "(2*A<INPUT>)=B<OUTPUT>",
      sample_hash: "6001b852fd881afc",
      sample_bindings: ["A=1, B=2","A=2, B=4","A=3, B=6"],
      last_trace: {
        INPUT: "3",
        OUTPUT: "1764",
        FORMULE: "ZEL_F1_8999c20385",
        PARENT: "76dbee4d52ba4289ba36179729cc7542",
        BRANCHE: "ROOT/Y:T/Y:E",
        RONDE: 61,
        TRACE: "e0bbb96ed17c46988d4a45d47d0b49a1"
      },
      last_proof: {
        trace_id: "e0bbb96ed17c46988d4a45d47d0b49a1",
        proof_id: "74a62b5f9c725bd811f15e013090bac0ee881dfe9e628580e9a4b162f1cc6b54",
        valid: true,
        reason: "EXACT_REPLAY",
        expected_output: "1764"
      }
    },
    zel_bridge: {
      source_url: "https://antmux.com/laboratoire/zelstereos/api/state",
      last_status: "EXACT_WITNESS_REPLAY",
      remote_write_enabled: false,
      latest: {
        source: "ZELSTEREOS_PUBLIC_SAFE",
        formula_id: "F1",
        relation: "z_P(21^k)=4*21^(k-1)",
        source_commit: "aa08bd336662",
        source_status: "PASS",
        source_mode: "PUBLIC_SAFE",
        source_read_only: true,
        test_count: 18,
        global_error_exact: "0",
        observed_parameter: "k",
        observed_parameter_value: 3,
        observed_value: 1764,
        provenance_hash: "8999c203856cc171821fd59adc0a42db40a667d5acd7b39b37278accf9ea8045",
        executable: true,
        compiler_kind: "ZP_POWER_FAMILY",
        imported_at: "2026-10-02T21:52:47.016388+00:00"
      }
    }
  };
}

function admittedMaterial(tick = 200) {
  const packet = adaptBrotoculateurStatus(statusFixture());
  const item = packet.ITEMS.find(value => value.KIND === "FORMULA_CAPSULE");
  assert.ok(item);
  const crystal = crystallizeMathInputItem(packet, item.ITEM_ID);

  const request = {
    SCHEMA: "BRUTUS-MATH-MATERIAL-ADMISSION-REQUEST-v0.1",
    VERSION: "0.1",
    REQUEST_ID: "MMA-MOVE-0001",
    ANT_ID: "ANT-000000000001",
    TICK: tick,
    CLOCK_AUTHORITY: "QUEEN_SERVER_V0_2",
    PARENT_CRYSTAL_ID: crystal.CRYSTAL_ID,
    PARENT_CRYSTAL_H256: crystal.CRYSTAL_H256,
    PURPOSE: "FOURMI_TRANSPORT_ADMISSION",
    AUTHORIZATION: {
      POLICY: "BRUTUS-MATH-MATERIAL-ADMISSION-v0.1",
      DECISION: "APPROVED",
      APPROVER: "BRUTUS_CONTROL_PLANE"
    },
    TRACE_ID: "TRACE-MATH-MOVE-ADMISSION",
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

function antBirthReceipt(antId = "ANT-000000000001") {
  const receipt = readJson("../fixtures/ants/ant-birth-receipt.json");
  receipt.ant_id = antId;
  receipt.project_soul.memory_id = "MEM-MATH-CARRIER-0001";
  receipt.project_soul.lineage = [antId];
  return receipt;
}

function carrierObservation(material, tick = material.CREATED_AT_TICK + 1) {
  const obs = {
    SCHEMA: "BRUTUS-MATH-MATERIAL-CARRIER-OBSERVATION-v0.1",
    VERSION: "0.1",
    OBSERVATION_ID: `MMCO-T${tick}-MATH-CARRIER-0001`,
    TICK: tick,
    CLOCK_AUTHORITY: "QUEEN_SERVER_V0_2",
    MATERIAL_ID: material.MATERIAL_ID,
    MATERIAL_H256: material.MATERIAL_H256,
    ANT_ID: material.CARRIER.ANT_ID,
    BINDING_STATE: "ATTACHED",
    SOURCE: {
      SOURCE_SCHEMA: "BRUTUS-RUNTIME-MATERIAL-CARRIER-v0.1",
      SOURCE_ENDPOINT: "/runtime/material-carrier",
      OBSERVED_AT_UTC: "2026-10-02T22:30:00.000Z",
      INTEGRITY_MATCH: true
    },
    TRACE_ID: "TRACE-MATH-CARRIER-ATTACHED",
    PROOF_REF: null,
    SIGNATURE_METHOD: "BRUTUS-CANONICAL-JSON-SHA256-v0.1",
    SIGNATURE_H256: "0".repeat(64),
    EXECUTABLE: false,
    PROOF_CLAIM: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "UNDECIDED"
  };
  obs.SIGNATURE_H256 = computeMathMaterialCarrierObservationH256(obs);
  return obs;
}

function antMoveEvent({
  antId = "ANT-000000000001",
  tick = 202,
  from = "W:START",
  to = "W:GENESIS-A",
  type = "ANT_MOVE"
} = {}) {
  const event = {
    SCHEMA: "BRUTUS-REAL-MECHANISM-EVENT-v0.1",
    VERSION: "0.1",
    EVENT_ID: `RME-T${tick}-ANT-MOVE-MATH-0001`,
    EVENT_CLASS: "RUNTIME_OBSERVATION",
    EVENT_TYPE: type,
    TICK: tick,
    CLOCK_AUTHORITY: "QUEEN_SERVER_V0_2",
    SOURCE: {
      OBSERVATION_ID: "OBS-LIVE-ANT-MOVE-0001",
      SOURCE_SCHEMA: "BRUTUS-RUNTIME-SOURCE-v0.1",
      SOURCE_ENDPOINT: "/runtime/events",
      OBSERVED_AT_UTC: "2026-10-02T22:30:01.000Z",
      INTEGRITY_MATCH: true
    },
    SUBJECT: type === "ANT_MOVE"
      ? { TYPE: "ANT", ID: antId }
      : { TYPE: "CRYSTAL", ID: "C:CRYSTAL-0001" },
    PAYLOAD: { FROM: from, TO: to },
    TRACE_ID: "TRACE-FMIN-MATH-MOTION-T202",
    PROOF_REF: null,
    SIGNATURE_METHOD: "BRUTUS-CANONICAL-JSON-SHA256-v0.1",
    SIGNATURE_H256: "",
    EXECUTABLE: false,
    PROOF_CLAIM: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "UNDECIDED"
  };
  event.SIGNATURE_H256 = computeRealMechanismEventSignature(event);
  return event;
}

test("validated attachment plus validated ANT_MOVE creates material move receipt", () => {
  const material = admittedMaterial(200);
  const attachment = carrierObservation(material, 201);
  const move = antMoveEvent({ tick: 202 });

  const result = bindFourmiMathMaterialMove({
    material,
    antBirthReceipt: antBirthReceipt(),
    carrierObservation: attachment,
    antMoveEvent: move
  });

  assert.equal(result.SCHEMA, "BRUTUS-FOURMI-MATH-MATERIAL-MOVE-v0.1");
  assert.equal(result.EVENT_TYPE, "MATERIAL_MOVE");
  assert.equal(result.TICK, 202);
  assert.equal(result.MOVEMENT.FROM, "W:START");
  assert.equal(result.MOVEMENT.TO, "W:GENESIS-A");
  assert.equal(result.MOVEMENT.ANT_MOVED, true);
  assert.equal(result.MOVEMENT.MATERIAL_BOUND_AT_MOVE, true);
  assert.equal(result.MOVEMENT.MATERIAL_MOVEMENT_VERIFIED, true);
  assert.equal(result.CARRIER.RUNTIME_VERIFIED, true);
});

test("movement receipt never mutates admitted material or parent crystal", () => {
  const material = admittedMaterial(200);
  const before = JSON.stringify(material);

  const result = bindFourmiMathMaterialMove({
    material,
    antBirthReceipt: antBirthReceipt(),
    carrierObservation: carrierObservation(material, 201),
    antMoveEvent: antMoveEvent({ tick: 202 })
  });

  assert.equal(JSON.stringify(material), before);
  assert.equal(material.TRANSPORT_STATE, "ADMITTED_NOT_MOVED");
  assert.equal(material.MOVEMENT_PERFORMED, false);
  assert.equal(result.MATERIAL_MUTATED, false);
  assert.equal(result.PARENT_CRYSTAL_MUTATED, false);
});

test("carrier observation requires ATTACHED state", () => {
  const material = admittedMaterial(200);
  const obs = carrierObservation(material, 201);
  obs.BINDING_STATE = "DETACHED";
  obs.SIGNATURE_H256 = computeMathMaterialCarrierObservationH256(obs);

  assert.throws(
    () => validateMathMaterialCarrierObservation(obs),
    /BINDING_STATE must be ATTACHED/
  );
});

test("live ant identity must match material carrier", () => {
  const material = admittedMaterial(200);

  assert.throws(
    () => bindFourmiMathMaterialMove({
      material,
      antBirthReceipt: antBirthReceipt("ANT-0123456789AB"),
      carrierObservation: carrierObservation(material, 201),
      antMoveEvent: antMoveEvent({ tick: 202 })
    }),
    /live ant identity does not match material carrier/
  );
});

test("carrier observation must name exact material", () => {
  const material = admittedMaterial(200);
  const obs = carrierObservation(material, 201);
  obs.MATERIAL_ID = "MAT-MATH-AAAAAAAAAAAAAAAAAAAAAAAA";
  obs.SIGNATURE_H256 = computeMathMaterialCarrierObservationH256(obs);

  assert.throws(
    () => bindFourmiMathMaterialMove({
      material,
      antBirthReceipt: antBirthReceipt(),
      carrierObservation: obs,
      antMoveEvent: antMoveEvent({ tick: 202 })
    }),
    /carrier observation material ID mismatch/
  );
});

test("carrier observation must pin exact material hash", () => {
  const material = admittedMaterial(200);
  const obs = carrierObservation(material, 201);
  obs.MATERIAL_H256 = "a".repeat(64);
  obs.SIGNATURE_H256 = computeMathMaterialCarrierObservationH256(obs);

  assert.throws(
    () => bindFourmiMathMaterialMove({
      material,
      antBirthReceipt: antBirthReceipt(),
      carrierObservation: obs,
      antMoveEvent: antMoveEvent({ tick: 202 })
    }),
    /carrier observation material hash mismatch/
  );
});

test("attachment observation cannot predate material admission", () => {
  const material = admittedMaterial(200);

  assert.throws(
    () => bindFourmiMathMaterialMove({
      material,
      antBirthReceipt: antBirthReceipt(),
      carrierObservation: carrierObservation(material, 199),
      antMoveEvent: antMoveEvent({ tick: 202 })
    }),
    /carrier observation cannot precede material admission/
  );
});

test("event must be a real ANT_MOVE, not another mechanism family", () => {
  const material = admittedMaterial(200);

  assert.throws(
    () => bindFourmiMathMaterialMove({
      material,
      antBirthReceipt: antBirthReceipt(),
      carrierObservation: carrierObservation(material, 201),
      antMoveEvent: antMoveEvent({ tick: 202, type: "CRYSTAL_MOVE" })
    }),
    /real mechanism event must be ANT_MOVE/
  );
});

test("ANT_MOVE subject must match live carrier", () => {
  const material = admittedMaterial(200);

  assert.throws(
    () => bindFourmiMathMaterialMove({
      material,
      antBirthReceipt: antBirthReceipt(),
      carrierObservation: carrierObservation(material, 201),
      antMoveEvent: antMoveEvent({
        tick: 202,
        antId: "ANT-0123456789AB"
      })
    }),
    /ANT_MOVE subject does not match live carrier/
  );
});

test("ANT_MOVE cannot predate attachment observation", () => {
  const material = admittedMaterial(200);

  assert.throws(
    () => bindFourmiMathMaterialMove({
      material,
      antBirthReceipt: antBirthReceipt(),
      carrierObservation: carrierObservation(material, 202),
      antMoveEvent: antMoveEvent({ tick: 201 })
    }),
    /ANT_MOVE cannot precede carrier attachment observation/
  );
});

test("ANT_MOVE source integrity mismatch fails before material move", () => {
  const material = admittedMaterial(200);
  const move = antMoveEvent({ tick: 202 });
  move.SOURCE.INTEGRITY_MATCH = false;
  move.SIGNATURE_H256 = computeRealMechanismEventSignature(move);

  assert.throws(
    () => bindFourmiMathMaterialMove({
      material,
      antBirthReceipt: antBirthReceipt(),
      carrierObservation: carrierObservation(material, 201),
      antMoveEvent: move
    }),
    /SOURCE.INTEGRITY_MATCH must be true/
  );
});

test("same evidence creates deterministic move receipt", () => {
  const material = admittedMaterial(200);
  const args = {
    material,
    antBirthReceipt: antBirthReceipt(),
    carrierObservation: carrierObservation(material, 201),
    antMoveEvent: antMoveEvent({ tick: 202 })
  };

  const a = bindFourmiMathMaterialMove(args);
  const b = bindFourmiMathMaterialMove(args);

  assert.equal(a.MOVE_ID, b.MOVE_ID);
  assert.equal(a.MOVE_H256, b.MOVE_H256);
  assert.deepEqual(a, b);
});

test("independent move validator detects endpoint tampering", () => {
  const material = admittedMaterial(200);
  const result = structuredClone(bindFourmiMathMaterialMove({
    material,
    antBirthReceipt: antBirthReceipt(),
    carrierObservation: carrierObservation(material, 201),
    antMoveEvent: antMoveEvent({ tick: 202 })
  }));

  result.MOVEMENT.TO = "W:GENESIS-B";

  assert.throws(
    () => validateFourmiMathMaterialMove(result),
    /movement endpoints must exactly match ANT_MOVE|MOVE_H256 mismatch/
  );
});

test("movement verification does not create mathematical proof authority", () => {
  const material = admittedMaterial(200);
  const result = bindFourmiMathMaterialMove({
    material,
    antBirthReceipt: antBirthReceipt(),
    carrierObservation: carrierObservation(material, 201),
    antMoveEvent: antMoveEvent({ tick: 202 })
  });

  assert.equal(result.BRUTUS_TRUTH_STATUS, "UNVERIFIED_BY_BRUTUS");
  assert.equal(result.PROOF_REF, null);
  assert.equal(result.PROOF_CREATED, false);
  assert.equal(result.PROOF_CLAIM, false);
  assert.equal(result.GATE_AUTHORITY, false);
  assert.equal(result.EXECUTABLE, false);
});

test("movement does not authorize wheel ingress, machine execution or routing", () => {
  const material = admittedMaterial(200);
  const result = bindFourmiMathMaterialMove({
    material,
    antBirthReceipt: antBirthReceipt(),
    carrierObservation: carrierObservation(material, 201),
    antMoveEvent: antMoveEvent({ tick: 202 })
  });

  assert.equal(result.TRANSPORT_AUTHORIZATION, true);
  assert.equal(result.WHEEL_INGRESS_AUTHORIZATION, false);
  assert.equal(result.MACHINE_EXECUTION_AUTHORIZATION, false);
  assert.equal(result.ROUTING_AUTHORIZATION, "UNDECIDED");
});

test("movement receipt is deeply immutable", () => {
  const material = admittedMaterial(200);
  const result = bindFourmiMathMaterialMove({
    material,
    antBirthReceipt: antBirthReceipt(),
    carrierObservation: carrierObservation(material, 201),
    antMoveEvent: antMoveEvent({ tick: 202 })
  });

  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.MOVEMENT), true);
  assert.equal(Object.isFrozen(result.CARRIER), true);
  assert.equal(Object.isFrozen(result.MATERIAL_REF), true);
});

test("move binding core contains no network timers random or process execution", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/fourmi-math-material-move.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /fetch\s*\(|WebSocket|XMLHttpRequest/);
  assert.doesNotMatch(source, /setInterval|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /node:child_process|process\.exec/);
});
