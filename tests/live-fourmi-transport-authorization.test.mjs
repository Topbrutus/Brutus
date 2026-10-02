import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { adaptBrotoculateurStatus } from "../src/brotoculateur-input-adapter.mjs";
import { crystallizeMathInputItem } from "../src/math-crystal-candidate.mjs";
import {
  admitMathCrystalToFourmi,
  computeMathMaterialAdmissionRequestH256
} from "../src/fourmi-math-material-admission.mjs";
import {
  createLiveFourmiTransportAuthorization,
  validateLiveFourmiTransportAuthorization,
  assertLiveMaterialTransportAuthorized
} from "../src/live-fourmi-transport-authorization.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(here, relative), "utf8"));
}

function statusFixture() {
  return {
    run_id: "run-auth-fixture",
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

function antBirthReceipt(antId = "ANT-000000000001", state = "SINGING_TO_MEET") {
  const receipt = readJson("../fixtures/ants/ant-birth-receipt.json");
  receipt.ant_id = antId;
  receipt.state = state;
  receipt.project_soul.memory_id = "MEM-LIVE-TRANSPORT";
  receipt.project_soul.lineage = [antId];
  return receipt;
}

function admittedMaterial(createdAtTick = 100) {
  const packet = adaptBrotoculateurStatus(statusFixture());
  const item = packet.ITEMS[0];
  const crystal = crystallizeMathInputItem(packet, item.ITEM_ID);

  const request = {
    SCHEMA: "BRUTUS-MATH-MATERIAL-ADMISSION-REQUEST-v0.1",
    VERSION: "0.1",
    REQUEST_ID: "MMA-LIVE-AUTH-0001",
    ANT_ID: "ANT-000000000001",
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
    TRACE_ID: "TRACE-LIVE-AUTH-ADMISSION",
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

function approval() {
  return {
    POLICY: "BRUTUS-LIVE-FOURMI-TRANSPORT-v0.1",
    DECISION: "APPROVED",
    APPROVER: "BRUTUS_CONTROL_PLANE"
  };
}

function grantFixture({
  receipt = antBirthReceipt(),
  material = admittedMaterial(),
  issuedAtTick = 110,
  validFromTick = 111,
  expiresAtTick = 500,
  from = "W:START",
  to = "W:GENESIS-A"
} = {}) {
  return createLiveFourmiTransportAuthorization({
    antBirthReceipt: receipt,
    material,
    issuedAtTick,
    validFromTick,
    expiresAtTick,
    from,
    to,
    traceId: "TRACE-LIVE-TRANSPORT-AUTH",
    authorization: approval()
  });
}

test("creates bounded single-use live transport authorization", () => {
  const grant = grantFixture();

  assert.equal(grant.SCHEMA, "BRUTUS-LIVE-FOURMI-TRANSPORT-AUTHORIZATION-v0.1");
  assert.equal(grant.ANT_ID, "ANT-000000000001");
  assert.equal(grant.SCOPE.FROM, "W:START");
  assert.equal(grant.SCOPE.TO, "W:GENESIS-A");
  assert.equal(grant.SCOPE.MAX_MOVES, 1);
  assert.equal(grant.SINGLE_USE, true);
  assert.equal(grant.ROUTING_AUTHORIZATION, "AUTHORIZED");
  assert.equal(grant.EXECUTABLE, false);
  assert.equal(grant.PROOF_REF, null);
});

test("same inputs create deterministic authorization", () => {
  const a = grantFixture();
  const b = grantFixture();

  assert.equal(a.AUTHORIZATION_ID, b.AUTHORIZATION_ID);
  assert.equal(a.SIGNATURE_H256, b.SIGNATURE_H256);
  assert.deepEqual(a, b);
});

test("authorization is bound to exact live ant identity", () => {
  const material = admittedMaterial();
  const grant = grantFixture({ material });

  assert.throws(
    () => assertLiveMaterialTransportAuthorized({
      authorization: grant,
      antBirthReceipt: antBirthReceipt("ANT-0123456789AB"),
      material,
      tick: 200,
      from: "W:START",
      to: "W:GENESIS-A"
    }),
    /grant ANT_ID mismatch|material carrier does not match live ANT/
  );
});

test("authorization is bound to exact material ID and hash", () => {
  const material = admittedMaterial();
  const grant = grantFixture({ material });
  const other = structuredClone(material);
  other.MATERIAL_ID = "MAT-MATH-AAAAAAAAAAAAAAAAAAAAAAAA";

  assert.throws(
    () => assertLiveMaterialTransportAuthorized({
      authorization: grant,
      antBirthReceipt: antBirthReceipt(),
      material: other,
      tick: 200,
      from: "W:START",
      to: "W:GENESIS-A"
    }),
    /MATERIAL_H256 mismatch|grant material ID mismatch/
  );
});

test("authorization rejects route outside exact scope", () => {
  const material = admittedMaterial();
  const grant = grantFixture({ material });

  assert.throws(
    () => assertLiveMaterialTransportAuthorized({
      authorization: grant,
      antBirthReceipt: antBirthReceipt(),
      material,
      tick: 200,
      from: "W:START",
      to: "W:GENESIS-B"
    }),
    /outside authorization scope/
  );
});

test("authorization is not valid before VALID_FROM_TICK", () => {
  const material = admittedMaterial();
  const grant = grantFixture({ material, validFromTick: 150 });

  assert.throws(
    () => assertLiveMaterialTransportAuthorized({
      authorization: grant,
      antBirthReceipt: antBirthReceipt(),
      material,
      tick: 149,
      from: "W:START",
      to: "W:GENESIS-A"
    }),
    /not active yet/
  );
});

test("authorization expires at finite Queen tick", () => {
  const material = admittedMaterial();
  const grant = grantFixture({ material, expiresAtTick: 300 });

  assert.throws(
    () => assertLiveMaterialTransportAuthorized({
      authorization: grant,
      antBirthReceipt: antBirthReceipt(),
      material,
      tick: 301,
      from: "W:START",
      to: "W:GENESIS-A"
    }),
    /authorization has expired/
  );
});

test("single-use grant cannot be reused when consumed flag is true", () => {
  const material = admittedMaterial();
  const grant = grantFixture({ material });

  assert.throws(
    () => assertLiveMaterialTransportAuthorized({
      authorization: grant,
      antBirthReceipt: antBirthReceipt(),
      material,
      tick: 200,
      from: "W:START",
      to: "W:GENESIS-A",
      consumed: true
    }),
    /already consumed/
  );
});

test("changed live ant lifecycle state invalidates old grant", () => {
  const material = admittedMaterial();
  const grant = grantFixture({ material });

  assert.throws(
    () => assertLiveMaterialTransportAuthorized({
      authorization: grant,
      antBirthReceipt: antBirthReceipt("ANT-000000000001", "MEETING"),
      material,
      tick: 200,
      from: "W:START",
      to: "W:GENESIS-A"
    }),
    /grant ANT identity hash mismatch|grant ANT state mismatch/
  );
});

test("denied Control Plane decision cannot create grant", () => {
  const material = admittedMaterial();

  assert.throws(
    () => createLiveFourmiTransportAuthorization({
      antBirthReceipt: antBirthReceipt(),
      material,
      issuedAtTick: 110,
      validFromTick: 111,
      expiresAtTick: 500,
      from: "W:START",
      to: "W:GENESIS-A",
      traceId: "TRACE-LIVE-TRANSPORT-AUTH",
      authorization: {
        POLICY: "BRUTUS-LIVE-FOURMI-TRANSPORT-v0.1",
        DECISION: "DENIED",
        APPROVER: "BRUTUS_CONTROL_PLANE"
      }
    }),
    /DECISION must be APPROVED/
  );
});

test("authorization cannot be issued before material admission", () => {
  const material = admittedMaterial(100);

  assert.throws(
    () => createLiveFourmiTransportAuthorization({
      antBirthReceipt: antBirthReceipt(),
      material,
      issuedAtTick: 99,
      validFromTick: 100,
      expiresAtTick: 500,
      from: "W:START",
      to: "W:GENESIS-A",
      traceId: "TRACE-LIVE-TRANSPORT-AUTH",
      authorization: approval()
    }),
    /cannot be issued before material admission/
  );
});

test("validity interval must be finite and bounded", () => {
  const material = admittedMaterial();

  assert.throws(
    () => grantFixture({
      material,
      validFromTick: 111,
      expiresAtTick: 111 + 65537
    }),
    /validity span exceeds/
  );
});

test("exact authorized request returns a non-executable verdict", () => {
  const material = admittedMaterial();
  const grant = grantFixture({ material });
  const verdict = assertLiveMaterialTransportAuthorized({
    authorization: grant,
    antBirthReceipt: antBirthReceipt(),
    material,
    tick: 200,
    from: "W:START",
    to: "W:GENESIS-A"
  });

  assert.equal(verdict.DECISION, "AUTHORIZED");
  assert.equal(verdict.ROUTING_AUTHORIZATION, "AUTHORIZED");
  assert.equal(verdict.SINGLE_USE, true);
  assert.equal(verdict.CONSUMED, false);
  assert.equal(verdict.EXECUTABLE, false);
  assert.equal(verdict.GATE_AUTHORITY, false);
  assert.equal(verdict.PROOF_REF, null);
});

test("tampered authorization fails signature validation", () => {
  const grant = structuredClone(grantFixture());
  grant.SCOPE.TO = "W:GENESIS-B";

  assert.throws(
    () => validateLiveFourmiTransportAuthorization(grant),
    /SIGNATURE_H256 mismatch/
  );
});

test("authorization core contains no network timers random or process execution", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/live-fourmi-transport-authorization.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /fetch\s*\(|WebSocket|XMLHttpRequest/);
  assert.doesNotMatch(source, /setInterval|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /node:child_process|process\.exec/);
});
