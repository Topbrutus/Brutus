import { sha256HexUtf8 } from "./sha256-utf8.mjs";
import { validateCrystalStrand } from "./crystal-strand-metabolism.mjs";
import { proposeStrandSegmentation } from "./strand-segmentation-dust.mjs";

const REQUEST_SCHEMA = "BRUTUS-FOURMI-MATERIAL-ACTION-REQUEST-v0.1";
const MATERIAL_SCHEMA = "BRUTUS-FOURMI-MATERIAL-v0.1";
const VERSION = "0.1";
const CLOCK_AUTHORITY = "QUEEN_SERVER_V0_2";
const SIGNATURE_METHOD = "BRUTUS-CANONICAL-JSON-SHA256-v0.1";

const REQUEST_FIELDS = new Set([
  "SCHEMA",
  "VERSION",
  "REQUEST_ID",
  "ANT_ID",
  "TICK",
  "CLOCK_AUTHORITY",
  "PARENT_STRAND_ID",
  "PARENT_SIGNATURE_H256",
  "PROPOSAL_H256",
  "SEGMENT_ID",
  "AUTHORIZATION",
  "TRACE_ID",
  "PROOF_REF",
  "SIGNATURE_METHOD",
  "SIGNATURE_H256",
  "EXECUTABLE",
  "GATE_AUTHORITY",
  "ROUTING_AUTHORIZATION"
]);

const REQUIRED_REQUEST_FIELDS = [...REQUEST_FIELDS];

const DISPOSITION_MAP = Object.freeze({
  PRESERVE_FRAGMENT_CANDIDATE: Object.freeze({
    MATERIAL_CLASS: "CRYSTAL_FRAGMENT",
    MATERIAL_INTENT: "PRESERVE"
  }),
  CRYSTAL_FRAGMENT_CANDIDATE: Object.freeze({
    MATERIAL_CLASS: "CRYSTAL_FRAGMENT",
    MATERIAL_INTENT: "RECRYSTALLIZE"
  }),
  DUST_CANDIDATE: Object.freeze({
    MATERIAL_CLASS: "CRYSTAL_DUST",
    MATERIAL_INTENT: "RECYCLE"
  })
});

function reject(reason) {
  throw new Error("FOURMI_MATERIAL_ACTION_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = canonicalize(value[key]);
    }
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

function assertSha256(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) {
    reject(label + " must be SHA-256 hex");
  }
}

function assertExactKeys(value, expected, label) {
  if (!isPlainObject(value)) reject(label + " must be a plain object");
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    reject(label + " has unsupported fields");
  }
}

function unsignedRequest(input) {
  const copy = JSON.parse(JSON.stringify(input));
  delete copy.SIGNATURE_H256;
  return copy;
}

function unsignedMaterial(input) {
  const copy = JSON.parse(JSON.stringify(input));
  delete copy.MATERIAL_H256;
  return copy;
}

function validateAuthorization(value) {
  assertExactKeys(value, ["POLICY", "DECISION", "APPROVER"], "AUTHORIZATION");
  if (value.POLICY !== "BRUTUS-FOURMI-MATERIAL-ACTION-v0.1") {
    reject("AUTHORIZATION.POLICY mismatch");
  }
  if (value.DECISION !== "APPROVED") {
    reject("AUTHORIZATION.DECISION must be APPROVED");
  }
  if (value.APPROVER !== "BRUTUS_CONTROL_PLANE") {
    reject("AUTHORIZATION.APPROVER must be BRUTUS_CONTROL_PLANE");
  }
}

export function computeStrandSegmentationProposalH256(proposal) {
  if (!isPlainObject(proposal)) reject("proposal must be a plain object");
  return h256(proposal);
}

export function computeFourmiMaterialRequestSignature(request) {
  if (!isPlainObject(request)) reject("request must be a plain object");
  return h256(unsignedRequest(request));
}

export function validateFourmiMaterialRequest(input) {
  if (!isPlainObject(input)) reject("request must be a plain object");

  for (const key of Object.keys(input)) {
    if (!REQUEST_FIELDS.has(key)) reject("unknown request field " + key);
  }
  for (const field of REQUIRED_REQUEST_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) {
      reject("missing request field " + field);
    }
  }

  if (input.SCHEMA !== REQUEST_SCHEMA) reject("unsupported request SCHEMA");
  if (input.VERSION !== VERSION) reject("unsupported request VERSION");
  if (
    typeof input.REQUEST_ID !== "string" ||
    !/^FMA-[A-Z0-9-]{4,80}$/.test(input.REQUEST_ID)
  ) {
    reject("invalid REQUEST_ID");
  }
  if (
    typeof input.ANT_ID !== "string" ||
    !/^ANT-[0-9A-F]{12}$/.test(input.ANT_ID)
  ) {
    reject("invalid ANT_ID");
  }
  if (!Number.isSafeInteger(input.TICK) || input.TICK < 0) {
    reject("TICK must be a non-negative safe integer");
  }
  if (input.CLOCK_AUTHORITY !== CLOCK_AUTHORITY) {
    reject("CLOCK_AUTHORITY must be QUEEN_SERVER_V0_2");
  }
  if (
    typeof input.PARENT_STRAND_ID !== "string" ||
    !/^STRAND-[A-Z0-9-]{4,80}$/.test(input.PARENT_STRAND_ID)
  ) {
    reject("invalid PARENT_STRAND_ID");
  }
  assertSha256(input.PARENT_SIGNATURE_H256, "PARENT_SIGNATURE_H256");
  assertSha256(input.PROPOSAL_H256, "PROPOSAL_H256");

  if (
    typeof input.SEGMENT_ID !== "string" ||
    !/^STRAND-[A-Z0-9-]{4,80}-SEG-[0-9]{4}$/.test(input.SEGMENT_ID)
  ) {
    reject("invalid SEGMENT_ID");
  }

  validateAuthorization(input.AUTHORIZATION);

  if (
    typeof input.TRACE_ID !== "string" ||
    !/^TRACE-[A-Z0-9-]{4,64}$/.test(input.TRACE_ID)
  ) {
    reject("invalid TRACE_ID");
  }

  if (input.PROOF_REF !== null) reject("PROOF_REF must be null");
  if (input.SIGNATURE_METHOD !== SIGNATURE_METHOD) {
    reject("unsupported SIGNATURE_METHOD");
  }
  assertSha256(input.SIGNATURE_H256, "SIGNATURE_H256");

  const expectedSignature = computeFourmiMaterialRequestSignature(input);
  if (input.SIGNATURE_H256.toLowerCase() !== expectedSignature) {
    reject("SIGNATURE_H256 mismatch");
  }

  if (input.EXECUTABLE !== false) reject("EXECUTABLE must be false");
  if (input.GATE_AUTHORITY !== false) reject("GATE_AUTHORITY must be false");
  if (input.ROUTING_AUTHORIZATION !== "UNDECIDED") {
    reject("ROUTING_AUTHORIZATION must be UNDECIDED");
  }

  return deepFreeze(JSON.parse(JSON.stringify(input)));
}

function derivePayload(beads) {
  const modalityKinds = new Set();
  let saliencePeak = 0;
  let minHz = Infinity;
  let maxHz = -Infinity;

  for (const bead of beads) {
    minHz = Math.min(minHz, bead.INTERNAL.LOGICAL_HZ);
    maxHz = Math.max(maxHz, bead.INTERNAL.LOGICAL_HZ);
    for (const modality of bead.MODALITIES) {
      modalityKinds.add(modality.KIND);
      saliencePeak = Math.max(saliencePeak, modality.SALIENCE);
    }
  }

  return {
    BEADS: JSON.parse(JSON.stringify(beads)),
    MODALITY_KINDS: [...modalityKinds].sort(),
    LOGICAL_HZ_MIN: Number(minHz.toFixed(6)),
    LOGICAL_HZ_MAX: Number(maxHz.toFixed(6)),
    SALIENCE_PEAK: Number(saliencePeak.toFixed(6))
  };
}

export function computeFourmiMaterialH256(material) {
  if (!isPlainObject(material)) reject("material must be a plain object");
  return h256(unsignedMaterial(material));
}

function validateMaterialPayload(value) {
  assertExactKeys(
    value,
    ["BEADS", "MODALITY_KINDS", "LOGICAL_HZ_MIN", "LOGICAL_HZ_MAX", "SALIENCE_PEAK"],
    "PAYLOAD"
  );

  if (!Array.isArray(value.BEADS) || value.BEADS.length < 1 || value.BEADS.length > 4096) {
    reject("PAYLOAD.BEADS must contain 1..4096 beads");
  }
  if (!Array.isArray(value.MODALITY_KINDS) || value.MODALITY_KINDS.length < 1) {
    reject("PAYLOAD.MODALITY_KINDS must be a non-empty array");
  }
  const allowedKinds = new Set(["AUDITION", "VISION", "TOUCH", "ODOR", "TASTE", "INTERNAL"]);
  const seenKinds = new Set();
  for (const kind of value.MODALITY_KINDS) {
    if (!allowedKinds.has(kind)) reject("PAYLOAD.MODALITY_KINDS contains unsupported modality");
    if (seenKinds.has(kind)) reject("PAYLOAD.MODALITY_KINDS cannot contain duplicates");
    seenKinds.add(kind);
  }
  if (
    typeof value.LOGICAL_HZ_MIN !== "number" ||
    !Number.isFinite(value.LOGICAL_HZ_MIN) ||
    value.LOGICAL_HZ_MIN < 0 ||
    value.LOGICAL_HZ_MIN > 20000
  ) {
    reject("PAYLOAD.LOGICAL_HZ_MIN invalid");
  }
  if (
    typeof value.LOGICAL_HZ_MAX !== "number" ||
    !Number.isFinite(value.LOGICAL_HZ_MAX) ||
    value.LOGICAL_HZ_MAX < value.LOGICAL_HZ_MIN ||
    value.LOGICAL_HZ_MAX > 20000
  ) {
    reject("PAYLOAD.LOGICAL_HZ_MAX invalid");
  }
  if (
    typeof value.SALIENCE_PEAK !== "number" ||
    !Number.isFinite(value.SALIENCE_PEAK) ||
    value.SALIENCE_PEAK < 0 ||
    value.SALIENCE_PEAK > 1
  ) {
    reject("PAYLOAD.SALIENCE_PEAK invalid");
  }
}

export function validateFourmiMaterial(input) {
  if (!isPlainObject(input)) reject("material must be a plain object");

  const fields = [
    "SCHEMA",
    "VERSION",
    "MATERIAL_ID",
    "MATERIAL_CLASS",
    "MATERIAL_INTENT",
    "ANT_ID",
    "CREATED_AT_TICK",
    "CLOCK_AUTHORITY",
    "TRACE_ID",
    "AUTHORIZATION_REF",
    "PEDIGREE",
    "PAYLOAD",
    "PAYLOAD_H256",
    "PROOF_REF",
    "PARENT_MUTATED",
    "PARENT_DELETED",
    "MATERIAL_CREATED",
    "IMMUTABLE",
    "EXECUTABLE",
    "AUTO_PROOF_PROMOTION",
    "GATE_AUTHORITY",
    "ROUTING_AUTHORIZATION",
    "SIGNATURE_METHOD",
    "MATERIAL_H256"
  ];
  assertExactKeys(input, fields, "material");

  if (input.SCHEMA !== MATERIAL_SCHEMA) reject("unsupported material SCHEMA");
  if (input.VERSION !== VERSION) reject("unsupported material VERSION");
  if (
    typeof input.MATERIAL_ID !== "string" ||
    !/^MAT-(DUST|FRAG)-[A-F0-9]{24}$/.test(input.MATERIAL_ID)
  ) {
    reject("invalid MATERIAL_ID");
  }
  if (!["CRYSTAL_FRAGMENT", "CRYSTAL_DUST"].includes(input.MATERIAL_CLASS)) {
    reject("unsupported MATERIAL_CLASS");
  }
  if (!["PRESERVE", "RECRYSTALLIZE", "RECYCLE"].includes(input.MATERIAL_INTENT)) {
    reject("unsupported MATERIAL_INTENT");
  }
  if (
    input.MATERIAL_CLASS === "CRYSTAL_DUST" &&
    input.MATERIAL_INTENT !== "RECYCLE"
  ) {
    reject("CRYSTAL_DUST requires RECYCLE intent");
  }
  if (
    input.MATERIAL_CLASS === "CRYSTAL_FRAGMENT" &&
    !["PRESERVE", "RECRYSTALLIZE"].includes(input.MATERIAL_INTENT)
  ) {
    reject("CRYSTAL_FRAGMENT requires PRESERVE or RECRYSTALLIZE intent");
  }
  if (
    typeof input.ANT_ID !== "string" ||
    !/^ANT-[0-9A-F]{12}$/.test(input.ANT_ID)
  ) {
    reject("invalid material ANT_ID");
  }
  if (!Number.isSafeInteger(input.CREATED_AT_TICK) || input.CREATED_AT_TICK < 0) {
    reject("CREATED_AT_TICK must be a non-negative safe integer");
  }
  if (input.CLOCK_AUTHORITY !== CLOCK_AUTHORITY) {
    reject("material CLOCK_AUTHORITY must be QUEEN_SERVER_V0_2");
  }
  if (
    typeof input.TRACE_ID !== "string" ||
    !/^TRACE-[A-Z0-9-]{4,64}$/.test(input.TRACE_ID)
  ) {
    reject("invalid material TRACE_ID");
  }

  assertExactKeys(
    input.AUTHORIZATION_REF,
    ["REQUEST_ID", "REQUEST_H256", "PROPOSAL_H256"],
    "AUTHORIZATION_REF"
  );
  if (
    typeof input.AUTHORIZATION_REF.REQUEST_ID !== "string" ||
    !/^FMA-[A-Z0-9-]{4,80}$/.test(input.AUTHORIZATION_REF.REQUEST_ID)
  ) {
    reject("invalid AUTHORIZATION_REF.REQUEST_ID");
  }
  assertSha256(input.AUTHORIZATION_REF.REQUEST_H256, "AUTHORIZATION_REF.REQUEST_H256");
  assertSha256(input.AUTHORIZATION_REF.PROPOSAL_H256, "AUTHORIZATION_REF.PROPOSAL_H256");

  assertExactKeys(
    input.PEDIGREE,
    [
      "PARENT_STRAND_ID",
      "PARENT_SIGNATURE_H256",
      "SEGMENT_ID",
      "SEGMENT_H256",
      "START_INDEX",
      "END_INDEX",
      "TICK_START",
      "TICK_END"
    ],
    "PEDIGREE"
  );
  if (
    typeof input.PEDIGREE.PARENT_STRAND_ID !== "string" ||
    !/^STRAND-[A-Z0-9-]{4,80}$/.test(input.PEDIGREE.PARENT_STRAND_ID)
  ) {
    reject("invalid PEDIGREE.PARENT_STRAND_ID");
  }
  assertSha256(input.PEDIGREE.PARENT_SIGNATURE_H256, "PEDIGREE.PARENT_SIGNATURE_H256");
  if (
    typeof input.PEDIGREE.SEGMENT_ID !== "string" ||
    !/^STRAND-[A-Z0-9-]{4,80}-SEG-[0-9]{4}$/.test(input.PEDIGREE.SEGMENT_ID)
  ) {
    reject("invalid PEDIGREE.SEGMENT_ID");
  }
  assertSha256(input.PEDIGREE.SEGMENT_H256, "PEDIGREE.SEGMENT_H256");
  for (const key of ["START_INDEX", "END_INDEX", "TICK_START", "TICK_END"]) {
    if (!Number.isSafeInteger(input.PEDIGREE[key]) || input.PEDIGREE[key] < 0) {
      reject("invalid PEDIGREE." + key);
    }
  }
  if (input.PEDIGREE.END_INDEX < input.PEDIGREE.START_INDEX) {
    reject("PEDIGREE index order invalid");
  }
  if (input.PEDIGREE.TICK_END < input.PEDIGREE.TICK_START) {
    reject("PEDIGREE tick order invalid");
  }

  validateMaterialPayload(input.PAYLOAD);
  assertSha256(input.PAYLOAD_H256, "PAYLOAD_H256");
  if (input.PAYLOAD_H256.toLowerCase() !== h256(input.PAYLOAD)) {
    reject("PAYLOAD_H256 mismatch");
  }

  if (input.PROOF_REF !== null) reject("material PROOF_REF must be null");
  if (input.PARENT_MUTATED !== false) reject("PARENT_MUTATED must be false");
  if (input.PARENT_DELETED !== false) reject("PARENT_DELETED must be false");
  if (input.MATERIAL_CREATED !== true) reject("MATERIAL_CREATED must be true");
  if (input.IMMUTABLE !== true) reject("IMMUTABLE must be true");
  if (input.EXECUTABLE !== false) reject("material EXECUTABLE must be false");
  if (input.AUTO_PROOF_PROMOTION !== false) reject("AUTO_PROOF_PROMOTION must be false");
  if (input.GATE_AUTHORITY !== false) reject("material GATE_AUTHORITY must be false");
  if (input.ROUTING_AUTHORIZATION !== "UNDECIDED") {
    reject("material ROUTING_AUTHORIZATION must be UNDECIDED");
  }
  if (input.SIGNATURE_METHOD !== SIGNATURE_METHOD) {
    reject("unsupported material SIGNATURE_METHOD");
  }
  assertSha256(input.MATERIAL_H256, "MATERIAL_H256");
  if (input.MATERIAL_H256.toLowerCase() !== computeFourmiMaterialH256(input)) {
    reject("MATERIAL_H256 mismatch");
  }

  return deepFreeze(JSON.parse(JSON.stringify(input)));
}

export function materializeApprovedStrandSegment({ strand, proposal, request }) {
  const validStrand = validateCrystalStrand(strand);
  const expectedProposal = proposeStrandSegmentation(validStrand);
  const expectedProposalH256 = computeStrandSegmentationProposalH256(expectedProposal);

  if (!isPlainObject(proposal)) reject("proposal must be a plain object");
  const suppliedProposalH256 = computeStrandSegmentationProposalH256(proposal);
  if (suppliedProposalH256 !== expectedProposalH256) {
    reject("proposal does not match deterministic proposal for parent strand");
  }

  const validRequest = validateFourmiMaterialRequest(request);

  if (validRequest.PARENT_STRAND_ID !== validStrand.STRAND_ID) {
    reject("request parent strand ID mismatch");
  }
  if (
    validRequest.PARENT_SIGNATURE_H256.toLowerCase() !==
    validStrand.SIGNATURE_H256.toLowerCase()
  ) {
    reject("request parent signature mismatch");
  }
  if (validRequest.PROPOSAL_H256.toLowerCase() !== expectedProposalH256) {
    reject("request proposal hash mismatch");
  }

  const segment = expectedProposal.SEGMENTS.find(
    item => item.SEGMENT_ID === validRequest.SEGMENT_ID
  );
  if (!segment) reject("authorized SEGMENT_ID is not present in deterministic proposal");

  const mapping = DISPOSITION_MAP[segment.DISPOSITION];
  if (!mapping) reject("segment disposition cannot be materialized by v0.1");

  if (validRequest.TICK < segment.TICK_END) {
    reject("materialization TICK cannot precede segment end");
  }

  const beads = validStrand.BEADS.slice(segment.START_INDEX, segment.END_INDEX + 1);
  if (beads.length !== segment.BEAD_COUNT) {
    reject("segment bead count mismatch");
  }
  if (
    beads[0].TICK !== segment.TICK_START ||
    beads[beads.length - 1].TICK !== segment.TICK_END
  ) {
    reject("segment tick ancestry mismatch");
  }

  const payload = derivePayload(beads);
  const payloadH256 = h256(payload);
  const idSeed = h256({
    REQUEST_ID: validRequest.REQUEST_ID,
    ANT_ID: validRequest.ANT_ID,
    TICK: validRequest.TICK,
    PARENT_SIGNATURE_H256: validStrand.SIGNATURE_H256,
    SEGMENT_H256: segment.SEGMENT_H256,
    PAYLOAD_H256: payloadH256,
    MATERIAL_CLASS: mapping.MATERIAL_CLASS,
    MATERIAL_INTENT: mapping.MATERIAL_INTENT
  });

  const material = {
    SCHEMA: MATERIAL_SCHEMA,
    VERSION,
    MATERIAL_ID: `MAT-${mapping.MATERIAL_CLASS === "CRYSTAL_DUST" ? "DUST" : "FRAG"}-${idSeed.slice(0, 24).toUpperCase()}`,
    MATERIAL_CLASS: mapping.MATERIAL_CLASS,
    MATERIAL_INTENT: mapping.MATERIAL_INTENT,
    ANT_ID: validRequest.ANT_ID,
    CREATED_AT_TICK: validRequest.TICK,
    CLOCK_AUTHORITY,
    TRACE_ID: validRequest.TRACE_ID,
    AUTHORIZATION_REF: {
      REQUEST_ID: validRequest.REQUEST_ID,
      REQUEST_H256: validRequest.SIGNATURE_H256,
      PROPOSAL_H256: expectedProposalH256
    },
    PEDIGREE: {
      PARENT_STRAND_ID: validStrand.STRAND_ID,
      PARENT_SIGNATURE_H256: validStrand.SIGNATURE_H256,
      SEGMENT_ID: segment.SEGMENT_ID,
      SEGMENT_H256: segment.SEGMENT_H256,
      START_INDEX: segment.START_INDEX,
      END_INDEX: segment.END_INDEX,
      TICK_START: segment.TICK_START,
      TICK_END: segment.TICK_END
    },
    PAYLOAD: payload,
    PAYLOAD_H256: payloadH256,
    PROOF_REF: null,
    PARENT_MUTATED: false,
    PARENT_DELETED: false,
    MATERIAL_CREATED: true,
    IMMUTABLE: true,
    EXECUTABLE: false,
    AUTO_PROOF_PROMOTION: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "UNDECIDED",
    SIGNATURE_METHOD,
    MATERIAL_H256: "0".repeat(64)
  };

  material.MATERIAL_H256 = computeFourmiMaterialH256(material);
  return validateFourmiMaterial(material);
}

export const BRUTUS_FOURMI_MATERIAL_REQUEST_SCHEMA = REQUEST_SCHEMA;
export const BRUTUS_FOURMI_MATERIAL_SCHEMA = MATERIAL_SCHEMA;
export const BRUTUS_FOURMI_MATERIAL_DISPOSITION_MAP = DISPOSITION_MAP;
