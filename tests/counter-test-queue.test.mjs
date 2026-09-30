import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createAstraStation, loadPrototypeManifestFromFile } from "../src/anchor-station.mjs";
import { createAnchorLedger } from "../src/anchor-ledger.mjs";
import { createCounterTestQueue } from "../src/counter-test-queue.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(here, relative), "utf8"));
}

function buildBench() {
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

  return {
    station,
    ledger,
    queue: createCounterTestQueue({ station, ledger })
  };
}

test("counter-test bench registers with no Verso card and no auto execution", () => {
  const station = createAstraStation();
  const prototype = loadPrototypeManifestFromFile(
    path.join(here, "../examples/prototypes/BRUTUS-PROTOTYPE-COUNTER-TEST-BENCH-0001.json")
  );
  const registered = station.registerPrototype(prototype);

  assert.deepEqual(registered.CARD_IDS, []);
  assert.equal(registered.PARAMETERS.mode, "PLAN_ONLY");
  assert.equal(registered.PARAMETERS.auto_execute, false);
  assert.equal(registered.PARAMETERS.auto_promote_to_proof, false);
  assert.equal(registered.PARAMETERS.live_ant_routing, "DENIED");
});

test("369 / 396 and L8 plans register against existing intake records", () => {
  const { queue } = buildBench();

  const z = queue.register(
    readJson("../examples/counter-tests/BRUTUS-COUNTER-TEST-ZELSTEREOS-369-396-0001.json")
  );
  const l8 = queue.register(
    readJson("../examples/counter-tests/BRUTUS-COUNTER-TEST-BRUTUS-PELL-L8-0001.json")
  );

  assert.equal(z.PRIORITY, "P0");
  assert.equal(l8.PRIORITY, "P0");
  assert.equal(z.AUTO_EXECUTE, false);
  assert.equal(l8.PROOF_PROMOTION, "MANUAL_AFTER_VERIFICATION");

  const snapshot = queue.snapshot();
  assert.equal(snapshot.MODE, "PLAN_ONLY");
  assert.equal(snapshot.PLAN_COUNT, 2);
  assert.equal(snapshot.READY_COUNT, 2);
  assert.equal(snapshot.BLOCKED_COUNT, 0);
  assert.equal(snapshot.AUTO_EXECUTE, false);
});

test("plan cannot reference a missing source record", () => {
  const { queue } = buildBench();
  const bad = readJson("../examples/counter-tests/BRUTUS-COUNTER-TEST-ZELSTEREOS-369-396-0001.json");
  bad.SOURCE_RECORD_IDS = ["BRUTUS-RECORD-MISSING-0001"];

  assert.throws(
    () => queue.register(bad),
    /unknown SOURCE_RECORD_ID/
  );
});

test("plan cannot enable auto execution", () => {
  const { queue } = buildBench();
  const bad = readJson("../examples/counter-tests/BRUTUS-COUNTER-TEST-ZELSTEREOS-369-396-0001.json");
  bad.AUTO_EXECUTE = true;

  assert.throws(
    () => queue.register(bad),
    /AUTO_EXECUTE must be false/
  );
});

test("plan cannot auto-promote results to proof", () => {
  const { queue } = buildBench();
  const bad = readJson("../examples/counter-tests/BRUTUS-COUNTER-TEST-BRUTUS-PELL-L8-0001.json");
  bad.PROOF_PROMOTION = "AUTO";

  assert.throws(
    () => queue.register(bad),
    /PROOF_PROMOTION must be MANUAL_AFTER_VERIFICATION/
  );
});

test("plan is data-only and rejects credential-shaped fields", () => {
  const { queue } = buildBench();

  const executable = readJson("../examples/counter-tests/BRUTUS-COUNTER-TEST-ZELSTEREOS-369-396-0001.json");
  executable.RUN = () => "no";
  assert.throws(
    () => queue.register(executable),
    /must contain data only/
  );

  const secret = readJson("../examples/counter-tests/BRUTUS-COUNTER-TEST-ZELSTEREOS-369-396-0001.json");
  secret.CHECKS[0].secret = "no";
  assert.throws(
    () => queue.register(secret),
    /forbidden credential field secret/
  );
});

test("queue plans are immutable and expose no update/delete/execute methods", () => {
  const { queue } = buildBench();
  const plan = queue.register(
    readJson("../examples/counter-tests/BRUTUS-COUNTER-TEST-ZELSTEREOS-369-396-0001.json")
  );

  assert.equal(Object.isFrozen(plan), true);
  assert.equal("update" in queue, false);
  assert.equal("delete" in queue, false);
  assert.equal("execute" in queue, false);
  assert.equal("run" in queue, false);
});

test("counter-test runtime contains no network, process execution or World Router invocation", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/counter-test-queue.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\b(exec|spawn|fork|routeWorld|buildWorldTransportRequest)\b/);
});
