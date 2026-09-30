import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createAstraStation, loadPrototypeManifestFromFile } from "../src/anchor-station.mjs";
import { createAnchorLedger } from "../src/anchor-ledger.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const prototypePath = path.join(
  here,
  "../examples/prototypes/BRUTUS-PROTOTYPE-QUEEN-CLOCK-BENCH-0001.json"
);
const recordPath = path.join(
  here,
  "../examples/records/BRUTUS-RECORD-QUEEN-PUBLIC-READ-0001.json"
);

function station() {
  const station = createAstraStation();
  station.registerPrototype(loadPrototypeManifestFromFile(prototypePath));
  return station;
}

function record() {
  return JSON.parse(fs.readFileSync(recordPath, "utf8"));
}

test("ledger appends the first proof reference and builds a hash chain", () => {
  const ledger = createAnchorLedger({ station: station() });
  const entry = ledger.append(record());

  assert.equal(entry.SEQUENCE, 1);
  assert.equal(entry.PREVIOUS_H256, null);
  assert.match(entry.ENTRY_H256, /^[0-9a-f]{64}$/);
  assert.equal(entry.RECORD.RECORD_ID, "BRUTUS-RECORD-QUEEN-PUBLIC-READ-0001");

  const verified = ledger.verify();
  assert.equal(verified.VALID, true);
  assert.equal(verified.ENTRY_COUNT, 1);
  assert.equal(verified.HEAD_H256, entry.ENTRY_H256);
});

test("second append chains to the previous entry hash", () => {
  const ledger = createAnchorLedger({ station: station() });
  const first = ledger.append(record());
  const secondRecord = record();
  secondRecord.RECORD_ID = "BRUTUS-RECORD-QUEEN-PUBLIC-READ-0002";
  secondRecord.RECORD_TYPE = "NOTE";
  secondRecord.PROOF_REF = null;
  secondRecord.DATA = { statement: "second append-only trace" };

  const second = ledger.append(secondRecord);

  assert.equal(second.SEQUENCE, 2);
  assert.equal(second.PREVIOUS_H256, first.ENTRY_H256);
  assert.notEqual(second.ENTRY_H256, first.ENTRY_H256);
  assert.equal(ledger.verify().VALID, true);
});

test("duplicate RECORD_ID is rejected", () => {
  const ledger = createAnchorLedger({ station: station() });
  ledger.append(record());

  assert.throws(
    () => ledger.append(record()),
    /duplicate RECORD_ID/
  );
});

test("record cannot reference an unknown prototype", () => {
  const ledger = createAnchorLedger({ station: station() });
  const bad = record();
  bad.PROTOTYPE_ID = "BRUTUS-PROTOTYPE-NOT-HERE";

  assert.throws(
    () => ledger.append(bad),
    /unknown PROTOTYPE_ID/
  );
});

test("record cannot reference an unknown card", () => {
  const ledger = createAnchorLedger({ station: station() });
  const bad = record();
  bad.CARD_ID = "BRUTUS-CARD-NOT-REGISTERED";

  assert.throws(
    () => ledger.append(bad),
    /unknown prepared CARD_ID/
  );
});

test("record cannot move away from ANCHOR-0001", () => {
  const ledger = createAnchorLedger({ station: station() });
  const bad = record();
  bad.ANCHOR_ID = "ANCHOR-9999";

  assert.throws(
    () => ledger.append(bad),
    /record must belong to ANCHOR-0001/
  );
});

test("ledger records are data-only", () => {
  const ledger = createAnchorLedger({ station: station() });
  const bad = record();
  bad.DATA.run = () => "no";

  assert.throws(
    () => ledger.append(bad),
    /must contain data only/
  );
});

test("ledger rejects credential-shaped fields", () => {
  const ledger = createAnchorLedger({ station: station() });
  const bad = record();
  bad.DATA.api_key = "do-not-store-me";

  assert.throws(
    () => ledger.append(bad),
    /forbidden credential field api_key/
  );
});

test("PROOF_REF records require a proof reference", () => {
  const ledger = createAnchorLedger({ station: station() });
  const bad = record();
  bad.PROOF_REF = null;

  assert.throws(
    () => ledger.append(bad),
    /PROOF_REF record requires PROOF_REF/
  );
});

test("ledger exposes no update or delete operation", () => {
  const ledger = createAnchorLedger({ station: station() });

  assert.equal("update" in ledger, false);
  assert.equal("delete" in ledger, false);
  assert.equal("updateRecord" in ledger, false);
  assert.equal("deleteRecord" in ledger, false);
});

test("ledger runtime contains no network, process execution or World Router call", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/anchor-ledger.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\b(exec|spawn|fork|routeWorld|buildWorldTransportRequest)\b/);
});
