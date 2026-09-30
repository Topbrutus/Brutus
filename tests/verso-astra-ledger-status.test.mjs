import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createVersoRuntime, VERSO_DEFAULT_STATE } from "../src/verso-guard.mjs";
import { createAstraStation, loadPrototypeManifestFromFile } from "../src/anchor-station.mjs";
import { createAnchorLedger } from "../src/anchor-ledger.mjs";
import { createVersoAstraLedgerStatusAdapter } from "../src/adapters/verso-astra-ledger-status.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function stationAndLedger() {
  const station = createAstraStation();
  station.registerPrototype(
    loadPrototypeManifestFromFile(
      path.join(
        here,
        "../examples/prototypes/BRUTUS-PROTOTYPE-QUEEN-CLOCK-BENCH-0001.json"
      )
    )
  );

  const ledger = createAnchorLedger({ station });
  ledger.append(
    JSON.parse(
      fs.readFileSync(
        path.join(
          here,
          "../examples/records/BRUTUS-RECORD-QUEEN-PUBLIC-READ-0001.json"
        ),
        "utf8"
      )
    )
  );

  return { station, ledger };
}

function card() {
  return JSON.parse(
    fs.readFileSync(
      path.join(
        here,
        "../examples/cards/BRUTUS-CARD-ASTRA-LEDGER-STATUS-0001.json"
      ),
      "utf8"
    )
  );
}

test("prepared ledger status card reports append-only ledger state", async () => {
  const { ledger } = stationAndLedger();
  const runtime = createVersoRuntime();
  const adapter = createVersoAstraLedgerStatusAdapter({ ledger });

  const outcome = await runtime.execute(card(), adapter);

  assert.equal(outcome.ok, true);
  assert.equal(outcome.cardId, "BRUTUS-CARD-ASTRA-LEDGER-STATUS-0001");
  assert.equal(outcome.result.DATA.anchor_id, "ANCHOR-0001");
  assert.equal(outcome.result.DATA.mode, "APPEND_ONLY");
  assert.equal(outcome.result.DATA.entry_count, 1);
  assert.match(outcome.result.DATA.head_h256, /^[0-9a-f]{64}$/);
  assert.equal(outcome.result.DATA.valid, true);
  assert.equal(outcome.result.PROOF.ledger_validity, true);
  assert.equal(runtime.state, VERSO_DEFAULT_STATE);
  assert.equal(outcome.trace.at(-1), "DEFAULT_LOCKED");
});

test("ledger status card cannot carry an append request", async () => {
  const { ledger } = stationAndLedger();
  const runtime = createVersoRuntime();
  const adapter = createVersoAstraLedgerStatusAdapter({ ledger });
  const bad = card();
  bad.READ.push("anchor.ledger.append");

  await assert.rejects(
    runtime.execute(bad, adapter),
    /prepared card contract mismatch: READ/
  );
  assert.equal(runtime.state, VERSO_DEFAULT_STATE);
});

test("ledger status card cannot carry mutable values", async () => {
  const { ledger } = stationAndLedger();
  const runtime = createVersoRuntime();
  const adapter = createVersoAstraLedgerStatusAdapter({ ledger });
  const bad = card();
  bad.VALUES["record"] = { anything: true };

  await assert.rejects(
    runtime.execute(bad, adapter),
    /VALUES key is not mutable/
  );
  assert.equal(runtime.state, VERSO_DEFAULT_STATE);
});

test("ledger status adapter cannot append or route", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/adapters/verso-astra-ledger-status.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /\.append\s*\(/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\b(exec|spawn|fork|routeWorld|buildWorldTransportRequest)\b/);
});
