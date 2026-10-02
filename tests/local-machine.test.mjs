import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  computeLocalMachineJobSignature,
  computeLocalMachineSignature,
  validateLocalMachine,
  validateLocalMachineJob
} from "../src/local-machine.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function loadMachine() {
  return JSON.parse(
    fs.readFileSync(
      path.join(here, "../examples/local-machine/LOCAL-MACHINE-FMIN-01.json"),
      "utf8"
    )
  );
}

function loadJob() {
  return JSON.parse(
    fs.readFileSync(
      path.join(here, "../examples/local-machine/LOCAL-MACHINE-JOB-FMIN-Q0001-0001.json"),
      "utf8"
    )
  );
}

function gitBlobSha(bytes) {
  const header = Buffer.from("blob " + bytes.length + "\0", "utf8");
  return createHash("sha1")
    .update(Buffer.concat([header, bytes]))
    .digest("hex");
}

test("reference local machine validates and is deeply immutable", () => {
  const machine = validateLocalMachine(loadMachine());

  assert.equal(machine.MACHINE_ID, "M:FMIN-01");
  assert.equal(machine.STATE, "DORMANT");
  assert.equal(machine.OWNER.ANT_ID, "ANT-000000000001");
  assert.equal(machine.WORKSPACE.MAX_CELLS, 343);
  assert.equal(Object.isFrozen(machine), true);
  assert.equal(Object.isFrozen(machine.WORKSPACE), true);
});

test("machine signature detects silent mutation", () => {
  const machine = loadMachine();
  assert.equal(machine.SIGNATURE_H256, computeLocalMachineSignature(machine));

  machine.WORKSPACE.MAX_SIDE = 8;
  assert.throws(
    () => validateLocalMachine(machine),
    /SIGNATURE_H256 mismatch|WORKSPACE.MAX_SIDE must be 7/
  );
});

test("machine pins exact merged dependency bytes", () => {
  const machine = loadMachine();
  const pins = [
    ["BRUTUS_CODE", "../contracts/brutus-code.v0.schema.json"],
    ["QUEEN_CRYSTAL", "../contracts/fourminizer-queen-crystal.v0.schema.json"],
    ["TRACE", "../contracts/brutus-trace.v0.schema.json"],
    ["LOCAL_WORLD_MODEL", "../contracts/local-world-model.v0.schema.json"]
  ];

  for (const [name, relative] of pins) {
    const bytes = fs.readFileSync(path.join(here, relative));
    assert.equal(
      gitBlobSha(bytes),
      machine.CONTRACT_PINS[name].BLOB_SHA
    );
  }
});

test("machine accepts only the initial six part families", () => {
  const machine = loadMachine();
  machine.ADMITTED_PART_TYPES.push("CHEVEU");
  machine.SIGNATURE_H256 = computeLocalMachineSignature(machine);

  assert.throws(
    () => validateLocalMachine(machine),
    /ADMITTED_PART_TYPES size outside v0.1 bounds|unsupported value CHEVEU/
  );
});

test("machine stays dormant and non-executable", () => {
  const active = loadMachine();
  active.STATE = "ACTIVE";
  active.SIGNATURE_H256 = computeLocalMachineSignature(active);
  assert.throws(() => validateLocalMachine(active), /STATE must begin at DORMANT/);

  const executable = loadMachine();
  executable.EXECUTABLE = true;
  executable.SIGNATURE_H256 = computeLocalMachineSignature(executable);
  assert.throws(() => validateLocalMachine(executable), /EXECUTABLE must be false/);
});

test("machine preserves pedigree and requires trace emission", () => {
  const pedigree = loadMachine();
  pedigree.INPUT_POLICY.PRESERVE_PEDIGREE = false;
  pedigree.SIGNATURE_H256 = computeLocalMachineSignature(pedigree);
  assert.throws(
    () => validateLocalMachine(pedigree),
    /INPUT_POLICY.PRESERVE_PEDIGREE must be true/
  );

  const trace = loadMachine();
  trace.TRACE_REQUIRED = false;
  trace.SIGNATURE_H256 = computeLocalMachineSignature(trace);
  assert.throws(() => validateLocalMachine(trace), /TRACE_REQUIRED must be true/);
});

test("reference local machine job validates and is deeply immutable", () => {
  const job = validateLocalMachineJob(loadJob());

  assert.equal(job.OPERATION, "ASSEMBLE");
  assert.equal(job.LAYOUT.DIMENSIONS, 2);
  assert.equal(job.LAYOUT.CELLS.length, 2);
  assert.equal(job.OUTPUT_PLAN.OUTPUT_TYPE, "CRISTAL");
  assert.equal(Object.isFrozen(job), true);
  assert.equal(Object.isFrozen(job.LAYOUT.CELLS), true);
});

test("job signature detects silent mutation", () => {
  const job = loadJob();
  assert.equal(job.SIGNATURE_H256, computeLocalMachineJobSignature(job));

  job.OUTPUT_PLAN.OUTPUT_TYPE = "BLOC";
  assert.throws(
    () => validateLocalMachineJob(job),
    /SIGNATURE_H256 mismatch/
  );
});

test("every input must be placed exactly once", () => {
  const missing = loadJob();
  missing.LAYOUT.CELLS.pop();
  missing.SIGNATURE_H256 = computeLocalMachineJobSignature(missing);
  assert.throws(
    () => validateLocalMachineJob(missing),
    /LAYOUT.CELLS must place every input exactly once/
  );

  const duplicate = loadJob();
  duplicate.LAYOUT.CELLS[1].PART_ID = "P:184";
  duplicate.SIGNATURE_H256 = computeLocalMachineJobSignature(duplicate);
  assert.throws(
    () => validateLocalMachineJob(duplicate),
    /LAYOUT cannot place a part twice/
  );
});

test("parts cannot overlap or leave the bounded workspace", () => {
  const overlap = loadJob();
  overlap.LAYOUT.CELLS[1].COORD = [0, 0];
  overlap.SIGNATURE_H256 = computeLocalMachineJobSignature(overlap);
  assert.throws(
    () => validateLocalMachineJob(overlap),
    /LAYOUT cannot overlap parts/
  );

  const outside = loadJob();
  outside.LAYOUT.CELLS[1].COORD = [2, 0];
  outside.SIGNATURE_H256 = computeLocalMachineJobSignature(outside);
  assert.throws(
    () => validateLocalMachineJob(outside),
    /LAYOUT.COORD outside workspace/
  );
});

test("output must be new and derive pedigree from every input", () => {
  const reused = loadJob();
  reused.OUTPUT_PLAN.OUTPUT_ID = "P:184";
  reused.SIGNATURE_H256 = computeLocalMachineJobSignature(reused);
  assert.throws(
    () => validateLocalMachineJob(reused),
    /OUTPUT_PLAN.OUTPUT_ID must be new/
  );

  const missingParent = loadJob();
  missingParent.OUTPUT_PLAN.PARENT_PARTS = ["P:184"];
  missingParent.SIGNATURE_H256 = computeLocalMachineJobSignature(missingParent);
  assert.throws(
    () => validateLocalMachineJob(missingParent),
    /PARENT_PARTS must include every input/
  );
});

test("recycle handoff flag must match operation", () => {
  const job = loadJob();
  job.RECYCLE_HANDOFF = true;
  job.SIGNATURE_H256 = computeLocalMachineJobSignature(job);

  assert.throws(
    () => validateLocalMachineJob(job),
    /RECYCLE_HANDOFF flag must match OPERATION/
  );
});

test("clock authority remains Queen server only", () => {
  const job = loadJob();
  job.CLOCK_AUTHORITY = "LOCAL";
  job.SIGNATURE_H256 = computeLocalMachineJobSignature(job);

  assert.throws(
    () => validateLocalMachineJob(job),
    /CLOCK_AUTHORITY must be QUEEN_SERVER_V0_2/
  );
});

test("job cannot claim proof, gate, routing or execution authority", () => {
  for (const [field, value, pattern] of [
    ["PROOF_REF", "proofs/x.json", /PROOF_REF must be null/],
    ["PROOF_CLAIM", true, /job PROOF_CLAIM must be false/],
    ["GATE_AUTHORITY", true, /job GATE_AUTHORITY must be false/],
    ["ROUTING_AUTHORIZATION", "ALLOWED", /job ROUTING_AUTHORIZATION must be UNDECIDED/],
    ["EXECUTABLE", true, /job EXECUTABLE must be false/]
  ]) {
    const job = loadJob();
    job[field] = value;
    job.SIGNATURE_H256 = computeLocalMachineJobSignature(job);
    assert.throws(() => validateLocalMachineJob(job), pattern);
  }
});

test("synthetic job does not pretend that fabrication already occurred", () => {
  const job = validateLocalMachineJob(loadJob());

  assert.equal(job.JOB_CLASS, "SYNTHETIC_FIXTURE");
  assert.equal(job.EXECUTABLE, false);
  assert.equal(job.PROOF_REF, null);
  assert.equal(job.TRACE_REQUIRED, true);
});

test("local machine runtime contains no network, process execution or World Router invocation", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/local-machine.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(
    source,
    /\b(exec|spawn|fork|routeWorld|buildWorldTransportRequest)\b/
  );
});
