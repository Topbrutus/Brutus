import { createHash } from "node:crypto";

const SCHEMA = "BRUTUS-LIVING-COLONY-v0.1";
const PUBLIC_SCHEMA = "BRUTUS-LIVING-COLONY-PUBLIC-v0.1";

const QUEST_SPECIALTY = Object.freeze({
  FRESQUE_SCAN: "FRESQUE_SCOUT",
  FRESQUE_RESCAN: "FRESQUE_SCOUT",
  CALCULATE: "CALCULATOR",
  CRYSTAL_VERIFY: "CRYSTAL_INSPECTOR",
  COUNTER_TEST: "COUNTER_TESTER",
  PROVENANCE: "PROVENANCE_AUDITOR",
  COMPACT_L1: "ARCHIVIST_COMPACTOR",
  ASTRA_FOLLOWUP: "ASTRA_LIAISON"
});

const ASTRA_DECISIONS = new Set([
  "APPROVE_FOR_PUBLICATION",
  "RETURN_TO_COLONY",
  "REQUEST_MORE_TESTS",
  "ARCHIVE",
  "REJECT"
]);

function nowIso(now) {
  const value = now();
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}

function sha(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function pad(value, size = 6) {
  return String(value).padStart(size, "0");
}

function levelNumber(level) {
  const match = /^L([1-9][0-9]*)$/.exec(String(level));
  return match ? Number(match[1]) : null;
}

function normalizeLevels(status) {
  const source =
    status?.brutomagique?.emitted_by_level ??
    status?.levels ??
    status?.crystals_by_level ??
    {};

  const out = {};
  for (const [key, raw] of Object.entries(source || {})) {
    const n = levelNumber(key);
    const count = Number(raw);
    if (n !== null && Number.isFinite(count) && count >= 0) out[`L${n}`] = Math.trunc(count);
  }
  return Object.fromEntries(
    Object.entries(out).sort((a, b) => levelNumber(a[0]) - levelNumber(b[0]))
  );
}

function highestObservedLevel(levels) {
  let best = null;
  for (const [level, count] of Object.entries(levels)) {
    if (count <= 0) continue;
    if (best === null || levelNumber(level) > levelNumber(best)) best = level;
  }
  return best;
}

function storagePressure(status) {
  const storage = status?.storage ?? status?.brutomagique?.storage ?? {};
  for (const key of ["disk_usage_percent", "used_percent", "percent_used", "usage_percent"]) {
    const value = Number(storage?.[key]);
    if (Number.isFinite(value) && value >= 0 && value <= 100) return value;
  }
  return null;
}

function asBigInts(values) {
  if (!Array.isArray(values) || values.length < 4) return null;
  const out = [];
  for (const value of values) {
    if (typeof value === "bigint") out.push(value);
    else if (typeof value === "number" && Number.isSafeInteger(value)) out.push(BigInt(value));
    else if (typeof value === "string" && /^-?(0|[1-9][0-9]*)$/.test(value)) out.push(BigInt(value));
    else return null;
  }
  return out;
}

export function detectFresquePatterns(values) {
  const ints = asBigInts(values);
  if (!ints) return [];

  const patterns = [];
  const diffs = ints.slice(1).map((value, index) => value - ints[index]);
  if (diffs.every((value) => value === diffs[0])) {
    patterns.push({
      kind: "CONSTANT_FIRST_DIFFERENCE",
      expression: `D1(a[n])=${diffs[0]}`,
      order: 1,
      sample_size: ints.length
    });
  }

  if (diffs.length >= 3) {
    const d2 = diffs.slice(1).map((value, index) => value - diffs[index]);
    if (d2.every((value) => value === d2[0])) {
      patterns.push({
        kind: "CONSTANT_SECOND_DIFFERENCE",
        expression: `D2(a[n])=${d2[0]}`,
        order: 2,
        sample_size: ints.length
      });
    }
  }

  for (let period = 2; period <= Math.min(8, Math.floor(ints.length / 2)); period += 1) {
    let repeated = true;
    for (let i = period; i < ints.length; i += 1) {
      if (ints[i] !== ints[i % period]) {
        repeated = false;
        break;
      }
    }
    if (repeated) {
      patterns.push({
        kind: "REPEATING_BLOCK",
        expression: `period=${period}`,
        period,
        sample_size: ints.length
      });
      break;
    }
  }

  return patterns;
}

function isTrivialFresquePattern(pattern, segment) {
  if (!pattern || !segment) return false;
  const operator = String(segment.operator || "").toUpperCase();
  const lineage = String(segment.lineage_id || "").toUpperCase();
  if (["CONSTANT_FIRST_DIFFERENCE", "CONSTANT_SECOND_DIFFERENCE"].includes(pattern.kind)) {
    if (["ADD", "SUB", "MUL"].includes(operator)) return true;
    if (["LIN-ARITH-INC", "LIN-MULT-EVEN"].includes(lineage)) return true;
  }
  if (pattern.kind === "REPEATING_BLOCK" && operator === "MOD") return true;
  return false;
}

function normalizeAdapterResult(raw) {
  if (raw === undefined || raw === null) return { status: "BLOCKED", reason: "NO_RESULT" };
  if (typeof raw !== "object") return { status: "PASS", value: raw };
  const result = clone(raw);
  const status = String(result.status ?? result.STATUS ?? "PASS").toUpperCase();
  result.status = ["PASS", "FAIL", "ERROR", "BLOCKED"].includes(status) ? status : "PASS";
  return result;
}

export function createLivingColony({
  readBrotoculateurStatus,
  readFresqueSegment,
  runCalculationQuest,
  runCounterTestQuest,
  runProvenanceQuest,
  runCompactionQuest,
  initialState = null,
  now = () => new Date(),
  limits = {}
} = {}) {
  const config = Object.freeze({
    maxActiveAnts: Number.isInteger(limits.maxActiveAnts) ? limits.maxActiveAnts : 24,
    maxQuestsPerCycle: Number.isInteger(limits.maxQuestsPerCycle) ? limits.maxQuestsPerCycle : 12,
    fresqueSegmentSize: Number.isInteger(limits.fresqueSegmentSize) ? limits.fresqueSegmentSize : 256,
    compactionDiskThreshold: Number.isFinite(limits.compactionDiskThreshold)
      ? Number(limits.compactionDiskThreshold)
      : 70,
    l1CompactionMinimum: Number.isInteger(limits.l1CompactionMinimum)
      ? limits.l1CompactionMinimum
      : 100000
  });

  const state = {
    schema: SCHEMA,
    mode: "AUTONOMOUS_QUEEN_GATED",
    queen: {
      id: "BRUTUS",
      role: "QUEEN",
      generation: 0,
      cycle: 0,
      auto_proof_promotion: false,
      ants_self_reproduce: false,
      astra_authority: "FINAL_REVIEW_AND_REPLY"
    },
    counters: { ant: 0, quest: 0, report: 0, candidate: 0, letter: 0, reply: 0, observation: 0 },
    ants: [],
    quests: [],
    reports: [],
    candidates: [],
    astra_mailbox: [],
    astra_replies: [],
    observations: [],
    crystal_watch: {
      levels: {},
      highest_level: null,
      previous_highest_level: null,
      total_events: 0,
      newest_events: []
    },
    fresque: {
      cursor: null,
      segments_scanned: 0,
      patterns_observed: 0,
      background_patterns: 0,
      last_segment_id: null,
      hot_segments: []
    },
    storage: {
      pressure_percent: null,
      compaction_quests: 0,
      compaction_cursor: null,
      last_compaction_report: null
    },
    last_cycle_at: null,
    last_error: null
  };

  if (initialState !== null) {
    if (!initialState || typeof initialState !== "object" || initialState.schema !== SCHEMA) {
      throw new Error("LIVING_COLONY_REJECTED: invalid initial state");
    }
    const restored = clone(initialState);
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state, restored);
    if (state.fresque && !Number.isFinite(state.fresque.background_patterns)) state.fresque.background_patterns = 0;
    if (state.storage && !Object.prototype.hasOwnProperty.call(state.storage, "compaction_cursor")) state.storage.compaction_cursor = null;
  }

  function recordObservation(type, payload) {
    state.counters.observation += 1;
    const observation = {
      observation_id: `OBS-${pad(state.counters.observation)}`,
      type,
      observed_at: nowIso(now),
      payload: clone(payload)
    };
    state.observations.push(observation);
    if (state.observations.length > 500) state.observations.splice(0, state.observations.length - 500);
    return observation;
  }

  function questSignature(spec) {
    return sha({ type: spec.type, target: spec.target ?? null, candidate_id: spec.candidate_id ?? null, payload: spec.payload ?? {} });
  }

  function enqueueQuest(spec) {
    const type = String(spec.type || "").toUpperCase();
    if (!QUEST_SPECIALTY[type]) throw new Error(`LIVING_COLONY_REJECTED: unsupported quest type ${type}`);
    const signature = questSignature({ ...spec, type });
    const duplicate = state.quests.find((quest) =>
      quest.signature === signature && ["QUEUED", "RUNNING"].includes(quest.status)
    );
    if (duplicate) return duplicate;

    state.counters.quest += 1;
    const quest = {
      quest_id: `QUEST-${type}-${pad(state.counters.quest)}`,
      type,
      specialty: QUEST_SPECIALTY[type],
      target: spec.target ?? null,
      candidate_id: spec.candidate_id ?? null,
      priority: Number.isFinite(spec.priority) ? Number(spec.priority) : 50,
      reason: spec.reason ?? null,
      payload: clone(spec.payload ?? {}),
      signature,
      status: "QUEUED",
      created_at: nowIso(now),
      started_at: null,
      finished_at: null,
      ant_id: null,
      result_status: null
    };
    state.quests.push(quest);
    return quest;
  }

  function spawnAnt(quest) {
    state.counters.ant += 1;
    const digest = sha({ queen: "BRUTUS", counter: state.counters.ant, quest: quest.quest_id }).slice(0, 12).toUpperCase();
    const ant = {
      ant_id: `ANT-${digest}`,
      queen_id: "BRUTUS",
      generation: state.queen.generation,
      specialty: quest.specialty,
      quest_id: quest.quest_id,
      born_at: nowIso(now),
      state: "BORN",
      parent_ant_id: null,
      spawned_by: "BRUTUS_QUEEN",
      self_reproduction_allowed: false,
      reports_returned: 0,
      recycled_at: null
    };
    state.ants.push(ant);
    return ant;
  }

  function registerPattern(pattern, segment) {
    const fingerprint = sha({
      kind: pattern.kind,
      expression: pattern.expression,
      source: "BRUTOTABLEUR_FRESQUE"
    });
    let candidate = state.candidates.find((item) => item.fingerprint === fingerprint && item.status !== "ARCHIVED");
    if (!candidate) {
      state.counters.candidate += 1;
      candidate = {
        candidate_id: `FORMULA-COLONY-${pad(state.counters.candidate)}`,
        fingerprint,
        title: `Motif de fresque - ${pattern.kind}`,
        expression: pattern.expression,
        classification: "RELATION_CANDIDATE",
        source: "BRUTOTABLEUR_FRESQUE",
        status: "UNDER_EVALUATION",
        evidence_count: 0,
        first_seen_at: nowIso(now),
        last_seen_at: null,
        segments: [],
        gates: {
          FRESQUE_REPRODUCED: false,
          BROTOCULATEUR_EXECUTED: false,
          COUNTER_TEST_COMPLETED: false,
          COUNTEREXAMPLE_FOUND: false,
          PROVENANCE_CHECKED: false
        },
        ready_for_astra: false,
        astra_status: "NOT_SENT"
      };
      state.candidates.push(candidate);
    }

    candidate.evidence_count += 1;
    candidate.last_seen_at = nowIso(now);
    if (segment?.segment_id && !candidate.segments.includes(segment.segment_id)) {
      candidate.segments.push(segment.segment_id);
    }

    enqueueQuest({
      type: "FRESQUE_RESCAN",
      candidate_id: candidate.candidate_id,
      target: segment?.segment_id ?? null,
      priority: 75,
      reason: "REPRODUCE_PATTERN_ON_FRESQUE",
      payload: { pattern: clone(pattern), segment: clone(segment) }
    });
    enqueueQuest({
      type: "CALCULATE",
      candidate_id: candidate.candidate_id,
      priority: 80,
      reason: "AMPLIFY_PATTERN_WITH_BROTOCULATEUR",
      payload: { pattern: clone(pattern), source_segment_id: segment?.segment_id ?? null, source_segment: clone(segment) }
    });
    enqueueQuest({
      type: "COUNTER_TEST",
      candidate_id: candidate.candidate_id,
      priority: 90,
      reason: "TRY_TO_BREAK_PATTERN",
      payload: { pattern: clone(pattern), source_segment: clone(segment) }
    });
    enqueueQuest({
      type: "PROVENANCE",
      candidate_id: candidate.candidate_id,
      priority: 60,
      reason: "CHECK_PROVENANCE_AND_PRIOR_ART",
      payload: { pattern: clone(pattern), source_segment: clone(segment) }
    });

    return candidate;
  }

  function candidateById(candidateId) {
    return state.candidates.find((candidate) => candidate.candidate_id === candidateId) ?? null;
  }

  function reviewCandidate(candidate) {
    const g = candidate.gates;
    candidate.ready_for_astra = Boolean(
      g.FRESQUE_REPRODUCED &&
      g.BROTOCULATEUR_EXECUTED &&
      g.COUNTER_TEST_COMPLETED &&
      !g.COUNTEREXAMPLE_FOUND &&
      g.PROVENANCE_CHECKED
    );

    if (g.COUNTEREXAMPLE_FOUND) candidate.status = "REFUTED_OR_DOMAIN_RESTRICTED";
    else if (candidate.ready_for_astra) candidate.status = "READY_FOR_ASTRA";
    else candidate.status = "UNDER_EVALUATION";

    if (candidate.ready_for_astra && candidate.astra_status === "NOT_SENT") {
      state.counters.letter += 1;
      const letter = {
        letter_id: `ASTRA-LETTER-${pad(state.counters.letter)}`,
        from: "BRUTUS_QUEEN",
        to: "ASTRA",
        candidate_id: candidate.candidate_id,
        subject: candidate.title,
        expression: candidate.expression,
        evidence_count: candidate.evidence_count,
        gates: clone(candidate.gates),
        status: "AWAITING_ASTRA_REVIEW",
        sent_at: nowIso(now),
        astra_reply_id: null
      };
      state.astra_mailbox.push(letter);
      candidate.astra_status = "AWAITING_REPLY";
    }
  }

  function applyReport(report) {
    const quest = state.quests.find((item) => item.quest_id === report.quest_id);
    const candidate = quest?.candidate_id ? candidateById(quest.candidate_id) : null;
    const result = report.result || {};

    if (quest?.type === "FRESQUE_RESCAN" && candidate && report.status === "PASS") {
      candidate.gates.FRESQUE_REPRODUCED = result.reproduced !== false;
    }
    if ((quest?.type === "CALCULATE" || quest?.type === "CRYSTAL_VERIFY") && candidate && report.status === "PASS") {
      candidate.gates.BROTOCULATEUR_EXECUTED = result.confirmed !== false;
    }
    if (quest?.type === "COUNTER_TEST" && candidate) {
      if (["PASS", "FAIL"].includes(report.status)) candidate.gates.COUNTER_TEST_COMPLETED = true;
      if (result.counterexample_found === true || report.status === "FAIL") {
        candidate.gates.COUNTEREXAMPLE_FOUND = true;
      }
    }
    if (quest?.type === "PROVENANCE" && candidate && report.status === "PASS") {
      candidate.gates.PROVENANCE_CHECKED = result.checked !== false;
    }
    if (quest?.type === "COMPACT_L1" && report.status === "PASS") {
      state.storage.last_compaction_report = clone(report);
      state.storage.compaction_cursor = Object.prototype.hasOwnProperty.call(result, "next_cursor")
        ? result.next_cursor
        : state.storage.compaction_cursor;
    }

    if (candidate) reviewCandidate(candidate);
  }

  function reportFromAnt(ant, quest, rawResult) {
    const normalized = normalizeAdapterResult(rawResult);
    state.counters.report += 1;
    const report = {
      report_id: `REPORT-${pad(state.counters.report)}`,
      quest_id: quest.quest_id,
      ant_id: ant.ant_id,
      specialty: ant.specialty,
      status: normalized.status,
      returned_at: nowIso(now),
      result: normalized
    };
    state.reports.push(report);
    if (state.reports.length > 1000) state.reports.splice(0, state.reports.length - 1000);
    ant.reports_returned += 1;
    applyReport(report);
    return report;
  }

  async function executeQuest(ant, quest) {
    ant.state = "WORKING";
    quest.status = "RUNNING";
    quest.ant_id = ant.ant_id;
    quest.started_at = nowIso(now);

    let result;
    try {
      const context = freeze(clone({
        queen: state.queen,
        ant,
        quest,
        crystal_watch: state.crystal_watch,
        fresque: state.fresque
      }));

      if (quest.type === "FRESQUE_SCAN") {
        if (typeof readFresqueSegment !== "function") {
          result = { status: "BLOCKED", reason: "NO_FRESQUE_READER" };
        } else {
          const segment = await readFresqueSegment({
            cursor: state.fresque.cursor,
            size: config.fresqueSegmentSize,
            ant: clone(ant),
            quest: clone(quest)
          });
          if (!segment || typeof segment !== "object") {
            result = { status: "ERROR", reason: "INVALID_FRESQUE_SEGMENT" };
          } else {
            const safeSegment = clone(segment);
            const patterns = detectFresquePatterns(safeSegment.values || []);
            state.fresque.segments_scanned += 1;
            state.fresque.patterns_observed += patterns.length;
            state.fresque.last_segment_id = safeSegment.segment_id ?? null;
            if (Object.prototype.hasOwnProperty.call(safeSegment, "next_cursor")) {
              state.fresque.cursor = safeSegment.next_cursor;
            }
            if (patterns.length) {
              const eligiblePatterns = patterns.filter((pattern) => !isTrivialFresquePattern(pattern, safeSegment));
              const backgroundPatterns = patterns.filter((pattern) => isTrivialFresquePattern(pattern, safeSegment));
              state.fresque.background_patterns += backgroundPatterns.length;
              state.fresque.hot_segments.unshift({
                segment_id: safeSegment.segment_id ?? null,
                patterns: patterns.map((pattern) => pattern.kind),
                candidate_patterns: eligiblePatterns.map((pattern) => pattern.kind),
                background_patterns: backgroundPatterns.map((pattern) => pattern.kind),
                observed_at: nowIso(now)
              });
              state.fresque.hot_segments = state.fresque.hot_segments.slice(0, 32);
              for (const pattern of backgroundPatterns) {
                recordObservation("FRESQUE_BACKGROUND_PATTERN", {
                  segment_id: safeSegment.segment_id ?? null,
                  kind: pattern.kind,
                  expression: pattern.expression
                });
              }
              for (const pattern of eligiblePatterns) registerPattern(pattern, safeSegment);
            }
            result = {
              status: "PASS",
              segment_id: safeSegment.segment_id ?? null,
              values_examined: Array.isArray(safeSegment.values) ? safeSegment.values.length : 0,
              patterns
            };
          }
        }
      } else if (quest.type === "FRESQUE_RESCAN") {
        if (typeof readFresqueSegment !== "function") result = { status: "BLOCKED", reason: "NO_FRESQUE_READER" };
        else {
          const original = quest.payload?.segment || {};
          const segment = await readFresqueSegment({
            cursor: original.cursor ?? null,
            segment_id: quest.target,
            size: config.fresqueSegmentSize,
            ant: clone(ant),
            quest: clone(quest)
          });
          const patterns = detectFresquePatterns(segment?.values || []);
          const wanted = quest.payload?.pattern?.expression;
          result = {
            status: patterns.some((pattern) => pattern.expression === wanted) ? "PASS" : "FAIL",
            reproduced: patterns.some((pattern) => pattern.expression === wanted),
            patterns
          };
        }
      } else if (quest.type === "CALCULATE" || quest.type === "CRYSTAL_VERIFY") {
        result = typeof runCalculationQuest === "function"
          ? await runCalculationQuest(clone(quest), context)
          : { status: "BLOCKED", reason: "NO_CALCULATION_ADAPTER" };
      } else if (quest.type === "COUNTER_TEST") {
        result = typeof runCounterTestQuest === "function"
          ? await runCounterTestQuest(clone(quest), context)
          : { status: "BLOCKED", reason: "NO_COUNTER_TEST_ADAPTER" };
      } else if (quest.type === "PROVENANCE") {
        result = typeof runProvenanceQuest === "function"
          ? await runProvenanceQuest(clone(quest), context)
          : { status: "BLOCKED", reason: "NO_PROVENANCE_ADAPTER" };
      } else if (quest.type === "COMPACT_L1") {
        result = typeof runCompactionQuest === "function"
          ? await runCompactionQuest(clone(quest), context)
          : { status: "BLOCKED", reason: "NO_COMPACTION_ADAPTER" };
      } else if (quest.type === "ASTRA_FOLLOWUP") {
        result = { status: "PASS", acknowledged: true };
      }
    } catch (error) {
      result = { status: "ERROR", error: `${error?.name || "Error"}: ${error?.message || error}` };
    }

    const report = reportFromAnt(ant, quest, result);
    quest.status = "DONE";
    quest.finished_at = nowIso(now);
    quest.result_status = report.status;
    ant.state = "RETURNED_TO_QUEEN";
    ant.recycled_at = nowIso(now);
    ant.state = "RECYCLED";
    return report;
  }

  async function observeBrotoculateur() {
    if (typeof readBrotoculateurStatus !== "function") return null;
    const status = await readBrotoculateurStatus();
    const levels = normalizeLevels(status);
    const previous = state.crystal_watch.levels;
    const previousHighest = state.crystal_watch.highest_level;
    const nextHighest = highestObservedLevel(levels);
    const events = [];

    for (const [level, count] of Object.entries(levels)) {
      const before = Number(previous[level] || 0);
      if (count > before) {
        const event = {
          type: level === nextHighest && (previousHighest === null || levelNumber(nextHighest) > levelNumber(previousHighest)) ? "NEW_HIGHEST_LEVEL" : "CRYSTAL_COUNT_INCREASE",
          level,
          delta: count - before,
          count,
          observed_at: nowIso(now)
        };
        events.push(event);
        recordObservation(event.type, event);
      }
    }

    state.crystal_watch.previous_highest_level = previousHighest;
    state.crystal_watch.levels = levels;
    state.crystal_watch.highest_level = nextHighest;
    state.crystal_watch.total_events += events.length;
    state.crystal_watch.newest_events = [...events.reverse(), ...state.crystal_watch.newest_events].slice(0, 50);

    for (const event of events) {
      if (event.type === "NEW_HIGHEST_LEVEL") {
        enqueueQuest({
          type: "CRYSTAL_VERIFY",
          priority: 100,
          target: event.level,
          reason: "VERIFY_NEW_HIGHEST_CRYSTAL_LEVEL",
          payload: clone(event)
        });
      }
    }

    const pressure = storagePressure(status);
    state.storage.pressure_percent = pressure;
    if (
      pressure !== null &&
      pressure >= config.compactionDiskThreshold &&
      Number(levels.L1 || 0) >= config.l1CompactionMinimum
    ) {
      const quest = enqueueQuest({
        type: "COMPACT_L1",
        priority: 95,
        target: "L1",
        reason: "DISK_PRESSURE_LOSSLESS_COMPACTION",
        payload: {
          level: "L1",
          current_count: Number(levels.L1 || 0),
          disk_usage_percent: pressure,
          lossless_only: true,
          delete_originals: false,
          start_after: state.storage.compaction_cursor
        }
      });
      if (quest.status === "QUEUED") state.storage.compaction_quests += 1;
    }

    return status;
  }

  async function dispatch() {
    const active = state.ants.filter((ant) => ["BORN", "WORKING"].includes(ant.state)).length;
    const capacity = Math.max(0, config.maxActiveAnts - active);
    const queued = state.quests
      .filter((quest) => quest.status === "QUEUED")
      .sort((a, b) => b.priority - a.priority || a.created_at.localeCompare(b.created_at))
      .slice(0, Math.min(capacity, config.maxQuestsPerCycle));

    const reports = [];
    for (const quest of queued) {
      const ant = spawnAnt(quest);
      reports.push(await executeQuest(ant, quest));
    }
    return reports;
  }

  async function runCycle() {
    state.queen.cycle += 1;
    state.last_cycle_at = nowIso(now);
    state.last_error = null;

    try {
      await observeBrotoculateur();
      if (typeof readFresqueSegment === "function") {
        enqueueQuest({
          type: "FRESQUE_SCAN",
          priority: 55,
          target: state.fresque.cursor,
          reason: "CONTINUOUS_FRESQUE_INSPECTION",
          payload: { cursor: state.fresque.cursor, size: config.fresqueSegmentSize }
        });
      }
      const reports = await dispatch();
      for (const candidate of state.candidates) reviewCandidate(candidate);
      state.queen.generation += 1;
      return freeze(clone({
        schema: SCHEMA,
        cycle: state.queen.cycle,
        generation: state.queen.generation,
        reports,
        public_state: getPublicState()
      }));
    } catch (error) {
      state.last_error = `${error?.name || "Error"}: ${error?.message || error}`;
      throw error;
    }
  }

  function replyFromAstra(letterId, reply = {}) {
    const letter = state.astra_mailbox.find((item) => item.letter_id === letterId);
    if (!letter) throw new Error("LIVING_COLONY_REJECTED: unknown Astra letter");
    if (letter.status !== "AWAITING_ASTRA_REVIEW") {
      throw new Error("LIVING_COLONY_REJECTED: Astra letter is already resolved");
    }
    const decision = String(reply.decision || "").toUpperCase();
    if (!ASTRA_DECISIONS.has(decision)) {
      throw new Error(`LIVING_COLONY_REJECTED: unsupported Astra decision ${decision}`);
    }

    state.counters.reply += 1;
    const record = {
      reply_id: `ASTRA-REPLY-${pad(state.counters.reply)}`,
      letter_id: letter.letter_id,
      candidate_id: letter.candidate_id,
      from: "ASTRA",
      to: "BRUTUS_QUEEN",
      decision,
      message: String(reply.message ?? ""),
      replied_at: nowIso(now)
    };
    state.astra_replies.push(record);
    letter.status = "REPLIED_BY_ASTRA";
    letter.astra_reply_id = record.reply_id;

    const candidate = candidateById(letter.candidate_id);
    if (candidate) {
      candidate.astra_status = decision;
      if (decision === "APPROVE_FOR_PUBLICATION") candidate.status = "ASTRA_APPROVED_NOT_AUTOMATIC_PROOF";
      if (decision === "ARCHIVE") candidate.status = "ARCHIVED";
      if (decision === "REJECT") candidate.status = "REJECTED_BY_ASTRA";
      if (["RETURN_TO_COLONY", "REQUEST_MORE_TESTS"].includes(decision)) {
        candidate.status = "RETURNED_TO_COLONY";
        candidate.ready_for_astra = false;
        candidate.gates.FRESQUE_REPRODUCED = false;
        candidate.gates.COUNTER_TEST_COMPLETED = false;
        candidate.astra_status = "NOT_SENT";
        enqueueQuest({
          type: "COUNTER_TEST",
          candidate_id: candidate.candidate_id,
          priority: 100,
          reason: "ASTRA_REQUESTED_MORE_TESTS",
          payload: { astra_reply_id: record.reply_id, message: record.message }
        });
        enqueueQuest({
          type: "FRESQUE_RESCAN",
          candidate_id: candidate.candidate_id,
          priority: 90,
          reason: "ASTRA_RETURNED_TO_COLONY",
          payload: {
            pattern: { expression: candidate.expression },
            segment: { segment_id: candidate.segments.at(-1) ?? null }
          }
        });
      }
    }

    recordObservation("ASTRA_REPLY_RECEIVED", record);
    return freeze(clone(record));
  }

  function getPublicState() {
    const liveAnts = state.ants.filter((ant) => ant.state !== "RECYCLED");
    return freeze(clone({
      schema: PUBLIC_SCHEMA,
      generated_at: nowIso(now),
      scope: "READ_ONLY_SANITIZED",
      queen: {
        id: state.queen.id,
        role: state.queen.role,
        generation: state.queen.generation,
        cycle: state.queen.cycle,
        auto_proof_promotion: false,
        astra_authority: state.queen.astra_authority
      },
      colony: {
        total_ants_born: state.ants.length,
        active_ants: liveAnts.length,
        recycled_ants: state.ants.length - liveAnts.length,
        queued_quests: state.quests.filter((quest) => quest.status === "QUEUED").length,
        completed_quests: state.quests.filter((quest) => quest.status === "DONE").length,
        reports: state.reports.length,
        recent_ants: state.ants.slice(-100).map((ant) => ({
          ant_id: ant.ant_id,
          generation: ant.generation,
          specialty: ant.specialty,
          quest_id: ant.quest_id,
          state: ant.state,
          born_at: ant.born_at,
          recycled_at: ant.recycled_at
        })),
        recent_quests: state.quests.slice(-100).map((quest) => ({
          quest_id: quest.quest_id,
          type: quest.type,
          specialty: quest.specialty,
          target: quest.target,
          candidate_id: quest.candidate_id,
          priority: quest.priority,
          reason: quest.reason,
          status: quest.status,
          created_at: quest.created_at,
          finished_at: quest.finished_at,
          ant_id: quest.ant_id,
          result_status: quest.result_status
        })),
        recent_reports: state.reports.slice(-50).map((report) => ({
          report_id: report.report_id,
          quest_id: report.quest_id,
          ant_id: report.ant_id,
          specialty: report.specialty,
          status: report.status,
          returned_at: report.returned_at
        })),
        specialties: Object.fromEntries(
          Object.values(QUEST_SPECIALTY).map((specialty) => [
            specialty,
            state.ants.filter((ant) => ant.specialty === specialty).length
          ])
        )
      },
      crystal_watch: clone(state.crystal_watch),
      fresque: clone(state.fresque),
      storage: clone(state.storage),
      candidates: state.candidates.slice(-20).map((candidate) => ({
        candidate_id: candidate.candidate_id,
        title: candidate.title,
        expression: candidate.expression,
        classification: candidate.classification,
        status: candidate.status,
        evidence_count: candidate.evidence_count,
        gates: clone(candidate.gates),
        ready_for_astra: candidate.ready_for_astra,
        astra_status: candidate.astra_status
      })),
      astra: {
        awaiting_review: state.astra_mailbox.filter((letter) => letter.status === "AWAITING_ASTRA_REVIEW").length,
        letters_sent: state.astra_mailbox.length,
        replies_received: state.astra_replies.length,
        latest_letters: state.astra_mailbox.slice(-10).map((letter) => ({
          letter_id: letter.letter_id,
          candidate_id: letter.candidate_id,
          subject: letter.subject,
          status: letter.status,
          sent_at: letter.sent_at
        }))
      },
      last_cycle_at: state.last_cycle_at,
      last_error: state.last_error
    }));
  }

  function getState() {
    return freeze(clone(state));
  }

  return Object.freeze({
    schema: SCHEMA,
    config,
    runCycle,
    enqueueQuest,
    replyFromAstra,
    getPublicState,
    getState
  });
}

export const BRUTUS_LIVING_COLONY_SCHEMA = SCHEMA;
export const BRUTUS_LIVING_COLONY_PUBLIC_SCHEMA = PUBLIC_SCHEMA;
export const BRUTUS_LIVING_COLONY_QUEST_SPECIALTY = QUEST_SPECIALTY;






