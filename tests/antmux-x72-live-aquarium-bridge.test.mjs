import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createAntmuxX72LiveAquariumBridge
} from "../src/antmux-x72-live-aquarium-bridge.mjs";

import {
  validateRealMechanismEvent
} from "../src/real-mechanism-event.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function frame({
  tick = 10,
  entityId = "QUEEN-X72-0072",
  left = 0.5,
  right = 5.5,
  whole = "a".repeat(64),
  integrity = true
} = {}) {
  return {
    source: "QUEEN_SERVER_V0_2",
    entity_id: entityId,
    tick_count: tick,
    integrity_match: integrity,
    noyau_runtime: {
      authority: "NOYAU_ENGINE_HEADLESS",
      noyau: {
        schema: "ANTMUX-X72-NOYAU-DYNAMIC-v0.2",
        tick,
        world_index: 0,
        world_name: "HELIX",
        phase_left: left,
        phase_right: right,
        whole_h256: whole
      }
    }
  };
}

test("first real X72 frame establishes baseline without inventing movement", () => {
  const bridge = createAntmuxX72LiveAquariumBridge();
  const result = bridge.acceptFrame(frame(), {
    observedAtUtc: "2026-10-02T17:00:00.000Z"
  });

  assert.equal(result.BASELINE_ONLY, true);
  assert.equal(result.TICK, 10);
  assert.equal(result.SOURCE_ENTITY_ID, "QUEEN-X72-0072");
  assert.equal(result.EVENTS.length, 0);
  assert.equal(bridge.hasBaseline, true);
  assert.equal(bridge.lastTick, 10);
});

test("second real frame emits exactly two validated wheel phase events", () => {
  const bridge = createAntmuxX72LiveAquariumBridge();

  bridge.acceptFrame(frame({
    tick: 10,
    left: 0.5,
    right: 5.5,
    whole: "a".repeat(64)
  }), {
    observedAtUtc: "2026-10-02T17:00:00.000Z"
  });

  const result = bridge.acceptFrame(frame({
    tick: 11,
    left: 0.75,
    right: 5.25,
    whole: "b".repeat(64)
  }), {
    observedAtUtc: "2026-10-02T17:00:00.035Z"
  });

  assert.equal(result.BASELINE_ONLY, false);
  assert.equal(result.TICK, 11);
  assert.equal(result.EVENTS.length, 2);

  const left = result.EVENTS.find(e => e.SUBJECT.ID === "M:LEFT-WHEEL");
  const right = result.EVENTS.find(e => e.SUBJECT.ID === "M:RIGHT-WHEEL");

  assert.ok(left);
  assert.ok(right);

  for (const event of result.EVENTS) {
    const valid = validateRealMechanismEvent(event);
    assert.equal(valid.EVENT_TYPE, "WHEEL_PHASE");
    assert.equal(valid.TICK, 11);
    assert.equal(valid.SOURCE.SOURCE_SCHEMA, "QUEEN_SERVER_V0_2");
    assert.equal(valid.SOURCE.INTEGRITY_MATCH, true);
    assert.equal(valid.CLOCK_AUTHORITY, "QUEEN_SERVER_V0_2");
    assert.equal(valid.PROOF_REF, null);
  }

  assert.ok(left.PAYLOAD.TO_DEG > left.PAYLOAD.FROM_DEG);
  assert.ok(right.PAYLOAD.TO_DEG < right.PAYLOAD.FROM_DEG);
});

test("same exact Queen tick and same noyau hash produces no duplicate motion", () => {
  const bridge = createAntmuxX72LiveAquariumBridge();

  const first = frame({
    tick: 12,
    left: 1,
    right: 5,
    whole: "c".repeat(64)
  });

  bridge.acceptFrame(first, {
    observedAtUtc: "2026-10-02T17:00:01.000Z"
  });

  const repeat = bridge.acceptFrame(structuredClone(first), {
    observedAtUtc: "2026-10-02T17:00:01.010Z"
  });

  assert.equal(repeat.EVENTS.length, 0);
  assert.equal(bridge.lastTick, 12);
});

test("same Queen tick with changed noyau hash fails closed", () => {
  const bridge = createAntmuxX72LiveAquariumBridge();

  bridge.acceptFrame(frame({
    tick: 20,
    whole: "d".repeat(64)
  }));

  assert.throws(
    () => bridge.acceptFrame(frame({
      tick: 20,
      whole: "e".repeat(64)
    })),
    /same Queen tick with changed noyau whole_h256/
  );
});

test("backward Queen time is rejected", () => {
  const bridge = createAntmuxX72LiveAquariumBridge();

  bridge.acceptFrame(frame({ tick: 30, whole: "f".repeat(64) }));

  assert.throws(
    () => bridge.acceptFrame(frame({ tick: 29, whole: "1".repeat(64) })),
    /backward Queen tick/
  );
});

test("Queen and noyau ticks must match exactly", () => {
  const bridge = createAntmuxX72LiveAquariumBridge();
  const bad = frame({ tick: 40 });
  bad.noyau_runtime.noyau.tick = 39;

  assert.throws(
    () => bridge.acceptFrame(bad),
    /Queen tick and noyau tick must match exactly/
  );
});

test("integrity mismatch is rejected before baseline mutation", () => {
  const bridge = createAntmuxX72LiveAquariumBridge();

  assert.throws(
    () => bridge.acceptFrame(frame({ integrity: false })),
    /integrity_match must be true/
  );

  assert.equal(bridge.hasBaseline, false);
  assert.equal(bridge.lastTick, null);
});

test("Queen entity identity cannot silently change", () => {
  const bridge = createAntmuxX72LiveAquariumBridge();

  bridge.acceptFrame(frame({
    tick: 50,
    entityId: "QUEEN-X72-0072",
    whole: "2".repeat(64)
  }));

  assert.throws(
    () => bridge.acceptFrame(frame({
      tick: 51,
      entityId: "QUEEN-X72-OTHER",
      whole: "3".repeat(64)
    })),
    /entity continuity violation/
  );
});

test("source phases are converted from radians to degrees only for presentation event", () => {
  const bridge = createAntmuxX72LiveAquariumBridge();

  bridge.acceptFrame(frame({
    tick: 60,
    left: Math.PI,
    right: Math.PI / 2,
    whole: "4".repeat(64)
  }));

  const result = bridge.acceptFrame(frame({
    tick: 61,
    left: Math.PI * 1.5,
    right: Math.PI,
    whole: "5".repeat(64)
  }));

  const left = result.EVENTS.find(e => e.SUBJECT.ID === "M:LEFT-WHEEL");
  const right = result.EVENTS.find(e => e.SUBJECT.ID === "M:RIGHT-WHEEL");

  assert.equal(left.PAYLOAD.FROM_DEG, 180);
  assert.equal(left.PAYLOAD.TO_DEG, 270);
  assert.equal(right.PAYLOAD.FROM_DEG, 90);
  assert.equal(right.PAYLOAD.TO_DEG, 180);
});

test("production core bridge has no network, timers, random or local tick engine", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/antmux-x72-live-aquarium-bridge.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /\bsetInterval\s*\(/);
  assert.doesNotMatch(source, /\bsetTimeout\s*\(/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\bWebSocket\b/);
  assert.doesNotMatch(source, /class QueenCore/);
  assert.doesNotMatch(source, /new QueenCore/);
});

test("browser live adapter uses only the documented public read-only websocket", () => {
  const live = fs.readFileSync(
    path.join(here, "../tools/genesis-aquarium/live-antmux.mjs"),
    "utf8"
  );

  assert.match(
    live,
    /wss:\/\/antmux\.com\/laboratoire\/embryon-x72\/ws/
  );
  assert.match(live, /new WebSocket\(DEFAULT_WS_URL\)/);
  assert.doesNotMatch(live, /Math\.random/);
  assert.doesNotMatch(live, /\bsetInterval\s*\(/);
  assert.doesNotMatch(live, /\bsetTimeout\s*\(/);
  assert.doesNotMatch(live, /\/api\/noyau\//);
  assert.doesNotMatch(live, /POST|PUT|PATCH|DELETE/);
});

test("Genesis X72 layout contains presentation anchors but no fake entities", () => {
  const layout = fs.readFileSync(
    path.join(here, "../tools/genesis-aquarium/layout-genesis-x72-v01.mjs"),
    "utf8"
  );

  assert.match(layout, /"M:LEFT-WHEEL"/);
  assert.match(layout, /"M:RIGHT-WHEEL"/);
  assert.match(layout, /READ_ONLY: true/);
  assert.match(layout, /ROUTING_AUTHORITY: false/);
  assert.doesNotMatch(layout, /ANT-[0-9A-F]{12}/);
  assert.doesNotMatch(layout, /CRYSTAL-[0-9]+/);
});

test("browser phase interpolation uses shortest visual arc", () => {
  const app = fs.readFileSync(
    path.join(here, "../tools/genesis-aquarium/app.mjs"),
    "utf8"
  );

  assert.match(
    app,
    /\(\(animation\.toDeg - animation\.fromDeg \+ 540\) % 360\) - 180/
  );
  assert.match(app, /brutus:genesis-ready/);
});
