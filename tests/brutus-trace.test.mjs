import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  computeBrutusTraceSignature,
  validateBrutusTrace
} from "../src/brutus-trace.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function loadReference() {
  const file = path.join(
    here,
    "../examples/traces/TRACE-FMIN-Q0001-0001.json"
  );
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

test("reference trace validates and is deeply immutable", () => {
  const trace = validateBrutusTrace(loadReference());

  assert.equal(trace.TRACE_ID, "TRACE-FMIN-Q0001-0001");
  assert.equal(trace.ANT_ID, "ANT-000000000001");
  assert.equal(trace.ACTION, "QUERY");
  assert.equal(trace.PROOF_REF, null);
  assert.equal(Object.isFrozen(trace), true);
  assert.equal(Object.isFrozen(trace.INPUT_OBJECTS), true);
});

test("trace signature detects silent mutation", () => {
  const trace = loadReference();
  assert.equal(trace.SIGNATURE_H256, computeBrutusTraceSignature(trace));

  trace.POSITION = "W:OTHER";
  assert.throws(() => validateBrutusTrace(trace), /SIGNATURE_H256 mismatch/);
});

test("tick authority is Queen server only", () => {
  const trace = loadReference();
  trace.CLOCK_AUTHORITY = "LOCAL";
  trace.SIGNATURE_H256 = computeBrutusTraceSignature(trace);

  assert.throws(
    () => validateBrutusTrace(trace),
    /CLOCK_AUTHORITY must be QUEEN_SERVER_V0_2/
  );
});

test("trace action must already exist in Brutus Code", () => {
  const trace = loadReference();
  trace.ACTION = "DREAM";
  trace.SIGNATURE_H256 = computeBrutusTraceSignature(trace);

  assert.throws(
    () => validateBrutusTrace(trace),
    /ACTION must exist in Brutus Code v0.1/
  );
});

test("object references are typed, bounded and unique", () => {
  const invalid = loadReference();
  invalid.INPUT_OBJECTS = ["hello"];
  invalid.SIGNATURE_H256 = computeBrutusTraceSignature(invalid);
  assert.throws(
    () => validateBrutusTrace(invalid),
    /INPUT_OBJECTS contains invalid object reference/
  );

  const duplicate = loadReference();
  duplicate.INPUT_OBJECTS = ["P:184", "P:184"];
  duplicate.SIGNATURE_H256 = computeBrutusTraceSignature(duplicate);
  assert.throws(
    () => validateBrutusTrace(duplicate),
    /INPUT_OBJECTS cannot contain duplicates/
  );
});

test("success and confidence are bounded integers", () => {
  const success = loadReference();
  success.SUCCESS_LEVEL = 101;
  success.SIGNATURE_H256 = computeBrutusTraceSignature(success);
  assert.throws(
    () => validateBrutusTrace(success),
    /SUCCESS_LEVEL must be an integer from 0 to 100/
  );

  const confidence = loadReference();
  confidence.CONFIDENCE = -1;
  confidence.SIGNATURE_H256 = computeBrutusTraceSignature(confidence);
  assert.throws(
    () => validateBrutusTrace(confidence),
    /CONFIDENCE must be an integer from 0 to 100/
  );
});

test("parent trace and message links are typed when present", () => {
  const parent = loadReference();
  parent.PARENT_TRACE = "bad";
  parent.SIGNATURE_H256 = computeBrutusTraceSignature(parent);
  assert.throws(() => validateBrutusTrace(parent), /invalid PARENT_TRACE/);

  const message = loadReference();
  message.MESSAGE_ID = "bad";
  message.SIGNATURE_H256 = computeBrutusTraceSignature(message);
  assert.throws(() => validateBrutusTrace(message), /invalid MESSAGE_ID/);
});

test("TRACE v0.1 cannot claim proof, gate or routing authority", () => {
  for (const [field, value, pattern] of [
    ["PROOF_REF", "proofs/x.json", /PROOF_REF must be null/],
    ["PROOF_CLAIM", true, /PROOF_CLAIM must be false/],
    ["GATE_AUTHORITY", true, /GATE_AUTHORITY must be false/],
    ["ROUTING_AUTHORIZATION", "ALLOWED", /ROUTING_AUTHORIZATION must be UNDECIDED/],
    ["EXECUTABLE", true, /EXECUTABLE must be false/]
  ]) {
    const trace = loadReference();
    trace[field] = value;
    trace.SIGNATURE_H256 = computeBrutusTraceSignature(trace);
    assert.throws(() => validateBrutusTrace(trace), pattern);
  }
});

test("unknown fields fail closed, including free-form text", () => {
  const trace = loadReference();
  trace.TEXT = "bonjour";

  assert.throws(
    () => validateBrutusTrace(trace),
    /unknown trace field TEXT/
  );
});

test("synthetic fixture is explicit and is not runtime evidence", () => {
  const trace = validateBrutusTrace(loadReference());
  assert.equal(trace.TRACE_CLASS, "SYNTHETIC_FIXTURE");
  assert.equal(trace.RESULT, "UNKNOWN");
  assert.equal(trace.CONFIDENCE, 0);
  assert.equal(trace.PROOF_CLAIM, false);
});

test("trace runtime contains no network, process execution or World Router invocation", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/brutus-trace.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(
    source,
    /\b(exec|spawn|fork|routeWorld|buildWorldTransportRequest)\b/
  );
});
