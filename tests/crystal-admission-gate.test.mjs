import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createCrystalAdmissionGate } from "../src/crystal-admission-gate.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const crystalPath = path.join(
  repoRoot,
  "examples/crystals/BRUTUS-CRYSTAL-QUEEN-PUBLIC-READ-0001.json"
);

function loadCrystal() {
  return JSON.parse(fs.readFileSync(crystalPath, "utf8"));
}

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "brutus-crystal-admission-"));
}

function copySources(crystal, targetRoot) {
  for (const source of crystal.SOURCE_REFS) {
    const from = path.join(repoRoot, source.REF);
    const to = path.join(targetRoot, source.REF);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
}

test("reference crystal becomes admissible only after exact local source verification", () => {
  const gate = createCrystalAdmissionGate({ repositoryRoot: repoRoot });
  const admission = gate.qualify(loadCrystal());

  assert.equal(admission.SCHEMA, "BRUTUS-CRYSTAL-ADMISSION-v0.1");
  assert.equal(admission.STATUS, "ADMISSIBLE");
  assert.equal(admission.SOURCE_INTEGRITY_VERDICT, "PASS");
  assert.equal(admission.VERIFIED_SOURCE_COUNT, 2);
  assert.equal(admission.REGISTRY_WRITE_PERFORMED, false);
  assert.equal(admission.PROOF_PROMOTION, false);
  assert.equal(Object.isFrozen(admission), true);
});

test("admission rejects source-byte tampering", () => {
  const crystal = loadCrystal();
  const tempRoot = makeTempRepo();
  copySources(crystal, tempRoot);
  fs.appendFileSync(path.join(tempRoot, crystal.SOURCE_REFS[0].REF), "X");

  const gate = createCrystalAdmissionGate({ repositoryRoot: tempRoot });
  assert.throws(
    () => gate.qualify(crystal),
    /source integrity must PASS; got FAIL/
  );
});

test("admission rejects incomplete source verification", () => {
  const crystal = loadCrystal();
  crystal.SOURCE_REFS[0].KIND = "EXTERNAL_REPORT";

  const gate = createCrystalAdmissionGate({ repositoryRoot: repoRoot });
  assert.throws(
    () => gate.qualify(crystal),
    /source integrity must PASS; got INCONCLUSIVE/
  );
});

test("admission rejects structurally invalid crystals before source admission", () => {
  const crystal = loadCrystal();
  crystal.PAYLOAD.tick += 1;

  const gate = createCrystalAdmissionGate({ repositoryRoot: repoRoot });
  assert.throws(
    () => gate.qualify(crystal),
    /PAYLOAD_H256 mismatch/
  );
});

test("admission does not mutate the input crystal", () => {
  const crystal = loadCrystal();
  const before = JSON.stringify(crystal);

  const gate = createCrystalAdmissionGate({ repositoryRoot: repoRoot });
  gate.qualify(crystal);

  assert.equal(JSON.stringify(crystal), before);
});

test("admission gate has no registry write, network, process execution or World Router call", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "src/crystal-admission-gate.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /\.append\s*\(/);
  assert.doesNotMatch(source, /\.register\s*\(/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(
    source,
    /\b(exec|spawn|fork|routeWorld|buildWorldTransportRequest)\b/
  );
});
