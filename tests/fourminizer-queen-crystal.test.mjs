import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  computeFourminizerQueenSignature,
  validateFourminizerQueenCrystal
} from "../src/fourminizer-queen-crystal.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function loadReference() {
  const file = path.join(
    here,
    "../examples/fourminizer/FOURMINIZER-QUEEN-CRYSTAL-0001.json"
  );
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function gitBlobSha(bytes) {
  const header = Buffer.from("blob " + bytes.length + "\0", "utf8");
  return createHash("sha1")
    .update(Buffer.concat([header, bytes]))
    .digest("hex");
}

test("reference Fourminizer queen crystal validates and is deeply immutable", () => {
  const crystal = validateFourminizerQueenCrystal(loadReference());

  assert.equal(crystal.QUEEN_ID, "FOURMINIZER-QUEEN-0001");
  assert.equal(crystal.ANT_ID, "ANT-000000000001");
  assert.equal(crystal.TEACHER.ENTITY, "@JEV");
  assert.equal(crystal.HANDOFF.TARGET, "@BRUTUS");
  assert.equal(crystal.HANDOFF.STATE, "NOT_READY");
  assert.equal(Object.isFrozen(crystal), true);
  assert.equal(Object.isFrozen(crystal.TEACHER), true);
  assert.equal(Object.isFrozen(crystal.PEDIGREE), true);
  assert.equal(Object.isFrozen(crystal.TASK_GRAPH.ACTIONS), true);
});

test("signature covers the immutable birth crystal except the signature field itself", () => {
  const crystal = loadReference();
  assert.equal(
    crystal.SIGNATURE_H256,
    computeFourminizerQueenSignature(crystal)
  );

  crystal.QUEEN_ID = "FOURMINIZER-QUEEN-0002";
  assert.throws(
    () => validateFourminizerQueenCrystal(crystal),
    /SIGNATURE_H256 mismatch/
  );
});

test("Brutus Code contract is pinned to the exact Git blob bytes", () => {
  const crystal = loadReference();
  const contractPath = path.join(
    here,
    "../contracts/brutus-code.v0.schema.json"
  );
  const bytes = fs.readFileSync(contractPath);

  assert.equal(
    gitBlobSha(bytes),
    crystal.BRUTUS_CODE_BLOB_SHA
  );
});

test("teacher is JEV only and cannot speak natural language inside the protocol", () => {
  const wrongTeacher = loadReference();
  wrongTeacher.TEACHER.ENTITY = "@OTHER";
  wrongTeacher.SIGNATURE_H256 = computeFourminizerQueenSignature(wrongTeacher);
  assert.throws(
    () => validateFourminizerQueenCrystal(wrongTeacher),
    /TEACHER.ENTITY must be @JEV/
  );

  const natural = loadReference();
  natural.TEACHER.NATURAL_LANGUAGE = true;
  natural.SIGNATURE_H256 = computeFourminizerQueenSignature(natural);
  assert.throws(
    () => validateFourminizerQueenCrystal(natural),
    /TEACHER.NATURAL_LANGUAGE must be false/
  );
});

test("handoff begins not ready and preserves identity plus memory", () => {
  const readyTooSoon = loadReference();
  readyTooSoon.HANDOFF.STATE = "READY";
  readyTooSoon.SIGNATURE_H256 = computeFourminizerQueenSignature(readyTooSoon);
  assert.throws(
    () => validateFourminizerQueenCrystal(readyTooSoon),
    /HANDOFF.STATE must begin at NOT_READY/
  );

  const memoryLoss = loadReference();
  memoryLoss.HANDOFF.PRESERVE_MEMORY = false;
  memoryLoss.SIGNATURE_H256 = computeFourminizerQueenSignature(memoryLoss);
  assert.throws(
    () => validateFourminizerQueenCrystal(memoryLoss),
    /PRESERVE_MEMORY must be true/
  );
});

test("mathematical code is symbolic numeric data only, never executable", () => {
  const invalid = loadReference();
  invalid.MATH_CODE.TOKENS = ["formula:x+1"];
  invalid.SIGNATURE_H256 = computeFourminizerQueenSignature(invalid);
  assert.throws(
    () => validateFourminizerQueenCrystal(invalid),
    /accepts Brutus numeric tokens only/
  );

  const executable = loadReference();
  executable.MATH_CODE.EXECUTABLE = true;
  executable.SIGNATURE_H256 = computeFourminizerQueenSignature(executable);
  assert.throws(
    () => validateFourminizerQueenCrystal(executable),
    /MATH_CODE.EXECUTABLE must be false/
  );
});

test("founder pedigree starts at generation zero without parent or recycle history", () => {
  const parented = loadReference();
  parented.PEDIGREE.PARENT_ID = "ANT-FFFFFFFFFFFF";
  parented.SIGNATURE_H256 = computeFourminizerQueenSignature(parented);
  assert.throws(
    () => validateFourminizerQueenCrystal(parented),
    /founder PEDIGREE.PARENT_ID must be null/
  );

  const recycled = loadReference();
  recycled.PEDIGREE.RECYCLE_COUNT = 1;
  recycled.SIGNATURE_H256 = computeFourminizerQueenSignature(recycled);
  assert.throws(
    () => validateFourminizerQueenCrystal(recycled),
    /founder PEDIGREE.RECYCLE_COUNT must be 0/
  );

  const badLineage = loadReference();
  badLineage.PEDIGREE.LINEAGE = ["L:14"];
  badLineage.SIGNATURE_H256 = computeFourminizerQueenSignature(badLineage);
  assert.throws(
    () => validateFourminizerQueenCrystal(badLineage),
    /invalid PEDIGREE.LINEAGE value/
  );
});

test("task graph is declarative and limited to Brutus Code actions", () => {
  const mutate = loadReference();
  mutate.TASK_GRAPH.MUTATES_ENGINE = true;
  mutate.SIGNATURE_H256 = computeFourminizerQueenSignature(mutate);
  assert.throws(
    () => validateFourminizerQueenCrystal(mutate),
    /TASK_GRAPH.MUTATES_ENGINE must be false/
  );

  const unknown = loadReference();
  unknown.TASK_GRAPH.ACTIONS = ["DREAM"];
  unknown.SIGNATURE_H256 = computeFourminizerQueenSignature(unknown);
  assert.throws(
    () => validateFourminizerQueenCrystal(unknown),
    /TASK_GRAPH.ACTIONS contains unsupported value DREAM/
  );
});

test("required receptors and local-machine port cannot silently disappear", () => {
  const noTrace = loadReference();
  noTrace.RECEPTORS = noTrace.RECEPTORS.filter(item => item !== "TRACE");
  noTrace.SIGNATURE_H256 = computeFourminizerQueenSignature(noTrace);
  assert.throws(
    () => validateFourminizerQueenCrystal(noTrace),
    /RECEPTORS must include TRACE/
  );

  const noMachine = loadReference();
  noMachine.TOOL_PORTS = ["RECYCLE_BASIN"];
  noMachine.SIGNATURE_H256 = computeFourminizerQueenSignature(noMachine);
  assert.throws(
    () => validateFourminizerQueenCrystal(noMachine),
    /TOOL_PORTS must include LOCAL_MACHINE/
  );
});

test("local machine stays unbound until its own contract exists", () => {
  const premature = loadReference();
  premature.LOCAL_MACHINE_ID = "M:FMIN-01";
  premature.SIGNATURE_H256 = computeFourminizerQueenSignature(premature);

  assert.throws(
    () => validateFourminizerQueenCrystal(premature),
    /LOCAL_MACHINE_ID must be null until its contract exists/
  );
});

test("queen crystal cannot self-authorize routing, proof promotion, gate access or execution", () => {
  for (const [field, value, pattern] of [
    ["EXECUTABLE", true, /EXECUTABLE must be false/],
    ["AUTO_PROOF_PROMOTION", true, /AUTO_PROOF_PROMOTION must be false/],
    ["GATE_AUTHORITY", true, /GATE_AUTHORITY must be false/],
    ["ROUTING_AUTHORIZATION", "ALLOWED", /ROUTING_AUTHORIZATION must begin at UNDECIDED/]
  ]) {
    const crystal = loadReference();
    crystal[field] = value;
    crystal.SIGNATURE_H256 = computeFourminizerQueenSignature(crystal);
    assert.throws(() => validateFourminizerQueenCrystal(crystal), pattern);
  }
});

test("external raw memory remains blocked while trace writing is enabled", () => {
  const rawRead = loadReference();
  rawRead.MEMORY_POLICY.RAW_EXTERNAL_READ = true;
  rawRead.SIGNATURE_H256 = computeFourminizerQueenSignature(rawRead);
  assert.throws(
    () => validateFourminizerQueenCrystal(rawRead),
    /RAW_EXTERNAL_READ must be false/
  );

  const noTraceWrite = loadReference();
  noTraceWrite.MEMORY_POLICY.TRACE_WRITE = false;
  noTraceWrite.SIGNATURE_H256 = computeFourminizerQueenSignature(noTraceWrite);
  assert.throws(
    () => validateFourminizerQueenCrystal(noTraceWrite),
    /TRACE_WRITE must be true/
  );
});

test("credential-shaped fields are rejected anywhere in the crystal", () => {
  const crystal = loadReference();
  crystal.TEACHER.API_TOKEN = "no";

  assert.throws(
    () => validateFourminizerQueenCrystal(crystal),
    /forbidden credential field API_TOKEN/
  );
});

test("unknown top-level fields fail closed", () => {
  const crystal = loadReference();
  crystal.BACKDOOR = false;

  assert.throws(
    () => validateFourminizerQueenCrystal(crystal),
    /unknown queen crystal field BACKDOOR/
  );
});

test("resource budget is bounded and pinned to Brutus Code message limits", () => {
  const actions = loadReference();
  actions.RESOURCE_BUDGET.MAX_ACTIONS_PER_CYCLE = 17;
  actions.SIGNATURE_H256 = computeFourminizerQueenSignature(actions);
  assert.throws(
    () => validateFourminizerQueenCrystal(actions),
    /MAX_ACTIONS_PER_CYCLE must be 1..16/
  );

  const args = loadReference();
  args.RESOURCE_BUDGET.MAX_MESSAGE_ARGS = 17;
  args.SIGNATURE_H256 = computeFourminizerQueenSignature(args);
  assert.throws(
    () => validateFourminizerQueenCrystal(args),
    /MAX_MESSAGE_ARGS must match Brutus Code v0.1/
  );
});

test("queen crystal runtime contains no network, process execution or World Router invocation", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/fourminizer-queen-crystal.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(
    source,
    /\b(exec|spawn|fork|routeWorld|buildWorldTransportRequest)\b/
  );
});
