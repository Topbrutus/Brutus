import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createAstraStation, loadPrototypeManifestFromFile } from "../src/anchor-station.mjs";
import { createAnchorLedger } from "../src/anchor-ledger.mjs";
import { createCounterTestQueue } from "../src/counter-test-queue.mjs";
import { createCounterTestResultGate } from "../src/counter-test-result-gate.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
function readJson(relative){ return JSON.parse(fs.readFileSync(path.join(here,relative),"utf8")); }

function setup(){
  const station=createAstraStation();
  station.registerPrototype(loadPrototypeManifestFromFile(path.join(here,"../examples/prototypes/BRUTUS-PROTOTYPE-EXPERIMENT-INTAKE-0001.json")));
  station.registerPrototype(loadPrototypeManifestFromFile(path.join(here,"../examples/prototypes/BRUTUS-PROTOTYPE-COUNTER-TEST-BENCH-0001.json")));
  const ledger=createAnchorLedger({station});
  ledger.append(readJson("../examples/records/BRUTUS-RECORD-ZELSTEREOS-369-396-0001.json"));
  ledger.append(readJson("../examples/records/BRUTUS-RECORD-BRUTUS-PELL-L7-L8-0001.json"));
  const queue=createCounterTestQueue({station,ledger});
  queue.register(readJson("../examples/counter-tests/BRUTUS-COUNTER-TEST-BRUTUS-PELL-L8-0001.json"));
  return {ledger,gate:createCounterTestResultGate({queue,station})};
}

test("native GMP-ECM L8 result qualifies exactly",()=>{
  const {gate}=setup();
  const raw=readJson("../examples/results/BRUTUS-COUNTER-RESULT-BRUTUS-PELL-L8-GMP-ECM-0003.json");
  const expected=readJson("../examples/records/BRUTUS-RECORD-COUNTER-BRUTUS-PELL-L8-GMP-ECM-0003.json");
  assert.deepEqual(gate.qualify(raw),expected);
  assert.equal(expected.DATA.verdict,"INCONCLUSIVE");
  assert.equal(expected.PROOF_REF,null);
});

test("native GMP-ECM campaign is preserved as a bounded no-factor result",()=>{
  const raw=readJson("../examples/results/BRUTUS-COUNTER-RESULT-BRUTUS-PELL-L8-GMP-ECM-0003.json");
  const ct03=raw.CHECK_RESULTS.find(x=>x.CHECK_ID==="CT-03");
  const run=ct03.OBSERVED.native_gmp_ecm_campaign;
  assert.equal(ct03.STATUS,"INCONCLUSIVE");
  assert.equal(run.status,"NO_FACTOR_IN_BOUNDED_CAMPAIGN");
  assert.equal(run.engine,"GMP-ECM 7.0.6");
  assert.equal(run.curves,100);
  assert.equal(run.B1,"1e6");
  assert.equal(run.B2,null);
  assert.equal(run.stop_on_first_factor,true);
  assert.equal(run.Q_digits,828);
  assert.equal(run.Q_sha256,"59ce8bd15e4bbfbec0403b55231ee2919425739d929a32787aa3135f9891d634");
  assert.equal(ct03.OBSERVED.prime_factor,null);
  assert.equal(ct03.OBSERVED.exact_rank,null);
});

test("L8 check-state vector remains PASS PASS INCONCLUSIVE PASS",()=>{
  const raw=readJson("../examples/results/BRUTUS-COUNTER-RESULT-BRUTUS-PELL-L8-GMP-ECM-0003.json");
  assert.deepEqual(
    Object.fromEntries(raw.CHECK_RESULTS.map(x=>[x.CHECK_ID,x.STATUS])),
    {"CT-01":"PASS","CT-02":"PASS","CT-03":"INCONCLUSIVE","CT-04":"PASS"}
  );
});
