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
  "../examples/prototypes/BRUTUS-PROTOTYPE-EXPERIMENT-INTAKE-0001.json"
);
const zPath = path.join(
  here,
  "../examples/records/BRUTUS-RECORD-ZELSTEREOS-369-396-0001.json"
);
const pellPath = path.join(
  here,
  "../examples/records/BRUTUS-RECORD-BRUTUS-PELL-L7-L8-0001.json"
);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

test("experiment intake bench registers without adding a Verso card", () => {
  const station = createAstraStation();
  const prototype = loadPrototypeManifestFromFile(prototypePath);
  const registered = station.registerPrototype(prototype);

  assert.equal(registered.PROTOTYPE_ID, "BRUTUS-PROTOTYPE-EXPERIMENT-INTAKE-0001");
  assert.equal(registered.PARAMETERS.mode, "PASSIVE_INTAKE");
  assert.equal(registered.PARAMETERS.auto_execute, false);
  assert.equal(registered.PARAMETERS.auto_promote_to_proof, false);
  assert.deepEqual(registered.CARD_IDS, []);
});

test("incoming ZELSTEREOS and Brutus-Pell reports append as qualified traces", () => {
  const station = createAstraStation();
  station.registerPrototype(loadPrototypeManifestFromFile(prototypePath));
  const ledger = createAnchorLedger({ station });

  const z = ledger.append(readJson(zPath));
  const pell = ledger.append(readJson(pellPath));

  assert.equal(z.SEQUENCE, 1);
  assert.equal(pell.SEQUENCE, 2);
  assert.equal(pell.PREVIOUS_H256, z.ENTRY_H256);
  assert.equal(ledger.verify().VALID, true);
  assert.equal(ledger.verify().ENTRY_COUNT, 2);

  assert.equal(
    z.RECORD.DATA.claim_status,
    "USER_REPORTED_NOT_REVERIFIED_BY_BRUTUS"
  );
  assert.equal(z.RECORD.PROOF_REF, null);
  assert.equal(z.RECORD.DATA.exact_external_calculation.determinant_for_396, 0);
  assert.equal(z.RECORD.DATA.exact_external_calculation.determinant_for_369, -23004);

  assert.equal(
    pell.RECORD.DATA.claim_status,
    "EXTERNAL_DERIVED_RELATIONS_NOT_REVERIFIED_BY_BRUTUS"
  );
  assert.equal(pell.RECORD.DATA.bounded_scan.new_prime_candidates, 4853);
  assert.equal(pell.RECORD.DATA.bounded_scan.exact_witnesses, 0);
  assert.equal(pell.RECORD.PROOF_REF, null);
});

test("intake records cannot silently become proof references", () => {
  const station = createAstraStation();
  station.registerPrototype(loadPrototypeManifestFromFile(prototypePath));
  const ledger = createAnchorLedger({ station });
  const incoming = readJson(zPath);

  assert.equal(incoming.RECORD_TYPE, "RESULT");
  assert.equal(incoming.PROOF_REF, null);

  const entry = ledger.append(incoming);
  assert.equal(entry.RECORD.PROOF_REF, null);
  assert.match(entry.RECORD.DATA.claim_status, /NOT_REVERIFIED_BY_BRUTUS/);
});
