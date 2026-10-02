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

const here = path.dirname(fileURLToPath(import.meta.url));
const HEX = "abcdef0123456789";

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
  const start = Math.max(0, HEX.indexOf(featureChar));
  return {
    BEAD_ID: `B-T${tick}-SEGMENT`,
    TICK: tick,
    MODALITIES: modalities.map((kind, index) =>
      modality(kind, HEX[(start + index) % HEX.length], salience)
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
    STRAND_ID: "STRAND-SEGMENTATION-0001",
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

test("flat low-salience strand is proposed as one dust candidate without deletion", () => {
  const input = strand([
    bead(100, 240.1, "b"),
    bead(101, 240.1, "b"),
    bead(102, 240.1, "b")
  ]);

  const result = proposeStrandSegmentation(input);
  assert.equal(result.METABOLISM_DECISION, "RECYCLE_CANDIDATE");
  assert.equal(result.ACTION, "PROPOSE_RECYCLE_AS_WHOLE");
  assert.equal(result.CUT_COUNT, 0);
  assert.equal(result.SEGMENTS.length, 1);
  assert.equal(result.SEGMENTS[0].DISPOSITION, "DUST_CANDIDATE");
  assert.equal(result.DUST_CREATED, false);
  assert.equal(result.DELETION_PERFORMED, false);
});

test("mixed strand gets deterministic cut proposals at observed material boundaries", () => {
  const input = strand([
    bead(200, 240.1, "b"),
    bead(201, 240.1, "b"),
    bead(202, 241.2, "c", { salience: 0.45 }),
    bead(203, 241.2, "c", { salience: 0.45 })
  ]);

  const result = proposeStrandSegmentation(input);
  assert.equal(result.METABOLISM_DECISION, "SEGMENT_CANDIDATE");
  assert.equal(result.ACTION, "PROPOSE_SEGMENTS");
  assert.equal(result.CUT_COUNT, 1);
  assert.deepEqual(result.CUTS[0].REASONS.sort(), [
    "FEATURE_CHANGE",
    "LOGICAL_HZ_BAND_CHANGE",
    "SALIENCE_BAND_CHANGE"
  ].sort());
  assert.equal(result.SEGMENTS.length, 2);
  assert.equal(result.SEGMENTS[0].DISPOSITION, "DUST_CANDIDATE");
  assert.equal(result.SEGMENTS[1].DISPOSITION, "CRYSTAL_FRAGMENT_CANDIDATE");
});

test("flat -> salient spike -> flat proposes selective retention", () => {
  const input = strand([
    bead(300, 240.1, "b", { salience: 0.1 }),
    bead(301, 240.1, "b", { salience: 0.1 }),
    bead(302, 246.7, "e", {
      salience: 0.95,
      modalities: ["AUDITION", "VISION", "TOUCH"],
      left: 90,
      right: 270,
      valence: 0.8
    }),
    bead(303, 240.1, "b", { salience: 0.1 }),
    bead(304, 240.1, "b", { salience: 0.1 })
  ]);

  const result = proposeStrandSegmentation(input);
  assert.equal(result.METABOLISM_DECISION, "PRESERVE");
  assert.equal(result.ACTION, "PROPOSE_SELECTIVE_RETENTION");
  assert.equal(result.CUT_COUNT, 2);
  assert.deepEqual(
    result.SEGMENTS.map(item => item.DISPOSITION),
    [
      "DUST_CANDIDATE",
      "PRESERVE_FRAGMENT_CANDIDATE",
      "DUST_CANDIDATE"
    ]
  );
  assert.equal(result.SEGMENTS[1].TICK_START, 302);
  assert.equal(result.SEGMENTS[1].TICK_END, 302);
});

test("globally rich preserved strand is not cut when no safe dust fragment exists", () => {
  const input = strand([
    bead(400, 240.1, "b", { salience: 0.65 }),
    bead(401, 242.2, "c", { salience: 0.65 }),
    bead(402, 244.3, "d", { salience: 0.65 }),
    bead(403, 246.4, "e", { salience: 0.65 })
  ]);

  const result = proposeStrandSegmentation(input);
  assert.equal(result.METABOLISM_DECISION, "PRESERVE");
  assert.equal(result.ACTION, "NO_CUT");
  assert.equal(result.CUT_COUNT, 0);
  assert.equal(result.SEGMENTS.length, 0);
});

test("replayed strand remains consolidation material and is not cut", () => {
  const input = strand([
    bead(500, 240.1, "b"),
    bead(501, 240.1, "b")
  ], 4);

  const result = proposeStrandSegmentation(input);
  assert.equal(result.METABOLISM_DECISION, "CONSOLIDATE");
  assert.equal(result.ACTION, "NO_CUT");
  assert.equal(result.REASON, "METABOLISM_REQUIRES_CONSOLIDATION");
  assert.equal(result.SEGMENTS.length, 0);
});

test("multisensory synchronized strand remains consolidation material", () => {
  const modalities = ["AUDITION", "VISION", "TOUCH"];
  const input = strand([
    bead(600, 240.1, "b", { modalities }),
    bead(601, 240.1, "b", { modalities })
  ]);

  const result = proposeStrandSegmentation(input);
  assert.equal(result.METABOLISM_DECISION, "CONSOLIDATE");
  assert.equal(result.ACTION, "NO_CUT");
});

test("segment proposals preserve exact parent signature and tick ancestry", () => {
  const input = strand([
    bead(700, 240.1, "b"),
    bead(701, 240.1, "b"),
    bead(702, 241.1, "c", { salience: 0.45 })
  ]);

  const result = proposeStrandSegmentation(input);
  assert.equal(result.PARENT_SIGNATURE_H256, input.SIGNATURE_H256);

  for (const segment of result.SEGMENTS) {
    assert.equal(segment.PARENT_STRAND_ID, input.STRAND_ID);
    assert.equal(segment.PARENT_SIGNATURE_H256, input.SIGNATURE_H256);
    assert.match(segment.SEGMENT_H256, /^[a-f0-9]{64}$/);
    assert.ok(segment.TICK_START >= input.TICK_START);
    assert.ok(segment.TICK_END <= input.TICK_END);
  }
});

test("same valid strand produces identical proposal and segment hashes", () => {
  const input = strand([
    bead(800, 240.1, "b"),
    bead(801, 241.2, "c", { salience: 0.45 }),
    bead(802, 241.2, "c", { salience: 0.45 })
  ]);

  const a = proposeStrandSegmentation(input);
  const b = proposeStrandSegmentation(input);
  assert.deepEqual(a, b);
});

test("silent parent mutation fails closed through crystal strand signature validation", () => {
  const input = strand([
    bead(900, 240.1, "b"),
    bead(901, 241.2, "c")
  ]);

  input.BEADS[1].INTERNAL.LOGICAL_HZ = 999.9;

  assert.throws(
    () => proposeStrandSegmentation(input),
    /SIGNATURE_H256 mismatch/
  );
});

test("proposal never creates dust, crystal, material, proof or deletion", () => {
  const input = strand([
    bead(1000, 240.1, "b"),
    bead(1001, 241.2, "c", { salience: 0.45 })
  ]);

  const result = proposeStrandSegmentation(input);
  assert.equal(result.MUTATION_PERFORMED, false);
  assert.equal(result.MATERIAL_CREATED, false);
  assert.equal(result.DUST_CREATED, false);
  assert.equal(result.CRYSTAL_CREATED, false);
  assert.equal(result.DELETION_PERFORMED, false);
  assert.equal(result.PROOF_REF, null);

  for (const segment of result.SEGMENTS) {
    assert.equal(segment.MATERIAL_CREATED, false);
    assert.equal(segment.DUST_CREATED, false);
    assert.equal(segment.CRYSTAL_CREATED, false);
    assert.equal(segment.DELETION_PERFORMED, false);
    assert.equal(segment.PROOF_REF, null);
  }
});

test("production segmenter has no random, timers, network or process execution", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/strand-segmentation-dust.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /setInterval|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(source, /fetch\s*\(|WebSocket|node:child_process|process\.exec/);
});
