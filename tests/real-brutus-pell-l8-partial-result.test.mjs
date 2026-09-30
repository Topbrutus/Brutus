import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
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
    readJson("../examples/counter-tests/BRUTUS-COUNTER-TEST-BRUTUS-PELL-L8-0001.json")
  );

  return {
    ledger,
    gate: createCounterTestResultGate({ queue, station })
  };
}

function pell(n) {
  let a = 0n;
  let b = 1n;
  for (let i = 0; i < n; i += 1) {
    const next = 2n * b + a;
    a = b;
    b = next;
  }
  return a;
}

function gcd(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const r = x % y;
    x = y;
    y = r;
  }
  return x;
}

function mod(a, m) {
  const r = a % m;
  return r < 0n ? r + m : r;
}

test("partial L8 result qualifies exactly to its durable RESULT record", () => {
  const { gate } = setup();
  const raw = readJson("../examples/results/BRUTUS-COUNTER-RESULT-BRUTUS-PELL-L8-PARTIAL-0001.json");
  const expected = readJson("../examples/records/BRUTUS-RECORD-COUNTER-BRUTUS-PELL-L8-PARTIAL-0001.json");

  const record = gate.qualify(raw);

  assert.deepEqual(record, expected);
  assert.equal(record.DATA.verdict, "INCONCLUSIVE");
  assert.equal(record.PROOF_REF, null);
  assert.equal(record.DATA.auto_proof_promotion, false);
});

test("partial L8 RESULT appends without becoming proof", () => {
  const { gate, ledger } = setup();
  const raw = readJson("../examples/results/BRUTUS-COUNTER-RESULT-BRUTUS-PELL-L8-PARTIAL-0001.json");
  const entry = ledger.append(gate.qualify(raw));

  assert.equal(entry.RECORD.RECORD_TYPE, "RESULT");
  assert.equal(entry.RECORD.DATA.verdict, "INCONCLUSIVE");
  assert.equal(entry.RECORD.PROOF_REF, null);
  assert.equal(ledger.verify().VALID, true);
});

test("Brutus independently reproduces the exact Pell/Q invariants supplied in CT-02", () => {
  const raw = readJson("../examples/results/BRUTUS-COUNTER-RESULT-BRUTUS-PELL-L8-PARTIAL-0001.json");
  const ct02 = raw.CHECK_RESULTS.find((item) => item.CHECK_ID === "CT-02");

  const cases = [
    { q: 47, observed: ct02.OBSERVED.q_47 },
    { q: 71, observed: ct02.OBSERVED.q_71 },
    { q: 83, observed: ct02.OBSERVED.q_83 }
  ];

  for (const { q, observed } of cases) {
    const p = pell(q);
    const qValue = pell(q * q) / p;
    const qText = qValue.toString();
    const digest = createHash("sha256").update(qText).digest("hex");
    const sign = (((q - 1) / 2) % 2 === 0) ? 1n : -1n;

    assert.equal(p.toString(), observed.P_q);
    assert.equal(qText, observed.Q_q);
    assert.equal(qText.length, observed.Q_digits);
    assert.equal(digest, observed.Q_sha256);
    assert.equal(gcd(p, qValue).toString(), observed.gcd_Pq_Qq);
    assert.equal(mod(p, BigInt(q)).toString(), observed.P_q_mod_q);
    assert.equal(mod(qValue - sign * BigInt(q), p), 0n);
    assert.equal(observed.Q_congruence_check, 0);
  }
});

test("partial L8 status preserves missing CT-01 and CT-03 as INCONCLUSIVE", () => {
  const raw = readJson("../examples/results/BRUTUS-COUNTER-RESULT-BRUTUS-PELL-L8-PARTIAL-0001.json");
  const byId = Object.fromEntries(raw.CHECK_RESULTS.map((item) => [item.CHECK_ID, item]));

  assert.equal(byId["CT-01"].STATUS, "INCONCLUSIVE");
  assert.equal(byId["CT-02"].STATUS, "PASS");
  assert.equal(byId["CT-03"].STATUS, "INCONCLUSIVE");
  assert.equal(byId["CT-04"].STATUS, "PASS");

  assert.equal(byId["CT-04"].OBSERVED.total_prime_candidates, 4853);
  assert.equal(byId["CT-04"].OBSERVED.total_exact_witnesses, 0);
});
