import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseBrutusCodeLine,
  renderBrutusCodeLine,
  validateBrutusCodeMessage
} from "../src/brutus-code.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function validMessage() {
  return {
    SCHEMA: "BRUTUS-CODE-MESSAGE-v0.1",
    VERSION: "0.1",
    MESSAGE_ID: "BCM-FOURMINIZER-0001",
    SENDER: "@FMIN-Q0001",
    RECIPIENT: "@JEV",
    ACTION: "QUERY",
    ARGS: ["P:184", "L:7"],
    MARKERS: ["?"],
    SIGNAL: "🟡",
    NATURAL_LANGUAGE: false,
    EXECUTABLE: false,
    PROOF_CLAIM: false,
    GATE_AUTHORITY: false
  };
}

test("valid Brutus Code message is accepted, frozen and rendered canonically", () => {
  const message = validateBrutusCodeMessage(validMessage());

  assert.equal(Object.isFrozen(message), true);
  assert.equal(Object.isFrozen(message.ARGS), true);
  assert.equal(Object.isFrozen(message.MARKERS), true);
  assert.equal(
    renderBrutusCodeLine(message),
    "@FMIN-Q0001 @JEV QUERY P:184 L:7 ? 🟡"
  );
});

test("canonical line parses back into a closed message", () => {
  const message = parseBrutusCodeLine(
    "@JEV @FMIN-Q0001 TEACH P:184 P:033 C:001 + 🟣",
    { messageId: "BCM-JEV-TEACH-0001" }
  );

  assert.equal(message.SENDER, "@JEV");
  assert.equal(message.RECIPIENT, "@FMIN-Q0001");
  assert.equal(message.ACTION, "TEACH");
  assert.deepEqual(message.ARGS, ["P:184", "P:033", "C:001"]);
  assert.deepEqual(message.MARKERS, ["+"]);
  assert.equal(message.SIGNAL, "🟣");
});

test("free natural-language tokens are rejected", () => {
  const message = validMessage();
  message.ARGS = ["bonjour"];
  assert.throws(
    () => validateBrutusCodeMessage(message),
    /unknown argument token bonjour/
  );

  assert.throws(
    () =>
      parseBrutusCodeLine(
        "@JEV @FMIN-Q0001 TEACH hello",
        { messageId: "BCM-NATURAL-LANGUAGE-0001" }
      ),
    /unknown argument token hello/
  );
});

test("unknown actions and symbols fail closed", () => {
  const action = validMessage();
  action.ACTION = "INVENT";
  assert.throws(() => validateBrutusCodeMessage(action), /unknown ACTION INVENT/);

  const signal = validMessage();
  signal.SIGNAL = "🙂";
  assert.throws(() => validateBrutusCodeMessage(signal), /unknown signal/);

  const marker = validMessage();
  marker.MARKERS = ["%"];
  assert.throws(() => validateBrutusCodeMessage(marker), /unknown marker/);
});

test("natural language, executable payloads, proof claims and gate authority are fixed false", () => {
  const natural = validMessage();
  natural.NATURAL_LANGUAGE = true;
  assert.throws(
    () => validateBrutusCodeMessage(natural),
    /NATURAL_LANGUAGE must be false/
  );

  const executable = validMessage();
  executable.EXECUTABLE = true;
  assert.throws(
    () => validateBrutusCodeMessage(executable),
    /EXECUTABLE must be false/
  );

  const proof = validMessage();
  proof.PROOF_CLAIM = true;
  assert.throws(
    () => validateBrutusCodeMessage(proof),
    /PROOF_CLAIM must be false/
  );

  const gate = validMessage();
  gate.GATE_AUTHORITY = true;
  assert.throws(
    () => validateBrutusCodeMessage(gate),
    /GATE_AUTHORITY must be false/
  );
});

test("unlock-looking signal is informational and never carries gate authority", () => {
  const message = validMessage();
  message.ACTION = "REPORT";
  message.MARKERS = ["="];
  message.SIGNAL = "🔓";

  const accepted = validateBrutusCodeMessage(message);
  assert.equal(accepted.SIGNAL, "🔓");
  assert.equal(accepted.GATE_AUTHORITY, false);
  assert.equal(accepted.PROOF_CLAIM, false);
});

test("QUERY must explicitly carry uncertainty", () => {
  const message = validMessage();
  message.MARKERS = [];
  message.SIGNAL = null;

  assert.throws(
    () => validateBrutusCodeMessage(message),
    /QUERY requires \? marker or ❓ signal/
  );
});

test("unknown fields are rejected instead of silently extending the language", () => {
  const message = validMessage();
  message.TEXT = "no";

  assert.throws(
    () => validateBrutusCodeMessage(message),
    /unknown message field TEXT/
  );
});

test("argument and marker limits are bounded", () => {
  const args = validMessage();
  args.ARGS = Array.from({ length: 17 }, (_, index) => "P:" + index);
  assert.throws(
    () => validateBrutusCodeMessage(args),
    /ARGS exceeds v0.1 limit/
  );

  const markers = validMessage();
  markers.MARKERS = ["?", "!", "+", "-", "="];
  assert.throws(
    () => validateBrutusCodeMessage(markers),
    /MARKERS exceeds v0.1 limit/
  );

  const duplicate = validMessage();
  duplicate.MARKERS = ["?", "?"];
  assert.throws(
    () => validateBrutusCodeMessage(duplicate),
    /MARKERS cannot contain duplicates/
  );
});

test("parser rejects non-canonical whitespace and misplaced symbols", () => {
  assert.throws(
    () =>
      parseBrutusCodeLine(
        "@FMIN-Q0001  @JEV QUERY P:184 ?",
        { messageId: "BCM-WHITESPACE-0001" }
      ),
    /canonical single-space formatting/
  );

  assert.throws(
    () =>
      parseBrutusCodeLine(
        "@FMIN-Q0001 @JEV QUERY ? P:184",
        { messageId: "BCM-MISPLACED-0001" }
      ),
    /markers and signals must appear after arguments/
  );
});

test("reference example validates and round-trips", () => {
  const file = path.join(
    here,
    "../examples/brutus-code/BRUTUS-CODE-MESSAGE-FOURMINIZER-0001.json"
  );
  const message = validateBrutusCodeMessage(
    JSON.parse(fs.readFileSync(file, "utf8"))
  );

  const line = renderBrutusCodeLine(message);
  const parsed = parseBrutusCodeLine(line, {
    messageId: "BCM-ROUNDTRIP-0001"
  });

  assert.equal(parsed.SENDER, message.SENDER);
  assert.equal(parsed.RECIPIENT, message.RECIPIENT);
  assert.equal(parsed.ACTION, message.ACTION);
  assert.deepEqual(parsed.ARGS, message.ARGS);
  assert.deepEqual(parsed.MARKERS, message.MARKERS);
  assert.equal(parsed.SIGNAL, message.SIGNAL);
});

test("Brutus Code runtime has no network, process execution or World Router invocation", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/brutus-code.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(
    source,
    /\b(exec|spawn|fork|routeWorld|buildWorldTransportRequest)\b/
  );
});
