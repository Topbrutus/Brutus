import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  analyzeCrystalStrand,
  computeCrystalStrandSignature,
  validateCrystalStrand
} from "../src/crystal-strand-metabolism.mjs";

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
  return {
    BEAD_ID: `B-T${tick}-MEMORY`,
    TICK: tick,
    MODALITIES: modalities.map((kind, index) =>
      modality(kind, String.fromCharCode(featureChar.charCodeAt(0) + index), salience)
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
    STRAND_ID: "STRAND-GENESIS-MEMORY-0001",
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

test("valid crystal strand is accepted and deeply immutable", () => {
  const input = strand([
    bead(100, 240.1, "b"),
    bead(101, 240.1, "b")
  ]);

  const valid = validateCrystalStrand(input);
  assert.equal(valid.TICK_START, 100);
  assert.equal(valid.TICK_END, 101);
  assert.equal(Object.isFrozen(valid), true);
  assert.equal(Object.isFrozen(valid.BEADS[0].MODALITIES[0]), true);
});

test("high structural variation and frequency diversity is preserved", () => {
  const input = strand([
    bead(200, 240.1, "b", { left: 10, right: 350 }),
    bead(201, 241.4, "c", { left: 30, right: 330 }),
    bead(202, 243.2, "d", { left: 70, right: 290 }),
    bead(203, 246.8, "e", { left: 110, right: 250 })
  ]);

  const result = analyzeCrystalStrand(input);
  assert.equal(result.DECISION, "PRESERVE");
  assert.equal(result.METRICS.TRANSITION_RATIO, 1);
  assert.ok(result.METRICS.DISTINCT_1HZ_BANDS >= 3);
  assert.ok(result.REASONS.includes("HIGH_VARIATION_AND_FREQUENCY_DIVERSITY"));
});

test("high salience preserves even a relatively flat strand", () => {
  const input = strand([
    bead(300, 240.1, "b", { salience: 0.91 }),
    bead(301, 240.1, "b", { salience: 0.91 })
  ]);

  const result = analyzeCrystalStrand(input);
  assert.equal(result.DECISION, "PRESERVE");
  assert.ok(result.REASONS.includes("HIGH_SALIENCE"));
});

test("replayed strand becomes consolidation candidate without pretending it is proof", () => {
  const input = strand([
    bead(400, 240.1, "b"),
    bead(401, 240.1, "b")
  ], 4);

  const result = analyzeCrystalStrand(input);
  assert.equal(result.DECISION, "CONSOLIDATE");
  assert.ok(result.REASONS.includes("REPEATED_REPLAY"));
  assert.equal(result.PROOF_REF, null);
  assert.equal(result.CRYSTAL_CREATED, false);
  assert.equal(result.MUTATION_PERFORMED, false);
});

test("synchronized multisensory strand is consolidation candidate", () => {
  const modalities = ["AUDITION", "VISION", "TOUCH"];
  const input = strand([
    bead(500, 240.1, "b", { modalities }),
    bead(501, 240.1, "b", { modalities })
  ]);

  const result = analyzeCrystalStrand(input);
  assert.equal(result.DECISION, "CONSOLIDATE");
  assert.ok(result.REASONS.includes("MULTISENSORY_SYNCHRONY"));
  assert.equal(result.METRICS.MODALITY_COUNT, 3);
  assert.equal(result.METRICS.SYNC_DENSITY, 0.5);
});

test("flat low-salience unreplayed strand becomes recycle candidate only", () => {
  const input = strand([
    bead(600, 240.1, "b", { salience: 0.1 }),
    bead(601, 240.1, "b", { salience: 0.1 }),
    bead(602, 240.1, "b", { salience: 0.1 })
  ]);

  const result = analyzeCrystalStrand(input);
  assert.equal(result.DECISION, "RECYCLE_CANDIDATE");
  assert.equal(result.DUST_CREATED, false);
  assert.equal(result.DELETION_PERFORMED, false);
  assert.ok(result.REASONS.includes("LOW_VARIATION_LOW_SALIENCE_NO_REPLAY"));
});

test("mixed strand is sent to segmentation instead of being destroyed", () => {
  const input = strand([
    bead(700, 240.1, "b"),
    bead(701, 240.1, "b"),
    bead(702, 241.2, "c")
  ]);

  const result = analyzeCrystalStrand(input);
  assert.equal(result.DECISION, "SEGMENT_CANDIDATE");
  assert.equal(result.SEGMENT_CREATED, false);
  assert.equal(result.DELETION_PERFORMED, false);
});

test("time order is Queen-authoritative and backward beads fail closed", () => {
  const input = strand([
    bead(800, 240.1, "b"),
    bead(801, 240.1, "c")
  ]);
  input.BEADS[1].TICK = 799;
  input.BEADS[1].BEAD_ID = "B-T799-MEMORY";
  input.TICK_END = 799;
  input.SIGNATURE_H256 = computeCrystalStrandSignature(input);

  assert.throws(
    () => validateCrystalStrand(input),
    /BEADS ticks must be strictly increasing/
  );
});

test("duplicate sensory modality at the same bead is rejected", () => {
  const input = strand([
    bead(900, 240.1, "b"),
    bead(901, 240.1, "c")
  ]);
  input.BEADS[0].MODALITIES = [
    modality("VISION", "b"),
    modality("VISION", "c")
  ];
  input.SIGNATURE_H256 = computeCrystalStrandSignature(input);

  assert.throws(
    () => validateCrystalStrand(input),
    /duplicate modality VISION/
  );
});

test("signature detects silent strand mutation", () => {
  const input = strand([
    bead(1000, 240.1, "b"),
    bead(1001, 241.1, "c")
  ]);
  input.BEADS[1].INTERNAL.LOGICAL_HZ = 999.9;

  assert.throws(
    () => validateCrystalStrand(input),
    /SIGNATURE_H256 mismatch/
  );
});

test("strand cannot grant mutation, dust creation, deletion or proof authority", () => {
  const base = strand([
    bead(1100, 240.1, "b"),
    bead(1101, 240.1, "c")
  ]);

  for (const field of [
    "MUTATION_AUTHORITY",
    "DUST_CREATION_AUTHORITY",
    "DELETION_AUTHORITY"
  ]) {
    const input = structuredClone(base);
    input[field] = true;
    input.SIGNATURE_H256 = computeCrystalStrandSignature(input);
    assert.throws(() => validateCrystalStrand(input));
  }

  const proof = structuredClone(base);
  proof.PROOF_REF = "proofs/not-allowed.json";
  proof.SIGNATURE_H256 = computeCrystalStrandSignature(proof);
  assert.throws(() => validateCrystalStrand(proof), /PROOF_REF must be null/);
});

test("production metabolism has no random, timers, network or process execution", () => {
  const source = fs.readFileSync(
    path.join(here, "../src/crystal-strand-metabolism.mjs"),
    "utf8"
  );

  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /setInterval|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(source, /fetch\s*\(|WebSocket|node:child_process|process\.exec/);
});
