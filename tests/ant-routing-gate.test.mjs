import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeAntIdentity } from "../src/adapters/ant-birth-identity.mjs";
import { assertLiveRoutingAuthorized } from "../src/policy/ant-routing-gate.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

test("audited birth identity remains fail-closed for live routing", () => {
  const receipt = JSON.parse(
    fs.readFileSync(path.join(here, "../fixtures/ants/ant-birth-receipt.json"), "utf8")
  );
  const ant = normalizeAntIdentity(receipt);

  assert.equal(ant.ROUTING_AUTHORIZATION, "UNDECIDED");
  assert.throws(
    () => assertLiveRoutingAuthorized(ant),
    /LIVE_ROUTING_DENIED: routing authorization is UNDECIDED/
  );
});

test("unnormalized identities cannot enter live routing gate", () => {
  assert.throws(
    () => assertLiveRoutingAuthorized({ ANT_ID: "ANT-0123456789AB" }),
    /normalized ANT identity required/
  );
});
