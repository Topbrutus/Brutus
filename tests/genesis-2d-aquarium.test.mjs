import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createGenesis2DAquarium,
  validateGenesisVisualLayout
} from "../src/genesis-2d-aquarium.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function layout() {
  return {
    SCHEMA: "BRUTUS-GENESIS-VISUAL-LAYOUT-v0.1",
    VERSION: "0.1",
    WORLD_POSITIONS: {
      "W:START": { X: 0.1, Y: 0.5 },
      "W:GENESIS-A": { X: 0.2, Y: 0.5 },
      "W:GENESIS-B": { X: 0.45, Y: 0.5 },
      "W:GENESIS-C": { X: 0.7, Y: 0.5 },
      "W:RETURN-BASIN": { X: 0.9, Y: 0.75 }
    },
    MECHANISM_ANCHORS: {
      "M:LEFT-WHEEL": { X: 0.35, Y: 0.25 },
      "M:PINEAL": { X: 0.5, Y: 0.25 },
      "M:DISTRIBUTOR": { X: 0.7, Y: 0.25 },
      "M:RETURN-BASIN": { X: 0.9, Y: 0.75 },
      "Z:MARKER-01": { X: 0.15, Y: 0.25 }
    },
    READ_ONLY: true,
    ROUTING_AUTHORITY: false
  };
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

function mechanismEvent({
  tick,
  id,
  type,
  subject,
  payload
}) {
  return {
    SCHEMA: "BRUTUS-REAL-MECHANISM-EVENT-v0.1",
    VERSION: "0.1",
    EVENT_ID: id,
    EVENT_CLASS: "RUNTIME_OBSERVATION",
    EVENT_TYPE: type,
    TICK: tick,
    CLOCK_AUTHORITY: "QUEEN_SERVER_V0_2",
    SOURCE: {
      OBSERVATION_ID: "OBS-" + id,
      SOURCE_SCHEMA: "BRUTUS-RUNTIME-SOURCE-v0.1",
      SOURCE_ENDPOINT: "/runtime/events",
      OBSERVED_AT_UTC: "2026-10-02T16:50:00.000Z",
      INTEGRITY_MATCH: true
    },
    SUBJECT: subject,
    PAYLOAD: payload,
    TRACE_ID: "TRACE-" + id,
    PROOF_REF: null,
    SIGNATURE_METHOD: "BRUTUS-CANONICAL-JSON-SHA256-v0.1",
    SIGNATURE_H256: "a".repeat(64),
    EXECUTABLE: false,
    PROOF_CLAIM: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "UNDECIDED"
  };
}

function delta(cursorIn, entries) {
  return {
    SCHEMA: "BRUTUS-READ-ONLY-LIVE-EVENT-DELTA-v0.1",
    VERSION: "0.1",
    CURSOR_IN: cursorIn,
    CURSOR_OUT: entries.length === 0
      ? cursorIn
      : entries[entries.length - 1].OFFSET,
    EVENTS: entries,
    GAP: false,
    RESYNC_REQUIRED: false
  };
}

test("aquarium starts truly empty and read-only", () => {
  const aquarium = createGenesis2DAquarium();
  const state = aquarium.snapshot();

  assert.equal(state.LAYOUT_LOADED, false);
  assert.equal(state.ENTITY_COUNT, 0);
  assert.equal(state.MECHANISM_COUNT, 0);
  assert.equal(state.LAST_OFFSET, 0);
  assert.equal(state.LAST_TICK, null);
  assert.equal(state.RESYNC_REQUIRED, false);
  assert.equal(state.READ_ONLY, true);
  assert.equal(state.CREATES_BRUTUS_STATE, false);
});

test("visual layout is explicit, normalized and has no routing authority", () => {
  const valid = validateGenesisVisualLayout(layout());

  assert.equal(valid.READ_ONLY, true);
  assert.equal(valid.ROUTING_AUTHORITY, false);
  assert.equal(valid.WORLD_POSITIONS["W:GENESIS-A"].X, 0.2);

  const invalid = layout();
  invalid.WORLD_POSITIONS["W:GENESIS-A"].X = 1.1;

  assert.throws(
    () => validateGenesisVisualLayout(invalid),
    /must be a finite number in \[0,1\]/
  );
});

test("startup event creates only the real reported ant presence", () => {
  const aquarium = createGenesis2DAquarium({ layout: layout() });

  const result = aquarium.applyDelta(delta(0, [
    { OFFSET: 1, EVENT: startupEvent(10) }
  ]));

  assert.equal(result.TRANSITIONS.length, 1);
  assert.equal(result.TRANSITIONS[0].KIND, "PRESENCE");
  assert.equal(result.TRANSITIONS[0].SUBJECT_ID, "ANT-000000000001");
  assert.equal(result.TRANSITIONS[0].DRAWABLE, true);

  const state = aquarium.snapshot();
  assert.equal(state.ENTITY_COUNT, 1);
  assert.equal(state.ENTITIES[0].WORLD_REF, "W:START");
  assert.equal(state.ENTITIES[0].X, 0.1);
  assert.equal(state.ENTITIES[0].Y, 0.5);
});

test("without layout a real event is retained but never given invented coordinates", () => {
  const aquarium = createGenesis2DAquarium();

  const result = aquarium.applyDelta(delta(0, [
    { OFFSET: 1, EVENT: startupEvent(10) }
  ]));

  assert.equal(result.TRANSITIONS[0].DRAWABLE, false);

  const ant = aquarium.snapshot().ENTITIES[0];
  assert.equal(ant.WORLD_REF, "W:START");
  assert.equal(ant.PLACED, false);
  assert.equal(ant.X, null);
  assert.equal(ant.Y, null);
});

test("loading a layout later places known logical positions without changing Brutus state", () => {
  const aquarium = createGenesis2DAquarium();

  aquarium.applyDelta(delta(0, [
    { OFFSET: 1, EVENT: startupEvent(10) }
  ]));

  const state = aquarium.loadLayout(layout());
  const ant = state.ENTITIES[0];

  assert.equal(ant.WORLD_REF, "W:START");
  assert.equal(ant.PLACED, true);
  assert.equal(ant.X, 0.1);
  assert.equal(ant.Y, 0.5);
  assert.equal(state.LAST_TICK, 10);
});

test("real ant move produces one drawable visual transition and updates logical mirror", () => {
  const aquarium = createGenesis2DAquarium({ layout: layout() });

  aquarium.applyDelta(delta(0, [
    {
      OFFSET: 1,
      EVENT: mechanismEvent({
        tick: 20,
        id: "RME-T20-ANT-MOVE-0001",
        type: "ANT_MOVE",
        subject: { TYPE: "ANT", ID: "ANT-000000000001" },
        payload: { FROM: "W:GENESIS-A", TO: "W:GENESIS-B" }
      })
    }
  ]));

  const transition = aquarium.applyDelta(delta(1, [
    {
      OFFSET: 2,
      EVENT: mechanismEvent({
        tick: 21,
        id: "RME-T21-ANT-MOVE-0002",
        type: "ANT_MOVE",
        subject: { TYPE: "ANT", ID: "ANT-000000000001" },
        payload: { FROM: "W:GENESIS-B", TO: "W:GENESIS-C" }
      })
    }
  ])).TRANSITIONS[0];

  assert.equal(transition.KIND, "POSITION");
  assert.equal(transition.FROM_X, 0.45);
  assert.equal(transition.TO_X, 0.7);
  assert.equal(transition.DRAWABLE, true);

  const ant = aquarium.snapshot().ENTITIES[0];
  assert.equal(ant.WORLD_REF, "W:GENESIS-C");
  assert.equal(ant.LAST_TICK, 21);
});

test("entity continuity mismatch fails closed and requires resync", () => {
  const aquarium = createGenesis2DAquarium({ layout: layout() });

  aquarium.applyDelta(delta(0, [
    {
      OFFSET: 1,
      EVENT: mechanismEvent({
        tick: 20,
        id: "RME-T20-ANT-MOVE-0001",
        type: "ANT_MOVE",
        subject: { TYPE: "ANT", ID: "ANT-000000000001" },
        payload: { FROM: "W:GENESIS-A", TO: "W:GENESIS-B" }
      })
    }
  ]));

  assert.throws(
    () => aquarium.applyDelta(delta(1, [
      {
        OFFSET: 2,
        EVENT: mechanismEvent({
          tick: 21,
          id: "RME-T21-ANT-MOVE-0002",
          type: "ANT_MOVE",
          subject: { TYPE: "ANT", ID: "ANT-000000000001" },
          payload: { FROM: "W:GENESIS-A", TO: "W:GENESIS-C" }
        })
      }
    ])),
    /entity continuity mismatch.*resync_required=true/
  );

  assert.equal(aquarium.resyncRequired, true);

  assert.throws(
    () => aquarium.applyDelta(delta(1, [])),
    /RESYNC_REQUIRED/
  );
});

test("cursor gap fails closed and requires resync", () => {
  const aquarium = createGenesis2DAquarium({ layout: layout() });

  aquarium.applyDelta(delta(0, [
    { OFFSET: 1, EVENT: startupEvent(10) }
  ]));

  assert.throws(
    () => aquarium.applyDelta(delta(0, [])),
    /cursor continuity mismatch.*resync_required=true/
  );

  assert.equal(aquarium.snapshot().RESYNC_REQUIRED, true);
});

test("wheel phase becomes a visual-only phase transition", () => {
  const aquarium = createGenesis2DAquarium({ layout: layout() });

  const result = aquarium.applyDelta(delta(0, [
    {
      OFFSET: 1,
      EVENT: mechanismEvent({
        tick: 30,
        id: "RME-T30-WHEEL-PHASE-0001",
        type: "WHEEL_PHASE",
        subject: { TYPE: "WHEEL", ID: "M:LEFT-WHEEL" },
        payload: { FROM_DEG: 30, TO_DEG: 60 }
      })
    }
  ]));

  const transition = result.TRANSITIONS[0];
  assert.equal(transition.KIND, "PHASE");
  assert.equal(transition.FROM_DEG, 30);
  assert.equal(transition.TO_DEG, 60);
  assert.equal(transition.DRAWABLE, true);

  const wheel = aquarium.snapshot().MECHANISMS[0];
  assert.equal(wheel.ID, "M:LEFT-WHEEL");
  assert.equal(wheel.PHASE_DEG, 60);
});

test("Z mark changes only the mirrored mark state", () => {
  const aquarium = createGenesis2DAquarium({ layout: layout() });

  const result = aquarium.applyDelta(delta(0, [
    {
      OFFSET: 1,
      EVENT: mechanismEvent({
        tick: 40,
        id: "RME-T40-Z-MARK-0001",
        type: "Z_MARK",
        subject: { TYPE: "Z_MARKER", ID: "Z:MARKER-01" },
        payload: {
          OBJECT_REF: "P:184",
          FROM_STATE: "UNMARKED",
          TO_STATE: "Z_MARKED"
        }
      })
    }
  ]));

  assert.equal(result.TRANSITIONS[0].KIND, "MARK");
  const part = aquarium.snapshot().ENTITIES[0];
  assert.equal(part.ID, "P:184");
  assert.equal(part.MARK_STATE, "Z_MARKED");
  assert.equal(part.PLACED, false);
});

test("distributor and basin events move the payload object, not the mechanism anchor", () => {
  const aquarium = createGenesis2DAquarium({ layout: layout() });

  aquarium.applyDelta(delta(0, [
    {
      OFFSET: 1,
      EVENT: mechanismEvent({
        tick: 50,
        id: "RME-T50-DISTRIBUTOR-0001",
        type: "DISTRIBUTOR_ROUTE",
        subject: { TYPE: "DISTRIBUTOR", ID: "M:DISTRIBUTOR" },
        payload: {
          OBJECT_REF: "C:CRYSTAL-0001",
          FROM: "W:GENESIS-A",
          TO: "W:GENESIS-B"
        }
      })
    }
  ]));

  const second = aquarium.applyDelta(delta(1, [
    {
      OFFSET: 2,
      EVENT: mechanismEvent({
        tick: 51,
        id: "RME-T51-BASIN-0001",
        type: "BASIN_TRANSFER",
        subject: { TYPE: "BASIN", ID: "M:RETURN-BASIN" },
        payload: {
          OBJECT_REF: "C:CRYSTAL-0001",
          FROM: "W:GENESIS-B",
          TO: "W:RETURN-BASIN"
        }
      })
    }
  ]));

  assert.equal(second.TRANSITIONS[0].TO_WORLD, "W:RETURN-BASIN");

  const state = aquarium.snapshot();
  const crystal = state.ENTITIES.find(item => item.ID === "C:CRYSTAL-0001");
  assert.equal(crystal.WORLD_REF, "W:RETURN-BASIN");
  assert.equal(state.MECHANISMS.length, 2);
});

test("empty delta performs zero movement", () => {
  const aquarium = createGenesis2DAquarium({ layout: layout() });
  const result = aquarium.applyDelta(delta(0, []));

  assert.equal(result.TRANSITIONS.length, 0);
  assert.equal(aquarium.snapshot().ENTITY_COUNT, 0);
});

test("production aquarium core has no simulator, random, timer, network or route mutation", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/genesis-2d-aquarium.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /\bSimProvider\b/);
  assert.doesNotMatch(source, /\bsetInterval\s*\(/);
  assert.doesNotMatch(source, /\bsetTimeout\s*\(/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\bWebSocket\b/);
  assert.doesNotMatch(source, /\brouteWorld\b/);
});

test("browser shell contains no fake event population or polling loop", () => {
  const app = fs.readFileSync(
    path.join(here, "../tools/genesis-aquarium/app.mjs"),
    "utf8"
  );
  const html = fs.readFileSync(
    path.join(here, "../tools/genesis-aquarium/index.html"),
    "utf8"
  );

  assert.doesNotMatch(app, /Math\.random/);
  assert.doesNotMatch(app, /\bSimProvider\b/);
  assert.doesNotMatch(app, /\bsetInterval\s*\(/);
  assert.doesNotMatch(app, /\bsetTimeout\s*\(/);
  assert.doesNotMatch(app, /\bfetch\s*\(/);
  assert.doesNotMatch(app, /\bWebSocket\b/);
  assert.match(app, /requestAnimationFrame/);

  assert.doesNotMatch(html, /ANT-000000000001/);
  assert.doesNotMatch(html, /CRYSTAL-0001/);
  assert.match(html, /WAITING FOR LAYOUT/);
});
