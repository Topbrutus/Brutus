import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createVersoRuntime, VERSO_DEFAULT_STATE } from "../src/verso-guard.mjs";
import { createQueenObservationIngress } from "../src/ingestion/queen-observation-ingress.mjs";
import { createVersoQueenClockAdapter } from "../src/adapters/verso-queen-clock.mjs";
import {
  BRUTUS_X72_PROVIDER_SCHEMA,
  createX72AdapterProcessProvider
} from "../src/providers/x72-adapter-process-provider.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function fixture() {
  return JSON.parse(
    fs.readFileSync(
      path.join(here, "../fixtures/x72/observation-envelope-state.json"),
      "utf8"
    )
  );
}

test("provider invokes only the fixed state bridge without a shell", async () => {
  const calls = [];
  const provider = createX72AdapterProcessProvider({
    pythonExecutable: "python3",
    bridgeScript: "/opt/brutus/tools/x72_observation_bridge.py",
    antmuxRoot: "/opt/antmux",
    baseUrl: "http://127.0.0.1:8072",
    runProcess: async (command, args, options) => {
      calls.push({ command, args, options });
      return { stdout: JSON.stringify(fixture()), stderr: "" };
    }
  });

  const envelope = await provider.readObservation();

  assert.equal(provider.SCHEMA, BRUTUS_X72_PROVIDER_SCHEMA);
  assert.equal(provider.MODE, "STATE_ONLY");
  assert.equal(envelope.entity_id, "QUEEN-X72-0072");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, "python3");
  assert.deepEqual(calls[0].args, [
    "/opt/brutus/tools/x72_observation_bridge.py",
    "--antmux-root",
    "/opt/antmux",
    "--base-url",
    "http://127.0.0.1:8072",
    "--mode",
    "state"
  ]);
  assert.equal(calls[0].options.shell, false);
});

test("provider rejects credentials embedded in Queen base URL", () => {
  assert.throws(
    () => createX72AdapterProcessProvider({
      bridgeScript: "bridge.py",
      antmuxRoot: "/opt/antmux",
      baseUrl: "http://user:secret@127.0.0.1:8072"
    }),
    /must not contain credentials/
  );
});

test("provider rejects malformed bridge output", async () => {
  const provider = createX72AdapterProcessProvider({
    bridgeScript: "bridge.py",
    antmuxRoot: "/opt/antmux",
    baseUrl: "http://127.0.0.1:8072",
    runProcess: async () => ({ stdout: "not-json", stderr: "" })
  });

  await assert.rejects(
    provider.readObservation(),
    /bridge stdout is not valid JSON/
  );
});

test("provider converts process failure into bounded unavailable state", async () => {
  const provider = createX72AdapterProcessProvider({
    bridgeScript: "bridge.py",
    antmuxRoot: "/opt/antmux",
    baseUrl: "http://127.0.0.1:8072",
    timeoutMs: 250,
    runProcess: async () => {
      throw new Error("process timed out");
    }
  });

  await assert.rejects(
    provider.readObservation(),
    /X72_PROVIDER_UNAVAILABLE: process timed out/
  );
});

test("provider feeds the full Verso -> ingress -> Queen clock path", async () => {
  const card = JSON.parse(
    fs.readFileSync(
      path.join(here, "../examples/cards/BRUTUS-CARD-QUEEN-CLOCK-0001.json"),
      "utf8"
    )
  );
  const provider = createX72AdapterProcessProvider({
    bridgeScript: "bridge.py",
    antmuxRoot: "/opt/antmux",
    baseUrl: "http://127.0.0.1:8072",
    runProcess: async () => ({ stdout: JSON.stringify(fixture()), stderr: "" })
  });
  const ingress = createQueenObservationIngress();
  const versoAdapter = createVersoQueenClockAdapter({
    ingress,
    readObservation: provider.readObservation,
    retryPolicy: { sleep: async () => {} }
  });
  const runtime = createVersoRuntime({ mutableValues: [] });

  const outcome = await runtime.execute(card, versoAdapter);

  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.DATA.tick, 273);
  assert.equal(outcome.result.PROOF.integrity_match, true);
  assert.equal(runtime.state, VERSO_DEFAULT_STATE);
});

test("bridge imports the existing Antmux adapter and requests state only", () => {
  const source = fs.readFileSync(
    path.join(here, "../tools/x72_observation_bridge.py"),
    "utf8"
  );

  assert.match(source, /from observation_adapter import X72ObservationAdapter/);
  assert.match(source, /adapter\.read_state\(\)/);
  assert.doesNotMatch(source, /read_telemetry\(\)|read_events\(\)|read_report\(\)/);
});

test("process provider contains no World Router call or shell execution", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/providers/x72-adapter-process-provider.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /\b(buildWorldTransportRequest|routeWorld)\b/);
  assert.match(source, /shell:\s*false/);
});
