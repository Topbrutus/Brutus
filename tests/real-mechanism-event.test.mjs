import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  computeRealMechanismEventSignature,
  validateRealMechanismEvent,
  BRUTUS_REAL_MECHANISM_EVENT_TYPES
} from "../src/real-mechanism-event.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function baseEvent({
  type = "ANT_MOVE",
  subject = { TYPE: "ANT", ID: "ANT-000000000001" },
  payload = { FROM: "W:GENESIS-A", TO: "W:GENESIS-B" }
} = {}) {
  const event = {
    SCHEMA: "BRUTUS-REAL-MECHANISM-EVENT-v0.1",
    VERSION: "0.1",
    EVENT_ID: "RME-T42-ANT-MOVE-0001",
    EVENT_CLASS: "RUNTIME_OBSERVATION",
    EVENT_TYPE: type,
    TICK: 42,
    CLOCK_AUTHORITY: "QUEEN_SERVER_V0_2",
    SOURCE: {
      OBSERVATION_ID: "OBS-RUNTIME-0001",
      SOURCE_SCHEMA: "BRUTUS-RUNTIME-SOURCE-v0.1",
      SOURCE_ENDPOINT: "/runtime/events",
      OBSERVED_AT_UTC: "2026-10-02T16:30:00.000Z",
      INTEGRITY_MATCH: true
    },
    SUBJECT: subject,
    PAYLOAD: payload,
    TRACE_ID: "TRACE-FMIN-Q0001-MOTION-T42",
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

function signed(event) {
  event.SIGNATURE_H256 = computeRealMechanismEventSignature(event);
  return event;
}

test("event type set contains the seven aquarium mechanism families", () => {
  assert.deepEqual(
    new Set(BRUTUS_REAL_MECHANISM_EVENT_TYPES),
    new Set([
      "ANT_MOVE",
      "CRYSTAL_MOVE",
      "WHEEL_PHASE",
      "PINEAL_PHASE",
      "Z_MARK",
      "DISTRIBUTOR_ROUTE",
      "BASIN_TRANSFER"
    ])
  );
});

test("real ant movement validates and freezes deeply", () => {
  const event = validateRealMechanismEvent(baseEvent());

  assert.equal(event.EVENT_TYPE, "ANT_MOVE");
  assert.equal(event.SUBJECT.ID, "ANT-000000000001");
  assert.equal(event.PAYLOAD.FROM, "W:GENESIS-A");
  assert.equal(event.PAYLOAD.TO, "W:GENESIS-B");
  assert.equal(event.TICK, 42);
  assert.equal(Object.isFrozen(event), true);
  assert.equal(Object.isFrozen(event.SOURCE), true);
  assert.equal(Object.isFrozen(event.PAYLOAD), true);
});

test("real crystal movement validates", () => {
  const event = baseEvent({
    type: "CRYSTAL_MOVE",
    subject: { TYPE: "CRYSTAL", ID: "C:CRYSTAL-0001" },
    payload: { FROM: "W:GENESIS-B", TO: "W:GENESIS-C" }
  });
  event.EVENT_ID = "RME-T42-CRYSTAL-MOVE-0001";
  signed(event);

  assert.equal(validateRealMechanismEvent(event).EVENT_TYPE, "CRYSTAL_MOVE");
});

test("wheel and pineal phases validate only on real phase changes", () => {
  const wheel = baseEvent({
    type: "WHEEL_PHASE",
    subject: { TYPE: "WHEEL", ID: "M:LEFT-WHEEL" },
    payload: { FROM_DEG: 30, TO_DEG: 60 }
  });
  wheel.EVENT_ID = "RME-T42-WHEEL-PHASE-0001";
  signed(wheel);
  assert.equal(validateRealMechanismEvent(wheel).PAYLOAD.TO_DEG, 60);

  const pineal = baseEvent({
    type: "PINEAL_PHASE",
    subject: { TYPE: "PINEAL", ID: "M:PINEAL" },
    payload: { FROM_DEG: 120.5, TO_DEG: 121.25 }
  });
  pineal.EVENT_ID = "RME-T42-PINEAL-PHASE-0001";
  signed(pineal);
  assert.equal(validateRealMechanismEvent(pineal).SUBJECT.TYPE, "PINEAL");

  const unchanged = structuredClone(wheel);
  unchanged.PAYLOAD.TO_DEG = unchanged.PAYLOAD.FROM_DEG;
  signed(unchanged);
  assert.throws(
    () => validateRealMechanismEvent(unchanged),
    /phase event requires a changed phase/
  );
});

test("Z mark requires a real transition from UNMARKED to Z_MARKED", () => {
  const event = baseEvent({
    type: "Z_MARK",
    subject: { TYPE: "Z_MARKER", ID: "Z:MARKER-01" },
    payload: {
      OBJECT_REF: "P:184",
      FROM_STATE: "UNMARKED",
      TO_STATE: "Z_MARKED"
    }
  });
  event.EVENT_ID = "RME-T42-Z-MARK-0001";
  signed(event);

  assert.equal(validateRealMechanismEvent(event).PAYLOAD.TO_STATE, "Z_MARKED");

  const invalid = structuredClone(event);
  invalid.PAYLOAD.TO_STATE = "UNKNOWN";
  signed(invalid);
  assert.throws(
    () => validateRealMechanismEvent(invalid),
    /Z TO_STATE must be Z_MARKED/
  );
});

test("distributor route validates changed world endpoints", () => {
  const event = baseEvent({
    type: "DISTRIBUTOR_ROUTE",
    subject: { TYPE: "DISTRIBUTOR", ID: "M:DISTRIBUTOR" },
    payload: {
      OBJECT_REF: "P:184",
      FROM: "W:DISTRIBUTOR-IN",
      TO: "W:LINE-L7"
    }
  });
  event.EVENT_ID = "RME-T42-DISTRIBUTOR-0001";
  signed(event);

  assert.equal(validateRealMechanismEvent(event).PAYLOAD.TO, "W:LINE-L7");
});

test("basin transfer must terminate at return basin", () => {
  const event = baseEvent({
    type: "BASIN_TRANSFER",
    subject: { TYPE: "BASIN", ID: "M:RETURN-BASIN" },
    payload: {
      OBJECT_REF: "C:CRYSTAL-0001",
      FROM: "W:GENESIS-C",
      TO: "W:RETURN-BASIN"
    }
  });
  event.EVENT_ID = "RME-T42-BASIN-0001";
  signed(event);

  assert.equal(validateRealMechanismEvent(event).PAYLOAD.TO, "W:RETURN-BASIN");

  const invalid = structuredClone(event);
  invalid.PAYLOAD.TO = "W:OTHER";
  signed(invalid);
  assert.throws(
    () => validateRealMechanismEvent(invalid),
    /BASIN_TRANSFER must terminate at W:RETURN-BASIN/
  );
});

test("source integrity must be explicitly true", () => {
  const event = baseEvent();
  event.SOURCE.INTEGRITY_MATCH = false;
  signed(event);

  assert.throws(
    () => validateRealMechanismEvent(event),
    /SOURCE.INTEGRITY_MATCH must be true/
  );
});

test("subject family must match event type", () => {
  const event = baseEvent();
  event.SUBJECT = { TYPE: "CRYSTAL", ID: "C:WRONG" };
  signed(event);

  assert.throws(
    () => validateRealMechanismEvent(event),
    /SUBJECT.TYPE does not match EVENT_TYPE/
  );
});

test("movement requires an actual position change", () => {
  const event = baseEvent();
  event.PAYLOAD.TO = event.PAYLOAD.FROM;
  signed(event);

  assert.throws(
    () => validateRealMechanismEvent(event),
    /movement requires a changed position/
  );
});

test("signature detects mutation", () => {
  const event = baseEvent();
  const validated = validateRealMechanismEvent(event);
  assert.equal(validated.SIGNATURE_H256, computeRealMechanismEventSignature(validated));

  event.PAYLOAD.TO = "W:GENESIS-Z";
  assert.throws(
    () => validateRealMechanismEvent(event),
    /SIGNATURE_H256 mismatch/
  );
});

test("event carries no proof, gate, execution or routing authority", () => {
  for (const [field, value, pattern] of [
    ["PROOF_REF", "proofs/fake.json", /PROOF_REF must be null/],
    ["PROOF_CLAIM", true, /PROOF_CLAIM must be false/],
    ["GATE_AUTHORITY", true, /GATE_AUTHORITY must be false/],
    ["EXECUTABLE", true, /EXECUTABLE must be false/],
    ["ROUTING_AUTHORIZATION", "ALLOWED", /ROUTING_AUTHORIZATION must be UNDECIDED/]
  ]) {
    const event = baseEvent();
    event[field] = value;
    signed(event);
    assert.throws(() => validateRealMechanismEvent(event), pattern);
  }
});

test("unknown fields fail closed", () => {
  const event = baseEvent();
  event.ANIMATION_SPEED = 999;
  signed(event);

  assert.throws(
    () => validateRealMechanismEvent(event),
    /unknown event field ANIMATION_SPEED/
  );
});

test("production validator contains no simulator, timers, network or movement generator", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/real-mechanism-event.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /\bSimProvider\b/);
  assert.doesNotMatch(source, /\bsetInterval\s*\(/);
  assert.doesNotMatch(source, /\bsetTimeout\s*\(/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(
    source,
    /\b(exec|spawn|fork|routeWorld|buildWorldTransportRequest)\b/
  );
});
