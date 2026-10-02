import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createMathInputPacket,
  validateMathInputPacket
} from "../src/math-input-bus.mjs";
import {
  adaptBrotoculateurStatus
} from "../src/brotoculateur-input-adapter.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function statusFixture() {
  return {
    run_id: "run-20261002T194025-561792Z-continuity",
    state: "RUNNING",
    round_index: 61,
    formula_ids: [
      "DOUBLE",
      "PLUS1",
      "ZEL_F1_8999c20385"
    ],
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
      traces_total: 376988,
      proofs_total: 376988,
      proofs_valid: 376988,
      proofs_invalid: 0,
      reconstructed_supports: 363925,
      failed_supports: 0,
      tracker_sources: 258347,
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

test("Brotoculateur status becomes a read-only math input packet", () => {
  const packet = adaptBrotoculateurStatus(statusFixture());

  assert.equal(packet.SCHEMA, "BRUTUS-MATH-INPUT-PACKET-v0.1");
  assert.equal(packet.SOURCE.SYSTEM, "BROTOCULATEUR");
  assert.equal(packet.SOURCE.ACCESS_MODE, "READ_ONLY");
  assert.equal(packet.SOURCE.SOURCE_ENDPOINT, "/api/status");
  assert.equal(packet.SUMMARY.CANONICAL_FORMULAS, 34);
  assert.equal(packet.SUMMARY.AUTHENTICATED_FORMULAS, 26);
  assert.equal(packet.SUMMARY.PROOFS_VALID, 376988);
  assert.equal(packet.PROOF_REF, null);
  assert.equal(packet.EXECUTABLE, false);
  assert.equal(packet.AUTO_PROOF_PROMOTION, false);
  assert.equal(packet.ROUTING_AUTHORIZATION, "UNDECIDED");
});

test("local external input does not invent Queen time", () => {
  const packet = adaptBrotoculateurStatus(statusFixture());

  assert.equal(packet.INGESTION.BOUND_TO_QUEEN, false);
  assert.equal(packet.INGESTION.QUEEN_TICK, null);
  assert.equal(packet.INGESTION.CLOCK_AUTHORITY, null);
});

test("explicit Queen tick can bind ingestion without changing source claims", () => {
  const packet = adaptBrotoculateurStatus(statusFixture(), { queenTick: 123456 });

  assert.equal(packet.INGESTION.BOUND_TO_QUEEN, true);
  assert.equal(packet.INGESTION.QUEEN_TICK, 123456);
  assert.equal(packet.INGESTION.CLOCK_AUTHORITY, "QUEEN_SERVER_V0_2");
  assert.equal(packet.SOURCE.ACCESS_MODE, "READ_ONLY");
});

test("sample formula remains an observation, not falsely authenticated item evidence", () => {
  const packet = adaptBrotoculateurStatus(statusFixture());
  const item = packet.ITEMS.find(value => value.KIND === "FORMULA_OBSERVATION");

  assert.ok(item);
  assert.equal(item.EXPRESSION, "(2*A<INPUT>)=B<OUTPUT>");
  assert.equal(item.SOURCE_STATUS, "OBSERVED_CANONICAL_SAMPLE");
  assert.equal(item.EVIDENCE.SOURCE_TRACE_REF, null);
  assert.equal(item.EVIDENCE.SOURCE_PROOF_REF, null);
  assert.equal(item.EVIDENCE.SUPPORT_COUNT, 0);
  assert.equal(item.EVIDENCE.TEST_COUNT, 0);
  assert.equal(item.EVIDENCE.REPLAY_STATUS, "NOT_ITEM_SCOPED");
  assert.equal(item.PROVENANCE.authenticated_formula_count, 26);
  assert.equal(item.PROVENANCE.global_proofs_valid, 376988);
});

test("ZEL capsule is preserved as a distinct upstream formula item", () => {
  const packet = adaptBrotoculateurStatus(statusFixture());
  const item = packet.ITEMS.find(value => value.KIND === "FORMULA_CAPSULE");

  assert.ok(item);
  assert.equal(item.EXPRESSION, "z_P(21^k)=4*21^(k-1)");
  assert.equal(item.SOURCE_STATUS, "SOURCE_PASS");
  assert.equal(item.EVIDENCE.TEST_COUNT, 18);
  assert.equal(item.EVIDENCE.REPLAY_STATUS, "EXACT_WITNESS_REPLAY");
  assert.equal(
    item.EVIDENCE.SOURCE_HASH_REF,
    "8999c203856cc171821fd59adc0a42db40a667d5acd7b39b37278accf9ea8045"
  );
  assert.equal(item.PROVENANCE.source, "ZELSTEREOS_PUBLIC_SAFE");
  assert.equal(item.PROVENANCE.executable_at_source, true);
  assert.equal(packet.EXECUTABLE, false);
});

test("same source snapshot creates deterministic packet identity and signature", () => {
  const a = adaptBrotoculateurStatus(statusFixture());
  const b = adaptBrotoculateurStatus(statusFixture());

  assert.equal(a.PACKET_ID, b.PACKET_ID);
  assert.equal(a.SOURCE_SNAPSHOT_H256, b.SOURCE_SNAPSHOT_H256);
  assert.equal(a.PACKET_H256, b.PACKET_H256);
  assert.deepEqual(a, b);
});

test("source evolution changes snapshot and packet identity", () => {
  const aInput = statusFixture();
  const bInput = statusFixture();
  bInput.brutaux_symbolic.traces_total += 1;
  bInput.brutaux_symbolic.proofs_total += 1;
  bInput.brutaux_symbolic.proofs_valid += 1;
  bInput.brutaux_symbolic.reconstructed_supports += 1;

  const a = adaptBrotoculateurStatus(aInput);
  const b = adaptBrotoculateurStatus(bInput);

  assert.notEqual(a.SOURCE_SNAPSHOT_H256, b.SOURCE_SNAPSHOT_H256);
  assert.notEqual(a.PACKET_ID, b.PACKET_ID);
  assert.notEqual(a.PACKET_H256, b.PACKET_H256);
});

test("tampering with normalized packet fails closed", () => {
  const packet = structuredClone(adaptBrotoculateurStatus(statusFixture()));
  packet.SUMMARY.AUTHENTICATED_FORMULAS = 999;

  assert.throws(
    () => validateMathInputPacket(packet),
    /AUTHENTICATED_FORMULAS cannot exceed CANONICAL_FORMULAS|PACKET_H256 mismatch/
  );
});

test("invalid source proof totals are rejected", () => {
  const input = statusFixture();
  input.brutaux_symbolic.proofs_invalid = 10;
  input.brutaux_symbolic.proofs_valid = 376988;

  assert.throws(
    () => adaptBrotoculateurStatus(input),
    /proof outcome counts exceed PROOFS_TOTAL/
  );
});

test("invalid support totals are rejected", () => {
  const input = statusFixture();
  input.brutaux_symbolic.reconstructed_supports = 400000;

  assert.throws(
    () => adaptBrotoculateurStatus(input),
    /support outcome counts exceed TRACES_TOTAL/
  );
});

test("generic bus admits a future second math source without Brotoculateur-specific fields", () => {
  const packet = createMathInputPacket({
    packetId: "MIP-FUTURE-INPUT-0001",
    source: {
      SYSTEM: "FUTURE_MATH_ENGINE",
      ADAPTER: "FUTURE_MATH_ADAPTER",
      ADAPTER_VERSION: "0.1",
      SOURCE_RUN_ID: "run-future-0001",
      SOURCE_ENDPOINT: "/export",
      ACCESS_MODE: "READ_ONLY",
      SOURCE_STATE: "READY"
    },
    sourceSnapshot: {
      source: "future",
      formula: "A+B=C"
    },
    summary: {
      CANONICAL_FORMULAS: 1,
      AUTHENTICATED_FORMULAS: 0,
      TESTING_FORMULAS: 1,
      REJECTED_FORMULAS: 0,
      CANDIDATE_FORMULAS: 0,
      TRACES_TOTAL: 1,
      PROOFS_TOTAL: 0,
      PROOFS_VALID: 0,
      PROOFS_INVALID: 0,
      RECONSTRUCTED_SUPPORTS: 1,
      FAILED_SUPPORTS: 0,
      TRACKER_SOURCES: 1,
      RECYCLE_EMITTED: 0
    },
    items: [{
      ITEM_ID: "FUTURE-ITEM-0001",
      KIND: "FORMULA_OBSERVATION",
      EXPRESSION: "A+B=C",
      SOURCE_STATUS: "TESTING",
      BINDINGS: [],
      EVIDENCE: {
        SOURCE_TRACE_REF: "trace-future-0001",
        SOURCE_PROOF_REF: null,
        SOURCE_HASH_REF: null,
        SUPPORT_COUNT: 1,
        TEST_COUNT: 0,
        REPLAY_STATUS: "NOT_TESTED"
      },
      PROVENANCE: {
        engine: "future"
      }
    }]
  });

  assert.equal(packet.SOURCE.SYSTEM, "FUTURE_MATH_ENGINE");
  assert.equal(packet.ITEMS[0].EXPRESSION, "A+B=C");
});

test("core input bus and adapter contain no network, timers, random or process execution", () => {
  for (const relative of [
    "../src/math-input-bus.mjs",
    "../src/brotoculateur-input-adapter.mjs"
  ]) {
    const source = fs.readFileSync(path.join(here, relative), "utf8");
    assert.doesNotMatch(source, /fetch\s*\(|WebSocket|XMLHttpRequest/);
    assert.doesNotMatch(source, /setInterval|setTimeout|requestAnimationFrame/);
    assert.doesNotMatch(source, /Math\.random/);
    assert.doesNotMatch(source, /node:child_process|process\.exec/);
  }
});

test("manual probe is loopback GET-only and has no write verbs", () => {
  const source = fs.readFileSync(
    path.join(here, "../tools/brotoculateur-input-probe.mjs"),
    "utf8"
  );

  assert.match(source, /method:\s*"GET"/);
  assert.match(source, /127\.0\.0\.1/);
  assert.match(source, /\/api\/status/);
  assert.doesNotMatch(source, /method:\s*"(POST|PUT|PATCH|DELETE)"/);
  assert.doesNotMatch(source, /writeFile|appendFile|createWriteStream/);
});
