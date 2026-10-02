import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { adaptBrotoculateurStatus } from "../src/brotoculateur-input-adapter.mjs";
import { crystallizeMathInputItem } from "../src/math-crystal-candidate.mjs";
import {
  admitMathCrystalToFourmi,
  computeMathMaterialAdmissionRequestH256,
  validateFourmiMathMaterial,
  validateMathMaterialAdmissionRequest
} from "../src/fourmi-math-material-admission.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

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

function packetAndCrystal({ queenTick = null, kind = "FORMULA_CAPSULE" } = {}) {
  const packet = adaptBrotoculateurStatus(statusFixture(), { queenTick });
  const item = packet.ITEMS.find(value => value.KIND === kind);
  assert.ok(item);
  const crystal = crystallizeMathInputItem(packet, item.ITEM_ID);
  return { packet, crystal, item };
}

function requestFor(crystal, tick = 200000000) {
  const request = {
    SCHEMA: "BRUTUS-MATH-MATERIAL-ADMISSION-REQUEST-v0.1",
    VERSION: "0.1",
    REQUEST_ID: "MMA-MATH-0001",
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
    TRACE_ID: "TRACE-MATH-MATERIAL-0001",
    PROOF_REF: null,
    SIGNATURE_METHOD: "BRUTUS-CANONICAL-JSON-SHA256-v0.1",
    SIGNATURE_H256: "0".repeat(64),
    EXECUTABLE: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "UNDECIDED",
    WHEEL_INGRESS_AUTHORIZATION: false
  };
  request.SIGNATURE_H256 = computeMathMaterialAdmissionRequestH256(request);
  return request;
}

test("approved math crystal becomes Fourmi transport material without moving", () => {
  const { packet, crystal } = packetAndCrystal();
  const request = requestFor(crystal);
  const material = admitMathCrystalToFourmi({ crystal, packet, request });

  assert.equal(material.SCHEMA, "BRUTUS-FOURMI-MATH-MATERIAL-v0.1");
  assert.equal(material.MATERIAL_CLASS, "FOURMI_MATH_MATERIAL");
  assert.equal(material.MATERIAL_INTENT, "TRANSPORT");
  assert.equal(material.TRANSPORT_AUTHORIZATION, true);
  assert.equal(material.TRANSPORT_STATE, "ADMITTED_NOT_MOVED");
  assert.equal(material.MOVEMENT_PERFORMED, false);
  assert.equal(material.WHEEL_INGRESS_AUTHORIZATION, false);
  assert.equal(material.MACHINE_EXECUTION_AUTHORIZATION, false);
  assert.equal(material.ROUTING_AUTHORIZATION, "UNDECIDED");
});

test("parent math crystal remains immutable and non-transport-authorized", () => {
  const { packet, crystal } = packetAndCrystal();
  const before = JSON.stringify(crystal);
  const request = requestFor(crystal);

  const material = admitMathCrystalToFourmi({ crystal, packet, request });

  assert.equal(crystal.TRANSPORT_AUTHORIZATION, false);
  assert.equal(JSON.stringify(crystal), before);
  assert.equal(material.PARENT_MUTATED, false);
  assert.equal(material.PARENT_DELETED, false);
});

test("SOURCE_PASS and upstream executability remain provenance, never Brutus proof/execution", () => {
  const { packet, crystal } = packetAndCrystal();
  const material = admitMathCrystalToFourmi({
    crystal,
    packet,
    request: requestFor(crystal)
  });

  assert.equal(material.CONTENT.SOURCE_STATUS, "SOURCE_PASS");
  assert.equal(material.CONTENT.PROVENANCE.executable_at_source, true);
  assert.equal(material.BRUTUS_TRUTH_STATUS, "UNVERIFIED_BY_BRUTUS");
  assert.equal(material.PROOF_REF, null);
  assert.equal(material.EXECUTABLE, false);
  assert.equal(material.AUTO_PROOF_PROMOTION, false);
});

test("unbound source crystal stays historically unbound while admission gets authoritative Queen tick", () => {
  const { packet, crystal } = packetAndCrystal({ queenTick: null });
  const request = requestFor(crystal, 200000001);
  const material = admitMathCrystalToFourmi({ crystal, packet, request });

  assert.equal(material.CREATED_AT_TICK, 200000001);
  assert.equal(material.CLOCK_AUTHORITY, "QUEEN_SERVER_V0_2");
  assert.equal(material.SOURCE_CRYSTALLIZATION.BOUND_TO_QUEEN, false);
  assert.equal(material.SOURCE_CRYSTALLIZATION.QUEEN_TICK, null);
  assert.equal(material.SOURCE_CRYSTALLIZATION.CLOCK_AUTHORITY, null);
});

test("admission cannot precede an already Queen-bound crystal", () => {
  const { packet, crystal } = packetAndCrystal({ queenTick: 188574293 });
  const request = requestFor(crystal, 188574292);

  assert.throws(
    () => admitMathCrystalToFourmi({ crystal, packet, request }),
    /cannot precede source crystal Queen tick/
  );
});

test("denied Control Plane request cannot admit material", () => {
  const { packet, crystal } = packetAndCrystal();
  const request = requestFor(crystal);
  request.AUTHORIZATION.DECISION = "DENIED";
  request.SIGNATURE_H256 = computeMathMaterialAdmissionRequestH256(request);

  assert.throws(
    () => validateMathMaterialAdmissionRequest(request),
    /DECISION must be APPROVED/
  );
  assert.throws(
    () => admitMathCrystalToFourmi({ crystal, packet, request }),
    /DECISION must be APPROVED/
  );
});

test("request bound to another parent crystal is rejected", () => {
  const { packet, crystal } = packetAndCrystal();
  const request = requestFor(crystal);
  request.PARENT_CRYSTAL_ID = "MATH-CRYSTAL-AAAAAAAAAAAAAAAAAAAAAAAA";
  request.SIGNATURE_H256 = computeMathMaterialAdmissionRequestH256(request);

  assert.throws(
    () => admitMathCrystalToFourmi({ crystal, packet, request }),
    /parent crystal ID mismatch/
  );
});

test("request with forged parent crystal hash is rejected", () => {
  const { packet, crystal } = packetAndCrystal();
  const request = requestFor(crystal);
  request.PARENT_CRYSTAL_H256 = "a".repeat(64);
  request.SIGNATURE_H256 = computeMathMaterialAdmissionRequestH256(request);

  assert.throws(
    () => admitMathCrystalToFourmi({ crystal, packet, request }),
    /parent crystal hash mismatch/
  );
});

test("crystal must still match the exact packet before admission", () => {
  const { crystal } = packetAndCrystal();
  const evolvedStatus = statusFixture();
  evolvedStatus.brutaux_symbolic.traces_total += 1;
  evolvedStatus.brutaux_symbolic.proofs_total += 1;
  evolvedStatus.brutaux_symbolic.proofs_valid += 1;
  evolvedStatus.brutaux_symbolic.reconstructed_supports += 1;
  const evolvedPacket = adaptBrotoculateurStatus(evolvedStatus);
  const request = requestFor(crystal);

  assert.throws(
    () => admitMathCrystalToFourmi({
      crystal,
      packet: evolvedPacket,
      request
    }),
    /packet ID ancestry mismatch|packet hash ancestry mismatch|source snapshot ancestry mismatch/
  );
});

test("same crystal packet request produces deterministic material", () => {
  const { packet, crystal } = packetAndCrystal();
  const request = requestFor(crystal);

  const a = admitMathCrystalToFourmi({ crystal, packet, request });
  const b = admitMathCrystalToFourmi({ crystal, packet, request });

  assert.equal(a.MATERIAL_ID, b.MATERIAL_ID);
  assert.equal(a.MATERIAL_H256, b.MATERIAL_H256);
  assert.deepEqual(a, b);
});

test("material preserves exact math pedigree and content hashes", () => {
  const { packet, crystal } = packetAndCrystal();
  const material = admitMathCrystalToFourmi({
    crystal,
    packet,
    request: requestFor(crystal)
  });

  assert.equal(material.PEDIGREE.PARENT_CRYSTAL_ID, crystal.CRYSTAL_ID);
  assert.equal(material.PEDIGREE.PARENT_CRYSTAL_H256, crystal.CRYSTAL_H256);
  assert.equal(material.PEDIGREE.PACKET_ID, crystal.PEDIGREE.PACKET_ID);
  assert.equal(material.PEDIGREE.PACKET_H256, crystal.PEDIGREE.PACKET_H256);
  assert.equal(material.PEDIGREE.SOURCE_ITEM_H256, crystal.PEDIGREE.SOURCE_ITEM_H256);
  assert.equal(material.PEDIGREE.CONTENT_H256, crystal.CONTENT_H256);
  assert.equal(material.PEDIGREE.EXPRESSION_H256, crystal.CONTENT.EXPRESSION_H256);
  assert.deepEqual(material.CONTENT, crystal.CONTENT);
});

test("independent material validator detects content tampering", () => {
  const { packet, crystal } = packetAndCrystal();
  const material = structuredClone(
    admitMathCrystalToFourmi({
      crystal,
      packet,
      request: requestFor(crystal)
    })
  );

  material.CONTENT.EXPRESSION = "FORGED";

  assert.throws(
    () => validateFourmiMathMaterial(material),
    /EXPRESSION_H256 mismatch|CONTENT_H256 mismatch|MATERIAL_H256 mismatch/
  );
});

test("carrier binding is declared by Control Plane but not runtime-verified", () => {
  const { packet, crystal } = packetAndCrystal();
  const material = admitMathCrystalToFourmi({
    crystal,
    packet,
    request: requestFor(crystal)
  });

  assert.equal(material.CARRIER.ANT_ID, "ANT-000000000001");
  assert.equal(material.CARRIER.BINDING_STATUS, "CONTROL_PLANE_DECLARED");
  assert.equal(material.CARRIER.RUNTIME_VERIFIED, false);
  assert.equal(material.MOVEMENT_PERFORMED, false);
});

test("admission output is deeply immutable", () => {
  const { packet, crystal } = packetAndCrystal();
  const material = admitMathCrystalToFourmi({
    crystal,
    packet,
    request: requestFor(crystal)
  });

  assert.equal(Object.isFrozen(material), true);
  assert.equal(Object.isFrozen(material.CONTENT), true);
  assert.equal(Object.isFrozen(material.PEDIGREE), true);
  assert.equal(Object.isFrozen(material.CARRIER), true);
});

test("math material admission core has no network timers random or process execution", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/fourmi-math-material-admission.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /fetch\s*\(|WebSocket|XMLHttpRequest/);
  assert.doesNotMatch(source, /setInterval|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /node:child_process|process\.exec/);
});
