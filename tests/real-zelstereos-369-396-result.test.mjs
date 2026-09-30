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

  return {
    ledger,
    gate: createCounterTestResultGate({ queue, station })
  };
}

test("real 369 / 396 counter-test report qualifies exactly to the durable RESULT record", () => {
  const { gate } = setup();
  const raw = readJson("../examples/results/BRUTUS-COUNTER-RESULT-ZELSTEREOS-369-396-0001.json");
  const expected = readJson("../examples/records/BRUTUS-RECORD-COUNTER-ZELSTEREOS-369-396-0001.json");

  const qualified = gate.qualify(raw);

  assert.deepEqual(qualified, expected);
  assert.equal(qualified.DATA.verdict, "PASS");
  assert.equal(qualified.PROOF_REF, null);
  assert.equal(qualified.DATA.auto_proof_promotion, false);
});

test("real 369 / 396 RESULT appends to ASTRA STATION ledger without becoming proof", () => {
  const { gate, ledger } = setup();
  const raw = readJson("../examples/results/BRUTUS-COUNTER-RESULT-ZELSTEREOS-369-396-0001.json");

  const entry = ledger.append(gate.qualify(raw));

  assert.equal(entry.RECORD.RECORD_TYPE, "RESULT");
  assert.equal(entry.RECORD.DATA.evidence_level, "COUNTER_TEST_RESULT");
  assert.equal(entry.RECORD.DATA.verdict, "PASS");
  assert.equal(entry.RECORD.PROOF_REF, null);
  assert.equal(ledger.verify().VALID, true);
});

test("recorded machine measurements preserve the supplied exact result", () => {
  const raw = readJson("../examples/results/BRUTUS-COUNTER-RESULT-ZELSTEREOS-369-396-0001.json");

  const ct01 = raw.CHECK_RESULTS.find((item) => item.CHECK_ID === "CT-01");
  const ct02 = raw.CHECK_RESULTS.find((item) => item.CHECK_ID === "CT-02");
  const ct03 = raw.CHECK_RESULTS.find((item) => item.CHECK_ID === "CT-03");
  const ct04 = raw.CHECK_RESULTS.find((item) => item.CHECK_ID === "CT-04");

  assert.equal(ct01.OBSERVED.determinant_396, 0);
  assert.equal(ct01.OBSERVED.determinant_369, -23004);
  assert.equal(ct02.OBSERVED.ratio_852_639, "4/3");
  assert.equal(ct02.OBSERVED.ratio_528_396, "4/3");
  assert.equal(ct02.OBSERVED.exact_equal, true);

  assert.equal(ct03.OBSERVED.branches_369, 1296);
  assert.equal(ct03.OBSERVED.branches_396, 1296);
  assert.equal(ct03.OBSERVED.protocol_same, true);
  assert.equal(
    ct03.OBSERVED.antmux_head,
    "942aba3afef9fb49a8467d0b642a4a1a81126bda"
  );

  assert.equal(ct04.OBSERVED.branches_equal, 0);
  assert.equal(ct04.OBSERVED.branches_different, 1296);
  assert.equal(ct04.OBSERVED.total, 1296);
  assert.deepEqual(ct04.OBSERVED.zenodo_family_output_differences, {
    "GSP-ZENODO-001": 1296,
    "GSP-ZENODO-002": 1296,
    "GSP-ZENODO-003": 233,
    "GSP-ZENODO-004": 0,
    "GSP-ZENODO-005": 0,
    "GSP-ZENODO-006": 0,
    "GSP-ZENODO-007": 684,
    "GSP-ZENODO-008": 1296,
    "GSP-ZENODO-009": 0,
    "GSP-ZENODO-010": 1296,
    "GSP-ZENODO-011": 0,
    "GSP-ZENODO-012": 1296
  });
  assert.equal(ct04.OBSERVED.zenodo_status_differences, 0);
});
