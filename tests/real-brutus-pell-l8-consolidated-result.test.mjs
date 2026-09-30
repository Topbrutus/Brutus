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
function pell(n){ let a=0n,b=1n; for(let i=0;i<n;i+=1){ const next=2n*b+a; a=b; b=next; } return a; }
function pellRankMod(prime,limit){ let a=0n,b=1n; const p=BigInt(prime); for(let n=1;n<=limit;n+=1){ const na=b%p; const nb=(2n*b+a)%p; a=na; b=nb; if(a===0n) return n; } return null; }
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

test("consolidated L8 result qualifies exactly",()=>{
  const {gate}=setup();
  const raw=readJson("../examples/results/BRUTUS-COUNTER-RESULT-BRUTUS-PELL-L8-CONSOLIDATED-0002.json");
  const expected=readJson("../examples/records/BRUTUS-RECORD-COUNTER-BRUTUS-PELL-L8-CONSOLIDATED-0002.json");
  assert.deepEqual(gate.qualify(raw),expected);
  assert.equal(expected.DATA.verdict,"INCONCLUSIVE");
  assert.equal(expected.PROOF_REF,null);
});

test("L8 consolidated check states are PASS PASS INCONCLUSIVE PASS",()=>{
  const raw=readJson("../examples/results/BRUTUS-COUNTER-RESULT-BRUTUS-PELL-L8-CONSOLIDATED-0002.json");
  const byId=Object.fromEntries(raw.CHECK_RESULTS.map(x=>[x.CHECK_ID,x.STATUS]));
  assert.deepEqual(byId,{"CT-01":"PASS","CT-02":"PASS","CT-03":"INCONCLUSIVE","CT-04":"PASS"});
});

test("q=2 is an out-of-domain counterexample",()=>{
  const Q2=pell(4)/pell(2);
  assert.equal(Q2,6n);
  assert.equal(Q2%2n,0n);
  assert.equal(pellRankMod(2,4),2);
});

test("q=9 is an out-of-domain composite counterexample",()=>{
  const Q9=pell(81)/pell(9);
  assert.equal(Q9%53n,0n);
  assert.equal(pellRankMod(53,81),27);
});
