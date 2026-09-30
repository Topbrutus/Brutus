import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createVersoRuntime, VERSO_DEFAULT_STATE } from "../src/verso-guard.mjs";
import { createQueenObservationIngress } from "../src/ingestion/queen-observation-ingress.mjs";
import { createVersoQueenClockAdapter } from "../src/adapters/verso-queen-clock.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function loadJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(here, relative), "utf8"));
}

function card() {
  return loadJson("../examples/cards/BRUTUS-CARD-QUEEN-CLOCK-0001.json");
}

function envelope() {
  return loadJson("../fixtures/x72/observation-envelope-state.json");
}

test("registered Verso Queen clock card reads one verified observation and returns DEFAULT_LOCKED", async () => {
  const runtime = createVersoRuntime();
  const ingress = createQueenObservationIngress();
  const adapter = createVersoQueenClockAdapter({
    ingress,
    readObservation: async () => envelope(),
    retryPolicy: { sleep: async () => {} }
  });

  const outcome = await runtime.execute(card(), adapter);

  assert.equal(outcome.ok, true);
  assert.equal(outcome.cardId, "BRUTUS-CARD-QUEEN-CLOCK-0001");
  assert.equal(outcome.result.USABLE, true);
  assert.equal(outcome.result.DATA.entity_id, "QUEEN-X72-0072");
  assert.equal(outcome.result.DATA.tick, 273);
  assert.equal(outcome.result.PROOF.integrity_match, true);
  assert.equal(outcome.result.PROOF.identity_continuity, true);
  assert.equal(outcome.result.PROOF.freshness_status, "FRESH");
  assert.deepEqual(outcome.trace, [
    "DEFAULT_LOCKED",
    "CARD_APPLIED",
    "QUERY_RUNNING",
    "RESULT_READY",
    "DEFAULT_LOCKED"
  ]);
  assert.equal(runtime.state, VERSO_DEFAULT_STATE);
});

test("persistent STALE source fails closed and Verso still resets", async () => {
  const runtime = createVersoRuntime();
  const ingress = createQueenObservationIngress();
  const stale = envelope();
  stale.status = "STALE";
  stale.condition = "WEBSOCKET_DISCONNECT";

  const adapter = createVersoQueenClockAdapter({
    ingress,
    readObservation: async () => stale,
    retryPolicy: {
      maxAttempts: 2,
      baseDelayMs: 0,
      maxDelayMs: 0,
      sleep: async () => {}
    }
  });

  await assert.rejects(
    runtime.execute(card(), adapter),
    /QUEEN_INGRESS_NOT_USABLE/
  );
  assert.equal(runtime.state, VERSO_DEFAULT_STATE);
});

test("registered Queen card cannot smuggle a World Router read", async () => {
  const runtime = createVersoRuntime();
  const ingress = createQueenObservationIngress();
  const adapter = createVersoQueenClockAdapter({
    ingress,
    readObservation: async () => envelope(),
    retryPolicy: { sleep: async () => {} }
  });
  const bad = card();
  bad.READ.push("world.route");

  await assert.rejects(
    runtime.execute(bad, adapter),
    /prepared card contract mismatch: READ/
  );
  assert.equal(runtime.state, VERSO_DEFAULT_STATE);
});

test("registered Queen clock card accepts no mutable VALUES", async () => {
  const runtime = createVersoRuntime();
  const ingress = createQueenObservationIngress();
  const adapter = createVersoQueenClockAdapter({
    ingress,
    readObservation: async () => envelope(),
    retryPolicy: { sleep: async () => {} }
  });
  const bad = card();
  bad.VALUES["query.any"] = "surprise";

  await assert.rejects(
    runtime.execute(bad, adapter),
    /VALUES key is not mutable: query.any/
  );
  assert.equal(runtime.state, VERSO_DEFAULT_STATE);
});

test("Verso Queen adapter contains no network transport and no World Router invocation", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/adapters/verso-queen-clock.mjs"),
    "utf8"
  );
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\b(buildWorldTransportRequest|routeWorld)\b/);
  assert.doesNotMatch(source, /\b(POST|PUT|PATCH|DELETE)\b/);
});
