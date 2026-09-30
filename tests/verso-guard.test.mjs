import test from "node:test";
import assert from "node:assert/strict";

import {
  createVersoRuntime,
  guardCard,
  VERSO_DEFAULT_STATE
} from "../src/verso-guard.mjs";

function validCard() {
  return {
    CARD_ID: "BRUTUS-CARD-0001",
    VERSION: "0.1",
    ANCHOR: "ANCHOR-0001",
    SOURCE: "ASTRA_STATION",
    TARGET: "BRUTUS_REGISTRY",
    VERSO: "DEFAULT_LOCKED",
    READ: ["registry.sources"],
    MEASURE: ["sha_consistency"],
    RETURN_DATA: ["repo", "head", "role"],
    WRITE: false,
    CODE_CHANGE: false,
    CREATE_ROUTE: false,
    VALUES: {
      "query.organ_id": "CLOCK"
    },
    EXPECTED_OUTPUT: "Verified registry data only",
    PROOF_REQUIRED: true,
    AFTER: "DEFAULT_LOCKED"
  };
}

test("known prepared card executes and always returns to DEFAULT_LOCKED", async () => {
  const runtime = createVersoRuntime();

  const outcome = await runtime.execute(validCard(), async ({ values }) => {
    return { organ: values["query.organ_id"], verified: true };
  });

  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.organ, "CLOCK");
  assert.deepEqual(outcome.trace, [
    "DEFAULT_LOCKED",
    "CARD_APPLIED",
    "QUERY_RUNNING",
    "RESULT_READY",
    "DEFAULT_LOCKED"
  ]);
  assert.equal(runtime.state, VERSO_DEFAULT_STATE);
});

test("unknown CARD_ID is rejected even when the card shape is otherwise valid", () => {
  const card = validCard();
  card.CARD_ID = "BRUTUS-CARD-NOT-REGISTERED";

  assert.throws(
    () => guardCard(card),
    /unknown CARD_ID BRUTUS-CARD-NOT-REGISTERED/
  );
});

test("known CARD_ID cannot alter its prepared static contract", () => {
  const card = validCard();
  card.TARGET = "QUEEN_CLOCK";

  assert.throws(
    () => guardCard(card),
    /prepared card contract mismatch: TARGET/
  );
});

test("known CARD_ID cannot alter its prepared READ contract", () => {
  const card = validCard();
  card.READ = ["registry.sources", "queen.clock"];

  assert.throws(
    () => guardCard(card),
    /prepared card contract mismatch: READ/
  );
});

test("unknown card fields are rejected", () => {
  const card = validCard();
  card.ARBITRARY_CODE = "console.log('no')";

  assert.throws(
    () => guardCard(card),
    /unknown field ARBITRARY_CODE/
  );
});

test("write, code change and route creation are fixed false by prepared policy", () => {
  for (const field of ["WRITE", "CODE_CHANGE", "CREATE_ROUTE"]) {
    const card = validCard();
    card[field] = true;

    assert.throws(
      () => guardCard(card),
      new RegExp("prepared card contract mismatch: " + field)
    );
  }
});

test("VALUES accepts only keys declared mutable by the prepared card", () => {
  const card = validCard();
  card.VALUES["unknown.switch"] = 1;

  assert.throws(
    () => guardCard(card),
    /VALUES key is not mutable/
  );
});

test("runtime may narrow but never expand a prepared card mutable policy", () => {
  assert.throws(
    () => guardCard(validCard(), { mutableValues: ["query.organ_id", "query.extra"] }),
    /runtime mutableValues cannot expand prepared card policy: query.extra/
  );

  const card = validCard();
  card.VALUES = {};
  assert.doesNotThrow(
    () => guardCard(card, { mutableValues: [] })
  );
});

test("cards are data-only", () => {
  const card = validCard();
  card.VALUES["query.organ_id"] = () => "CLOCK";

  assert.throws(
    () => guardCard(card),
    /must contain data only/
  );
});

test("adapter failure still resets Verso", async () => {
  const runtime = createVersoRuntime();

  await assert.rejects(
    runtime.execute(validCard(), async () => {
      throw new Error("adapter boom");
    }),
    /adapter boom/
  );

  assert.equal(runtime.state, VERSO_DEFAULT_STATE);
});

test("a second card cannot enter while one card is active", async () => {
  const runtime = createVersoRuntime();

  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });

  const first = runtime.execute(validCard(), async () => {
    await gate;
    return { ok: true };
  });

  await assert.rejects(
    runtime.execute(validCard(), async () => ({ ok: true })),
    /RUNTIME_BUSY/
  );

  release();
  await first;
  assert.equal(runtime.state, VERSO_DEFAULT_STATE);
});
