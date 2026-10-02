import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  createFourminizerStartupRuntime,
  validateFourminizerLiveEvent,
  BRUTUS_FOURMINIZER_STARTUP_PINS
} from "../src/fourminizer-startup-runtime.mjs";

import {
  computeLocalWorldModelSignature
} from "../src/local-world-model.mjs";

import {
  computeLocalMachineSignature
} from "../src/local-machine.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(here, relativePath), "utf8"));
}

function queenCrystal() {
  return readJson("../examples/fourminizer/FOURMINIZER-QUEEN-CRYSTAL-0001.json");
}

function localMachine() {
  return readJson("../examples/local-machine/LOCAL-MACHINE-FMIN-01.json");
}

function runtimeWorld(tick = 42) {
  const world = readJson("../examples/world/LOCAL-WORLD-MODEL-FMIN-Q0001-0001.json");
  world.SNAPSHOT_CLASS = "RUNTIME";
  world.OBSERVED_AT_TICK = tick;
  world.KNOWN_TRACES = [];
  world.PARENT_MODEL = null;
  world.SIGNATURE_H256 = computeLocalWorldModelSignature(world);
  return world;
}

function antBirthReceipt(antId = "ANT-000000000001") {
  const receipt = readJson("../fixtures/ants/ant-birth-receipt.json");
  receipt.ant_id = antId;
  receipt.project_soul.memory_id = "MEM-FOURMINIZER-QUEEN-0001";
  receipt.project_soul.lineage = [antId];
  return receipt;
}

function clockEnvelope(tick = 42) {
  return {
    status: "FRESH",
    source_schema: "QUEEN_SERVER_V0_2",
    source_endpoint: "/api/state",
    entity_id: "QUEEN-SERVER-LIVE-0001",
    freshness_ms: 0,
    observed_at_utc: "2026-10-02T15:40:00.000Z",
    condition: "READY",
    payload: {
      source: "QUEEN_SERVER_V0_2",
      entity_id: "QUEEN-SERVER-LIVE-0001",
      tick_count: tick,
      generation: 0,
      queen_mode: "FOURMINIZER_STARTUP",
      integrity_match: true,
      reference_h256: "a".repeat(64)
    }
  };
}

function makeRuntime({
  tick = 42,
  receipt = antBirthReceipt(),
  world = runtimeWorld(tick),
  envelope = clockEnvelope(tick)
} = {}) {
  return createFourminizerStartupRuntime({
    readObservation: async () => structuredClone(envelope),
    readAntBirthReceipt: async () => structuredClone(receipt),
    readWorldModel: async () => structuredClone(world),
    retryPolicy: {
      maxAttempts: 1,
      baseDelayMs: 0,
      maxDelayMs: 0,
      sleep: async () => {}
    }
  });
}

function gitBlobSha(bytes) {
  const header = Buffer.from("blob " + bytes.length + "\0", "utf8");
  return createHash("sha1")
    .update(Buffer.concat([header, bytes]))
    .digest("hex");
}

test("startup runtime refuses to exist without real-reader interfaces", () => {
  assert.throws(
    () => createFourminizerStartupRuntime({
      readAntBirthReceipt: async () => antBirthReceipt(),
      readWorldModel: async () => runtimeWorld()
    }),
    /readObservation function is required/
  );

  assert.throws(
    () => createFourminizerStartupRuntime({
      readObservation: async () => clockEnvelope(),
      readWorldModel: async () => runtimeWorld()
    }),
    /readAntBirthReceipt function is required/
  );

  assert.throws(
    () => createFourminizerStartupRuntime({
      readObservation: async () => clockEnvelope(),
      readAntBirthReceipt: async () => antBirthReceipt()
    }),
    /readWorldModel function is required/
  );
});

test("one validated cycle emits one runtime trace and one read-only live event", async () => {
  const runtime = makeRuntime();
  const result = await runtime.runCycle({
    queenCrystal: queenCrystal(),
    localMachine: localMachine()
  });

  assert.equal(result.STATUS, "STOPPED_AFTER_ONE_REAL_CYCLE");
  assert.equal(result.REAL_INPUT_REQUIRED, true);
  assert.equal(result.QUEEN.ANT_ID, "ANT-000000000001");
  assert.equal(result.CLOCK.TICK, 42);
  assert.equal(result.WORLD.SNAPSHOT_CLASS, "RUNTIME");
  assert.equal(result.WORLD.OBSERVED_AT_TICK, 42);

  assert.equal(result.LOCAL_MACHINE.STATE, "DORMANT");
  assert.equal(result.LOCAL_MACHINE.BOUND, false);
  assert.equal(result.LOCAL_MACHINE.EXECUTED, false);

  assert.equal(result.TRACE.TRACE_CLASS, "RUNTIME");
  assert.equal(result.TRACE.ACTION, "READ");
  assert.equal(result.TRACE.TICK, 42);
  assert.equal(result.TRACE.PROOF_REF, null);

  assert.equal(result.LIVE_EVENTS.length, 1);
  const event = result.LIVE_EVENTS[0];
  assert.equal(event.EVENT_CLASS, "RUNTIME");
  assert.equal(event.EVENT_TYPE, "STARTUP_OBSERVED");
  assert.equal(event.TICK, 42);
  assert.equal(event.POSITION, "W:START");
  assert.equal(event.MOTION, null);
  assert.equal(event.TRACE_ID, result.TRACE.TRACE_ID);
  assert.equal(event.PROOF_CLAIM, false);
  assert.equal(event.GATE_AUTHORITY, false);

  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.TRACE), true);
  assert.equal(Object.isFrozen(event), true);
});

test("startup runtime is one-cycle only", async () => {
  const runtime = makeRuntime();

  await runtime.runCycle({
    queenCrystal: queenCrystal(),
    localMachine: localMachine()
  });

  await assert.rejects(
    () => runtime.runCycle({
      queenCrystal: queenCrystal(),
      localMachine: localMachine()
    }),
    /v0.1 runtime permits one cycle only/
  );
});

test("synthetic world model is rejected", async () => {
  const synthetic = readJson("../examples/world/LOCAL-WORLD-MODEL-FMIN-Q0001-0001.json");

  const runtime = makeRuntime({
    world: synthetic
  });

  await assert.rejects(
    () => runtime.runCycle({
      queenCrystal: queenCrystal(),
      localMachine: localMachine()
    }),
    /world model must be a RUNTIME snapshot/
  );
});

test("world snapshot must exactly match Queen clock tick", async () => {
  const runtime = makeRuntime({
    tick: 42,
    world: runtimeWorld(41),
    envelope: clockEnvelope(42)
  });

  await assert.rejects(
    () => runtime.runCycle({
      queenCrystal: queenCrystal(),
      localMachine: localMachine()
    }),
    /world snapshot tick must exactly equal Queen clock tick/
  );
});

test("live ant identity must match the Queen crystal", async () => {
  const runtime = makeRuntime({
    receipt: antBirthReceipt("ANT-0123456789AB")
  });

  await assert.rejects(
    () => runtime.runCycle({
      queenCrystal: queenCrystal(),
      localMachine: localMachine()
    }),
    /live ant identity does not match Queen crystal ANT_ID/
  );
});

test("local machine owner must match Queen identity", async () => {
  const machine = localMachine();
  machine.OWNER.ANT_ID = "ANT-0123456789AB";
  machine.SIGNATURE_H256 = computeLocalMachineSignature(machine);

  const runtime = makeRuntime();

  await assert.rejects(
    () => runtime.runCycle({
      queenCrystal: queenCrystal(),
      localMachine: machine
    }),
    /local machine owner does not match Queen identity/
  );
});

test("stale Queen clock cannot create a startup event", async () => {
  const envelope = clockEnvelope(42);
  envelope.status = "STALE";

  const runtime = makeRuntime({ envelope });

  await assert.rejects(
    () => runtime.runCycle({
      queenCrystal: queenCrystal(),
      localMachine: localMachine()
    }),
    /QUEEN_INGRESS_NOT_USABLE/
  );
});

test("integrity mismatch cannot create a startup event", async () => {
  const envelope = clockEnvelope(42);
  envelope.payload.integrity_match = false;

  const runtime = makeRuntime({ envelope });

  await assert.rejects(
    () => runtime.runCycle({
      queenCrystal: queenCrystal(),
      localMachine: localMachine()
    }),
    /QUEEN_INGRESS_DENIED: integrity_match=false/
  );
});

test("live event contract rejects invented motion in v0.1", async () => {
  const result = await makeRuntime().runCycle({
    queenCrystal: queenCrystal(),
    localMachine: localMachine()
  });

  const event = structuredClone(result.LIVE_EVENTS[0]);
  event.MOTION = {
    FROM: "W:START",
    TO: "W:NORTH"
  };

  assert.throws(
    () => validateFourminizerLiveEvent(event),
    /MOTION must remain null until a real motion contract exists/
  );
});

test("startup runtime pins exact merged contract bytes", () => {
  const files = {
    QUEEN_CRYSTAL: "../contracts/fourminizer-queen-crystal.v0.schema.json",
    LOCAL_WORLD_MODEL: "../contracts/local-world-model.v0.schema.json",
    LOCAL_MACHINE: "../contracts/local-machine.v0.schema.json",
    TRACE: "../contracts/brutus-trace.v0.schema.json",
    CLOCK_OBSERVATION: "../contracts/clock-observation.v0.schema.json"
  };

  for (const [name, relative] of Object.entries(files)) {
    const bytes = fs.readFileSync(path.join(here, relative));
    assert.equal(
      gitBlobSha(bytes),
      BRUTUS_FOURMINIZER_STARTUP_PINS[name].BLOB_SHA
    );
  }
});

test("production startup runtime contains no simulation or autonomous movement engine", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/fourminizer-startup-runtime.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /\bRandom\b/);
  assert.doesNotMatch(source, /\bSimProvider\b/);
  assert.doesNotMatch(source, /\bsetInterval\s*\(/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\b(exec|spawn|fork|routeWorld|buildWorldTransportRequest)\b/);
});

test("startup event carries no proof, gate or routing authority", async () => {
  const result = await makeRuntime().runCycle({
    queenCrystal: queenCrystal(),
    localMachine: localMachine()
  });

  const event = result.LIVE_EVENTS[0];
  assert.equal(event.PROOF_REF, null);
  assert.equal(event.PROOF_CLAIM, false);
  assert.equal(event.GATE_AUTHORITY, false);
  assert.equal(event.ROUTING_AUTHORIZATION, "UNDECIDED");

  assert.equal(result.PROOF_REF, null);
  assert.equal(result.PROOF_CLAIM, false);
  assert.equal(result.GATE_AUTHORITY, false);
  assert.equal(result.ROUTING_AUTHORIZATION, "UNDECIDED");
});
