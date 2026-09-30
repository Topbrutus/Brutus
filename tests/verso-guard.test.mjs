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

test("valid card executes and always returns to DEFAULT_LOCKED", async () => {
  const runtime = createVersoRuntime({ mutableValues: ["query.organ_id"] });

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

test("unknown card fields are rejected", () => {
  const card = validCard();
  card.ARBITRARY_CODE = "console.log('no')";

  assert.throws(
    () => guardCard(card, { mutableValues: ["query.organ_id"] }),
    /unknown field ARBITRARY_CODE/
  );
});

test("write, code change and route creation are forbidden in v0.1", () => {
  for (const field of ["WRITE", "CODE_CHANGE", "CREATE_ROUTE"]) {
    const card = validCard();
    card[field] = true;

    assert.throws(
      () => guardCard(card, { mutableValues: ["query.organ_id"] }),
      new RegExp(field + " must be false")
    );
  }
});

test("VALUES accepts only explicitly mutable keys", () => {
  const card = validCard();
  card.VALUES["unknown.switch"] = 1;

  assert.throws(
    () => guardCard(card, { mutableValues: ["query.organ_id"] }),
    /VALUES key is not mutable/
  );
});

test("cards are data-only", () => {
  const card = validCard();
  card.VALUES["query.organ_id"] = () => "CLOCK";

  assert.throws(
    () => guardCard(card, { mutableValues: ["query.organ_id"] }),
    /must contain data only/
  );
});

test("adapter failure still resets Verso", async () => {
  const runtime = createVersoRuntime({ mutableValues: ["query.organ_id"] });

  await assert.rejects(
    runtime.execute(validCard(), async () => {
      throw new Error("adapter boom");
    }),
    /adapter boom/
  );

  assert.equal(runtime.state, VERSO_DEFAULT_STATE);
});

test("a second card cannot enter while one card is active", async () => {
  const runtime = createVersoRuntime({ mutableValues: ["query.organ_id"] });

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
