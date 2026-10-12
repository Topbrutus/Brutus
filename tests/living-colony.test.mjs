import test from "node:test";
import assert from "node:assert/strict";

import {
  createLivingColony,
  detectFresquePatterns
} from "../src/living-colony.mjs";

function deterministicClock() {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 9, 12, 2, 0, tick++));
}

function makeHarness({ withPressure = false } = {}) {
  let broCycle = 0;
  const calls = {
    calculate: [],
    counter: [],
    provenance: [],
    compaction: [],
    fresque: []
  };

  const segments = {
    "SEG-0001": [1, 4, 9, 16, 25, 36],
    "SEG-0002": [2, 5, 8, 11, 14, 17]
  };

  const colony = createLivingColony({
    now: deterministicClock(),
    limits: {
      maxActiveAnts: 20,
      maxQuestsPerCycle: 20,
      fresqueSegmentSize: 64,
      compactionDiskThreshold: 70,
      l1CompactionMinimum: 100000
    },
    readBrotoculateurStatus: async () => {
      broCycle += 1;
      if (broCycle === 1) {
        return {
          state: "RUNNING",
          brutomagique: {
            emitted_by_level: { L1: withPressure ? 150000 : 100, L2: 10, L3: 2, L4: 4 },
            storage: withPressure ? { used_percent: 81 } : { used_percent: 42 }
          }
        };
      }
      return {
        state: "RUNNING",
        brutomagique: {
          emitted_by_level: {
            L1: withPressure ? 150050 : 120,
            L2: 12,
            L3: 3,
            L4: 4,
            L5: broCycle >= 3 ? 1 : 0
          },
          storage: withPressure ? { used_percent: 81 } : { used_percent: 43 }
        }
      };
    },
    readFresqueSegment: async ({ cursor, segment_id }) => {
      const id = segment_id || (cursor === "SEG-0002" ? "SEG-0002" : "SEG-0001");
      calls.fresque.push(id);
      return {
        segment_id: id,
        cursor: id,
        next_cursor: id === "SEG-0001" ? "SEG-0002" : "SEG-0001",
        values: segments[id]
      };
    },
    runCalculationQuest: async (quest) => {
      calls.calculate.push(quest.quest_id);
      return { status: "PASS", confirmed: true, measurements: 49 };
    },
    runCounterTestQuest: async (quest) => {
      calls.counter.push(quest.quest_id);
      return { status: "PASS", counterexample_found: false, tests: 91 };
    },
    runProvenanceQuest: async (quest) => {
      calls.provenance.push(quest.quest_id);
      return { status: "PASS", checked: true, prior_art_state: "REVIEW_REQUIRED" };
    },
    runCompactionQuest: async (quest) => {
      calls.compaction.push(quest.quest_id);
      return {
        status: "PASS",
        lossless_verified: true,
        originals_deleted: false,
        bytes_before: 1000000,
        bytes_after: 220000
      };
    }
  });

  return { colony, calls };
}

test("Fresque detector finds first- and second-difference structures", () => {
  const squares = detectFresquePatterns([1, 4, 9, 16, 25, 36]);
  assert.equal(squares.some((p) => p.kind === "CONSTANT_SECOND_DIFFERENCE"), true);

  const arithmetic = detectFresquePatterns([2, 5, 8, 11, 14]);
  assert.equal(arithmetic.some((p) => p.kind === "CONSTANT_FIRST_DIFFERENCE"), true);
});

test("Queen creates ants, gives quests, receives reports, amplifies a Fresque candidate and writes Astra", async () => {
  const { colony, calls } = makeHarness();

  await colony.runCycle();
  let state = colony.getState();
  assert.equal(state.ants.length >= 1, true);
  assert.equal(state.ants.every((ant) => ant.spawned_by === "BRUTUS_QUEEN"), true);
  assert.equal(state.ants.every((ant) => ant.self_reproduction_allowed === false), true);
  assert.equal(state.candidates.length >= 1, true);

  await colony.runCycle();
  state = colony.getState();

  const candidate = state.candidates.find((c) => c.expression === "D2(a[n])=2");
  assert.ok(candidate, "square-sequence candidate should exist");
  assert.equal(candidate.gates.FRESQUE_REPRODUCED, true);
  assert.equal(candidate.gates.BROTOCULATEUR_EXECUTED, true);
  assert.equal(candidate.gates.COUNTER_TEST_COMPLETED, true);
  assert.equal(candidate.gates.COUNTEREXAMPLE_FOUND, false);
  assert.equal(candidate.gates.PROVENANCE_CHECKED, true);
  assert.equal(candidate.ready_for_astra, true);
  assert.equal(candidate.status, "READY_FOR_ASTRA");

  const letter = state.astra_mailbox.find((item) => item.candidate_id === candidate.candidate_id);
  assert.ok(letter);
  assert.equal(letter.status, "AWAITING_ASTRA_REVIEW");
  assert.equal(calls.calculate.length > 0, true);
  assert.equal(calls.counter.length > 0, true);
  assert.equal(calls.provenance.length > 0, true);
});

test("Astra is final reviewer and her approval never auto-promotes a proof", async () => {
  const { colony } = makeHarness();
  await colony.runCycle();
  await colony.runCycle();

  const before = colony.getState();
  const letter = before.astra_mailbox[0];
  assert.ok(letter);

  const reply = colony.replyFromAstra(letter.letter_id, {
    decision: "APPROVE_FOR_PUBLICATION",
    message: "Validation Astra reÃ§ue; conserver les limites et la provenance."
  });
  assert.equal(reply.from, "ASTRA");

  const after = colony.getState();
  const candidate = after.candidates.find((item) => item.candidate_id === letter.candidate_id);
  assert.equal(candidate.status, "ASTRA_APPROVED_NOT_AUTOMATIC_PROOF");
  assert.equal(after.queen.auto_proof_promotion, false);
});

test("Astra can return a quest to the colony and Queen creates follow-up work", async () => {
  const { colony } = makeHarness();
  await colony.runCycle();
  await colony.runCycle();

  const before = colony.getState();
  const letter = before.astra_mailbox[0];
  const queuedBefore = before.quests.filter((q) => q.status === "QUEUED").length;

  colony.replyFromAstra(letter.letter_id, {
    decision: "REQUEST_MORE_TESTS",
    message: "Ã‰largir le domaine et essayer de casser la relation."
  });

  const after = colony.getState();
  const candidate = after.candidates.find((item) => item.candidate_id === letter.candidate_id);
  assert.equal(candidate.status, "RETURNED_TO_COLONY");
  assert.equal(after.quests.filter((q) => q.status === "QUEUED").length > queuedBefore, true);
  assert.equal(after.quests.some((q) => q.reason === "ASTRA_REQUESTED_MORE_TESTS"), true);
});

test("Crystal Watch discovers L5 dynamically and publicly exposes the measured level", async () => {
  const { colony } = makeHarness();
  await colony.runCycle();
  await colony.runCycle();
  await colony.runCycle();

  const publicState = colony.getPublicState();
  assert.equal(publicState.crystal_watch.levels.L5, 1);
  assert.equal(publicState.crystal_watch.highest_level, "L5");
  assert.equal(
    publicState.crystal_watch.newest_events.some((event) => event.level === "L5"),
    true
  );
  assert.equal(publicState.scope, "READ_ONLY_SANITIZED");
});

test("disk pressure makes Queen spawn a lossless compaction quest without deleting originals", async () => {
  const { colony, calls } = makeHarness({ withPressure: true });
  await colony.runCycle();

  const state = colony.getState();
  const compaction = state.quests.find((quest) => quest.type === "COMPACT_L1");
  assert.ok(compaction);
  assert.equal(compaction.payload.lossless_only, true);
  assert.equal(compaction.payload.delete_originals, false);
  assert.equal(calls.compaction.length, 1);
  assert.equal(state.storage.last_compaction_report.result.lossless_verified, true);
  assert.equal(state.storage.last_compaction_report.result.originals_deleted, false);
});




test("trivial operator patterns stay background observations and do not become candidates", async () => {
  const colony = createLivingColony({
    now: deterministicClock(),
    readFresqueSegment: async () => ({
      segment_id: "TABLE:ADD:7:0",
      kind: "VIRTUAL_TABLE_7X7",
      operator: "ADD",
      anchor: "7",
      next_cursor: "TABLE:ADD:7:0",
      values: [7, 8, 9, 10, 11, 12]
    })
  });
  await colony.runCycle();
  const state = colony.getState();
  assert.equal(state.fresque.background_patterns >= 1, true);
  assert.equal(state.candidates.length, 0);
  assert.equal(state.observations.some((item) => item.type === "FRESQUE_BACKGROUND_PATTERN"), true);
});