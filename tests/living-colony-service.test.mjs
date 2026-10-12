import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createLivingColonyService } from "../tools/living-colony-service.mjs";

function makeAdapters() {
  return {
    readBrotoculateurStatus: async () => ({
      run_id: "main-live",
      state: "RUNNING",
      brutomagique: { emitted_by_level: { L1: 1000, L2: 20, L3: 3, L4: 4 } }
    }),
    readFresqueSegment: async ({ segment_id } = {}) => ({
      segment_id: segment_id || "LINEAGE:SQUARES",
      kind: "CANONICAL_LINEAGE",
      lineage_id: "LIN-SQUARES",
      category: "TEST",
      next_cursor: "LINEAGE:SQUARES",
      values: [1, 4, 9, 16, 25, 36]
    }),
    runCalculationQuest: async () => ({ status: "PASS", confirmed: true, meaning: "BROTOCULATEUR_QUEST_EXECUTED_NOT_PROOF" }),
    runCounterTestQuest: async () => ({ status: "PASS", counterexample_found: false, reproduced: true }),
    runProvenanceQuest: async () => ({ status: "PASS", checked: true, external_prior_art_checked: false, novelty_claimed: false }),
    runCompactionQuest: async () => ({ status: "BLOCKED", reason: "NOT_CONFIGURED" }),
    fresquePublicSummary: async () => ({
      schema: "BRUTOTABLEUR-FRESQUE-COLONY-FEED-v0.1",
      source_commit: "abc123",
      stats: { segments: 567, discoveries: 15 }
    })
  };
}

test("service runs autonomous cycles, persists, publishes read-only state, and accepts Astra reply through colony gate", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "brutus-colony-service-"));
  const statePath = path.join(dir, "state.json");
  const journalPath = path.join(dir, "journal.jsonl");
  const publicPath = path.join(dir, "public.json");
  const service = await createLivingColonyService({
    adapters: makeAdapters(),
    stateDir: dir,
    statePath,
    journalPath,
    publicPath,
    fresquePath: path.join(dir, "unused.json"),
    cycleMs: 60_000,
    port: 18812,
    host: "127.0.0.1"
  });

  try {
    await service.start({ withHttp: false, immediateCycle: true });
    await service.cycle();

    const state = service.colony.getState();
    assert.equal(state.queen.cycle, 2);
    assert.equal(state.ants.length > 0, true);
    assert.equal(state.astra_mailbox.length > 0, true);

    const publicPayload = JSON.parse(await readFile(publicPath, "utf8"));
    assert.equal(publicPayload.public_scope, "READ_ONLY_SANITIZED");
    assert.equal(publicPayload.colony.colony.recent_ants.length > 0, true);
    assert.equal(publicPayload.fresque.stats.segments, 567);

    const letter = state.astra_mailbox[0];
    const reply = await service.colony.replyFromAstra(letter.letter_id, {
      decision: "REQUEST_MORE_TESTS",
      message: "Élargir le domaine."
    });
    assert.equal(reply.from, "ASTRA");
    await service.publish();

    const after = service.colony.getState();
    assert.equal(after.candidates[0].status, "RETURNED_TO_COLONY");
  } finally {
    await service.stop();
    await rm(dir, { recursive: true, force: true });
  }
});

test("service refuses non-loopback bind", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "brutus-colony-bind-"));
  try {
    await assert.rejects(
      () => createLivingColonyService({ adapters: makeAdapters(), stateDir: dir, statePath: path.join(dir,"s.json"), journalPath: path.join(dir,"j.jsonl"), publicPath: path.join(dir,"p.json"), fresquePath: path.join(dir,"f.json"), host: "0.0.0.0" }),
      /loopback-only/
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
