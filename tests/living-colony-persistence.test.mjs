import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createPersistentLivingColony,
  verifyLivingColonyJournal
} from "../src/living-colony-persistence.mjs";

function options(now) {
  return {
    now,
    colonyOptions: {
      readBrotoculateurStatus: async () => ({
        brutomagique: { emitted_by_level: { L1: 10, L2: 2, L3: 1 } }
      }),
      readFresqueSegment: async () => ({
        segment_id: "SEG-PERSIST",
        next_cursor: "SEG-PERSIST",
        values: [2, 5, 8, 11, 14]
      }),
      runCalculationQuest: async () => ({ status: "PASS", confirmed: true }),
      runCounterTestQuest: async () => ({ status: "PASS", counterexample_found: false }),
      runProvenanceQuest: async () => ({ status: "PASS", checked: true })
    }
  };
}

test("persistent colony resumes Queen cycle, ants and mailbox after restart", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "brutus-colony-"));
  const statePath = path.join(dir, "state.json");
  const journalPath = path.join(dir, "journal.jsonl");
  let t = 0;
  const now = () => new Date(Date.UTC(2026, 9, 12, 4, 0, t++));

  try {
    const first = await createPersistentLivingColony({ statePath, journalPath, ...options(now) });
    await first.runCycle();
    await first.runCycle();
    const saved = first.getState();
    assert.equal(saved.queen.cycle, 2);
    assert.equal(saved.ants.length > 0, true);
    assert.equal(saved.astra_mailbox.length > 0, true);

    const raw = JSON.parse(await readFile(statePath, "utf8"));
    assert.equal(raw.queen.cycle, 2);

    const second = await createPersistentLivingColony({ statePath, journalPath, ...options(now) });
    const resumed = second.getState();
    assert.equal(resumed.queen.cycle, 2);
    assert.equal(resumed.ants.length, saved.ants.length);
    assert.equal(resumed.astra_mailbox.length, saved.astra_mailbox.length);

    await second.runCycle();
    assert.equal(second.getState().queen.cycle, 3);

    const verification = await verifyLivingColonyJournal(journalPath);
    assert.equal(verification.valid, true);
    assert.equal(verification.entries, 3);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("journal detects tampering", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "brutus-journal-"));
  const statePath = path.join(dir, "state.json");
  const journalPath = path.join(dir, "journal.jsonl");
  let t = 0;
  const now = () => new Date(Date.UTC(2026, 9, 12, 5, 0, t++));

  try {
    const runtime = await createPersistentLivingColony({ statePath, journalPath, ...options(now) });
    await runtime.runCycle();
    const text = await readFile(journalPath, "utf8");
    await import("node:fs/promises").then(({ writeFile }) => writeFile(journalPath, text.replace("CYCLE_COMMITTED", "CYCLE_FAKE"), "utf8"));
    const verification = await verifyLivingColonyJournal(journalPath);
    assert.equal(verification.valid, false);
    assert.equal(verification.reason, "HASH_MISMATCH");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
