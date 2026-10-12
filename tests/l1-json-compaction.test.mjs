import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, utimes } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { compactL1JsonFile, compactL1JsonBatch, createL1JsonCompactionWalker } from "../src/l1-json-compaction.mjs";

function crystal(id, level = 1) {
  return {
    AUTO_PROOF_PROMOTION: false,
    COVERAGE: 49,
    CRYSTAL_H256: `hash-${id}`,
    CRYSTAL_ID: id,
    EVIDENCE_CLASS: "PACKAGED_OBSERVATION",
    FORMULA_ID: "BIT_LENGTH",
    LEVEL: level,
    MEMBERS: Array.from({ length: 49 }, (_, index) => ({
      coverage: 1,
      id: `OBS-${index}`,
      kind: "OBSERVATION",
      payload: {
        formula_id: "BIT_LENGTH",
        input_value: String(index + 1),
        output_value: String((index + 1).toString(2).length),
        validation_state: "EXACT"
      }
    }))
  };
}

async function writePrettyOld(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  const old = new Date(Date.now() - 3_600_000);
  await utimes(filePath, old, old);
}

test("semantic L1 compaction saves bytes while preserving JSON and CRYSTAL_H256", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "brutus-l1-json-"));
  const file = path.join(dir, "BRUTOMAGIQUE-BIT_LENGTH-L1-X49-TEST.json");
  const original = crystal("BRUTOMAGIQUE-BIT_LENGTH-L1-X49-TEST");
  try {
    await writePrettyOld(file, original);
    const receipt = await compactL1JsonFile({ sourcePath: file, minAgeSeconds: 600 });
    assert.equal(receipt.status, "COMPACTED");
    assert.equal(receipt.saved_bytes > 0, true);
    assert.equal(receipt.crystal_h256_preserved, true);
    assert.deepEqual(JSON.parse(await readFile(file, "utf8")), original);
    assert.equal((await readFile(file, "utf8")).includes("\n  \""), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("semantic compactor skips recent and non-L1 crystals", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "brutus-l1-json-skip-"));
  const recent = path.join(dir, "BRUTOMAGIQUE-X-L1-X49-RECENT.json");
  const l2 = path.join(dir, "BRUTOMAGIQUE-X-L2-X2401-OLD.json");
  try {
    await writeFile(recent, JSON.stringify(crystal("RECENT"), null, 2), "utf8");
    await writePrettyOld(l2, crystal("OLD-L2", 2));
    assert.equal((await compactL1JsonFile({ sourcePath: recent, minAgeSeconds: 600 })).status, "SKIPPED_TOO_RECENT");
    assert.equal((await compactL1JsonFile({ sourcePath: l2, minAgeSeconds: 600 })).status, "SKIPPED_NOT_L1");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("batch compactor is bounded and never deletes originals", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "brutus-l1-json-batch-"));
  try {
    for (let i = 0; i < 5; i += 1) {
      await writePrettyOld(path.join(dir, `BRUTOMAGIQUE-X-L1-X49-${i}.json`), crystal(`L1-${i}`));
    }
    const result = await compactL1JsonBatch({ crystalDir: dir, maxFiles: 3, minAgeSeconds: 600 });
    assert.equal(result.status, "PASS");
    assert.equal(result.processed_files, 3);
    assert.equal(result.compacted_files, 3);
    assert.equal(result.saved_bytes > 0, true);
    assert.equal(result.originals_deleted, false);
    assert.equal(result.crystal_h256_preserved, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});


test("streaming walker advances across batches without rebuilding a sorted manifest", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "brutus-l1-json-walker-"));
  try {
    for (let i = 0; i < 7; i += 1) {
      await writePrettyOld(path.join(dir, `BRUTOMAGIQUE-X-L1-X49-${i}.json`), crystal(`WALK-${i}`));
    }
    await writeFile(path.join(dir, "ignore.txt"), "x", "utf8");
    const walker = createL1JsonCompactionWalker({ crystalDir: dir, minAgeSeconds: 600 });
    const seen = new Set();
    let reachedEnd = false;
    for (let i = 0; i < 5 && !reachedEnd; i += 1) {
      const batch = await walker.compactNextBatch({ maxFiles: 2 });
      for (const receipt of batch.receipts) seen.add(receipt.crystal_id);
      reachedEnd = batch.reached_end;
    }
    assert.equal(seen.size, 7);
    assert.equal(reachedEnd, true);
    await walker.close();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
