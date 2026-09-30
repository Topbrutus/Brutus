import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createVersoRuntime, VERSO_DEFAULT_STATE } from "../src/verso-guard.mjs";
import { createAstraStation, loadPrototypeManifestFromFile } from "../src/anchor-station.mjs";
import { createVersoAstraStationStatusAdapter } from "../src/adapters/verso-astra-station-status.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function stationWithPrototype() {
  const station = createAstraStation();
  const manifest = loadPrototypeManifestFromFile(
    path.join(
      here,
      "../examples/prototypes/BRUTUS-PROTOTYPE-QUEEN-CLOCK-BENCH-0001.json"
    )
  );
  station.registerPrototype(manifest);
  return station;
}

async function loadCard() {
  const { readFile } = await import("node:fs/promises");
  return JSON.parse(
    await readFile(
      path.join(
        here,
        "../examples/cards/BRUTUS-CARD-ASTRA-STATION-STATUS-0001.json"
      ),
      "utf8"
    )
  );
}

test("prepared station status card reports the fixed anchor and prototypes", async () => {
  const station = stationWithPrototype();
  const runtime = createVersoRuntime();
  const adapter = createVersoAstraStationStatusAdapter({ station });
  const card = await loadCard();

  const outcome = await runtime.execute(card, adapter);

  assert.equal(outcome.ok, true);
  assert.equal(outcome.cardId, "BRUTUS-CARD-ASTRA-STATION-STATUS-0001");
  assert.equal(outcome.result.DATA.anchor_id, "ANCHOR-0001");
  assert.equal(outcome.result.DATA.name, "ASTRA STATION");
  assert.equal(outcome.result.DATA.status, "ESTABLISHED");
  assert.equal(outcome.result.DATA.return_point, true);
  assert.equal(outcome.result.DATA.prototype_count, 1);
  assert.equal(outcome.result.DATA.prototypes[0].PROTOTYPE_ID, "BRUTUS-PROTOTYPE-QUEEN-CLOCK-BENCH-0001");
  assert.equal(outcome.result.DATA.prototypes[0].STATUS, "ACTIVE");
  assert.equal(outcome.result.PROOF.fixed_return_point, true);
  assert.equal(outcome.result.PROOF.safety_boundary, true);
  assert.equal(outcome.result.PROOF.verso_core_mutation, false);
  assert.equal(outcome.result.PROOF.world_router_invocation, false);
  assert.equal(runtime.state, VERSO_DEFAULT_STATE);
  assert.equal(outcome.trace.at(-1), "DEFAULT_LOCKED");
});

test("station status card cannot expand its READ contract", async () => {
  const station = stationWithPrototype();
  const runtime = createVersoRuntime();
  const adapter = createVersoAstraStationStatusAdapter({ station });
  const card = await loadCard();
  card.READ.push("world.route");

  await assert.rejects(
    runtime.execute(card, adapter),
    /prepared card contract mismatch: READ/
  );
  assert.equal(runtime.state, VERSO_DEFAULT_STATE);
});

test("station status card cannot carry mutable values", async () => {
  const station = stationWithPrototype();
  const runtime = createVersoRuntime();
  const adapter = createVersoAstraStationStatusAdapter({ station });
  const card = await loadCard();
  card.VALUES["prototype.register"] = true;

  await assert.rejects(
    runtime.execute(card, adapter),
    /VALUES key is not mutable/
  );
  assert.equal(runtime.state, VERSO_DEFAULT_STATE);
});

test("station status adapter is read-only and contains no network or process execution", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(
    path.join(here, "../src/adapters/verso-astra-station-status.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\b(exec|spawn|fork|routeWorld|buildWorldTransportRequest)\b/);
  assert.doesNotMatch(source, /registerPrototype\s*\(/);
});
