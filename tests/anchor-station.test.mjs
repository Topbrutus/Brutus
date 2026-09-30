import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ASTRA_STATION_ANCHOR_ID,
  createAstraStation,
  loadPrototypeManifestFromFile
} from "../src/anchor-station.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(
  here,
  "../examples/prototypes/BRUTUS-PROTOTYPE-QUEEN-CLOCK-BENCH-0001.json"
);

function manifest() {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

test("ANCHOR-0001 is an established fixed return point", () => {
  const station = createAstraStation();
  const snapshot = station.snapshot();

  assert.equal(station.anchorId, ASTRA_STATION_ANCHOR_ID);
  assert.equal(snapshot.ANCHOR_ID, "ANCHOR-0001");
  assert.equal(snapshot.NAME, "ASTRA STATION");
  assert.equal(snapshot.STATUS, "ESTABLISHED");
  assert.equal(snapshot.RETURN_POINT, true);
  assert.equal(snapshot.VERSO_CORE_MUTATION, false);
  assert.equal(snapshot.WORLD_ROUTER_INVOCATION, false);
});

test("first Queen clock bench registers at ASTRA STATION", () => {
  const station = createAstraStation();
  const registered = station.registerPrototype(manifest());

  assert.equal(registered.PROTOTYPE_ID, "BRUTUS-PROTOTYPE-QUEEN-CLOCK-BENCH-0001");
  assert.equal(registered.ANCHOR_ID, "ANCHOR-0001");
  assert.deepEqual(registered.CARD_IDS, ["BRUTUS-CARD-QUEEN-CLOCK-0001"]);

  const snapshot = station.snapshot();
  assert.equal(snapshot.PROTOTYPE_COUNT, 1);
  assert.deepEqual(snapshot.PROTOTYPE_IDS, [
    "BRUTUS-PROTOTYPE-QUEEN-CLOCK-BENCH-0001"
  ]);
});

test("prototype manifest can be loaded as data from file", () => {
  const loaded = loadPrototypeManifestFromFile(manifestPath);
  assert.equal(loaded.STATUS, "ACTIVE");
  assert.equal(Object.isFrozen(loaded), true);
});

test("prototype cannot move away from ANCHOR-0001", () => {
  const station = createAstraStation();
  const bad = manifest();
  bad.ANCHOR_ID = "ANCHOR-9999";

  assert.throws(
    () => station.registerPrototype(bad),
    /prototype must live at ANCHOR-0001/
  );
});

test("prototype cannot reference an unknown Verso card", () => {
  const station = createAstraStation();
  const bad = manifest();
  bad.CARD_IDS = ["BRUTUS-CARD-UNKNOWN"];

  assert.throws(
    () => station.registerPrototype(bad),
    /unknown prepared CARD_ID BRUTUS-CARD-UNKNOWN/
  );
});

test("prototype manifest is data-only", () => {
  const station = createAstraStation();
  const bad = manifest();
  bad.PARAMETERS.run = () => "no";

  assert.throws(
    () => station.registerPrototype(bad),
    /must contain data only/
  );
});

test("prototype manifest rejects credential-shaped fields", () => {
  const station = createAstraStation();

  for (const key of ["api_token", "access_token", "bearer_token", "client_secret"]) {
    const bad = manifest();
    bad.PARAMETERS[key] = "do-not-store-me";

    assert.throws(
      () => station.registerPrototype(bad),
      new RegExp("forbidden credential field " + key)
    );
  }
});

test("unknown executable-looking manifest field is rejected", () => {
  const station = createAstraStation();
  const bad = manifest();
  bad.CODE = "console.log('no')";

  assert.throws(
    () => station.registerPrototype(bad),
    /unknown manifest field CODE/
  );
});

test("duplicate prototype IDs are rejected", () => {
  const station = createAstraStation();
  station.registerPrototype(manifest());

  assert.throws(
    () => station.registerPrototype(manifest()),
    /duplicate PROTOTYPE_ID/
  );
});

test("Astra Station module contains no network or process execution", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/anchor-station.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\b(exec|spawn|fork|WorldRouter|routeWorld)\b/);
});
