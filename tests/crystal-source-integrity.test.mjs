import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  computeGitBlobSha1,
  verifyCrystalLocalSources
} from "../src/crystal-source-integrity.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const crystalPath = path.join(
  repoRoot,
  "examples/crystals/BRUTUS-CRYSTAL-QUEEN-PUBLIC-READ-0001.json"
);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function loadCrystal() {
  return readJson(crystalPath);
}

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "brutus-crystal-integrity-"));
}

function copySource(root, ref) {
  const from = path.join(repoRoot, ref);
  const to = path.join(root, ref);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  return to;
}

test("git blob SHA-1 uses exact Git object framing", () => {
  assert.equal(
    computeGitBlobSha1(Buffer.from("test content\n")),
    "d670460b4b4aece5915caf5c68d12f560a9fe3e4"
  );
});

test("reference crystal recomputes both pinned local Git blob SHAs", () => {
  const result = verifyCrystalLocalSources(loadCrystal(), { repoRoot });

  assert.equal(result.VERDICT, "PASS");
  assert.deepEqual(result.COUNTS, {
    TOTAL: 2,
    PASS: 2,
    FAIL: 0,
    NOT_VERIFIED: 0
  });
  assert.equal(
    result.SOURCE_RESULTS[0].COMPUTED_DIGEST,
    "04b8a74da278f9027d0bc2528ba60325e7feccc9"
  );
  assert.equal(
    result.SOURCE_RESULTS[1].COMPUTED_DIGEST,
    "2c4d29b967d250787f89110e9c36e19738b32baf"
  );
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.SOURCE_RESULTS), true);
});

test("one-byte source tamper fails integrity", () => {
  const crystal = loadCrystal();
  const tempRoot = makeTempRepo();

  for (const source of crystal.SOURCE_REFS) copySource(tempRoot, source.REF);
  fs.appendFileSync(path.join(tempRoot, crystal.SOURCE_REFS[0].REF), "X");

  const result = verifyCrystalLocalSources(crystal, { repoRoot: tempRoot });
  assert.equal(result.VERDICT, "FAIL");
  assert.equal(result.SOURCE_RESULTS[0].STATUS, "FAIL");
  assert.equal(result.SOURCE_RESULTS[0].REASON, "DIGEST_MISMATCH");
});

test("wrong declared digest fails even when shape is valid", () => {
  const crystal = loadCrystal();
  crystal.SOURCE_REFS[0].DIGEST = "0".repeat(40);

  const result = verifyCrystalLocalSources(crystal, { repoRoot });
  assert.equal(result.VERDICT, "FAIL");
  assert.equal(result.SOURCE_RESULTS[0].REASON, "DIGEST_MISMATCH");
});

test("missing local source fails explicitly", () => {
  const crystal = loadCrystal();
  const tempRoot = makeTempRepo();
  copySource(tempRoot, crystal.SOURCE_REFS[0].REF);

  const result = verifyCrystalLocalSources(crystal, { repoRoot: tempRoot });
  assert.equal(result.VERDICT, "FAIL");
  assert.equal(result.SOURCE_RESULTS[1].REASON, "SOURCE_MISSING");
});

test("path traversal is rejected before file read", () => {
  const crystal = loadCrystal();
  crystal.SOURCE_REFS[0].REF = "../outside.json";

  const result = verifyCrystalLocalSources(crystal, { repoRoot });
  assert.equal(result.VERDICT, "FAIL");
  assert.equal(result.SOURCE_RESULTS[0].REASON, "PATH_OUTSIDE_REPOSITORY");
});

test("unsupported source kinds are explicit and never silent PASS", () => {
  const crystal = loadCrystal();
  crystal.SOURCE_REFS[0].KIND = "EXTERNAL_REPORT";

  const result = verifyCrystalLocalSources(crystal, { repoRoot });
  assert.equal(result.VERDICT, "INCONCLUSIVE");
  assert.equal(result.SOURCE_RESULTS[0].STATUS, "NOT_VERIFIED");
  assert.equal(result.SOURCE_RESULTS[0].REASON, "UNSUPPORTED_SOURCE_KIND");
});

test("non-GIT_SHA1 source integrity remains explicitly unverified", () => {
  const crystal = loadCrystal();
  crystal.SOURCE_REFS[0].DIGEST_ALGORITHM = "NONE";
  crystal.SOURCE_REFS[0].DIGEST = null;

  const result = verifyCrystalLocalSources(crystal, { repoRoot });
  assert.equal(result.VERDICT, "INCONCLUSIVE");
  assert.equal(
    result.SOURCE_RESULTS[0].REASON,
    "UNSUPPORTED_DIGEST_ALGORITHM"
  );
});

test("verification does not mutate the crystal", () => {
  const crystal = loadCrystal();
  const before = JSON.stringify(crystal);

  verifyCrystalLocalSources(crystal, { repoRoot });
  assert.equal(JSON.stringify(crystal), before);
});

test("source-integrity runtime contains no network, process execution or World Router invocation", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "src/crystal-source-integrity.mjs"),
    "utf8"
  );
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(
    source,
    /\b(exec|spawn|fork|routeWorld|buildWorldTransportRequest)\b/
  );
});
