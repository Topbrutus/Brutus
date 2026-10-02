import { sha256HexUtf8 } from "./sha256-utf8.mjs";
import {
  analyzeCrystalStrand,
  validateCrystalStrand
} from "./crystal-strand-metabolism.mjs";

const RESULT_SCHEMA = "BRUTUS-STRAND-SEGMENTATION-PROPOSAL-v0.1";
const VERSION = "0.1";

const DISPOSITIONS = Object.freeze([
  "PRESERVE_FRAGMENT_CANDIDATE",
  "CRYSTAL_FRAGMENT_CANDIDATE",
  "DUST_CANDIDATE"
]);

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function h256(value) {
  return sha256HexUtf8(JSON.stringify(canonicalize(value)));
}

function maxSalience(bead) {
  return Math.max(...bead.MODALITIES.map(item => item.SALIENCE));
}

function meanSalience(beads) {
  let sum = 0;
  let count = 0;
  for (const bead of beads) {
    for (const modality of bead.MODALITIES) {
      sum += modality.SALIENCE;
      count += 1;
    }
  }
  return count === 0 ? 0 : sum / count;
}

function salienceBand(value) {
  if (value >= 0.8) return "HIGH";
  if (value >= 0.3) return "MID";
  return "LOW";
}

function modalitySignature(bead) {
  return bead.MODALITIES
    .map(item => item.KIND)
    .sort()
    .join("+");
}

function sensoryFeatureSignature(bead) {
  return h256(
    bead.MODALITIES
      .map(item => ({
        KIND: item.KIND,
        FEATURE_H256: item.FEATURE_H256
      }))
      .sort((a, b) => a.KIND.localeCompare(b.KIND))
  );
}

function beadClass(bead) {
  return {
    MODALITIES: modalitySignature(bead),
    FEATURE_SIGNATURE: sensoryFeatureSignature(bead),
    HZ_BAND_1: Math.round(bead.INTERNAL.LOGICAL_HZ),
    SALIENCE_BAND: salienceBand(maxSalience(bead))
  };
}

function sameClass(a, b) {
  return (
    a.MODALITIES === b.MODALITIES &&
    a.FEATURE_SIGNATURE === b.FEATURE_SIGNATURE &&
    a.HZ_BAND_1 === b.HZ_BAND_1 &&
    a.SALIENCE_BAND === b.SALIENCE_BAND
  );
}

function segmentSignature(parentStrand, startIndex, endIndex) {
  const beads = parentStrand.BEADS.slice(startIndex, endIndex + 1);
  return h256({
    PARENT_STRAND_ID: parentStrand.STRAND_ID,
    PARENT_SIGNATURE_H256: parentStrand.SIGNATURE_H256,
    START_INDEX: startIndex,
    END_INDEX: endIndex,
    BEADS: beads.map(bead => ({
      BEAD_ID: bead.BEAD_ID,
      TICK: bead.TICK,
      FEATURE_SIGNATURE: sensoryFeatureSignature(bead),
      LOGICAL_HZ: bead.INTERNAL.LOGICAL_HZ,
      MAX_SALIENCE: maxSalience(bead)
    }))
  });
}

function dispositionFor(beads) {
  const peak = Math.max(...beads.map(maxSalience));
  const uniqueFeatures = new Set(beads.map(sensoryFeatureSignature)).size;
  const hzBands = new Set(beads.map(bead => Math.round(bead.INTERNAL.LOGICAL_HZ))).size;
  const modalities = new Set(
    beads.flatMap(bead => bead.MODALITIES.map(item => item.KIND))
  ).size;

  if (peak >= 0.8) {
    return "PRESERVE_FRAGMENT_CANDIDATE";
  }

  if (
    peak < 0.3 &&
    uniqueFeatures === 1 &&
    hzBands === 1 &&
    modalities <= 2
  ) {
    return "DUST_CANDIDATE";
  }

  return "CRYSTAL_FRAGMENT_CANDIDATE";
}

function buildSegment(parentStrand, startIndex, endIndex, sequence) {
  const beads = parentStrand.BEADS.slice(startIndex, endIndex + 1);
  const disposition = dispositionFor(beads);
  const peak = Math.max(...beads.map(maxSalience));
  const featureCount = new Set(beads.map(sensoryFeatureSignature)).size;
  const hzBands = new Set(beads.map(bead => Math.round(bead.INTERNAL.LOGICAL_HZ))).size;
  const modalityCount = new Set(
    beads.flatMap(bead => bead.MODALITIES.map(item => item.KIND))
  ).size;

  return {
    SEGMENT_ID: `${parentStrand.STRAND_ID}-SEG-${String(sequence).padStart(4, "0")}`,
    PARENT_STRAND_ID: parentStrand.STRAND_ID,
    PARENT_SIGNATURE_H256: parentStrand.SIGNATURE_H256,
    START_INDEX: startIndex,
    END_INDEX: endIndex,
    TICK_START: beads[0].TICK,
    TICK_END: beads[beads.length - 1].TICK,
    BEAD_COUNT: beads.length,
    DISPOSITION: disposition,
    METRICS: {
      DISTINCT_FEATURES: featureCount,
      DISTINCT_1HZ_BANDS: hzBands,
      MODALITY_COUNT: modalityCount,
      SALIENCE_PEAK: Number(peak.toFixed(6)),
      MEAN_SALIENCE: Number(meanSalience(beads).toFixed(6))
    },
    SEGMENT_H256: segmentSignature(parentStrand, startIndex, endIndex),
    MATERIAL_CREATED: false,
    DUST_CREATED: false,
    CRYSTAL_CREATED: false,
    DELETION_PERFORMED: false,
    PROOF_REF: null
  };
}

function oneWholeStrandDustProposal(strand) {
  return buildSegment(strand, 0, strand.BEADS.length - 1, 1);
}

export function proposeStrandSegmentation(input) {
  const strand = validateCrystalStrand(input);
  const metabolism = analyzeCrystalStrand(strand);

  if (metabolism.DECISION === "CONSOLIDATE") {
    return deepFreeze({
      SCHEMA: RESULT_SCHEMA,
      VERSION,
      PARENT_STRAND_ID: strand.STRAND_ID,
      PARENT_SIGNATURE_H256: strand.SIGNATURE_H256,
      METABOLISM_DECISION: metabolism.DECISION,
      CUT_COUNT: 0,
      CUTS: [],
      SEGMENTS: [],
      ACTION: "NO_CUT",
      REASON: "METABOLISM_REQUIRES_CONSOLIDATION",
      MUTATION_PERFORMED: false,
      MATERIAL_CREATED: false,
      DUST_CREATED: false,
      CRYSTAL_CREATED: false,
      DELETION_PERFORMED: false,
      PROOF_REF: null
    });
  }

  if (metabolism.DECISION === "RECYCLE_CANDIDATE") {
    const segment = oneWholeStrandDustProposal(strand);
    return deepFreeze({
      SCHEMA: RESULT_SCHEMA,
      VERSION,
      PARENT_STRAND_ID: strand.STRAND_ID,
      PARENT_SIGNATURE_H256: strand.SIGNATURE_H256,
      METABOLISM_DECISION: metabolism.DECISION,
      CUT_COUNT: 0,
      CUTS: [],
      SEGMENTS: [segment],
      ACTION: "PROPOSE_RECYCLE_AS_WHOLE",
      REASON: "WHOLE_STRAND_LOW_VARIATION_LOW_SALIENCE",
      MUTATION_PERFORMED: false,
      MATERIAL_CREATED: false,
      DUST_CREATED: false,
      CRYSTAL_CREATED: false,
      DELETION_PERFORMED: false,
      PROOF_REF: null
    });
  }

  const classes = strand.BEADS.map(beadClass);
  const cuts = [];
  const ranges = [];
  let startIndex = 0;

  for (let index = 1; index < classes.length; index += 1) {
    if (!sameClass(classes[index], classes[index - 1])) {
      cuts.push({
        AFTER_INDEX: index - 1,
        BEFORE_INDEX: index,
        AFTER_TICK: strand.BEADS[index - 1].TICK,
        BEFORE_TICK: strand.BEADS[index].TICK,
        REASONS: [
          classes[index - 1].FEATURE_SIGNATURE !== classes[index].FEATURE_SIGNATURE
            ? "FEATURE_CHANGE"
            : null,
          classes[index - 1].HZ_BAND_1 !== classes[index].HZ_BAND_1
            ? "LOGICAL_HZ_BAND_CHANGE"
            : null,
          classes[index - 1].SALIENCE_BAND !== classes[index].SALIENCE_BAND
            ? "SALIENCE_BAND_CHANGE"
            : null,
          classes[index - 1].MODALITIES !== classes[index].MODALITIES
            ? "MODALITY_SET_CHANGE"
            : null
        ].filter(Boolean)
      });
      ranges.push([startIndex, index - 1]);
      startIndex = index;
    }
  }
  ranges.push([startIndex, strand.BEADS.length - 1]);

  const segments = ranges.map(([start, end], index) =>
    buildSegment(strand, start, end, index + 1)
  );

  if (metabolism.DECISION === "PRESERVE") {
    const hasPreserveFragment = segments.some(
      segment => segment.DISPOSITION === "PRESERVE_FRAGMENT_CANDIDATE"
    );
    const hasDustFragment = segments.some(
      segment => segment.DISPOSITION === "DUST_CANDIDATE"
    );

    if (!(cuts.length > 0 && hasPreserveFragment && hasDustFragment)) {
      return deepFreeze({
        SCHEMA: RESULT_SCHEMA,
        VERSION,
        PARENT_STRAND_ID: strand.STRAND_ID,
        PARENT_SIGNATURE_H256: strand.SIGNATURE_H256,
        METABOLISM_DECISION: metabolism.DECISION,
        CUT_COUNT: 0,
        CUTS: [],
        SEGMENTS: [],
        ACTION: "NO_CUT",
        REASON: "PRESERVE_WITHOUT_SAFE_SELECTIVE_BOUNDARY",
        MUTATION_PERFORMED: false,
        MATERIAL_CREATED: false,
        DUST_CREATED: false,
        CRYSTAL_CREATED: false,
        DELETION_PERFORMED: false,
        PROOF_REF: null
      });
    }

    return deepFreeze({
      SCHEMA: RESULT_SCHEMA,
      VERSION,
      PARENT_STRAND_ID: strand.STRAND_ID,
      PARENT_SIGNATURE_H256: strand.SIGNATURE_H256,
      METABOLISM_DECISION: metabolism.DECISION,
      CUT_COUNT: cuts.length,
      CUTS: cuts,
      SEGMENTS: segments,
      ACTION: "PROPOSE_SELECTIVE_RETENTION",
      REASON: "PRESERVE_DISTINCTIVE_FRAGMENT_AND_RECYCLE_FLAT_FRAGMENT_CANDIDATES",
      MUTATION_PERFORMED: false,
      MATERIAL_CREATED: false,
      DUST_CREATED: false,
      CRYSTAL_CREATED: false,
      DELETION_PERFORMED: false,
      PROOF_REF: null
    });
  }

  return deepFreeze({
    SCHEMA: RESULT_SCHEMA,
    VERSION,
    PARENT_STRAND_ID: strand.STRAND_ID,
    PARENT_SIGNATURE_H256: strand.SIGNATURE_H256,
    METABOLISM_DECISION: metabolism.DECISION,
    CUT_COUNT: cuts.length,
    CUTS: cuts,
    SEGMENTS: segments,
    ACTION: cuts.length > 0 ? "PROPOSE_SEGMENTS" : "NO_EFFECTIVE_BOUNDARY",
    REASON: cuts.length > 0
      ? "OBSERVED_MATERIAL_BOUNDARIES"
      : "NO_DETERMINISTIC_BOUNDARY_FOUND",
    MUTATION_PERFORMED: false,
    MATERIAL_CREATED: false,
    DUST_CREATED: false,
    CRYSTAL_CREATED: false,
    DELETION_PERFORMED: false,
    PROOF_REF: null
  });
}

export const BRUTUS_STRAND_SEGMENTATION_PROPOSAL_SCHEMA = RESULT_SCHEMA;
export const BRUTUS_STRAND_SEGMENT_DISPOSITIONS = DISPOSITIONS;
