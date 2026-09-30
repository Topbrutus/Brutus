import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeAntIdentity } from "../src/adapters/ant-birth-identity.mjs";
import {
  normalizeClockObservation,
  buildWorldTransportRequest
} from "../src/adapters/x72-world-bridge.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function loadJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(here, relative), "utf8"));
}

function antFixture() {
  return loadJson("../fixtures/ants/ant-birth-receipt.json");
}

function clockFixture() {
  return loadJson("../fixtures/x72/observation-envelope-state.json");
}

test("audited ANTMUX birth receipt normalizes to Brutus ANT identity", () => {
  const ant = normalizeAntIdentity(antFixture());

  assert.equal(ant.ANT_ID, "ANT-0123456789AB");
  assert.equal(ant.ROLE, "SYNAPSE");
  assert.equal(ant.LIFE_CLOCK_ASSIGNED, true);
  assert.equal(ant.BECOME_SYNAPSE_DONE, true);
  assert.equal(ant.ROUTING_AUTHORIZATION, "UNDECIDED");
});

test("invalid ANT_ID format is rejected", () => {
  const receipt = antFixture();
  receipt.ant_id = "QUEEN-X72-0072";

  assert.throws(() => normalizeAntIdentity(receipt), /invalid ant_id/);
});

test("lineage root must match ANT_ID", () => {
  const receipt = antFixture();
  receipt.project_soul.lineage = ["ANT-FFFFFFFFFFFF"];

  assert.throws(() => normalizeAntIdentity(receipt), /lineage root must equal ant_id/);
});

test("BECOME_SYNAPSE must be completed", () => {
  const receipt = antFixture();
  receipt.lifecycle.find(step => step.state === "BECOME_SYNAPSE").status = "WAITING";

  assert.throws(() => normalizeAntIdentity(receipt), /BECOME_SYNAPSE must be DONE/);
});

test("world transport uses Queen tick, never ant birth wallclock", () => {
  const ant = normalizeAntIdentity(antFixture());
  const clock = normalizeClockObservation(clockFixture());

  const request = buildWorldTransportRequest({
    observation: clock,
    antId: ant.ANT_ID,
    from: "MATTER/CARBON",
    to: "INFORMATION/CRYPTO",
    state: ant.STATE,
    proofRef: "PROOF-BRUTUS-ANT-CLOCK-0001",
    echo: "ECHO-BRUTUS-ANT-CLOCK-0001"
  });

  assert.equal(request.antId, ant.ANT_ID);
  assert.equal(request.tick, clock.TICK);
  assert.equal(request.tick, 273);
  assert.notEqual(request.tick, ant.BIRTH_WALLCLOCK_MS);
});

test("normalizing identity does not silently authorize routing", () => {
  const ant = normalizeAntIdentity(antFixture());
  assert.equal(ant.ROUTING_AUTHORIZATION, "UNDECIDED");
});
