import test from "node:test";
import assert from "node:assert/strict";

import {
  pellMod,
  parseFirstFactor,
  verifyPrimeFactorRank,
  buildEcmArgs
} from "../tools/l8-gmp-ecm-runner.mjs";

test("GMP-ECM args request loop mode and stop on first factor", () => {
  assert.deepEqual(
    buildEcmArgs({ curves: 100, b1: "1e6", b2: null }),
    ["-one", "-c", "100", "1e6"]
  );
  assert.deepEqual(
    buildEcmArgs({ curves: 25, b1: "5e5", b2: "5e7" }),
    ["-one", "-c", "25", "5e5", "5e7"]
  );
});

test("factor parser accepts only a non-trivial divisor of N", () => {
  const n = 197n * 211n;
  const output = [
    "GMP-ECM",
    "********** Factor found in step 2: 197",
    "Found probable prime factor of 3 digits: 197"
  ].join("\n");

  assert.equal(parseFirstFactor(output, n), 197n);
  assert.equal(parseFirstFactor("Factor found in step 1: 199", n), null);
});

test("Pell rank verifier confirms the q=3 square-rank example", () => {
  const P3 = 5n;
  const P9 = 985n;
  const Q3 = P9 / P3;

  assert.equal(Q3, 197n);
  const result = verifyPrimeFactorRank({ q: 3, Q: Q3, factor: 197n });

  assert.equal(result.Q_q_mod_factor, "0");
  assert.notEqual(result.P_q_mod_factor, "0");
  assert.equal(result.P_q2_mod_factor, "0");
  assert.equal(result.exact_rank, 9);
  assert.equal(result.witness, true);
});

test("out-of-domain q=2 example is not falsely promoted to square rank", () => {
  const P2 = 2n;
  const P4 = 12n;
  const Q2 = P4 / P2;
  const result = verifyPrimeFactorRank({ q: 2, Q: Q2, factor: 2n });

  assert.equal(result.exact_rank, 2);
  assert.equal(result.witness, false);
});

test("pellMod reproduces small Pell values modulo a prime", () => {
  assert.equal(pellMod(1, 197n), 1n);
  assert.equal(pellMod(3, 197n), 5n);
  assert.equal(pellMod(9, 197n), 0n);
});
