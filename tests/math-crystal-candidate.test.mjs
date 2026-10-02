import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createMathInputPacket
} from "../src/math-input-bus.mjs";
import {
  adaptBrotoculateurStatus
} from "../src/brotoculateur-input-adapter.mjs";
import {
  crystallizeMathInputItem,
  validateMathCrystalCandidate,
  verifyMathCrystalAgainstPacket
} from "../src/math-crystal-candidate.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function statusFixture() {
  return {
    run_id: "run-20261002T194025-561792Z-continuity",
    state: "RUNNING",
    round_index: 61,
    formula_ids: ["DOUBLE", "PLUS1", "ZEL_F1_8999c20385"],
    brutaux_symbolic: {
      seven_fields: [
        "INPUT",
        "OUTPUT",
        "FORMULE",
        "PARENT",
        "BRANCHE",
        "RONDE",
        "TRACE"
      ],
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
      sample_bindings: [
        "A=1, B=2",
        "A=2, B=4",
        "A=3, B=6"
      ],
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

function packetFixture(options = {}) {
  return adaptBrotoculateurStatus(statusFixture(), options);
}

function itemByKind(packet, kind) {
  const item = packet.ITEMS.find(value => value.KIND === kind);
  assert.ok(item, "expected item kind " + kind);
  return item;
}

test("canonical formula observation becomes immutable math crystal candidate", () => {
  const packet = packetFixture();
  const item = itemByKind(packet, "FORMULA_OBSERVATION");

  const crystal = crystallizeMathInputItem(packet, item.ITEM_ID);

  assert.equal(crystal.SCHEMA, "BRUTUS-MATH-CRYSTAL-CANDIDATE-v0.1");
  assert.equal(crystal.MATERIAL_CLASS, "MATH_CRYSTAL_CANDIDATE");
  assert.equal(crystal.STATE, "CANDIDATE");
  assert.equal(crystal.BRUTUS_EVIDENCE_CLASS, "CANDIDAT");
  assert.equal(crystal.BRUTUS_TRUTH_STATUS, "UNVERIFIED_BY_BRUTUS");
  assert.equal(crystal.CONTENT.EXPRESSION, "(2*A<INPUT>)=B<OUTPUT>");
  assert.deepEqual(crystal.CONTENT.BINDINGS, ["A=1, B=2", "A=2, B=4", "A=3, B=6"]);
  assert.equal(crystal.PROOF_REF, null);
  assert.equal(crystal.IMMUTABLE, true);
  assert.equal(Object.isFrozen(crystal), true);
  assert.equal(Object.isFrozen(crystal.CONTENT), true);
});

test("SOURCE_PASS ZEL capsule remains unverified by Brutus", () => {
  const packet = packetFixture();
  const item = itemByKind(packet, "FORMULA_CAPSULE");

  const crystal = crystallizeMathInputItem(packet, item.ITEM_ID);

  assert.equal(crystal.CONTENT.EXPRESSION, "z_P(21^k)=4*21^(k-1)");
  assert.equal(crystal.CONTENT.SOURCE_STATUS, "SOURCE_PASS");
  assert.equal(crystal.CONTENT.EVIDENCE.TEST_COUNT, 18);
  assert.equal(crystal.CONTENT.EVIDENCE.REPLAY_STATUS, "EXACT_WITNESS_REPLAY");
  assert.equal(crystal.CONTENT.PROVENANCE.executable_at_source, true);
  assert.equal(crystal.BRUTUS_TRUTH_STATUS, "UNVERIFIED_BY_BRUTUS");
  assert.equal(crystal.PROOF_REF, null);
  assert.equal(crystal.EXECUTABLE, false);
  assert.equal(crystal.AUTO_PROOF_PROMOTION, false);
});

test("source proof reference is preserved as source evidence but never promoted", () => {
  const packet = createMathInputPacket({
    packetId: "MIP-PROOF-SOURCE-0001",
    source: {
      SYSTEM: "EXTERNAL_MATH_ENGINE",
      ADAPTER: "EXTERNAL_MATH_ADAPTER",
      ADAPTER_VERSION: "0.1",
      SOURCE_RUN_ID: "run-proof-source-0001",
      SOURCE_ENDPOINT: "/export",
      ACCESS_MODE: "READ_ONLY",
      SOURCE_STATE: "READY"
    },
    sourceSnapshot: {
      formula: "A^2=B",
      proof_ref: "external-proof-42"
    },
    summary: {
      CANONICAL_FORMULAS: 1,
      AUTHENTICATED_FORMULAS: 1,
      TESTING_FORMULAS: 0,
      REJECTED_FORMULAS: 0,
      CANDIDATE_FORMULAS: 0,
      TRACES_TOTAL: 1,
      PROOFS_TOTAL: 1,
      PROOFS_VALID: 1,
      PROOFS_INVALID: 0,
      RECONSTRUCTED_SUPPORTS: 1,
      FAILED_SUPPORTS: 0,
      TRACKER_SOURCES: 1,
      RECYCLE_EMITTED: 0
    },
    items: [{
      ITEM_ID: "EXT-ITEM-0001",
      KIND: "FORMULA_OBSERVATION",
      EXPRESSION: "A^2=B",
      SOURCE_STATUS: "SOURCE_AUTHENTICATED",
      BINDINGS: ["A=3, B=9"],
      EVIDENCE: {
        SOURCE_TRACE_REF: "trace-42",
        SOURCE_PROOF_REF: "external-proof-42",
        SOURCE_HASH_REF: "source-hash-42",
        SUPPORT_COUNT: 1,
        TEST_COUNT: 1,
        REPLAY_STATUS: "SOURCE_PASS"
      },
      PROVENANCE: {
        engine: "external"
      }
    }]
  });

  const crystal = crystallizeMathInputItem(packet, "EXT-ITEM-0001");

  assert.equal(crystal.CONTENT.EVIDENCE.SOURCE_PROOF_REF, "external-proof-42");
  assert.equal(crystal.PROOF_REF, null);
  assert.equal(crystal.BRUTUS_TRUTH_STATUS, "UNVERIFIED_BY_BRUTUS");
});

test("same packet item creates deterministic crystal identity and hash", () => {
  const packet = packetFixture();
  const item = itemByKind(packet, "FORMULA_CAPSULE");

  const a = crystallizeMathInputItem(packet, item.ITEM_ID);
  const b = crystallizeMathInputItem(packet, item.ITEM_ID);

  assert.equal(a.CRYSTAL_ID, b.CRYSTAL_ID);
  assert.equal(a.CONTENT_H256, b.CONTENT_H256);
  assert.equal(a.CRYSTAL_H256, b.CRYSTAL_H256);
  assert.deepEqual(a, b);
});

test("different source items create different math crystals", () => {
  const packet = packetFixture();
  const observation = itemByKind(packet, "FORMULA_OBSERVATION");
  const capsule = itemByKind(packet, "FORMULA_CAPSULE");

  const a = crystallizeMathInputItem(packet, observation.ITEM_ID);
  const b = crystallizeMathInputItem(packet, capsule.ITEM_ID);

  assert.notEqual(a.CRYSTAL_ID, b.CRYSTAL_ID);
  assert.notEqual(a.CONTENT_H256, b.CONTENT_H256);
  assert.notEqual(a.CRYSTAL_H256, b.CRYSTAL_H256);
});

test("unknown source item cannot be crystallized", () => {
  const packet = packetFixture();

  assert.throws(
    () => crystallizeMathInputItem(packet, "ITEM-DOES-NOT-EXIST"),
    /ITEM_ID not found/
  );
});

test("tampered input packet fails before crystallization", () => {
  const packet = structuredClone(packetFixture());
  const itemId = packet.ITEMS[0].ITEM_ID;
  packet.ITEMS[0].EXPRESSION = "FORGED";

  assert.throws(
    () => crystallizeMathInputItem(packet, itemId),
    /PACKET_H256 mismatch/
  );
});

test("tampered crystal expression fails independent validation", () => {
  const packet = packetFixture();
  const item = itemByKind(packet, "FORMULA_OBSERVATION");
  const crystal = structuredClone(crystallizeMathInputItem(packet, item.ITEM_ID));

  crystal.CONTENT.EXPRESSION = "FORGED";

  assert.throws(
    () => validateMathCrystalCandidate(crystal),
    /EXPRESSION_H256 mismatch|CONTENT_H256 mismatch|CRYSTAL_H256 mismatch/
  );
});

test("crystal ancestry verification passes against exact packet", () => {
  const packet = packetFixture();
  const item = itemByKind(packet, "FORMULA_CAPSULE");
  const crystal = crystallizeMathInputItem(packet, item.ITEM_ID);

  const result = verifyMathCrystalAgainstPacket(crystal, packet);

  assert.equal(result.VERDICT, "PASS");
  assert.equal(result.CONTENT_MATCH, true);
  assert.equal(result.PACKET_MATCH, true);
  assert.equal(result.ITEM_MATCH, true);
  assert.equal(result.CLOCK_MATCH, true);
  assert.equal(result.PROOF_CREATED, false);
  assert.equal(result.PROOF_REF, null);
});

test("crystal ancestry fails against evolved source packet", () => {
  const first = packetFixture();
  const item = itemByKind(first, "FORMULA_OBSERVATION");
  const crystal = crystallizeMathInputItem(first, item.ITEM_ID);

  const evolvedStatus = statusFixture();
  evolvedStatus.brutaux_symbolic.traces_total += 1;
  evolvedStatus.brutaux_symbolic.proofs_total += 1;
  evolvedStatus.brutaux_symbolic.proofs_valid += 1;
  evolvedStatus.brutaux_symbolic.reconstructed_supports += 1;
  const evolved = adaptBrotoculateurStatus(evolvedStatus);

  assert.throws(
    () => verifyMathCrystalAgainstPacket(crystal, evolved),
    /packet ID ancestry mismatch|packet hash ancestry mismatch|source snapshot ancestry mismatch/
  );
});

test("unbound math packet creates crystal with no invented Queen time", () => {
  const packet = packetFixture();
  const item = itemByKind(packet, "FORMULA_OBSERVATION");
  const crystal = crystallizeMathInputItem(packet, item.ITEM_ID);

  assert.equal(crystal.CRYSTALLIZATION.BOUND_TO_QUEEN, false);
  assert.equal(crystal.CRYSTALLIZATION.QUEEN_TICK, null);
  assert.equal(crystal.CRYSTALLIZATION.CLOCK_AUTHORITY, null);
});

test("Queen-bound packet preserves exact authoritative tick in crystal", () => {
  const packet = packetFixture({ queenTick: 188574293 });
  const item = itemByKind(packet, "FORMULA_CAPSULE");
  const crystal = crystallizeMathInputItem(packet, item.ITEM_ID);

  assert.equal(crystal.CRYSTALLIZATION.BOUND_TO_QUEEN, true);
  assert.equal(crystal.CRYSTALLIZATION.QUEEN_TICK, 188574293);
  assert.equal(crystal.CRYSTALLIZATION.CLOCK_AUTHORITY, "QUEEN_SERVER_V0_2");
  assert.equal(crystal.CRYSTALLIZATION.SOURCE_PACKET_BOUND_TO_QUEEN, true);
});

test("math crystal has no routing gate transport or execution authority", () => {
  const packet = packetFixture();
  const item = itemByKind(packet, "FORMULA_CAPSULE");
  const crystal = crystallizeMathInputItem(packet, item.ITEM_ID);

  assert.equal(crystal.EXECUTABLE, false);
  assert.equal(crystal.AUTO_PROOF_PROMOTION, false);
  assert.equal(crystal.GATE_AUTHORITY, false);
  assert.equal(crystal.ROUTING_AUTHORIZATION, "UNDECIDED");
  assert.equal(crystal.TRANSPORT_AUTHORIZATION, false);
});

test("math crystal core has no network timers random or process execution", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/math-crystal-candidate.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /fetch\s*\(|WebSocket|XMLHttpRequest/);
  assert.doesNotMatch(source, /setInterval|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /node:child_process|process\.exec/);
});
