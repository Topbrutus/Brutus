import { createHash } from "node:crypto";
import { opendir, readdir, readFile, rename, stat, writeFile, chmod, rm } from "node:fs/promises";
import path from "node:path";

const SCHEMA = "BRUTUS-L1-JSON-COMPACTION-v0.1";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function semanticHash(value) {
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

function isL1Crystal(value) {
  return value && typeof value === "object" && Number(value.LEVEL) === 1 && typeof value.CRYSTAL_ID === "string";
}

export async function compactL1JsonFile({ sourcePath, minAgeSeconds = 600, nowMs = Date.now() } = {}) {
  if (!sourcePath) throw new Error("L1_JSON_COMPACTION_REJECTED: sourcePath is required");
  const beforeStat = await stat(sourcePath);
  if (!beforeStat.isFile()) throw new Error("L1_JSON_COMPACTION_REJECTED: source is not a file");
  const ageMs = nowMs - beforeStat.mtimeMs;
  if (ageMs < minAgeSeconds * 1000) {
    return Object.freeze({ schema: SCHEMA, sourcePath, status: "SKIPPED_TOO_RECENT", age_seconds: ageMs / 1000 });
  }

  const raw = await readFile(sourcePath, "utf8");
  const original = JSON.parse(raw);
  if (!isL1Crystal(original)) {
    return Object.freeze({ schema: SCHEMA, sourcePath, status: "SKIPPED_NOT_L1" });
  }

  const beforeBytes = Buffer.byteLength(raw, "utf8");
  const beforeHash = semanticHash(original);
  const originalCrystalHash = original.CRYSTAL_H256 ?? null;
  const compact = JSON.stringify(original);
  const afterBytes = Buffer.byteLength(compact, "utf8");

  if (afterBytes >= beforeBytes) {
    return Object.freeze({
      schema: SCHEMA,
      sourcePath,
      crystal_id: original.CRYSTAL_ID,
      status: "ALREADY_COMPACT",
      semantic_sha256: beforeHash,
      before_bytes: beforeBytes,
      after_bytes: beforeBytes,
      saved_bytes: 0,
      crystal_h256_preserved: true
    });
  }

  const tmp = `${sourcePath}.compact-tmp-${process.pid}-${Date.now()}`;
  try {
    await writeFile(tmp, compact, "utf8");
    await chmod(tmp, beforeStat.mode);
    const roundTrip = JSON.parse(await readFile(tmp, "utf8"));
    const afterHash = semanticHash(roundTrip);
    if (afterHash !== beforeHash || roundTrip.CRYSTAL_H256 !== originalCrystalHash) {
      throw new Error("L1_JSON_COMPACTION_REJECTED: semantic verification failed");
    }
    await rename(tmp, sourcePath);
  } catch (error) {
    await rm(tmp, { force: true }).catch(() => {});
    throw error;
  }

  return Object.freeze({
    schema: SCHEMA,
    sourcePath,
    crystal_id: original.CRYSTAL_ID,
    status: "COMPACTED",
    semantic_sha256: beforeHash,
    before_bytes: beforeBytes,
    after_bytes: afterBytes,
    saved_bytes: beforeBytes - afterBytes,
    saved_percent: Number(((1 - afterBytes / beforeBytes) * 100).toFixed(4)),
    crystal_h256_preserved: true
  });
}

export async function compactL1JsonBatch({
  crystalDir,
  maxFiles = 50,
  minAgeSeconds = 600,
  startAfter = null,
  nowMs = Date.now()
} = {}) {
  if (!crystalDir) throw new Error("L1_JSON_COMPACTION_REJECTED: crystalDir is required");
  if (!Number.isInteger(maxFiles) || maxFiles < 1 || maxFiles > 1000) {
    throw new Error("L1_JSON_COMPACTION_REJECTED: maxFiles must be 1..1000");
  }

  const names = (await readdir(crystalDir))
    .filter((name) => /-L1-.*\.json$/i.test(name))
    .sort();

  let startIndex = 0;
  if (startAfter) {
    startIndex = names.findIndex((name) => name > startAfter);
    if (startIndex < 0) startIndex = names.length;
  }

  const receipts = [];
  let inspected = 0;
  let lastInspectedName = null;
  for (const name of names.slice(startIndex)) {
    if (inspected >= maxFiles) break;
    inspected += 1;
    lastInspectedName = name;
    const receipt = await compactL1JsonFile({
      sourcePath: path.join(crystalDir, name),
      minAgeSeconds,
      nowMs
    });
    receipts.push(receipt);
  }

  const compacted = receipts.filter((item) => item.status === "COMPACTED");
  const atEnd = lastInspectedName === null || lastInspectedName === names.at(-1);
  return Object.freeze({
    schema: SCHEMA,
    status: "PASS",
    mode: "SEMANTIC_LOSSLESS_JSON_MINIFY",
    crystal_dir: crystalDir,
    inspected_files: inspected,
    processed_files: receipts.length,
    compacted_files: compacted.length,
    already_compact_files: receipts.filter((item) => item.status === "ALREADY_COMPACT").length,
    skipped_recent_files: receipts.filter((item) => item.status === "SKIPPED_TOO_RECENT").length,
    saved_bytes: compacted.reduce((sum, item) => sum + item.saved_bytes, 0),
    before_bytes: compacted.reduce((sum, item) => sum + item.before_bytes, 0),
    after_bytes: compacted.reduce((sum, item) => sum + item.after_bytes, 0),
    originals_deleted: false,
    crystal_h256_preserved: receipts.every((item) => item.crystal_h256_preserved !== false),
    start_after: startAfter,
    next_cursor: atEnd ? null : lastInspectedName,
    receipts
  });
}

export const BRUTUS_L1_JSON_COMPACTION_SCHEMA = SCHEMA;


export function createL1JsonCompactionWalker({ crystalDir, minAgeSeconds = 600 } = {}) {
  if (!crystalDir) throw new Error("L1_JSON_COMPACTION_REJECTED: crystalDir is required");
  let handle = null;
  let sweep = 0;
  let totalInspected = 0;

  async function ensureHandle() {
    if (!handle) {
      handle = await opendir(crystalDir);
      sweep += 1;
    }
    return handle;
  }

  async function compactNextBatch({ maxFiles = 50, nowMs = Date.now() } = {}) {
    if (!Number.isInteger(maxFiles) || maxFiles < 1 || maxFiles > 1000) {
      throw new Error("L1_JSON_COMPACTION_REJECTED: maxFiles must be 1..1000");
    }
    const receipts = [];
    let inspectedEntries = 0;
    let lastInspectedName = null;
    let reachedEnd = false;

    while (receipts.length < maxFiles) {
      const dir = await ensureHandle();
      const entry = await dir.read();
      if (!entry) {
        await dir.close().catch(() => {});
        handle = null;
        reachedEnd = true;
        break;
      }
      inspectedEntries += 1;
      totalInspected += 1;
      if (!entry.isFile() || !/-L1-.*\.json$/i.test(entry.name)) continue;
      lastInspectedName = entry.name;
      receipts.push(await compactL1JsonFile({
        sourcePath: path.join(crystalDir, entry.name),
        minAgeSeconds,
        nowMs
      }));
    }

    const compacted = receipts.filter((item) => item.status === "COMPACTED");
    return Object.freeze({
      schema: SCHEMA,
      status: "PASS",
      mode: "SEMANTIC_LOSSLESS_JSON_MINIFY_STREAMING_WALK",
      crystal_dir: crystalDir,
      sweep,
      inspected_entries: inspectedEntries,
      total_inspected_entries: totalInspected,
      processed_files: receipts.length,
      compacted_files: compacted.length,
      already_compact_files: receipts.filter((item) => item.status === "ALREADY_COMPACT").length,
      skipped_recent_files: receipts.filter((item) => item.status === "SKIPPED_TOO_RECENT").length,
      saved_bytes: compacted.reduce((sum, item) => sum + item.saved_bytes, 0),
      before_bytes: compacted.reduce((sum, item) => sum + item.before_bytes, 0),
      after_bytes: compacted.reduce((sum, item) => sum + item.after_bytes, 0),
      originals_deleted: false,
      crystal_h256_preserved: receipts.every((item) => item.crystal_h256_preserved !== false),
      last_inspected_name: lastInspectedName,
      reached_end: reachedEnd,
      receipts
    });
  }

  async function close() {
    if (handle) {
      await handle.close().catch(() => {});
      handle = null;
    }
  }

  return Object.freeze({ compactNextBatch, close });
}
