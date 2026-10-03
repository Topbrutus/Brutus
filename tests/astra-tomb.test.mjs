import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { inspectAstraTombs } from "../src/continuity/astra-tomb.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

function copyRepoTomb() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "brutus-astra-tomb-"));
  fs.cpSync(path.join(repoRoot, "astra-tomb"), path.join(tmp, "astra-tomb"), {
    recursive: true
  });
  return tmp;
}

test("bootstrap reads both tombs and keeps one-generation trust lag", () => {
  const result = inspectAstraTombs(repoRoot, {
    liveHead: "d5267622b544d07b14e8cf12e7420402fe458772"
  });

  assert.equal(result.ok, true);
  assert.equal(result.mode, "ASTRA_OPERATIONAL");
  assert.deepEqual(result.defaultRestore, { tomb: "WHITE", generation: 1 });
  assert.deepEqual(result.newestCandidate, { tomb: "BLACK", generation: 2 });
  assert.deepEqual(result.discrepancies, []);
  assert.deepEqual(result.warnings, []);
});

test("an advanced live HEAD is reported and never silently normalized", () => {
  const result = inspectAstraTombs(repoRoot, { liveHead: "NEW-LIVE-HEAD" });

  assert.equal(result.ok, true);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0].code, "LIVE_STATE_DIFFERS_FROM_TOMB_ANCHOR");
});

test("divergent witness seed enters verification mode without auto-repair", () => {
  const tmp = copyRepoTomb();
  const blackSeed = path.join(
    tmp,
    "astra-tomb/black/generations/0002/CURRENT_SEED.md"
  );

  fs.appendFileSync(blackSeed, "\nSIMULATED_DIVERGENCE\n", "utf8");
  const before = fs.readFileSync(blackSeed, "utf8");

  const result = inspectAstraTombs(tmp);
  const after = fs.readFileSync(blackSeed, "utf8");

  assert.equal(result.ok, false);
  assert.equal(result.mode, "VERIFICATION_REQUIRED");
  assert.deepEqual(result.discrepancies, ["CURRENT_SEED.md"]);
  assert.equal(after, before);
});

test("missing second witness blocks Astra return", () => {
  const tmp = copyRepoTomb();
  fs.rmSync(path.join(tmp, "astra-tomb/black"), { recursive: true, force: true });

  assert.throws(
    () => inspectAstraTombs(tmp),
    /ASTRA_RETURN_BLOCKED: BLACK witness missing/
  );
});

test("tampering that enables auto-repair fails closed", () => {
  const tmp = copyRepoTomb();
  const controlPath = path.join(tmp, "astra-tomb/CONTROL.json");
  const control = JSON.parse(fs.readFileSync(controlPath, "utf8"));
  control.auto_repair_divergence = true;
  fs.writeFileSync(controlPath, JSON.stringify(control, null, 2));

  assert.throws(
    () => inspectAstraTombs(tmp),
    /ASTRA_RETURN_BLOCKED: auto repair must remain disabled/
  );
});
