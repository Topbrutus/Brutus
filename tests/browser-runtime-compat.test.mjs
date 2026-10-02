import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sha256HexUtf8 } from "../src/sha256-utf8.mjs";
import {
  computeRealMechanismEventSignature,
  validateRealMechanismEvent
} from "../src/real-mechanism-event.mjs";
import {
  validateFourminizerLiveEvent
} from "../src/fourminizer-live-event.mjs";
import {
  createReadOnlyLiveEventStream
} from "../src/read-only-live-event-stream.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

test("browser-safe SHA-256 matches standard vectors", () => {
  assert.equal(
    sha256HexUtf8(""),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  );
  assert.equal(
    sha256HexUtf8("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
  );
  assert.equal(
    sha256HexUtf8("Brutus ♥ 7⁷"),
    createHash("sha256").update("Brutus ♥ 7⁷").digest("hex")
  );
});

test("real mechanism signature remains byte-compatible with Node SHA-256", () => {
  const event = {
    SCHEMA: "BRUTUS-REAL-MECHANISM-EVENT-v0.1",
    VERSION: "0.1",
    EVENT_ID: "RME-T77-X72-LEFT-WHEEL",
    EVENT_CLASS: "RUNTIME_OBSERVATION",
    EVENT_TYPE: "WHEEL_PHASE",
    TICK: 77,
    CLOCK_AUTHORITY: "QUEEN_SERVER_V0_2",
    SOURCE: {
      OBSERVATION_ID: "OBS-X72-T77-LEFT-ABCDEF123456",
      SOURCE_SCHEMA: "QUEEN_SERVER_V0_2",
      SOURCE_ENDPOINT: "/laboratoire/embryon-x72/ws",
      OBSERVED_AT_UTC: "2026-10-02T17:30:00.000Z",
      INTEGRITY_MATCH: true
    },
    SUBJECT: {
      TYPE: "WHEEL",
      ID: "M:LEFT-WHEEL"
    },
    PAYLOAD: {
      FROM_DEG: 12.5,
      TO_DEG: 13.25
    },
    TRACE_ID: "TRACE-X72-NOYAU-LEFT-T77",
    PROOF_REF: null,
    SIGNATURE_METHOD: "BRUTUS-CANONICAL-JSON-SHA256-v0.1",
    SIGNATURE_H256: "",
    EXECUTABLE: false,
    PROOF_CLAIM: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "UNDECIDED"
  };

  const unsigned = structuredClone(event);
  delete unsigned.SIGNATURE_H256;
  const canonical = JSON.stringify(canonicalize(unsigned));
  const expected = createHash("sha256").update(canonical).digest("hex");

  event.SIGNATURE_H256 = computeRealMechanismEventSignature(event);
  assert.equal(event.SIGNATURE_H256, expected);
  assert.equal(validateRealMechanismEvent(event).SIGNATURE_H256, expected);
});

test("browser-safe startup event validator preserves contract", () => {
  const event = {
    SCHEMA: "BRUTUS-LIVE-EVENT-v0.1",
    VERSION: "0.1",
    EVENT_ID: "EVT-FMIN-Q0001-STARTUP-T88",
    EVENT_CLASS: "RUNTIME",
    EVENT_TYPE: "STARTUP_OBSERVED",
    TICK: 88,
    CLOCK_AUTHORITY: "QUEEN_SERVER_V0_2",
    SOURCE_ENDPOINT: "/ws",
    CLOCK_ENTITY_ID: "QUEEN-X72-0072",
    QUEEN_ID: "FOURMINIZER-QUEEN-0001",
    ANT_ID: "ANT-000000000001",
    POSITION: "W:START",
    QUEEN_MODE: "STABLE",
    GENERATION: 1,
    CONDITION: "STREAM_STATE",
    TRACE_ID: "TRACE-FMIN-Q0001-STARTUP-T88",
    MOTION: null,
    PROOF_REF: null,
    PROOF_CLAIM: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "UNDECIDED"
  };

  const valid = validateFourminizerLiveEvent(event);
  assert.equal(valid.TICK, 88);
  assert.equal(Object.isFrozen(valid), true);

  const stream = createReadOnlyLiveEventStream();
  const entry = stream.append(event);
  assert.equal(entry.OFFSET, 1);
  assert.equal(entry.EVENT.EVENT_TYPE, "STARTUP_OBSERVED");
});

test("browser live dependency path contains no Node built-in imports", () => {
  const files = [
    "../tools/genesis-aquarium/live-antmux.mjs",
    "../src/antmux-x72-live-aquarium-bridge.mjs",
    "../src/read-only-live-event-stream.mjs",
    "../src/real-mechanism-event.mjs",
    "../src/fourminizer-live-event.mjs",
    "../src/sha256-utf8.mjs"
  ];

  for (const rel of files) {
    const source = fs.readFileSync(path.join(here, rel), "utf8");
    assert.doesNotMatch(source, /from\s+["']node:/, rel);
    assert.doesNotMatch(source, /import\s*\(\s*["']node:/, rel);
  }
});
