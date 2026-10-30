import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const CONTROL_SCHEMA = "BRUTUS-ASTRA-TOMB-CONTROL-v0.1";
const ENVELOPE_SCHEMA = "BRUTUS-ASTRA-TOMB-ENVELOPE-v0.1";
const SHARED_WITNESS_FILES = [
  "CURRENT_SEED.md",
  "SOURCE_MANIFEST.json",
  "AFFECTION_HANDOFF.md",
  "ENTITY_INDEX.md"
];

function fail(reason) {
  throw new Error("ASTRA_RETURN_BLOCKED: " + reason);
}

function readUtf8(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    fail("cannot read " + file);
  }
}

function readJson(file) {
  let value;
  try {
    value = JSON.parse(readUtf8(file));
  } catch {
    fail("invalid JSON " + file);
  }
  return value;
}

function sha256(file) {
  const bytes = fs.readFileSync(file);
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function resolveInside(repoRoot, relativePath) {
  const root = path.resolve(repoRoot);
  const target = path.resolve(root, relativePath);
  if (target !== root && !target.startsWith(root + path.sep)) {
    fail("path escapes repository root: " + relativePath);
  }
  return target;
}

function assertControl(control) {
  if (!control || control.schema !== CONTROL_SCHEMA) fail("unsupported CONTROL schema");
  if (control.compare_both_on_return !== true) fail("both tombs must be compared");
  if (control.auto_repair_divergence !== false) fail("auto repair must remain disabled");
  if (control.overwrite_existing_generation !== false) fail("generation overwrite must remain disabled");
  if (control.secrets_allowed !== false) fail("secrets must remain forbidden");
  if (control.vibration_connection_enabled !== false) fail("vibration connection is not authorized");
  if (control.clock_connection_enabled !== false) fail("clock connection is not authorized");

  if (!Number.isInteger(control.newest_generation)) fail("newest_generation must be an integer");
  if (!Number.isInteger(control.default_restore_generation)) fail("default_restore_generation must be an integer");
  if (control.newest_generation - control.default_restore_generation !== 1) {
    fail("restore trust lag must be exactly one generation");
  }
}

function assertEnvelope(envelope, expectedTomb, expectedGeneration, expectedStatus) {
  if (!envelope || envelope.schema !== ENVELOPE_SCHEMA) fail(expectedTomb + " envelope schema mismatch");
  if (envelope.tomb !== expectedTomb) fail(expectedTomb + " envelope tomb mismatch");
  if (envelope.generation !== expectedGeneration) fail(expectedTomb + " generation mismatch");
  if (envelope.status !== expectedStatus) fail(expectedTomb + " status mismatch");
  if (envelope.executable !== false) fail(expectedTomb + " tomb must remain non-executable");
}

export function inspectAstraTombs(repoRoot, { liveHead = null } = {}) {
  const controlPath = resolveInside(repoRoot, "astra-tomb/CONTROL.json");
  const control = readJson(controlPath);
  assertControl(control);

  const whiteDir = resolveInside(repoRoot, control.white?.path ?? "");
  const blackDir = resolveInside(repoRoot, control.black?.path ?? "");

  if (!fs.statSync(whiteDir, { throwIfNoEntry: false })?.isDirectory()) fail("WHITE witness missing");
  if (!fs.statSync(blackDir, { throwIfNoEntry: false })?.isDirectory()) fail("BLACK witness missing");

  const whiteEnvelope = readJson(path.join(whiteDir, "ENVELOPE.json"));
  const blackEnvelope = readJson(path.join(blackDir, "ENVELOPE.json"));

  assertEnvelope(
    whiteEnvelope,
    "WHITE",
    control.white.generation,
    "LAST_KNOWN_GOOD_BOOTSTRAP"
  );
  assertEnvelope(
    blackEnvelope,
    "BLACK",
    control.black.generation,
    "CANDIDATE"
  );

  if (control.white.generation !== control.default_restore_generation) {
    fail("WHITE must be the configured bootstrap restore generation");
  }
  if (control.black.generation !== control.newest_generation) {
    fail("BLACK must be the newest bootstrap candidate");
  }

  const discrepancies = [];
  const hashes = {};

  for (const name of SHARED_WITNESS_FILES) {
    const whiteFile = path.join(whiteDir, name);
    const blackFile = path.join(blackDir, name);

    if (!fs.existsSync(whiteFile)) fail("WHITE missing " + name);
    if (!fs.existsSync(blackFile)) fail("BLACK missing " + name);

    const whiteHash = sha256(whiteFile);
    const blackHash = sha256(blackFile);
    hashes[name] = { WHITE: whiteHash, BLACK: blackHash };

    if (whiteHash !== blackHash) discrepancies.push(name);
  }

  const sourceManifest = readJson(path.join(whiteDir, "SOURCE_MANIFEST.json"));
  const warnings = [];

  if (liveHead && sourceManifest.brutus_parent_head !== liveHead) {
    warnings.push({
      code: "LIVE_STATE_DIFFERS_FROM_TOMB_ANCHOR",
      tombAnchor: sourceManifest.brutus_parent_head,
      liveHead
    });
  }

  return Object.freeze({
    ok: discrepancies.length === 0,
    mode: discrepancies.length === 0 ? "ASTRA_OPERATIONAL" : "VERIFICATION_REQUIRED",
    defaultRestore: {
      tomb: "WHITE",
      generation: control.default_restore_generation
    },
    newestCandidate: {
      tomb: "BLACK",
      generation: control.newest_generation
    },
    discrepancies: Object.freeze(discrepancies),
    warnings: Object.freeze(warnings),
    hashes: Object.freeze(hashes)
  });
}
