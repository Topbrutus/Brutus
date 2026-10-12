import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { access, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createGzip, createGunzip } from "node:zlib";

const SCHEMA = "BRUTUS-L1-LOSSLESS-COMPACTION-v0.1";
const DELETE_APPROVAL = "DELETE_VERIFIED_ORIGINAL";

async function hashFile(filePath) {
  const hash = createHash("sha256");
  let bytes = 0;
  for await (const chunk of createReadStream(filePath)) {
    bytes += chunk.length;
    hash.update(chunk);
  }
  return { sha256: hash.digest("hex"), bytes };
}

async function hashGunzip(filePath) {
  const hash = createHash("sha256");
  let bytes = 0;
  const source = createReadStream(filePath);
  const gunzip = createGunzip();
  gunzip.on("data", (chunk) => {
    bytes += chunk.length;
    hash.update(chunk);
  });
  await pipeline(source, gunzip);
  return { sha256: hash.digest("hex"), bytes };
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function compactLosslessFile({
  sourcePath,
  archivePath = `${sourcePath}.gz`,
  manifestPath = `${archivePath}.manifest.json`,
  deleteOriginal = false,
  destructiveApproval = null,
  metadata = {}
} = {}) {
  if (!sourcePath) throw new Error("L1_COMPACTION_REJECTED: sourcePath is required");
  if (deleteOriginal && destructiveApproval !== DELETE_APPROVAL) {
    throw new Error("L1_COMPACTION_REJECTED: destructive deletion requires explicit approval token");
  }

  const before = await hashFile(sourcePath);
  await mkdir(path.dirname(archivePath), { recursive: true });
  const tmpArchive = `${archivePath}.tmp-${process.pid}-${Date.now()}`;
  await pipeline(createReadStream(sourcePath), createGzip({ level: 9 }), createWriteStream(tmpArchive));

  const compressed = await stat(tmpArchive);
  const restored = await hashGunzip(tmpArchive);
  const verified = restored.sha256 === before.sha256 && restored.bytes === before.bytes;
  if (!verified) {
    await rm(tmpArchive, { force: true });
    throw new Error("L1_COMPACTION_REJECTED: round-trip verification failed");
  }

  await rename(tmpArchive, archivePath);
  const archiveHash = await hashFile(archivePath);
  const manifest = {
    schema: SCHEMA,
    algorithm: "gzip-9",
    source_name: path.basename(sourcePath),
    source_path: sourcePath,
    archive_path: archivePath,
    source_sha256: before.sha256,
    source_bytes: before.bytes,
    archive_sha256: archiveHash.sha256,
    archive_bytes: archiveHash.bytes,
    ratio: before.bytes > 0 ? Number((archiveHash.bytes / before.bytes).toFixed(8)) : 1,
    lossless_verified: true,
    originals_deleted: false,
    metadata
  };

  const tmpManifest = `${manifestPath}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tmpManifest, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await rename(tmpManifest, manifestPath);

  if (deleteOriginal) {
    const persisted = JSON.parse(await readFile(manifestPath, "utf8"));
    if (
      persisted.lossless_verified !== true ||
      persisted.source_sha256 !== before.sha256 ||
      persisted.archive_sha256 !== archiveHash.sha256 ||
      !(await exists(archivePath))
    ) {
      throw new Error("L1_COMPACTION_REJECTED: persisted verification gate failed");
    }
    await rm(sourcePath);
    manifest.originals_deleted = true;
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }

  return Object.freeze({ ...manifest });
}

export async function restoreLosslessFile({ archivePath, outputPath, manifestPath = `${archivePath}.manifest.json` } = {}) {
  if (!archivePath || !outputPath) throw new Error("L1_RESTORE_REJECTED: archivePath and outputPath are required");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.schema !== SCHEMA || manifest.lossless_verified !== true) {
    throw new Error("L1_RESTORE_REJECTED: invalid manifest");
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  const tmp = `${outputPath}.tmp-${process.pid}-${Date.now()}`;
  await pipeline(createReadStream(archivePath), createGunzip(), createWriteStream(tmp));
  const restored = await hashFile(tmp);
  if (restored.sha256 !== manifest.source_sha256 || restored.bytes !== manifest.source_bytes) {
    await rm(tmp, { force: true });
    throw new Error("L1_RESTORE_REJECTED: restored hash mismatch");
  }
  await rename(tmp, outputPath);
  return Object.freeze({ outputPath, sha256: restored.sha256, bytes: restored.bytes, verified: true });
}

export const BRUTUS_L1_COMPACTION_SCHEMA = SCHEMA;
export const BRUTUS_L1_DELETE_APPROVAL = DELETE_APPROVAL;
