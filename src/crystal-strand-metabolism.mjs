import { sha256HexUtf8 } from "./sha256-utf8.mjs";

const SCHEMA = "BRUTUS-CRYSTAL-STRAND-v0.1";
const VERSION = "0.1";
const CLOCK_AUTHORITY = "QUEEN_SERVER_V0_2";
const SIGNATURE_METHOD = "BRUTUS-CANONICAL-JSON-SHA256-v0.1";

const MODALITIES = new Set([
  "AUDITION",
  "VISION",
  "TOUCH",
  "ODOR",
  "TASTE",
  "INTERNAL"
]);

const REQUIRED_FIELDS = [
  "SCHEMA",
  "VERSION",
  "STRAND_ID",
  "CLOCK_AUTHORITY",
  "TICK_START",
  "TICK_END",
  "REPLAY_COUNT",
  "PARENT_CRYSTAL_REFS",
  "BEADS",
  "SIGNATURE_METHOD",
  "SIGNATURE_H256",
  "PROOF_REF",
  "EXECUTABLE",
  "MUTATION_AUTHORITY",
  "DUST_CREATION_AUTHORITY",
  "DELETION_AUTHORITY"
];

const ALLOWED_FIELDS = new Set(REQUIRED_FIELDS);

const DECISIONS = Object.freeze([
  "PRESERVE",
  "CONSOLIDATE",
  "SEGMENT_CANDIDATE",
  "RECYCLE_CANDIDATE"
]);

function reject(reason) {
  throw new Error("CRYSTAL_STRAND_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
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

function assertExactKeys(value, expected, label) {
  if (!isPlainObject(value)) reject(label + " must be a plain object");
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    reject(label + " has unsupported fields");
  }
}

function assertSafeTick(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    reject(label + " must be a non-negative safe integer");
  }
}

function assertUnit(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    reject(label + " must be a finite number in [0,1]");
  }
}

function assertPhase(value, label) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value >= 360
  ) {
    reject(label + " must be a finite number in [0,360)");
  }
}

function assertSha256(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) {
    reject(label + " must be SHA-256 hex");
  }
}

function assertRef(value, label) {
  if (typeof value !== "string" || value.length < 1 || value.length > 256) {
    reject(label + " must be a non-empty bounded string");
  }
}

function validateModality(modality, beadIndex, seenKinds) {
  const label = `BEADS[${beadIndex}].MODALITIES`;
  assertExactKeys(
    modality,
    ["KIND", "SOURCE_REF", "SOURCE_H256", "FEATURE_H256", "SALIENCE", "CONFIDENCE"],
    label
  );

  if (!MODALITIES.has(modality.KIND)) {
    reject(label + ".KIND is unsupported");
  }
  if (seenKinds.has(modality.KIND)) {
    reject(label + " cannot contain duplicate modality " + modality.KIND);
  }
  seenKinds.add(modality.KIND);

  assertRef(modality.SOURCE_REF, label + ".SOURCE_REF");
  assertSha256(modality.SOURCE_H256, label + ".SOURCE_H256");
  assertSha256(modality.FEATURE_H256, label + ".FEATURE_H256");
  assertUnit(modality.SALIENCE, label + ".SALIENCE");
  assertUnit(modality.CONFIDENCE, label + ".CONFIDENCE");
}

function validateInternal(internal, beadIndex) {
  const label = `BEADS[${beadIndex}].INTERNAL`;
  assertExactKeys(
    internal,
    ["LOGICAL_HZ", "VALENCE", "LEFT_PHASE_DEG", "RIGHT_PHASE_DEG"],
    label
  );

  if (
    typeof internal.LOGICAL_HZ !== "number" ||
    !Number.isFinite(internal.LOGICAL_HZ) ||
    internal.LOGICAL_HZ < 0 ||
    internal.LOGICAL_HZ > 20000
  ) {
    reject(label + ".LOGICAL_HZ must be a finite number in [0,20000]");
  }
  if (
    typeof internal.VALENCE !== "number" ||
    !Number.isFinite(internal.VALENCE) ||
    internal.VALENCE < -1 ||
    internal.VALENCE > 1
  ) {
    reject(label + ".VALENCE must be a finite number in [-1,1]");
  }

  assertPhase(internal.LEFT_PHASE_DEG, label + ".LEFT_PHASE_DEG");
  assertPhase(internal.RIGHT_PHASE_DEG, label + ".RIGHT_PHASE_DEG");
}

function validateBead(bead, index, previousTick) {
  assertExactKeys(bead, ["BEAD_ID", "TICK", "MODALITIES", "INTERNAL"], `BEADS[${index}]`);

  if (
    typeof bead.BEAD_ID !== "string" ||
    !/^B-T[0-9]{1,16}-[A-Z0-9-]{2,64}$/.test(bead.BEAD_ID)
  ) {
    reject(`BEADS[${index}].BEAD_ID is invalid`);
  }

  assertSafeTick(bead.TICK, `BEADS[${index}].TICK`);
  if (previousTick !== null && bead.TICK <= previousTick) {
    reject("BEADS ticks must be strictly increasing");
  }

  if (!Array.isArray(bead.MODALITIES) || bead.MODALITIES.length < 1 || bead.MODALITIES.length > 6) {
    reject(`BEADS[${index}].MODALITIES must contain 1..6 modalities`);
  }

  const seenKinds = new Set();
  bead.MODALITIES.forEach(modality => validateModality(modality, index, seenKinds));
  validateInternal(bead.INTERNAL, index);

  return bead.TICK;
}

function unsigned(input) {
  const copy = JSON.parse(JSON.stringify(input));
  delete copy.SIGNATURE_H256;
  return copy;
}

function beadFingerprint(bead) {
  return sha256HexUtf8(
    JSON.stringify(
      canonicalize({
        MODALITIES: bead.MODALITIES.map(item => ({
          KIND: item.KIND,
          FEATURE_H256: item.FEATURE_H256
        })),
        INTERNAL: bead.INTERNAL
      })
    )
  );
}

export function computeCrystalStrandSignature(input) {
  if (!isPlainObject(input)) reject("strand must be a plain object");
  return sha256HexUtf8(JSON.stringify(canonicalize(unsigned(input))));
}

export function validateCrystalStrand(input) {
  if (!isPlainObject(input)) reject("strand must be a plain object");

  for (const key of Object.keys(input)) {
    if (!ALLOWED_FIELDS.has(key)) reject("unknown strand field " + key);
  }
  for (const key of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) {
      reject("missing strand field " + key);
    }
  }

  if (input.SCHEMA !== SCHEMA) reject("unsupported SCHEMA");
  if (input.VERSION !== VERSION) reject("unsupported VERSION");
  if (
    typeof input.STRAND_ID !== "string" ||
    !/^STRAND-[A-Z0-9-]{4,80}$/.test(input.STRAND_ID)
  ) {
    reject("invalid STRAND_ID");
  }
  if (input.CLOCK_AUTHORITY !== CLOCK_AUTHORITY) {
    reject("CLOCK_AUTHORITY must be QUEEN_SERVER_V0_2");
  }

  assertSafeTick(input.TICK_START, "TICK_START");
  assertSafeTick(input.TICK_END, "TICK_END");
  if (input.TICK_END < input.TICK_START) reject("TICK_END cannot precede TICK_START");

  if (!Number.isSafeInteger(input.REPLAY_COUNT) || input.REPLAY_COUNT < 0) {
    reject("REPLAY_COUNT must be a non-negative safe integer");
  }

  if (!Array.isArray(input.PARENT_CRYSTAL_REFS)) {
    reject("PARENT_CRYSTAL_REFS must be an array");
  }
  const parentSet = new Set();
  for (const ref of input.PARENT_CRYSTAL_REFS) {
    if (typeof ref !== "string" || !/^BRUTUS-CRYSTAL-[A-Z0-9-]+$/.test(ref)) {
      reject("invalid PARENT_CRYSTAL_REFS item");
    }
    if (parentSet.has(ref)) reject("PARENT_CRYSTAL_REFS must be unique");
    parentSet.add(ref);
  }

  if (!Array.isArray(input.BEADS) || input.BEADS.length < 2 || input.BEADS.length > 4096) {
    reject("BEADS must contain 2..4096 time-ordered beads");
  }

  let previousTick = null;
  for (let i = 0; i < input.BEADS.length; i += 1) {
    previousTick = validateBead(input.BEADS[i], i, previousTick);
  }

  if (input.BEADS[0].TICK !== input.TICK_START) {
    reject("TICK_START must equal first bead tick");
  }
  if (input.BEADS[input.BEADS.length - 1].TICK !== input.TICK_END) {
    reject("TICK_END must equal last bead tick");
  }

  if (input.SIGNATURE_METHOD !== SIGNATURE_METHOD) {
    reject("unsupported SIGNATURE_METHOD");
  }
  assertSha256(input.SIGNATURE_H256, "SIGNATURE_H256");
  const expected = computeCrystalStrandSignature(input);
  if (input.SIGNATURE_H256.toLowerCase() !== expected) {
    reject("SIGNATURE_H256 mismatch");
  }

  if (input.PROOF_REF !== null) reject("PROOF_REF must be null");
  if (input.EXECUTABLE !== false) reject("EXECUTABLE must be false");
  if (input.MUTATION_AUTHORITY !== false) reject("MUTATION_AUTHORITY must be false");
  if (input.DUST_CREATION_AUTHORITY !== false) {
    reject("DUST_CREATION_AUTHORITY must be false");
  }
  if (input.DELETION_AUTHORITY !== false) reject("DELETION_AUTHORITY must be false");

  return deepFreeze(JSON.parse(JSON.stringify(input)));
}

export function analyzeCrystalStrand(input) {
  const strand = validateCrystalStrand(input);
  const beads = strand.BEADS;

  const fingerprints = beads.map(beadFingerprint);
  let changedTransitions = 0;
  for (let i = 1; i < fingerprints.length; i += 1) {
    if (fingerprints[i] !== fingerprints[i - 1]) changedTransitions += 1;
  }

  const transitionRatio = changedTransitions / (beads.length - 1);

  const hzValues = beads.map(bead => bead.INTERNAL.LOGICAL_HZ);
  const minHz = Math.min(...hzValues);
  const maxHz = Math.max(...hzValues);
  const frequencySpreadHz = maxHz - minHz;
  const frequencyBands = new Set(hzValues.map(value => Math.round(value)));

  const allModalities = new Set();
  let modalitySlots = 0;
  let saliencePeak = 0;
  let salienceSum = 0;
  let modalityCount = 0;

  for (const bead of beads) {
    modalitySlots += bead.MODALITIES.length;
    for (const modality of bead.MODALITIES) {
      allModalities.add(modality.KIND);
      saliencePeak = Math.max(saliencePeak, modality.SALIENCE);
      salienceSum += modality.SALIENCE;
      modalityCount += 1;
    }
  }

  const meanSalience = modalityCount === 0 ? 0 : salienceSum / modalityCount;
  const modalityCoverage = allModalities.size / MODALITIES.size;
  const syncDensity = modalitySlots / (beads.length * MODALITIES.size);

  const flat =
    transitionRatio <= 0.10 &&
    frequencyBands.size <= 1 &&
    saliencePeak < 0.30 &&
    strand.REPLAY_COUNT === 0;

  const highStructure =
    transitionRatio >= 0.60 &&
    frequencyBands.size >= 3;

  const highSalience = saliencePeak >= 0.80;
  const rehearsed = strand.REPLAY_COUNT >= 3;
  const multisensory = allModalities.size >= 3 && syncDensity >= 0.35;

  let decision;
  const reasons = [];

  if (highSalience || highStructure) {
    decision = "PRESERVE";
    if (highSalience) reasons.push("HIGH_SALIENCE");
    if (highStructure) reasons.push("HIGH_VARIATION_AND_FREQUENCY_DIVERSITY");
  } else if (rehearsed || multisensory) {
    decision = "CONSOLIDATE";
    if (rehearsed) reasons.push("REPEATED_REPLAY");
    if (multisensory) reasons.push("MULTISENSORY_SYNCHRONY");
  } else if (flat) {
    decision = "RECYCLE_CANDIDATE";
    reasons.push("LOW_VARIATION_LOW_SALIENCE_NO_REPLAY");
  } else {
    decision = "SEGMENT_CANDIDATE";
    reasons.push("MIXED_STRUCTURE_REQUIRES_SEGMENTATION");
  }

  return deepFreeze({
    SCHEMA: "BRUTUS-CRYSTAL-STRAND-METABOLISM-RESULT-v0.1",
    VERSION: "0.1",
    STRAND_ID: strand.STRAND_ID,
    TICK_START: strand.TICK_START,
    TICK_END: strand.TICK_END,
    METRICS: {
      BEAD_COUNT: beads.length,
      TRANSITION_RATIO: Number(transitionRatio.toFixed(6)),
      FREQUENCY_SPREAD_HZ: Number(frequencySpreadHz.toFixed(6)),
      DISTINCT_1HZ_BANDS: frequencyBands.size,
      MODALITY_COUNT: allModalities.size,
      MODALITY_COVERAGE: Number(modalityCoverage.toFixed(6)),
      SYNC_DENSITY: Number(syncDensity.toFixed(6)),
      SALIENCE_PEAK: Number(saliencePeak.toFixed(6)),
      MEAN_SALIENCE: Number(meanSalience.toFixed(6)),
      REPLAY_COUNT: strand.REPLAY_COUNT
    },
    DECISION: decision,
    REASONS: reasons,
    MUTATION_PERFORMED: false,
    DUST_CREATED: false,
    SEGMENT_CREATED: false,
    CRYSTAL_CREATED: false,
    DELETION_PERFORMED: false,
    PROOF_REF: null
  });
}

export const BRUTUS_CRYSTAL_STRAND_SCHEMA = SCHEMA;
export const BRUTUS_CRYSTAL_STRAND_MODALITIES = Object.freeze([...MODALITIES]);
export const BRUTUS_CRYSTAL_STRAND_DECISIONS = DECISIONS;
