import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createAstraStation, loadPrototypeManifestFromFile } from "../src/anchor-station.mjs";
import { createAnchorLedger } from "../src/anchor-ledger.mjs";
import { createCounterTestQueue } from "../src/counter-test-queue.mjs";
import { createCounterTestResultGate } from "../src/counter-test-result-gate.mjs";
import { verifyPrimeFactorRank } from "../tools/l8-gmp-ecm-runner.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const readJson = (relative) =>
  JSON.parse(fs.readFileSync(path.join(here, relative), "utf8"));

function setup() {
  const station = createAstraStation();
  station.registerPrototype(loadPrototypeManifestFromFile(
    path.join(here, "../examples/prototypes/BRUTUS-PROTOTYPE-EXPERIMENT-INTAKE-0001.json")
  ));
  station.registerPrototype(loadPrototypeManifestFromFile(
    path.join(here, "../examples/prototypes/BRUTUS-PROTOTYPE-COUNTER-TEST-BENCH-0001.json")
  ));
  const ledger = createAnchorLedger({ station });
  ledger.append(readJson("../examples/records/BRUTUS-RECORD-ZELSTEREOS-369-396-0001.json"));
  ledger.append(readJson("../examples/records/BRUTUS-RECORD-BRUTUS-PELL-L7-L8-0001.json"));
  const queue = createCounterTestQueue({ station, ledger });
  queue.register(readJson("../examples/counter-tests/BRUTUS-COUNTER-TEST-BRUTUS-PELL-L8-0001.json"));
  return { gate: createCounterTestResultGate({ queue, station }) };
}

test("L8 exact-witness result qualifies exactly", () => {
  const { gate } = setup();
  const raw = readJson("../examples/results/BRUTUS-COUNTER-RESULT-BRUTUS-PELL-L8-EXACT-WITNESS-0004.json");
  const expected = readJson("../examples/records/BRUTUS-RECORD-COUNTER-BRUTUS-PELL-L8-EXACT-WITNESS-0004.json");
  assert.deepEqual(gate.qualify(raw), expected);
  assert.equal(raw.VERDICT, "PASS");
  assert.equal(raw.PROOF_REF, null);
  assert.equal(raw.AUTO_PROOF_PROMOTION, false);
});

test("L8 check vector is PASS PASS PASS PASS", () => {
  const raw = readJson("../examples/results/BRUTUS-COUNTER-RESULT-BRUTUS-PELL-L8-EXACT-WITNESS-0004.json");
  assert.deepEqual(
    Object.fromEntries(raw.CHECK_RESULTS.map((x) => [x.CHECK_ID, x.STATUS])),
    { "CT-01": "PASS", "CT-02": "PASS", "CT-03": "PASS", "CT-04": "PASS" }
  );
});

test("Q47 factor reconstructs the target and has exact Pell rank 2209", () => {
  const raw = readJson("../examples/results/BRUTUS-COUNTER-RESULT-BRUTUS-PELL-L8-EXACT-WITNESS-0004.json");
  const q47 = raw.CHECK_RESULTS.find((x) => x.CHECK_ID === "CT-02").OBSERVED.q_47;
  const ct03 = raw.CHECK_RESULTS.find((x) => x.CHECK_ID === "CT-03").OBSERVED;
  const Q = BigInt(q47.Q_q);
  const r = BigInt(ct03.prime_factor);

  assert.equal(Q % r, 0n);
  const cofactor = Q / r;
  const cofactorText = cofactor.toString();
  assert.equal(cofactorText.length, 792);
  assert.equal(
    crypto.createHash("sha256").update(cofactorText).digest("hex"),
    "978b7253d1665b4c59168fed591b9844db1faf9020b675776ef6a274ba36f570"
  );

  const witness = verifyPrimeFactorRank({ q: 47, Q, factor: r });
  assert.equal(witness.Q_q_mod_factor, "0");
  assert.equal(witness.P_1_mod_factor, "1");
  assert.notEqual(witness.P_q_mod_factor, "0");
  assert.equal(witness.P_q2_mod_factor, "0");
  assert.equal(witness.exact_rank, 2209);
  assert.equal(witness.witness, true);
});

test("independent primality verification metadata is preserved", () => {
  const raw = readJson("../examples/results/BRUTUS-COUNTER-RESULT-BRUTUS-PELL-L8-EXACT-WITNESS-0004.json");
  const ct03 = raw.CHECK_RESULTS.find((x) => x.CHECK_ID === "CT-03").OBSERVED;
  assert.equal(ct03.factor_primality_verified, true);
  assert.equal(ct03.independent_verification.sympy_isprime, true);
  assert.equal(ct03.independent_verification.sympy_version, "1.14.0");
  assert.deepEqual(ct03.independent_verification.rank_divisors_checked, [1, 47, 2209]);
});
