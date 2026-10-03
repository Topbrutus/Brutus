import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sha256HexUtf8 } from "../src/sha256-utf8.mjs";
import { adaptBrotoculateurStatus } from "../src/brotoculateur-input-adapter.mjs";
import { crystallizeMathInputItem } from "../src/math-crystal-candidate.mjs";
import {
  admitMathCrystalToFourmi,
  computeMathMaterialAdmissionRequestH256
} from "../src/fourmi-math-material-admission.mjs";
import {
  createLiveFourmiTransportAuthorization
} from "../src/live-fourmi-transport-authorization.mjs";
import {
  createOneStepLiveTransportRuntime
} from "../src/one-step-live-transport-runtime.mjs";
import {
  createAntmuxLiveTransportAdapter,
  createAntmuxLiveTransportRuntimeBindings
} from "../src/antmux-live-transport-adapter.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ANT_ID = "ANT-000000000001";
const TOKEN = "transport-production-test-token";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

function h256(value) {
  return sha256HexUtf8(JSON.stringify(canonicalize(value)));
}

function antBirthReceipt() {
  const receipt = JSON.parse(
    fs.readFileSync(path.join(here, "../fixtures/ants/ant-birth-receipt.json"), "utf8")
  );
  receipt.ant_id = ANT_ID;
  receipt.project_soul.memory_id = "MEM-ANTMUX-LIVE-ADAPTER";
  receipt.project_soul.lineage = [ANT_ID];
  return receipt;
}

function statusFixture() {
  return {
    run_id: "run-antmux-adapter",
    state: "RUNNING",
    round_index: 1,
    formula_ids: ["DOUBLE"],
    brutaux_symbolic: {
      seven_fields: ["INPUT","OUTPUT","FORMULE","PARENT","BRANCHE","RONDE","TRACE"],
      canonical_formulas: 1,
      authenticated_formulas: 1,
      testing_formulas: 0,
      rejected_formulas: 0,
      candidate_formulas: 0,
      traces_total: 10,
      proofs_total: 10,
      proofs_valid: 10,
      proofs_invalid: 0,
      reconstructed_supports: 10,
      failed_supports: 0,
      tracker_sources: 10,
      recycle_emitted: 0,
      sample_formula: "(2*A<INPUT>)=B<OUTPUT>",
      sample_hash: "6001b852fd881afc",
      sample_bindings: ["A=1, B=2"],
      last_trace: {
        INPUT: "1",
        OUTPUT: "2",
        FORMULE: "DOUBLE",
        PARENT: "root",
        BRANCHE: "ROOT",
        RONDE: 1,
        TRACE: "trace-1"
      },
      last_proof: {
        trace_id: "trace-1",
        proof_id: "proof-1",
        valid: true,
        reason: "EXACT_REPLAY",
        expected_output: "2"
      }
    },
    zel_bridge: null
  };
}

function admittedMaterial(createdAtTick = 100) {
  const packet = adaptBrotoculateurStatus(statusFixture());
  const crystal = crystallizeMathInputItem(packet, packet.ITEMS[0].ITEM_ID);

  const request = {
    SCHEMA: "BRUTUS-MATH-MATERIAL-ADMISSION-REQUEST-v0.1",
    VERSION: "0.1",
    REQUEST_ID: "MMA-ANTMUX-ADAPTER-0001",
    ANT_ID,
    TICK: createdAtTick,
    CLOCK_AUTHORITY: "QUEEN_SERVER_V0_2",
    PARENT_CRYSTAL_ID: crystal.CRYSTAL_ID,
    PARENT_CRYSTAL_H256: crystal.CRYSTAL_H256,
    PURPOSE: "FOURMI_TRANSPORT_ADMISSION",
    AUTHORIZATION: {
      POLICY: "BRUTUS-MATH-MATERIAL-ADMISSION-v0.1",
      DECISION: "APPROVED",
      APPROVER: "BRUTUS_CONTROL_PLANE"
    },
    TRACE_ID: "TRACE-ANTMUX-ADAPTER-ADMISSION",
    PROOF_REF: null,
    SIGNATURE_METHOD: "BRUTUS-CANONICAL-JSON-SHA256-v0.1",
    SIGNATURE_H256: "0".repeat(64),
    EXECUTABLE: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "UNDECIDED",
    WHEEL_INGRESS_AUTHORIZATION: false
  };
  request.SIGNATURE_H256 = computeMathMaterialAdmissionRequestH256(request);
  return admitMathCrystalToFourmi({ crystal, packet, request });
}

function grantFor(material) {
  return createLiveFourmiTransportAuthorization({
    antBirthReceipt: antBirthReceipt(),
    material,
    issuedAtTick: 110,
    validFromTick: 150,
    expiresAtTick: 500,
    from: "W:START",
    to: "W:GENESIS-A",
    traceId: "TRACE-ANTMUX-ADAPTER-AUTH",
    authorization: {
      POLICY: "BRUTUS-LIVE-FOURMI-TRANSPORT-v0.1",
      DECISION: "APPROVED",
      APPROVER: "BRUTUS_CONTROL_PLANE"
    }
  });
}

function serverState(material, {
  tick = 200,
  position = "W:START",
  stateVersion = 1,
  lastMoveTick = null,
  lastCommandId = null,
  lastAuthorizationId = null
} = {}) {
  const payload = {
    schema: "ANTMUX-LIVE-FOURMI-TRANSPORT-v0.1",
    authority: "QUEEN_SERVER_V0_2",
    source_endpoint: "/api/live-transport/state",
    observed_at_utc: tick === 200
      ? "2026-10-03T00:10:00.000Z"
      : "2026-10-03T00:10:01.000Z",
    tick,
    queen: {
      entity_id: "QUEEN-X72-0072",
      tick_count: tick,
      generation: 7,
      queen_mode: "STABLE",
      integrity_match: true,
      reference_h256: "c".repeat(64)
    },
    ant_id: ANT_ID,
    position,
    material: {
      material_id: material.MATERIAL_ID,
      material_h256: material.MATERIAL_H256,
      binding_state: "ATTACHED"
    },
    attached_tick: 150,
    updated_tick: tick,
    last_move_tick: lastMoveTick,
    last_command_id: lastCommandId,
    last_authorization_id: lastAuthorizationId,
    state_version: stateVersion
  };

  return {
    ...payload,
    state_h256: h256(payload),
    integrity_match: true
  };
}

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return structuredClone(payload);
    }
  };
}

function createFakeServer(material) {
  let tick = 200;
  let position = "W:START";
  let version = 1;
  let lastMoveTick = null;
  let lastCommandId = null;
  let lastAuthorizationId = null;
  let moveCalls = 0;
  let attachCalls = 0;
  const requests = [];

  async function fetchImpl(url, init = {}) {
    const parsed = new URL(url);
    const method = init.method ?? "GET";
    const headers = init.headers ?? {};
    requests.push({
      path: parsed.pathname,
      method,
      authorization: headers.Authorization ?? null,
      body: init.body ? JSON.parse(init.body) : null
    });

    if (parsed.pathname.endsWith(`/api/live-transport/ant/${ANT_ID}`)) {
      return response(antBirthReceipt());
    }

    if (parsed.pathname.endsWith("/api/live-transport/attach")) {
      attachCalls += 1;
      const body = JSON.parse(init.body);
      assert.equal(body.ANT_ID, ANT_ID);
      assert.equal(body.MATERIAL_ID, material.MATERIAL_ID);
      assert.equal(body.MATERIAL_H256, material.MATERIAL_H256);
      position = body.POSITION;
      return response(serverState(material, {
        tick,
        position,
        stateVersion: version
      }));
    }

    if (parsed.pathname.includes("/api/live-transport/state/")) {
      return response(serverState(material, {
        tick,
        position,
        stateVersion: version,
        lastMoveTick,
        lastCommandId,
        lastAuthorizationId
      }));
    }

    if (parsed.pathname.endsWith("/api/live-transport/move")) {
      moveCalls += 1;
      const body = JSON.parse(init.body);
      assert.equal(body.ANT_ID, ANT_ID);
      assert.equal(body.MATERIAL_ID, material.MATERIAL_ID);
      assert.equal(body.MATERIAL_H256, material.MATERIAL_H256);
      assert.equal(body.FROM, position);
      assert.equal(body.TO, "W:GENESIS-A");
      assert.equal(body.MAX_MOVES, 1);
      assert.equal(body.SINGLE_USE, true);
      assert.equal(body.PROOF_REF, null);
      assert.equal(body.EXECUTABLE, false);
      assert.equal(body.GATE_AUTHORITY, false);
      assert.equal(body.ROUTING_AUTHORIZATION, "AUTHORIZED");

      position = body.TO;
      tick += 1;
      version += 1;
      lastMoveTick = tick;
      lastCommandId = body.COMMAND_ID;
      lastAuthorizationId = body.AUTHORIZATION_ID;

      return response({
        STATUS: "ACCEPTED",
        COMMAND_ID: body.COMMAND_ID,
        AUTHORIZATION_ID: body.AUTHORIZATION_ID,
        ANT_ID: body.ANT_ID,
        MATERIAL_ID: body.MATERIAL_ID,
        FROM: body.FROM,
        TO: body.TO
      });
    }

    return response({ detail: "not found" }, 404);
  }

  return {
    fetchImpl,
    get moveCalls() { return moveCalls; },
    get attachCalls() { return attachCalls; },
    get requests() { return requests; },
    corruptNextStateHash: false
  };
}

test("adapter rejects insecure non-loopback HTTP", () => {
  const material = admittedMaterial();
  assert.throws(
    () => createAntmuxLiveTransportAdapter({
      baseUrl: "http://example.com/laboratoire/embryon-x72",
      token: TOKEN,
      antId: ANT_ID,
      material,
      fetchImpl: async () => { throw new Error("unused"); }
    }),
    /must use HTTPS/
  );
});

test("adapter exposes no transport token", () => {
  const material = admittedMaterial();
  const server = createFakeServer(material);
  const adapter = createAntmuxLiveTransportAdapter({
    baseUrl: "https://antmux.example/laboratoire/embryon-x72",
    token: TOKEN,
    antId: ANT_ID,
    material,
    fetchImpl: server.fetchImpl
  });

  assert.equal("token" in adapter, false);
  assert.equal(JSON.stringify(adapter).includes(TOKEN), false);
});

test("private ant receipt is validated and returned", async () => {
  const material = admittedMaterial();
  const server = createFakeServer(material);
  const adapter = createAntmuxLiveTransportAdapter({
    baseUrl: "https://antmux.example/laboratoire/embryon-x72",
    token: TOKEN,
    antId: ANT_ID,
    material,
    fetchImpl: server.fetchImpl
  });

  const receipt = await adapter.readAntBirthReceipt();
  assert.equal(receipt.schema, "ANTMUX-ANT-BIRTH-v1");
  assert.equal(receipt.ant_id, ANT_ID);
  assert.equal(receipt.role, "SYNAPSE");
  assert.equal(server.requests[0].authorization, `Bearer ${TOKEN}`);
});

test("attach establishes exact server-authoritative pre-state", async () => {
  const material = admittedMaterial();
  const server = createFakeServer(material);
  const adapter = createAntmuxLiveTransportAdapter({
    baseUrl: "https://antmux.example/laboratoire/embryon-x72",
    token: TOKEN,
    antId: ANT_ID,
    material,
    fetchImpl: server.fetchImpl
  });

  const combined = await adapter.attachMaterial({
    position: "W:START",
    traceId: "TRACE-ANTMUX-LIVE-ATTACH"
  });

  assert.equal(server.attachCalls, 1);
  assert.equal(combined.transportState.TICK, 200);
  assert.equal(combined.transportState.POSITION, "W:START");
  assert.equal(combined.transportState.MATERIAL.MATERIAL_ID, material.MATERIAL_ID);
  assert.equal(combined.queenEnvelope.payload.tick_count, 200);
  assert.equal(
    combined.queenEnvelope.source_endpoint,
    "/api/live-transport/state"
  );
});

test("same combined HTTP state supplies exact same Queen and transport tick", async () => {
  const material = admittedMaterial();
  const server = createFakeServer(material);
  const adapter = createAntmuxLiveTransportAdapter({
    baseUrl: "https://antmux.example/laboratoire/embryon-x72",
    token: TOKEN,
    antId: ANT_ID,
    material,
    fetchImpl: server.fetchImpl
  });
  const bindings = createAntmuxLiveTransportRuntimeBindings(adapter);

  const beforeCount = server.requests.length;
  const envelope = await bindings.readObservation();
  const state = await bindings.readTransportState();
  const afterCount = server.requests.length;

  assert.equal(afterCount - beforeCount, 1);
  assert.equal(envelope.payload.tick_count, state.TICK);
  assert.equal(envelope.observed_at_utc, state.SOURCE.OBSERVED_AT_UTC);
});

test("bindings reject transport-state read without preceding combined observation", async () => {
  const material = admittedMaterial();
  const server = createFakeServer(material);
  const adapter = createAntmuxLiveTransportAdapter({
    baseUrl: "https://antmux.example/laboratoire/embryon-x72",
    token: TOKEN,
    antId: ANT_ID,
    material,
    fetchImpl: server.fetchImpl
  });
  const bindings = createAntmuxLiveTransportRuntimeBindings(adapter);

  await assert.rejects(
    () => bindings.readTransportState(),
    /readObservation must run before readTransportState/
  );
});

test("server state hash tampering is rejected", async () => {
  const material = admittedMaterial();
  const good = serverState(material);
  good.position = "W:FORGED";

  const adapter = createAntmuxLiveTransportAdapter({
    baseUrl: "https://antmux.example/laboratoire/embryon-x72",
    token: TOKEN,
    antId: ANT_ID,
    material,
    fetchImpl: async () => response(good)
  });

  await assert.rejects(
    () => adapter.readCombinedState(),
    /server state_h256 mismatch/
  );
});

test("full adapter + runtime chain produces observed material move and consumption", async () => {
  const material = admittedMaterial();
  const grant = grantFor(material);
  const server = createFakeServer(material);

  const adapter = createAntmuxLiveTransportAdapter({
    baseUrl: "https://antmux.example/laboratoire/embryon-x72",
    token: TOKEN,
    antId: ANT_ID,
    material,
    fetchImpl: server.fetchImpl
  });

  await adapter.attachMaterial({
    position: "W:START",
    traceId: "TRACE-ANTMUX-LIVE-ATTACH"
  });

  const bindings = createAntmuxLiveTransportRuntimeBindings(adapter);
  const runtime = createOneStepLiveTransportRuntime({
    ...bindings,
    retryPolicy: {
      maxAttempts: 1,
      baseDelayMs: 0,
      maxDelayMs: 0,
      sleep: async () => {}
    }
  });

  const result = await runtime.runCycle({
    authorization: grant,
    material
  });

  assert.equal(server.moveCalls, 1);
  assert.equal(result.STATUS, "COMPLETED_ONE_AUTHORIZED_MOVE");
  assert.equal(result.PRE_STATE.POSITION, "W:START");
  assert.equal(result.POST_STATE.POSITION, "W:GENESIS-A");
  assert.equal(result.POST_CLOCK_TICK, result.PRE_CLOCK_TICK + 1);
  assert.equal(result.ANT_MOVE.EVENT_TYPE, "ANT_MOVE");
  assert.equal(result.MATERIAL_MOVE.MOVEMENT.MATERIAL_MOVEMENT_VERIFIED, true);
  assert.equal(result.AUTHORIZATION_CONSUMPTION.CONSUMED, true);
  assert.equal(result.AUTHORIZATION_CONSUMPTION.ROUTING_AUTHORIZATION, "CONSUMED");
  assert.equal(result.MATERIAL_MOVE.PROOF_REF, null);
  assert.equal(result.MATERIAL_MOVE.WHEEL_INGRESS_AUTHORIZATION, false);
});

test("move POST sends only bounded server contract fields", async () => {
  const material = admittedMaterial();
  const grant = grantFor(material);
  const server = createFakeServer(material);
  const adapter = createAntmuxLiveTransportAdapter({
    baseUrl: "https://antmux.example/laboratoire/embryon-x72",
    token: TOKEN,
    antId: ANT_ID,
    material,
    fetchImpl: server.fetchImpl
  });
  await adapter.attachMaterial({
    position: "W:START",
    traceId: "TRACE-ANTMUX-LIVE-ATTACH"
  });

  const bindings = createAntmuxLiveTransportRuntimeBindings(adapter);
  const runtime = createOneStepLiveTransportRuntime({
    ...bindings,
    retryPolicy: {
      maxAttempts: 1,
      baseDelayMs: 0,
      maxDelayMs: 0,
      sleep: async () => {}
    }
  });
  await runtime.runCycle({ authorization: grant, material });

  const move = server.requests.find(
    value => value.path.endsWith("/api/live-transport/move")
  );
  assert.ok(move);
  assert.equal("SCHEMA" in move.body, false);
  assert.equal("VERSION" in move.body, false);
  assert.equal(move.body.MAX_MOVES, 1);
  assert.equal(move.body.SINGLE_USE, true);
  assert.equal(move.body.ROUTING_AUTHORIZATION, "AUTHORIZED");
  assert.equal(move.authorization, `Bearer ${TOKEN}`);
});

test("production adapter is network-specific but contains no timers random or process execution", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/antmux-live-transport-adapter.mjs"),
    "utf8"
  );

  assert.match(source, /fetchImpl/);
  assert.doesNotMatch(source, /setInterval|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /node:child_process|process\.exec/);
});
