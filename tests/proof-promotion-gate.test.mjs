import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import { createAstraStation, loadPrototypeManifestFromFile } from "../src/anchor-station.mjs";
import { createAnchorLedger } from "../src/anchor-ledger.mjs";
import { createCounterTestQueue } from "../src/counter-test-queue.mjs";
import { createCounterTestResultGate } from "../src/counter-test-result-gate.mjs";
import { createProofPromotionGate } from "../src/proof-promotion-gate.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(here, relative), "utf8"));
}

function fixtureResult() {
  return {
    SCHEMA: "BRUTUS-COUNTER-TEST-RESULT-v0.1",
    RESULT_ID: "BRUTUS-COUNTER-RESULT-ZELSTEREOS-369-396-PROOF-FIXTURE",
    RECORD_ID: "BRUTUS-RECORD-COUNTER-ZELSTEREOS-369-396-PROOF-FIXTURE",
    VERSION: "0.1",
    ANCHOR_ID: "ANCHOR-0001",
    PLAN_ID: "BRUTUS-COUNTER-TEST-ZELSTEREOS-369-396-0001",
    EXECUTION_REF: "TEST-FIXTURE-ONLY",
    EXECUTED_AT_UTC: null,
    PROTOCOL_VERSION: "fixture-v0.1",
    VERDICT: "PASS",
    CHECK_RESULTS: [
      { CHECK_ID: "CT-01", STATUS: "PASS", OBSERVED: { fixture: true }, NOTES: [] },
      { CHECK_ID: "CT-02", STATUS: "PASS", OBSERVED: { fixture: true }, NOTES: [] },
      { CHECK_ID: "CT-03", STATUS: "PASS", OBSERVED: { fixture: true }, NOTES: [] },
      { CHECK_ID: "CT-04", STATUS: "PASS", OBSERVED: { fixture: true }, NOTES: [] }
    ],
    SUMMARY: "Synthetic fixture only.",
    EVIDENCE_LEVEL: "COUNTER_TEST_RESULT",
    PROOF_REF: null,
    AUTO_PROOF_PROMOTION: false,
    NOTES: ["Unit-test fixture only; not a real experiment."]
  };
}

function setup() {
  const station = createAstraStation();

  station.registerPrototype(
    loadPrototypeManifestFromFile(
      path.join(here, "../examples/prototypes/BRUTUS-PROTOTYPE-EXPERIMENT-INTAKE-0001.json")
    )
  );
  station.registerPrototype(
    loadPrototypeManifestFromFile(
      path.join(here, "../examples/prototypes/BRUTUS-PROTOTYPE-COUNTER-TEST-BENCH-0001.json")
    )
  );

  const ledger = createAnchorLedger({ station });
  ledger.append(readJson("../examples/records/BRUTUS-RECORD-ZELSTEREOS-369-396-0001.json"));
  ledger.append(readJson("../examples/records/BRUTUS-RECORD-BRUTUS-PELL-L7-L8-0001.json"));

  const queue = createCounterTestQueue({ station, ledger });
  queue.register(
    readJson("../examples/counter-tests/BRUTUS-COUNTER-TEST-ZELSTEREOS-369-396-0001.json")
  );

  const resultGate = createCounterTestResultGate({ queue, station });
  const resultRecord = resultGate.qualify(fixtureResult());
  ledger.append(resultRecord);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "brutus-proof-gate-"));
  const proofsDir = path.join(root, "proofs");
  fs.mkdirSync(proofsDir, { recursive: true });
  const proofPath = path.join(proofsDir, "fixture-proof.json");
  const proofBytes = Buffer.from(
    JSON.stringify({
      schema: "TEST-FIXTURE-PROOF",
      note: "Not a real scientific or mathematical proof."
    }) + "\n",
    "utf8"
  );
  fs.writeFileSync(proofPath, proofBytes);

  const h256 = createHash("sha256").update(proofBytes).digest("hex");

  return {
    ledger,
    root,
    h256,
    resultRecord,
    gate: createProofPromotionGate({ ledger, repositoryRoot: root })
  };
}

function validPromotion(h256) {
  return {
    SCHEMA: "BRUTUS-PROOF-PROMOTION-v0.1",
    PROMOTION_ID: "BRUTUS-PROOF-PROMOTION-ZELSTEREOS-FIXTURE-0001",
    RECORD_ID: "BRUTUS-RECORD-PROOF-ZELSTEREOS-FIXTURE-0001",
    VERSION: "0.1",
    ANCHOR_ID: "ANCHOR-0001",
    RESULT_RECORD_ID: "BRUTUS-RECORD-COUNTER-ZELSTEREOS-369-396-PROOF-FIXTURE",
    PROOF_REF: "proofs/fixture-proof.json",
    EXPECTED_PROOF_H256: h256,
    REVIEW_STATUS: "APPROVED",
    REVIEW_AUTHORITY: "TEST-FIXTURE-REVIEWER",
    REVIEWED_AT_UTC: "2026-09-30T19:00:00Z",
    SCOPE: "Unit-test fixture scope only.",
    LIMITATIONS: [
      "Synthetic fixture; no claim about the real ZELSTEREOS experiment."
    ],
    AUTO_PROMOTION: false,
    NOTES: [
      "Unit-test fixture only."
    ]
  };
}

test("reviewed proof artifact qualifies into separate PROOF_REF record", () => {
  const { gate, h256 } = setup();
  const record = gate.qualify(validPromotion(h256));

  assert.equal(record.RECORD_TYPE, "PROOF_REF");
  assert.equal(record.PROOF_REF, "proofs/fixture-proof.json");
  assert.equal(record.DATA.proof_h256, h256);
  assert.equal(record.DATA.result_verdict, "PASS");
  assert.equal(record.DATA.auto_promotion, false);
});

test("qualified proof reference can append separately from RESULT", () => {
  const { gate, h256, ledger } = setup();
  const proofRecord = gate.qualify(validPromotion(h256));
  const entry = ledger.append(proofRecord);

  assert.equal(entry.RECORD.RECORD_TYPE, "PROOF_REF");
  assert.equal(entry.RECORD.DATA.result_record_id, "BRUTUS-RECORD-COUNTER-ZELSTEREOS-369-396-PROOF-FIXTURE");
  assert.equal(ledger.verify().VALID, true);
});

test("proof promotion rejects missing result records", () => {
  const { gate, h256 } = setup();
  const bad = validPromotion(h256);
  bad.RESULT_RECORD_ID = "BRUTUS-RECORD-MISSING-RESULT";

  assert.throws(
    () => gate.qualify(bad),
    /unknown RESULT_RECORD_ID/
  );
});

test("proof promotion rejects missing proof artifacts", () => {
  const { gate, h256 } = setup();
  const bad = validPromotion(h256);
  bad.PROOF_REF = "proofs/missing.json";

  assert.throws(
    () => gate.qualify(bad),
    /proof artifact does not exist/
  );
});

test("proof promotion rejects SHA-256 mismatch", () => {
  const { gate, h256 } = setup();
  const bad = validPromotion(h256);
  bad.EXPECTED_PROOF_H256 = "0".repeat(64);

  assert.throws(
    () => gate.qualify(bad),
    /proof artifact SHA-256 mismatch/
  );
});

test("proof promotion rejects path traversal outside proofs", () => {
  const { gate, h256 } = setup();
  const bad = validPromotion(h256);
  bad.PROOF_REF = "proofs/../outside.json";

  assert.throws(
    () => gate.qualify(bad),
    /PROOF_REF must stay inside proofs/
  );
});

test("proof promotion requires explicit approval and forbids auto promotion", () => {
  const { gate, h256 } = setup();

  const review = validPromotion(h256);
  review.REVIEW_STATUS = "PENDING";
  assert.throws(
    () => gate.qualify(review),
    /REVIEW_STATUS must be APPROVED/
  );

  const auto = validPromotion(h256);
  auto.AUTO_PROMOTION = true;
  assert.throws(
    () => gate.qualify(auto),
    /AUTO_PROMOTION must be false/
  );
});

test("proof promotion rejects credential-shaped payloads", () => {
  const { gate, h256 } = setup();
  const bad = validPromotion(h256);
  bad.api_token = "no";

  assert.throws(
    () => gate.qualify(bad),
    /forbidden credential field api_token/
  );
});

test("proof gate contains no network, process execution, append or World Router call", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/proof-promotion-gate.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /\.append\s*\(/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\b(exec|spawn|fork|routeWorld|buildWorldTransportRequest)\b/);
});
