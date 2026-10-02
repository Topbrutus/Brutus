import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  computeCrystalStrandSignature
} from "../src/crystal-strand-metabolism.mjs";
import {
  proposeStrandSegmentation
} from "../src/strand-segmentation-dust.mjs";
import {
  computeFourmiMaterialRequestSignature,
  computeStrandSegmentationProposalH256,
  materializeApprovedStrandSegment,
  validateFourmiMaterial,
  validateFourmiMaterialRequest
} from "../src/fourmi-material-action.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function hex(char) {
  return char.repeat(64);
}

function modality(kind, featureChar, salience = 0.2, confidence = 0.9) {
  return {
    KIND: kind,
    SOURCE_REF: `source://${kind.toLowerCase()}/${featureChar}`,
    SOURCE_H256: hex("a"),
    FEATURE_H256: hex(featureChar),
    SALIENCE: salience,
    CONFIDENCE: confidence
  };
}

function bead(tick, hz, featureChar, {
  salience = 0.2,
  modalities = ["AUDITION"],
  left = 0,
  right = 0,
  valence = 0
} = {}) {
  const chars = "bcdef123456789";
  const start = Math.max(0, chars.indexOf(featureChar));
  return {
    BEAD_ID: `B-T${tick}-MATERIAL`,
    TICK: tick,
    MODALITIES: modalities.map((kind, index) =>
      modality(kind, chars[(start + index) % chars.length], salience)
    ),
    INTERNAL: {
      LOGICAL_HZ: hz,
      VALENCE: valence,
      LEFT_PHASE_DEG: left,
      RIGHT_PHASE_DEG: right
    }
  };
}

function strand(beads, replayCount = 0) {
  const value = {
    SCHEMA: "BRUTUS-CRYSTAL-STRAND-v0.1",
    VERSION: "0.1",
    STRAND_ID: "STRAND-MATERIAL-0001",
    CLOCK_AUTHORITY: "QUEEN_SERVER_V0_2",
    TICK_START: beads[0].TICK,
    TICK_END: beads[beads.length - 1].TICK,
    REPLAY_COUNT: replayCount,
    PARENT_CRYSTAL_REFS: ["BRUTUS-CRYSTAL-QUEEN-PUBLIC-READ-0001"],
    BEADS: beads,
    SIGNATURE_METHOD: "BRUTUS-CANONICAL-JSON-SHA256-v0.1",
    SIGNATURE_H256: "0".repeat(64),
    PROOF_REF: null,
    EXECUTABLE: false,
    MUTATION_AUTHORITY: false,
    DUST_CREATION_AUTHORITY: false,
    DELETION_AUTHORITY: false
  };
  value.SIGNATURE_H256 = computeCrystalStrandSignature(value);
  return value;
}

function requestFor(inputStrand, proposal, segmentId, tick = 10000) {
  const request = {
    SCHEMA: "BRUTUS-FOURMI-MATERIAL-ACTION-REQUEST-v0.1",
    VERSION: "0.1",
    REQUEST_ID: "FMA-MATERIAL-0001",
    ANT_ID: "ANT-000000000001",
    TICK: tick,
    CLOCK_AUTHORITY: "QUEEN_SERVER_V0_2",
    PARENT_STRAND_ID: inputStrand.STRAND_ID,
    PARENT_SIGNATURE_H256: inputStrand.SIGNATURE_H256,
    PROPOSAL_H256: computeStrandSegmentationProposalH256(proposal),
    SEGMENT_ID: segmentId,
    AUTHORIZATION: {
      POLICY: "BRUTUS-FOURMI-MATERIAL-ACTION-v0.1",
      DECISION: "APPROVED",
      APPROVER: "BRUTUS_CONTROL_PLANE"
    },
    TRACE_ID: "TRACE-MATERIAL-0001",
    PROOF_REF: null,
    SIGNATURE_METHOD: "BRUTUS-CANONICAL-JSON-SHA256-v0.1",
    SIGNATURE_H256: "0".repeat(64),
    EXECUTABLE: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "UNDECIDED"
  };
  request.SIGNATURE_H256 = computeFourmiMaterialRequestSignature(request);
  return request;
}

function mixedStrand() {
  return strand([
    bead(100, 240.1, "b"),
    bead(101, 240.1, "b"),
    bead(102, 241.2, "c", { salience: 0.45 }),
    bead(103, 241.2, "c", { salience: 0.45 })
  ]);
}

function spikeStrand() {
  return strand([
    bead(200, 240.1, "b", { salience: 0.1 }),
    bead(201, 240.1, "b", { salience: 0.1 }),
    bead(202, 246.7, "e", {
      salience: 0.95,
      modalities: ["AUDITION", "VISION", "TOUCH"],
      left: 90,
      right: 270,
      valence: 0.8
    }),
    bead(203, 240.1, "b", { salience: 0.1 }),
    bead(204, 240.1, "b", { salience: 0.1 })
  ]);
}

test("approved dust candidate becomes immutable crystal dust material", () => {
  const s = strand([
    bead(10, 240.1, "b", { salience: 0.1 }),
    bead(11, 240.1, "b", { salience: 0.1 }),
    bead(12, 240.1, "b", { salience: 0.1 })
  ]);
  const proposal = proposeStrandSegmentation(s);
  const req = requestFor(s, proposal, proposal.SEGMENTS[0].SEGMENT_ID, 20);

  const material = materializeApprovedStrandSegment({
    strand: s,
    proposal,
    request: req
  });

  assert.equal(material.MATERIAL_CLASS, "CRYSTAL_DUST");
  assert.equal(material.MATERIAL_INTENT, "RECYCLE");
  assert.equal(material.PARENT_MUTATED, false);
  assert.equal(material.PARENT_DELETED, false);
  assert.equal(material.MATERIAL_CREATED, true);
  assert.equal(material.PROOF_REF, null);
  assert.equal(Object.isFrozen(material), true);
  assert.equal(Object.isFrozen(material.PAYLOAD.BEADS[0]), true);
});

test("crystal fragment candidate becomes recrystallization material", () => {
  const s = mixedStrand();
  const proposal = proposeStrandSegmentation(s);
  const target = proposal.SEGMENTS.find(
    item => item.DISPOSITION === "CRYSTAL_FRAGMENT_CANDIDATE"
  );
  assert.ok(target);

  const req = requestFor(s, proposal, target.SEGMENT_ID, 110);
  const material = materializeApprovedStrandSegment({
    strand: s,
    proposal,
    request: req
  });

  assert.equal(material.MATERIAL_CLASS, "CRYSTAL_FRAGMENT");
  assert.equal(material.MATERIAL_INTENT, "RECRYSTALLIZE");
  assert.equal(material.PEDIGREE.SEGMENT_ID, target.SEGMENT_ID);
  assert.equal(material.PAYLOAD.BEADS.length, target.BEAD_COUNT);
});

test("preserve fragment candidate becomes preserve material", () => {
  const s = spikeStrand();
  const proposal = proposeStrandSegmentation(s);
  const target = proposal.SEGMENTS.find(
    item => item.DISPOSITION === "PRESERVE_FRAGMENT_CANDIDATE"
  );
  assert.ok(target);

  const req = requestFor(s, proposal, target.SEGMENT_ID, 300);
  const material = materializeApprovedStrandSegment({
    strand: s,
    proposal,
    request: req
  });

  assert.equal(material.MATERIAL_CLASS, "CRYSTAL_FRAGMENT");
  assert.equal(material.MATERIAL_INTENT, "PRESERVE");
  assert.equal(material.PAYLOAD.SALIENCE_PEAK, 0.95);
  assert.deepEqual(material.PAYLOAD.MODALITY_KINDS, ["AUDITION", "TOUCH", "VISION"]);
});

test("material payload contains exact selected bead range only", () => {
  const s = mixedStrand();
  const proposal = proposeStrandSegmentation(s);
  const target = proposal.SEGMENTS[1];
  const req = requestFor(s, proposal, target.SEGMENT_ID, 110);

  const material = materializeApprovedStrandSegment({
    strand: s,
    proposal,
    request: req
  });

  const expectedIds = s.BEADS
    .slice(target.START_INDEX, target.END_INDEX + 1)
    .map(item => item.BEAD_ID);
  assert.deepEqual(material.PAYLOAD.BEADS.map(item => item.BEAD_ID), expectedIds);
  assert.equal(material.PEDIGREE.TICK_START, target.TICK_START);
  assert.equal(material.PEDIGREE.TICK_END, target.TICK_END);
});

test("request requires exact explicit control-plane approval", () => {
  const s = mixedStrand();
  const proposal = proposeStrandSegmentation(s);
  const target = proposal.SEGMENTS[0];
  const req = requestFor(s, proposal, target.SEGMENT_ID, 110);
  req.AUTHORIZATION.DECISION = "DENIED";
  req.SIGNATURE_H256 = computeFourmiMaterialRequestSignature(req);

  assert.throws(
    () => validateFourmiMaterialRequest(req),
    /DECISION must be APPROVED/
  );
});

test("request cannot target a segment absent from deterministic proposal", () => {
  const s = mixedStrand();
  const proposal = proposeStrandSegmentation(s);
  const req = requestFor(s, proposal, "STRAND-MATERIAL-0001-SEG-9999", 110);

  assert.throws(
    () => materializeApprovedStrandSegment({ strand: s, proposal, request: req }),
    /SEGMENT_ID is not present/
  );
});

test("proposal tampering is rejected before materialization", () => {
  const s = mixedStrand();
  const proposal = structuredClone(proposeStrandSegmentation(s));
  const targetId = proposal.SEGMENTS[0].SEGMENT_ID;
  proposal.SEGMENTS[0].METRICS.SALIENCE_PEAK = 0.999;
  const req = requestFor(s, proposal, targetId, 110);

  assert.throws(
    () => materializeApprovedStrandSegment({ strand: s, proposal, request: req }),
    /proposal does not match deterministic proposal/
  );
});

test("parent strand mutation is rejected by its existing signature", () => {
  const s = mixedStrand();
  const proposal = proposeStrandSegmentation(s);
  const target = proposal.SEGMENTS[0];
  const req = requestFor(s, proposal, target.SEGMENT_ID, 110);
  s.BEADS[0].INTERNAL.LOGICAL_HZ = 999;

  assert.throws(
    () => materializeApprovedStrandSegment({ strand: s, proposal, request: req }),
    /SIGNATURE_H256 mismatch/
  );
});

test("materialization cannot occur before segment end tick", () => {
  const s = mixedStrand();
  const proposal = proposeStrandSegmentation(s);
  const target = proposal.SEGMENTS[1];
  const req = requestFor(s, proposal, target.SEGMENT_ID, target.TICK_END - 1);

  assert.throws(
    () => materializeApprovedStrandSegment({ strand: s, proposal, request: req }),
    /cannot precede segment end/
  );
});

test("same approved inputs produce byte-equivalent deterministic material", () => {
  const s = mixedStrand();
  const proposal = proposeStrandSegmentation(s);
  const target = proposal.SEGMENTS[1];
  const req = requestFor(s, proposal, target.SEGMENT_ID, 110);

  const a = materializeApprovedStrandSegment({ strand: s, proposal, request: req });
  const b = materializeApprovedStrandSegment({ strand: s, proposal, request: req });

  assert.deepEqual(a, b);
  assert.equal(a.MATERIAL_H256, b.MATERIAL_H256);
  assert.equal(a.MATERIAL_ID, b.MATERIAL_ID);
});

test("material validator detects payload tampering", () => {
  const s = mixedStrand();
  const proposal = proposeStrandSegmentation(s);
  const target = proposal.SEGMENTS[1];
  const req = requestFor(s, proposal, target.SEGMENT_ID, 110);
  const material = structuredClone(
    materializeApprovedStrandSegment({ strand: s, proposal, request: req })
  );

  material.PAYLOAD.BEADS[0].INTERNAL.LOGICAL_HZ = 777;
  assert.throws(
    () => validateFourmiMaterial(material),
    /LOGICAL_HZ_MIN mismatch|PAYLOAD_H256 mismatch|MATERIAL_H256 mismatch/
  );
});

test("material validator rejects forged modality summary even if payload hash is not checked first", () => {
  const s = spikeStrand();
  const proposal = proposeStrandSegmentation(s);
  const target = proposal.SEGMENTS.find(
    item => item.DISPOSITION === "PRESERVE_FRAGMENT_CANDIDATE"
  );
  const req = requestFor(s, proposal, target.SEGMENT_ID, 300);
  const material = structuredClone(
    materializeApprovedStrandSegment({ strand: s, proposal, request: req })
  );

  material.PAYLOAD.MODALITY_KINDS = ["AUDITION"];
  assert.throws(
    () => validateFourmiMaterial(material),
    /does not match bead modalities/
  );
});

test("created material remains non-executable, non-routing and non-proof", () => {
  const s = mixedStrand();
  const proposal = proposeStrandSegmentation(s);
  const target = proposal.SEGMENTS[1];
  const req = requestFor(s, proposal, target.SEGMENT_ID, 110);
  const material = materializeApprovedStrandSegment({
    strand: s,
    proposal,
    request: req
  });

  assert.equal(material.EXECUTABLE, false);
  assert.equal(material.AUTO_PROOF_PROMOTION, false);
  assert.equal(material.GATE_AUTHORITY, false);
  assert.equal(material.ROUTING_AUTHORIZATION, "UNDECIDED");
  assert.equal(material.PROOF_REF, null);
});

test("production material action has no random, timers, network or process execution", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/fourmi-material-action.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /setInterval|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(source, /fetch\s*\(|WebSocket|node:child_process|process\.exec/);
});
