import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildWorldTransportRequest,
  normalizeClockObservation,
  BRUTUS_CLOCK_SCHEMA
} from "../src/adapters/x72-world-bridge.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(here, "../fixtures/x72/observation-envelope-state.json");

function fixture() {
  return JSON.parse(fs.readFileSync(fixturePath, "utf8"));
}

test("Queen ObservationEnvelope normalizes without inventing ANT_ID", () => {
  const observation = normalizeClockObservation(fixture());

  assert.equal(observation.SCHEMA, BRUTUS_CLOCK_SCHEMA);
  assert.equal(observation.ENTITY_ID, "QUEEN-X72-0072");
  assert.equal(observation.TICK, 273);
  assert.equal(Object.prototype.hasOwnProperty.call(observation, "ANT_ID"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(observation, "antId"), false);
});

test("explicit Fourmi identity is required before world transport", () => {
  const observation = normalizeClockObservation(fixture());

  assert.throws(
    () => buildWorldTransportRequest({
      observation,
      from: "MATTER/CARBON",
      to: "INFORMATION/CRYPTO",
      proofRef: "PROOF-BRUTUS-0001"
    }),
    /explicit antId is required/
  );
});

test("Queen ENTITY_ID cannot be reused as antId", () => {
  const observation = normalizeClockObservation(fixture());

  assert.throws(
    () => buildWorldTransportRequest({
      observation,
      antId: observation.ENTITY_ID,
      from: "MATTER/CARBON",
      to: "INFORMATION/CRYPTO",
      proofRef: "PROOF-BRUTUS-0001"
    }),
    /must not reuse Queen ENTITY_ID/
  );
});

test("fresh valid observation maps Queen tick into an explicit transport request", () => {
  const observation = normalizeClockObservation(fixture());

  const request = buildWorldTransportRequest({
    observation,
    antId: "ANT-BRUTUS-0001",
    from: "MATTER/CARBON",
    to: "INFORMATION/CRYPTO",
    state: "CARRYING_CLOCK_OBSERVATION",
    proofRef: "PROOF-BRUTUS-0001",
    echo: "ECHO-BRUTUS-0001"
  });

  assert.deepEqual(request, {
    antId: "ANT-BRUTUS-0001",
    from: "MATTER/CARBON",
    to: "INFORMATION/CRYPTO",
    tick: 273,
    state: "CARRYING_CLOCK_OBSERVATION",
    proofRef: "PROOF-BRUTUS-0001",
    echo: "ECHO-BRUTUS-0001"
  });
});

test("STALE clock observations cannot open a world transport request", () => {
  const input = fixture();
  input.status = "STALE";
  input.condition = "WEBSOCKET_DISCONNECT";
  const observation = normalizeClockObservation(input);

  assert.throws(
    () => buildWorldTransportRequest({
      observation,
      antId: "ANT-BRUTUS-0001",
      from: "MATTER/CARBON",
      to: "INFORMATION/CRYPTO",
      proofRef: "PROOF-BRUTUS-0001"
    }),
    /requires a FRESH clock observation/
  );
});

test("integrity mismatch blocks world transport", () => {
  const input = fixture();
  input.payload.integrity_match = false;
  const observation = normalizeClockObservation(input);

  assert.throws(
    () => buildWorldTransportRequest({
      observation,
      antId: "ANT-BRUTUS-0001",
      from: "MATTER/CARBON",
      to: "INFORMATION/CRYPTO",
      proofRef: "PROOF-BRUTUS-0001"
    }),
    /integrity_match=true/
  );
});
