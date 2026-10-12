import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  compactLosslessFile,
  restoreLosslessFile,
  BRUTUS_L1_DELETE_APPROVAL
} from "../src/l1-lossless-compaction.mjs";

async function exists(filePath) {
  try { await access(filePath); return true; } catch { return false; }
}

test("L1 compactor is lossless and preserves original by default", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "brutus-l1-"));
  const source = path.join(dir, "L1.jsonl");
  const archive = path.join(dir, "L1.jsonl.gz");
  const restored = path.join(dir, "restored.jsonl");
  const payload = Array.from({ length: 3000 }, (_, i) => JSON.stringify({ level: "L1", formula_id: "PLUS1", n: i, value: i + 1 })).join("\n") + "\n";

  try {
    await writeFile(source, payload, "utf8");
    const receipt = await compactLosslessFile({ sourcePath: source, archivePath: archive });
    assert.equal(receipt.lossless_verified, true);
    assert.equal(receipt.originals_deleted, false);
    assert.equal(await exists(source), true);
    assert.equal(receipt.archive_bytes < receipt.source_bytes, true);

    const result = await restoreLosslessFile({ archivePath: archive, outputPath: restored });
    assert.equal(result.verified, true);
    assert.equal(await readFile(restored, "utf8"), payload);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("L1 compactor refuses deletion without the explicit destructive approval gate", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "brutus-l1-gate-"));
  const source = path.join(dir, "L1.jsonl");
  try {
    await writeFile(source, "{\"level\":\"L1\"}\n", "utf8");
    await assert.rejects(
      () => compactLosslessFile({ sourcePath: source, deleteOriginal: true }),
      /destructive deletion requires explicit approval token/
    );
    assert.equal(await exists(source), true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("verified replacement can delete source and still restore byte-for-byte", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "brutus-l1-replace-"));
  const source = path.join(dir, "L1.jsonl");
  const archive = path.join(dir, "L1.jsonl.gz");
  const restored = path.join(dir, "L1-restored.jsonl");
  const payload = "A".repeat(20000) + "\n";
  try {
    await writeFile(source, payload, "utf8");
    const receipt = await compactLosslessFile({
      sourcePath: source,
      archivePath: archive,
      deleteOriginal: true,
      destructiveApproval: BRUTUS_L1_DELETE_APPROVAL
    });
    assert.equal(receipt.lossless_verified, true);
    assert.equal(receipt.originals_deleted, true);
    assert.equal(await exists(source), false);
    await restoreLosslessFile({ archivePath: archive, outputPath: restored });
    assert.equal(await readFile(restored, "utf8"), payload);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
