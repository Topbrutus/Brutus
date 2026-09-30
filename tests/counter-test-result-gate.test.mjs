import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createAstraStation, loadPrototypeManifestFromFile } from "../src/anchor-station.mjs";
import { createAnchorLedger } from "../src/anchor-ledger.mjs";
import { createCounterTestQueue } from "../src/counter-test-queue.mjs";
import { createCounterTestResultGate } from "../src/counter-test-result-gate.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(here, relative), "utf8"));
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
  queue.register(
    readJson("../examples/counter-tests/BRUTUS-COUNTER-TEST-BRUTUS-PELL-L8-0001.json")
  );

  return {
    station,
    ledger,
    queue,
    gate: createCounterTestResultGate({ queue, station })
  };
}

function passingZResult() {
  return {
    SCHEMA: "BRUTUS-COUNTER-TEST-RESULT-v0.1",
    RESULT_ID: "BRUTUS-COUNTER-RESULT-ZELSTEREOS-369-396-0001",
    RECORD_ID: "BRUTUS-RECORD-COUNTER-ZELSTEREOS-369-396-0001",
    VERSION: "0.1",
    ANCHOR_ID: "ANCHOR-0001",
    PLAN_ID: "BRUTUS-COUNTER-TEST-ZELSTEREOS-369-396-0001",
    EXECUTION_REF: "TEST-FIXTURE-ONLY",
    EXECUTED_AT_UTC: null,
    PROTOCOL_VERSION: "fixture-v0.1",
    VERDICT: "PASS",
    CHECK_RESULTS: [
      {
        CHECK_ID: "CT-01",
        STATUS: "PASS",
        OBSERVED: {
          determinant_396: 0,
          determinant_369: -23004
        },
        NOTES: []
      },
      {
        CHECK_ID: "CT-02",
        STATUS: "PASS",
        OBSERVED: {
          ratio_852_639: "4/3",
          ratio_528_396: "4/3"
        },
        NOTES: []
      },
      {
        CHECK_ID: "CT-03",
        STATUS: "PASS",
        OBSERVED: {
          fixture_only: true
        },
        NOTES: [
          "Synthetic fixture for gate testing; not a machine execution."
        ]
      },
      {
        CHECK_ID: "CT-04",
        STATUS: "PASS",
        OBSERVED: {
          fixture_only: true
        },
        NOTES: [
          "Synthetic fixture for gate testing; not a machine execution."
        ]
      }
    ],
    SUMMARY: "Synthetic passing fixture used only to test result qualification.",
    EVIDENCE_LEVEL: "COUNTER_TEST_RESULT",
    PROOF_REF: null,
    AUTO_PROOF_PROMOTION: false,
    NOTES: [
      "This object is a unit-test fixture, not an experimental claim."
    ]
  };
}

test("PASS result qualifies into a ledger RESULT with PROOF_REF null", () => {
  const { gate } = setup();
  const record = gate.qualify(passingZResult());

  assert.equal(record.RECORD_TYPE, "RESULT");
  assert.equal(record.PROTOTYPE_ID, "BRUTUS-PROTOTYPE-COUNTER-TEST-BENCH-0001");
  assert.equal(record.DATA.verdict, "PASS");
  assert.equal(record.DATA.auto_proof_promotion, false);
  assert.equal(record.PROOF_REF, null);
  assert.match(record.SOURCE_REF, /BRUTUS-COUNTER-TEST-ZELSTEREOS-369-396-0001/);
});

test("qualified result can append to ledger without becoming proof", () => {
  const { gate, ledger } = setup();
  const record = gate.qualify(passingZResult());
  const entry = ledger.append(record);

  assert.equal(entry.RECORD.RECORD_TYPE, "RESULT");
  assert.equal(entry.RECORD.PROOF_REF, null);
  assert.equal(entry.RECORD.DATA.evidence_level, "COUNTER_TEST_RESULT");
  assert.equal(ledger.verify().VALID, true);
});

test("PASS cannot hide a non-PASS check", () => {
  const { gate } = setup();
  const bad = passingZResult();
  bad.CHECK_RESULTS[3].STATUS = "INCONCLUSIVE";

  assert.throws(
    () => gate.qualify(bad),
    /PASS verdict requires every check to PASS/
  );
});

test("FAIL requires an explicit failing check", () => {
  const { gate } = setup();
  const bad = passingZResult();
  bad.VERDICT = "FAIL";

  assert.throws(
    () => gate.qualify(bad),
    /FAIL verdict requires at least one FAIL check/
  );
});

test("INCONCLUSIVE cannot hide FAIL or ERROR", () => {
  const { gate } = setup();
  const bad = passingZResult();
  bad.VERDICT = "INCONCLUSIVE";
  bad.CHECK_RESULTS[0].STATUS = "INCONCLUSIVE";
  bad.CHECK_RESULTS[1].STATUS = "FAIL";

  assert.throws(
    () => gate.qualify(bad),
    /INCONCLUSIVE verdict cannot hide FAIL or ERROR check/
  );
});

test("result must report every planned check exactly once", () => {
  const { gate } = setup();
  const bad = passingZResult();
  bad.CHECK_RESULTS.pop();

  assert.throws(
    () => gate.qualify(bad),
    /must report every planned check exactly once/
  );
});

test("result cannot reference an unknown plan", () => {
  const { gate } = setup();
  const bad = passingZResult();
  bad.PLAN_ID = "BRUTUS-COUNTER-TEST-MISSING-0001";

  assert.throws(
    () => gate.qualify(bad),
    /unknown PLAN_ID/
  );
});

test("result cannot carry a proof reference through this gate", () => {
  const { gate } = setup();
  const bad = passingZResult();
  bad.PROOF_REF = "proofs/not-allowed-here.json";

  assert.throws(
    () => gate.qualify(bad),
    /PROOF_REF must remain null/
  );
});

test("result cannot enable automatic proof promotion", () => {
  const { gate } = setup();
  const bad = passingZResult();
  bad.AUTO_PROOF_PROMOTION = true;

  assert.throws(
    () => gate.qualify(bad),
    /AUTO_PROOF_PROMOTION must be false/
  );
});

test("result gate rejects executable or credential-shaped payloads", () => {
  const { gate } = setup();

  const executable = passingZResult();
  executable.CHECK_RESULTS[0].OBSERVED.run = () => "no";
  assert.throws(
    () => gate.qualify(executable),
    /must contain data only/
  );

  const secret = passingZResult();
  secret.CHECK_RESULTS[0].OBSERVED.api_token = "no";
  assert.throws(
    () => gate.qualify(secret),
    /forbidden credential field api_token/
  );
});

test("result gate contains no append, network, process execution or World Router call", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/counter-test-result-gate.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /\.append\s*\(/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\b(exec|spawn|fork|routeWorld|buildWorldTransportRequest)\b/);
});
