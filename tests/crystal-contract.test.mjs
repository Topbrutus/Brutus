import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BRUTUS_CRYSTAL_RECONSTRUCTION_METHOD,
  computeCrystalPayloadH256,
  validateCrystal
} from "../src/crystal-contract.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function validCrystal() {
  const payload = {
    entity_id: "QUEEN-X72-0072",
    final_state: "DEFAULT_LOCKED",
    generation: 20396,
    integrity_match: true,
    live_ant_routing: "DENIED",
    queen_mode: "BURST",
    status: "FRESH",
    tick: 146857067
  };

  return {
    SCHEMA: "BRUTUS-CRYSTAL-v0.1",
    CRYSTAL_ID: "BRUTUS-CRYSTAL-QUEEN-PUBLIC-READ-0001",
    VERSION: "0.1",
    ANCHOR_ID: "ANCHOR-0001",
    EVIDENCE_LABEL: "MESURE",
    SOURCE_REFS: [
      {
        KIND: "BRUTUS_RECORD",
        REF: "examples/records/BRUTUS-RECORD-QUEEN-PUBLIC-READ-0001.json",
        DIGEST_ALGORITHM: "GIT_SHA1",
        DIGEST: "04b8a74da278f9027d0bc2528ba60325e7feccc9"
      },
      {
        KIND: "BRUTUS_PROOF",
        REF: "proofs/BRUTUS-PROOF-QUEEN-PUBLIC-READ-0001.json",
        DIGEST_ALGORITHM: "GIT_SHA1",
        DIGEST: "2c4d29b967d250787f89110e9c36e19738b32baf"
      }
    ],
    PAYLOAD: payload,
    PAYLOAD_H256: computeCrystalPayloadH256(payload),
    RECONSTRUCTION: {
      METHOD: BRUTUS_CRYSTAL_RECONSTRUCTION_METHOD,
      PAYLOAD_FORMAT: "JSON",
      CANONICALIZATION: "RECURSIVE_SORTED_OBJECT_KEYS"
    },
    PROOF_REFS: ["proofs/BRUTUS-PROOF-QUEEN-PUBLIC-READ-0001.json"],
    IMMUTABLE: true,
    EXECUTABLE: false,
    AUTO_PROOF_PROMOTION: false,
    NOTES: ["Portable snapshot only; it does not execute or route anything."]
  };
}

test("valid crystal verifies and is deeply immutable", () => {
  const crystal = validateCrystal(validCrystal());
  assert.equal(Object.isFrozen(crystal), true);
  assert.equal(Object.isFrozen(crystal.PAYLOAD), true);
  assert.equal(Object.isFrozen(crystal.SOURCE_REFS), true);
  assert.equal(crystal.EXECUTABLE, false);
  assert.equal(crystal.AUTO_PROOF_PROMOTION, false);
});

test("payload integrity is order-independent for object keys", () => {
  const left = { a: 1, nested: { z: 3, b: 2 } };
  const right = { nested: { b: 2, z: 3 }, a: 1 };
  assert.equal(computeCrystalPayloadH256(left), computeCrystalPayloadH256(right));
});

test("tampering with the payload invalidates the crystal", () => {
  const crystal = validCrystal();
  crystal.PAYLOAD.tick += 1;
  assert.throws(() => validateCrystal(crystal), /PAYLOAD_H256 mismatch/);
});

test("crystal rejects credential-shaped fields anywhere in data", () => {
  const crystal = validCrystal();
  crystal.PAYLOAD.api_token = "no";
  assert.throws(() => validateCrystal(crystal), /forbidden credential field api_token/);
});

test("crystal rejects executable values and non-finite numbers", () => {
  const executable = validCrystal();
  executable.PAYLOAD.run = () => "no";
  assert.throws(() => validateCrystal(executable), /must contain data only/);

  const nonFinite = validCrystal();
  nonFinite.PAYLOAD.value = Infinity;
  assert.throws(() => validateCrystal(nonFinite), /non-finite number/);
});

test("source digests are typed and strict", () => {
  const crystal = validCrystal();
  crystal.SOURCE_REFS[0].DIGEST = "deadbeef";
  assert.throws(() => validateCrystal(crystal), /invalid GIT_SHA1 digest/);
});

test("crystal cannot self-promote or become executable", () => {
  const promotion = validCrystal();
  promotion.AUTO_PROOF_PROMOTION = true;
  assert.throws(() => validateCrystal(promotion), /AUTO_PROOF_PROMOTION must be false/);

  const executable = validCrystal();
  executable.EXECUTABLE = true;
  assert.throws(() => validateCrystal(executable), /EXECUTABLE must be false/);
});

test("crystal rejects unknown fields instead of silently accepting drift", () => {
  const crystal = validCrystal();
  crystal.ROUTE = "WORLD";
  assert.throws(() => validateCrystal(crystal), /unknown crystal field ROUTE/);
});

test("reference crystal file validates against runtime invariants", () => {
  const file = path.join(
    here,
    "../examples/crystals/BRUTUS-CRYSTAL-QUEEN-PUBLIC-READ-0001.json"
  );
  const crystal = validateCrystal(JSON.parse(fs.readFileSync(file, "utf8")));
  assert.equal(crystal.CRYSTAL_ID, "BRUTUS-CRYSTAL-QUEEN-PUBLIC-READ-0001");
  assert.equal(crystal.PAYLOAD_H256, computeCrystalPayloadH256(crystal.PAYLOAD));
  assert.equal(crystal.PROOF_REFS.length, 1);
});
