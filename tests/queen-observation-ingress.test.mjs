import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BRUTUS_QUEEN_INGRESS_SCHEMA,
  createQueenObservationIngress
} from "../src/ingestion/queen-observation-ingress.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(here, "../fixtures/x72/observation-envelope-state.json");

function fixture() {
  return JSON.parse(fs.readFileSync(fixturePath, "utf8"));
}

function unknownEnvelope() {
  return {
    observed_at_utc: "2026-09-30T00:00:01.000Z",
    entity_id: "QUEEN-X72-0072",
    source_schema: "QUEEN_SERVER_V0_2",
    source_endpoint: "/api/state",
    freshness_ms: 0,
    status: "UNKNOWN",
    condition: "HTTP_CONNECT_ERROR",
    payload: null,
    error: "connection refused"
  };
}

test("fresh X72 ObservationEnvelope is accepted without inventing a new Queen", () => {
  const ingress = createQueenObservationIngress();
  const result = ingress.accept(fixture());

  assert.equal(result.SCHEMA, BRUTUS_QUEEN_INGRESS_SCHEMA);
  assert.equal(result.USABLE, true);
  assert.equal(result.REASON, "READY");
  assert.equal(result.CLOCK.TICK, 273);
  assert.equal(result.ENTITY_ID, "QUEEN-X72-0072");
  assert.equal(ingress.entityId, "QUEEN-X72-0072");
});

test("STALE is preserved but never usable downstream", () => {
  const ingress = createQueenObservationIngress();
  const input = fixture();
  input.status = "STALE";
  input.condition = "WEBSOCKET_DISCONNECT";

  const result = ingress.accept(input);
  assert.equal(result.STATUS, "STALE");
  assert.equal(result.USABLE, false);
  assert.equal(result.REASON, "STALE");
  assert.equal(result.CLOCK.TICK, 273);
});

test("UNKNOWN is explicit and does not synthesize clock state", () => {
  const ingress = createQueenObservationIngress();
  const result = ingress.accept(unknownEnvelope());

  assert.equal(result.STATUS, "UNKNOWN");
  assert.equal(result.USABLE, false);
  assert.equal(result.CLOCK, null);
  assert.equal(result.ENTITY_ID, "QUEEN-X72-0072");
});

test("integrity mismatch is observable but unusable", () => {
  const ingress = createQueenObservationIngress();
  const input = fixture();
  input.payload.integrity_match = false;

  const result = ingress.accept(input);
  assert.equal(result.STATUS, "FRESH");
  assert.equal(result.USABLE, false);
  assert.equal(result.REASON, "INTEGRITY_MISMATCH");
});

test("Queen identity continuity is enforced across observations", () => {
  const ingress = createQueenObservationIngress();
  ingress.accept(fixture());

  const changed = fixture();
  changed.entity_id = "QUEEN-X72-OTHER";
  changed.payload.entity_id = "QUEEN-X72-OTHER";

  assert.throws(
    () => ingress.accept(changed),
    /ENTITY_CONTINUITY_VIOLATION/
  );
});

test("bounded retry crosses UNKNOWN then STALE and returns first usable FRESH observation", async () => {
  const ingress = createQueenObservationIngress();
  const stale = fixture();
  stale.status = "STALE";
  stale.condition = "WEBSOCKET_DISCONNECT";
  const fresh = fixture();
  fresh.condition = "RECONNECTED";

  const queue = [unknownEnvelope(), stale, fresh];
  const delays = [];
  const result = await ingress.readUsable(
    async () => queue.shift(),
    {
      maxAttempts: 3,
      baseDelayMs: 5,
      maxDelayMs: 20,
      sleep: async (ms) => delays.push(ms)
    }
  );

  assert.equal(result.USABLE, true);
  assert.equal(result.ATTEMPTS, 3);
  assert.equal(result.CONDITION, "RECONNECTED");
  assert.deepEqual(delays, [5, 10]);
});

test("integrity mismatch fails closed without retrying past the anomaly", async () => {
  const ingress = createQueenObservationIngress();
  const bad = fixture();
  bad.payload.integrity_match = false;
  let calls = 0;
  const delays = [];

  await assert.rejects(
    ingress.readUsable(
      async () => {
        calls += 1;
        return bad;
      },
      { sleep: async (ms) => delays.push(ms) }
    ),
    /QUEEN_INGRESS_DENIED: integrity_match=false/
  );

  assert.equal(calls, 1);
  assert.deepEqual(delays, []);
});

test("bounded retry stops after maxAttempts when observations stay STALE", async () => {
  const ingress = createQueenObservationIngress();
  const stale = fixture();
  stale.status = "STALE";
  stale.condition = "WEBSOCKET_DISCONNECT";
  let calls = 0;
  const delays = [];

  await assert.rejects(
    ingress.readUsable(
      async () => {
        calls += 1;
        return stale;
      },
      {
        maxAttempts: 3,
        baseDelayMs: 2,
        maxDelayMs: 5,
        sleep: async (ms) => delays.push(ms)
      }
    ),
    /QUEEN_INGRESS_NOT_USABLE: status=STALE reason=STALE attempts=3/
  );

  assert.equal(calls, 3);
  assert.deepEqual(delays, [2, 4]);
});

test("ingress module has no network transport and no World Router invocation", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/ingestion/queen-observation-ingress.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\b(buildWorldTransportRequest|routeWorld)\b/);
  assert.doesNotMatch(source, /\b(POST|PUT|PATCH|DELETE)\b/);
});
