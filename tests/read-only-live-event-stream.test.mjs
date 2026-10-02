import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createReadOnlyLiveEventStream,
  BRUTUS_READ_ONLY_LIVE_EVENT_STREAM_SUPPORTED_SCHEMAS
} from "../src/read-only-live-event-stream.mjs";

import {
  computeRealMechanismEventSignature
} from "../src/real-mechanism-event.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function mechanismEvent(tick, suffix = "0001") {
  const event = {
    SCHEMA: "BRUTUS-REAL-MECHANISM-EVENT-v0.1",
    VERSION: "0.1",
    EVENT_ID: `RME-T${tick}-ANT-MOVE-${suffix}`,
    EVENT_CLASS: "RUNTIME_OBSERVATION",
    EVENT_TYPE: "ANT_MOVE",
    TICK: tick,
    CLOCK_AUTHORITY: "QUEEN_SERVER_V0_2",
    SOURCE: {
      OBSERVATION_ID: `OBS-T${tick}-${suffix}`,
      SOURCE_SCHEMA: "BRUTUS-RUNTIME-SOURCE-v0.1",
      SOURCE_ENDPOINT: "/runtime/events",
      OBSERVED_AT_UTC: "2026-10-02T16:40:00.000Z",
      INTEGRITY_MATCH: true
    },
    SUBJECT: {
      TYPE: "ANT",
      ID: "ANT-000000000001"
    },
    PAYLOAD: {
      FROM: "W:GENESIS-A",
      TO: "W:GENESIS-B"
    },
    TRACE_ID: `TRACE-FMIN-Q0001-MOTION-T${tick}-${suffix}`,
    PROOF_REF: null,
    SIGNATURE_METHOD: "BRUTUS-CANONICAL-JSON-SHA256-v0.1",
    SIGNATURE_H256: "",
    EXECUTABLE: false,
    PROOF_CLAIM: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "UNDECIDED"
  };
  event.SIGNATURE_H256 = computeRealMechanismEventSignature(event);
  return event;
}

function startupEvent(tick = 10) {
  return {
    SCHEMA: "BRUTUS-LIVE-EVENT-v0.1",
    VERSION: "0.1",
    EVENT_ID: `EVT-FMIN-Q0001-STARTUP-T${tick}`,
    EVENT_CLASS: "RUNTIME",
    EVENT_TYPE: "STARTUP_OBSERVED",
    TICK: tick,
    CLOCK_AUTHORITY: "QUEEN_SERVER_V0_2",
    SOURCE_ENDPOINT: "/api/state",
    CLOCK_ENTITY_ID: "QUEEN-SERVER-LIVE-0001",
    QUEEN_ID: "FOURMINIZER-QUEEN-0001",
    ANT_ID: "ANT-000000000001",
    POSITION: "W:START",
    QUEEN_MODE: "FOURMINIZER_STARTUP",
    GENERATION: 0,
    CONDITION: "READY",
    TRACE_ID: `TRACE-FMIN-Q0001-STARTUP-T${tick}`,
    MOTION: null,
    PROOF_REF: null,
    PROOF_CLAIM: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "UNDECIDED"
  };
}

test("stream accepts both admitted real event schemas", () => {
  assert.deepEqual(
    new Set(BRUTUS_READ_ONLY_LIVE_EVENT_STREAM_SUPPORTED_SCHEMAS),
    new Set([
      "BRUTUS-LIVE-EVENT-v0.1",
      "BRUTUS-REAL-MECHANISM-EVENT-v0.1"
    ])
  );

  const stream = createReadOnlyLiveEventStream();
  const a = stream.append(startupEvent(10));
  const b = stream.append(mechanismEvent(10, "0002"));

  assert.equal(a.OFFSET, 1);
  assert.equal(b.OFFSET, 2);
  assert.equal(stream.lastTick, 10);
  assert.equal(stream.size, 2);
});

test("stream rejects backward Queen time", () => {
  const stream = createReadOnlyLiveEventStream();
  stream.append(mechanismEvent(20, "0001"));

  assert.throws(
    () => stream.append(mechanismEvent(19, "0002")),
    /backward time/
  );
});

test("same tick preserves insertion order without inventing a logical tick", () => {
  const stream = createReadOnlyLiveEventStream();

  stream.append(mechanismEvent(30, "0001"));
  stream.append(mechanismEvent(30, "0002"));
  stream.append(mechanismEvent(30, "0003"));

  const snapshot = stream.snapshot();

  assert.deepEqual(
    snapshot.EVENTS.map(entry => entry.OFFSET),
    [1, 2, 3]
  );
  assert.deepEqual(
    snapshot.EVENTS.map(entry => entry.EVENT.TICK),
    [30, 30, 30]
  );
  assert.equal(snapshot.LAST_TICK, 30);
  assert.equal(snapshot.LOGICAL_CLOCK_AUTHORITY, "QUEEN_SERVER_V0_2");
});

test("duplicate EVENT_ID at the current tick is rejected", () => {
  const stream = createReadOnlyLiveEventStream();
  const event = mechanismEvent(40, "0001");

  stream.append(event);

  assert.throws(
    () => stream.append(structuredClone(event)),
    /duplicate EVENT_ID/
  );
});

test("bounded buffer drops only oldest transport entries", () => {
  const stream = createReadOnlyLiveEventStream({ capacity: 2 });

  stream.append(mechanismEvent(1, "0001"));
  stream.append(mechanismEvent(2, "0002"));
  stream.append(mechanismEvent(3, "0003"));

  const snapshot = stream.snapshot();

  assert.equal(snapshot.CAPACITY, 2);
  assert.equal(snapshot.SIZE, 2);
  assert.equal(snapshot.FIRST_OFFSET, 2);
  assert.equal(snapshot.LAST_OFFSET, 3);
  assert.equal(snapshot.DROPPED_COUNT, 1);
  assert.deepEqual(
    snapshot.EVENTS.map(entry => entry.EVENT.TICK),
    [2, 3]
  );
});

test("consumer behind evicted history gets a hard resync error", () => {
  const stream = createReadOnlyLiveEventStream({ capacity: 2 });

  stream.append(mechanismEvent(1, "0001"));
  stream.append(mechanismEvent(2, "0002"));
  stream.append(mechanismEvent(3, "0003"));

  assert.throws(
    () => stream.readAfter(0),
    /STREAM_CURSOR_GAP:.*resync_required=true/
  );

  const safeDelta = stream.readAfter(1);
  assert.equal(safeDelta.CURSOR_IN, 1);
  assert.equal(safeDelta.CURSOR_OUT, 3);
  assert.equal(safeDelta.EVENTS.length, 2);
  assert.equal(safeDelta.GAP, false);
  assert.equal(safeDelta.RESYNC_REQUIRED, false);
});

test("renderer delta cursor advances only over admitted events", () => {
  const stream = createReadOnlyLiveEventStream();

  stream.append(startupEvent(10));
  const first = stream.readAfter(0);
  assert.equal(first.CURSOR_OUT, 1);
  assert.equal(first.EVENTS.length, 1);

  stream.append(mechanismEvent(11, "0001"));
  stream.append(mechanismEvent(12, "0002"));

  const second = stream.readAfter(first.CURSOR_OUT);
  assert.equal(second.CURSOR_IN, 1);
  assert.equal(second.CURSOR_OUT, 3);
  assert.deepEqual(
    second.EVENTS.map(entry => entry.EVENT.TICK),
    [11, 12]
  );

  const empty = stream.readAfter(second.CURSOR_OUT);
  assert.equal(empty.CURSOR_OUT, 3);
  assert.equal(empty.EVENTS.length, 0);
});

test("future cursor is rejected", () => {
  const stream = createReadOnlyLiveEventStream();
  stream.append(startupEvent(10));

  assert.throws(
    () => stream.readAfter(2),
    /cursor offset is ahead of stream/
  );
});

test("capacity and per-tick work are bounded", () => {
  assert.throws(
    () => createReadOnlyLiveEventStream({ capacity: 0 }),
    /capacity must be an integer/
  );
  assert.throws(
    () => createReadOnlyLiveEventStream({ capacity: 4097 }),
    /capacity must be an integer/
  );

  const stream = createReadOnlyLiveEventStream({ capacity: 2 });
  stream.append(mechanismEvent(50, "0001"));
  stream.append(mechanismEvent(50, "0002"));

  assert.throws(
    () => stream.append(mechanismEvent(50, "0003")),
    /per-tick event limit reached/
  );
});

test("unsupported or invalid events fail before entering stream", () => {
  const stream = createReadOnlyLiveEventStream();

  assert.throws(
    () => stream.append({
      SCHEMA: "FAKE-EVENT-v9",
      EVENT_ID: "FAKE",
      TICK: 1
    }),
    /unsupported event SCHEMA/
  );

  const corrupted = mechanismEvent(60, "0001");
  corrupted.SOURCE.INTEGRITY_MATCH = false;

  assert.throws(
    () => stream.append(corrupted),
    /REAL_MECHANISM_EVENT_REJECTED/
  );

  assert.equal(stream.size, 0);
  assert.equal(stream.lastOffset, 0);
});

test("entries, snapshots and deltas are deeply immutable", () => {
  const stream = createReadOnlyLiveEventStream();
  const entry = stream.append(startupEvent(70));
  const snapshot = stream.snapshot();
  const delta = stream.readAfter(0);

  assert.equal(Object.isFrozen(entry), true);
  assert.equal(Object.isFrozen(entry.EVENT), true);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.EVENTS), true);
  assert.equal(Object.isFrozen(snapshot.EVENTS[0].EVENT), true);
  assert.equal(Object.isFrozen(delta), true);
  assert.equal(Object.isFrozen(delta.EVENTS), true);
});

test("stream source has no simulator, timer, network polling or event generator", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/read-only-live-event-stream.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /\bSimProvider\b/);
  assert.doesNotMatch(source, /\bsetInterval\s*\(/);
  assert.doesNotMatch(source, /\bsetTimeout\s*\(/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\bWebSocket\b/);
  assert.doesNotMatch(source, /\b(exec|spawn|fork)\b/);
});
