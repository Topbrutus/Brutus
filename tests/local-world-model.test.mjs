import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  computeLocalWorldModelSignature,
  validateLocalWorldModel
} from "../src/local-world-model.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function loadReference() {
  const file = path.join(
    here,
    "../examples/world/LOCAL-WORLD-MODEL-FMIN-Q0001-0001.json"
  );
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function gitBlobSha(bytes) {
  const header = Buffer.from("blob " + bytes.length + "\0", "utf8");
  return createHash("sha1")
    .update(Buffer.concat([header, bytes]))
    .digest("hex");
}

test("reference local world model validates and is deeply immutable", () => {
  const model = validateLocalWorldModel(loadReference());

  assert.equal(model.SELF.QUEEN_ID, "FOURMINIZER-QUEEN-0001");
  assert.equal(model.SELF.ANT_ID, "ANT-000000000001");
  assert.equal(model.POSITION, "W:START");
  assert.equal(model.OMNISCIENT, false);
  assert.equal(Object.isFrozen(model), true);
  assert.equal(Object.isFrozen(model.SELF), true);
  assert.equal(Object.isFrozen(model.UNKNOWN_ZONES), true);
});

test("signature detects silent mutation", () => {
  const model = loadReference();
  assert.equal(
    model.SIGNATURE_H256,
    computeLocalWorldModelSignature(model)
  );

  model.POSITION = "W:OTHER";
  assert.throws(
    () => validateLocalWorldModel(model),
    /SIGNATURE_H256 mismatch/
  );
});

test("dependency pins match exact merged Git blob bytes", () => {
  const model = loadReference();

  const pins = [
    ["BRUTUS_CODE", "../contracts/brutus-code.v0.schema.json"],
    ["QUEEN_CRYSTAL", "../contracts/fourminizer-queen-crystal.v0.schema.json"],
    ["TRACE", "../contracts/brutus-trace.v0.schema.json"]
  ];

  for (const [name, relative] of pins) {
    const bytes = fs.readFileSync(path.join(here, relative));
    assert.equal(
      gitBlobSha(bytes),
      model.CONTRACT_PINS[name].BLOB_SHA
    );
  }
});

test("clock authority remains Queen server only", () => {
  const model = loadReference();
  model.CLOCK_AUTHORITY = "LOCAL";
  model.SIGNATURE_H256 = computeLocalWorldModelSignature(model);

  assert.throws(
    () => validateLocalWorldModel(model),
    /CLOCK_AUTHORITY must be QUEEN_SERVER_V0_2/
  );
});

test("available parts must already be known objects", () => {
  const model = loadReference();
  model.AVAILABLE_PARTS = ["P:999"];
  model.SIGNATURE_H256 = computeLocalWorldModelSignature(model);

  assert.throws(
    () => validateLocalWorldModel(model),
    /AVAILABLE_PARTS must be a subset of KNOWN_OBJECTS/
  );
});

test("current position cannot simultaneously be unknown", () => {
  const model = loadReference();
  model.UNKNOWN_ZONES.push("W:START");
  model.UNCERTAINTY.UNKNOWN_ZONE_COUNT = model.UNKNOWN_ZONES.length;
  model.SIGNATURE_H256 = computeLocalWorldModelSignature(model);

  assert.throws(
    () => validateLocalWorldModel(model),
    /POSITION cannot simultaneously be an UNKNOWN_ZONE/
  );
});

test("uncertainty count must match the explicit unknown-zone list", () => {
  const model = loadReference();
  model.UNCERTAINTY.UNKNOWN_ZONE_COUNT = 99;
  model.SIGNATURE_H256 = computeLocalWorldModelSignature(model);

  assert.throws(
    () => validateLocalWorldModel(model),
    /UNKNOWN_ZONE_COUNT must equal UNKNOWN_ZONES length/
  );
});

test("world model cannot claim omniscience or raw external access", () => {
  const omniscient = loadReference();
  omniscient.OMNISCIENT = true;
  omniscient.SIGNATURE_H256 = computeLocalWorldModelSignature(omniscient);
  assert.throws(
    () => validateLocalWorldModel(omniscient),
    /OMNISCIENT must be false/
  );

  const raw = loadReference();
  raw.RAW_EXTERNAL_READ = true;
  raw.SIGNATURE_H256 = computeLocalWorldModelSignature(raw);
  assert.throws(
    () => validateLocalWorldModel(raw),
    /RAW_EXTERNAL_READ must be false/
  );
});

test("future gates can only be CLOSED or UNKNOWN in v0.1", () => {
  const model = loadReference();
  model.GATE_STATES[0].STATE = "OPEN";
  model.SIGNATURE_H256 = computeLocalWorldModelSignature(model);

  assert.throws(
    () => validateLocalWorldModel(model),
    /unsupported GATE_STATES state/
  );
});

test("local machine remains unbound until its own contract exists", () => {
  const model = loadReference();
  model.LOCAL_MACHINE.ID = "M:FMIN-01";
  model.SIGNATURE_H256 = computeLocalWorldModelSignature(model);

  assert.throws(
    () => validateLocalWorldModel(model),
    /LOCAL_MACHINE.ID must remain null in v0.1/
  );
});

test("known paths must be observed, typed and non-self-looping", () => {
  const selfLoop = loadReference();
  selfLoop.KNOWN_PATHS = [
    {
      FROM: "W:START",
      TO: "W:START",
      STATE: "OBSERVED_OPEN"
    }
  ];
  selfLoop.SIGNATURE_H256 = computeLocalWorldModelSignature(selfLoop);
  assert.throws(
    () => validateLocalWorldModel(selfLoop),
    /KNOWN_PATHS cannot self-loop/
  );

  const guessed = loadReference();
  guessed.KNOWN_PATHS = [
    {
      FROM: "W:START",
      TO: "W:NORTH",
      STATE: "GUESSED_OPEN"
    }
  ];
  guessed.SIGNATURE_H256 = computeLocalWorldModelSignature(guessed);
  assert.throws(
    () => validateLocalWorldModel(guessed),
    /unsupported KNOWN_PATHS state/
  );
});

test("unknown fields and free-form additions fail closed", () => {
  const model = loadReference();
  model.DESCRIPTION = "I know everything";

  assert.throws(
    () => validateLocalWorldModel(model),
    /unknown local world model field DESCRIPTION/
  );
});

test("model cannot claim proof, gate or routing authority", () => {
  for (const [field, value, pattern] of [
    ["PROOF_REF", "proofs/x.json", /PROOF_REF must be null/],
    ["PROOF_CLAIM", true, /PROOF_CLAIM must be false/],
    ["GATE_AUTHORITY", true, /GATE_AUTHORITY must be false/],
    ["ROUTING_AUTHORIZATION", "ALLOWED", /ROUTING_AUTHORIZATION must be UNDECIDED/],
    ["EXECUTABLE", true, /EXECUTABLE must be false/]
  ]) {
    const model = loadReference();
    model[field] = value;
    model.SIGNATURE_H256 = computeLocalWorldModelSignature(model);
    assert.throws(() => validateLocalWorldModel(model), pattern);
  }
});

test("synthetic fixture stays explicit and does not pretend to be runtime perception", () => {
  const model = validateLocalWorldModel(loadReference());

  assert.equal(model.SNAPSHOT_CLASS, "SYNTHETIC_FIXTURE");
  assert.equal(model.UNCERTAINTY.BASIS, "LOCAL_OBSERVATION_ONLY");
  assert.equal(model.GATE_STATES.every(g => g.STATE === "UNKNOWN"), true);
});

test("local world model runtime has no network, process execution or World Router invocation", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/local-world-model.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(
    source,
    /\b(exec|spawn|fork|routeWorld|buildWorldTransportRequest)\b/
  );
});
