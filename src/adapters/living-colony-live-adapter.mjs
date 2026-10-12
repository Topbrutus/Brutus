import { statfs } from "node:fs/promises";
import { createBrutotableurFresqueFeed } from "../brutotableur-fresque-feed.mjs";
import { createL1JsonCompactionWalker } from "../l1-json-compaction.mjs";
import { detectFresquePatterns } from "../living-colony.mjs";

function loopbackBase(raw, name) {
  const url = new URL(raw);
  if (url.protocol !== "http:") throw new Error(`${name}_REJECTED: http loopback required`);
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname)) {
    throw new Error(`${name}_REJECTED: loopback host required`);
  }
  url.pathname = url.pathname.replace(/\/$/, "");
  return url;
}

async function requestJson(base, pathname, { method = "GET", body = null, timeoutMs = 5000 } = {}) {
  const target = new URL(base.toString());
  target.pathname = `${base.pathname}${pathname}`.replace(/\/+/g, "/");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(target, {
      method,
      headers: body === null ? undefined : { "content-type": "application/json" },
      body: body === null ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`${method} ${target.pathname} -> HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function integerSeeds(segment) {
  const seen = new Set();
  const seeds = [];
  for (const raw of segment?.values || []) {
    const text = String(raw);
    if (!/^-?(0|[1-9][0-9]*)$/.test(text)) continue;
    const value = BigInt(text);
    if (value < -1_000_000_000n || value > 1_000_000_000n) continue;
    const n = Number(value);
    if (seen.has(n)) continue;
    seen.add(n);
    seeds.push(n);
    if (seeds.length >= 8) break;
  }
  return seeds;
}

function levelCount(status, level) {
  const levels = status?.brutomagique?.emitted_by_level ?? status?.levels ?? {};
  return Number(levels?.[level] || 0);
}

async function filesystemUsagePercent(targetPath) {
  const fs = await statfs(targetPath);
  const blocks = Number(fs.blocks || 0);
  const available = Number(fs.bavail ?? fs.bfree ?? 0);
  if (!Number.isFinite(blocks) || blocks <= 0 || !Number.isFinite(available)) return null;
  return Number(((1 - available / blocks) * 100).toFixed(4));
}

export function createLivingColonyLiveAdapters({
  brotoculateurMainUrl = "http://127.0.0.1:8781",
  brotoculateurWorkerUrl = null,
  fresquePath,
  workerSteps = 256,
  l1CrystalDir = null,
  compactionBatchSize = 50,
  compactionMinAgeSeconds = 600
} = {}) {
  const main = loopbackBase(brotoculateurMainUrl, "BROTO_MAIN");
  const worker = brotoculateurWorkerUrl ? loopbackBase(brotoculateurWorkerUrl, "BROTO_WORKER") : null;
  if (worker && worker.origin === main.origin) {
    throw new Error("BROTO_WORKER_REJECTED: worker must be isolated from the main Brotoculateur");
  }
  const fresque = createBrutotableurFresqueFeed(fresquePath);
  const compactionWalker = l1CrystalDir
    ? createL1JsonCompactionWalker({ crystalDir: l1CrystalDir, minAgeSeconds: compactionMinAgeSeconds })
    : null;

  async function readBrotoculateurStatus() {
    const status = await requestJson(main, "/api/status");
    if (!l1CrystalDir) return status;
    try {
      const diskUsage = await filesystemUsagePercent(l1CrystalDir);
      return {
        ...status,
        storage: {
          ...(status.storage || {}),
          disk_usage_percent: diskUsage
        }
      };
    } catch {
      return status;
    }
  }

  async function runCalculationQuest(quest) {
    if (quest.type === "CRYSTAL_VERIFY") {
      const status = await readBrotoculateurStatus();
      const count = levelCount(status, quest.target);
      return count > 0
        ? { status: "PASS", confirmed: true, mode: "MAIN_READ_ONLY_VERIFY", level: quest.target, count, run_id: status.run_id }
        : { status: "FAIL", confirmed: false, mode: "MAIN_READ_ONLY_VERIFY", level: quest.target, count };
    }

    if (!worker) {
      return { status: "BLOCKED", confirmed: false, reason: "DEDICATED_BROTOCULATEUR_WORKER_NOT_CONFIGURED" };
    }

    const sourceSegment = quest.payload?.source_segment;
    const seeds = integerSeeds(sourceSegment);
    if (seeds.length === 0) {
      return { status: "BLOCKED", confirmed: false, reason: "NO_SAFE_INTEGER_SEEDS_IN_FRESQUE_SEGMENT" };
    }

    const reset = await requestJson(worker, "/api/reset", { method: "POST", body: { seeds } });
    const stepped = await requestJson(worker, "/api/step", {
      method: "POST",
      body: { count: Math.max(1, Math.min(Number(workerSteps) || 1, 1000)) },
      timeoutMs: 15000
    });
    const processed = Number(stepped?.processed_packets ?? stepped?.round_processed_packets ?? 0);
    return processed > 0
      ? {
          status: "PASS",
          confirmed: true,
          meaning: "BROTOCULATEUR_QUEST_EXECUTED_NOT_PROOF",
          worker_run_id: stepped?.run_id ?? reset?.run_id ?? null,
          seeds: seeds.map(String),
          processed_packets: processed,
          top_values: stepped?.top_values ?? []
        }
      : {
          status: "BLOCKED",
          confirmed: false,
          reason: "BROTOCULATEUR_WORKER_EXECUTED_NO_PACKETS",
          worker_run_id: stepped?.run_id ?? reset?.run_id ?? null
        };
  }

  async function runCounterTestQuest(quest) {
    const source = quest.payload?.source_segment;
    const pattern = quest.payload?.pattern;
    if (!source?.segment_id || !pattern?.expression) {
      return { status: "BLOCKED", counterexample_found: false, reason: "COUNTER_TEST_MISSING_SOURCE_SEGMENT" };
    }
    const peer = await fresque.findPeer(source);
    if (!peer) return { status: "BLOCKED", counterexample_found: false, reason: "NO_PEER_SEGMENT" };
    const patterns = detectFresquePatterns(peer.values || []);
    const reproduced = patterns.some((item) => item.expression === pattern.expression);
    return reproduced
      ? { status: "PASS", counterexample_found: false, tested_segment: peer.segment_id, reproduced: true, patterns }
      : { status: "FAIL", counterexample_found: true, tested_segment: peer.segment_id, reproduced: false, observed_patterns: patterns };
  }

  async function runProvenanceQuest(quest) {
    const source = quest.payload?.source_segment;
    if (!source?.segment_id) return { status: "BLOCKED", checked: false, reason: "MISSING_FRESQUE_SOURCE" };
    const provenance = await fresque.provenance(source.segment_id);
    if (!provenance.segment_found || !provenance.source_commit) {
      return { status: "FAIL", checked: false, provenance };
    }
    return {
      status: "PASS",
      checked: true,
      provenance,
      external_prior_art_checked: false,
      novelty_claimed: false,
      astra_must_review_external_prior_art: true
    };
  }

  async function runCompactionQuest() {
    if (!compactionWalker) {
      return {
        status: "BLOCKED",
        reason: "L1_CRYSTAL_DIRECTORY_NOT_CONFIGURED",
        lossless_only: true,
        originals_deleted: false
      };
    }
    const result = await compactionWalker.compactNextBatch({
      maxFiles: Math.max(1, Math.min(Number(compactionBatchSize) || 1, 1000))
    });
    return {
      ...result,
      status: "PASS",
      semantic_lossless: true,
      originals_deleted: false
    };
  }

  return Object.freeze({
    readBrotoculateurStatus,
    readFresqueSegment: fresque.readSegment,
    runCalculationQuest,
    runCounterTestQuest,
    runProvenanceQuest,
    runCompactionQuest,
    fresquePublicSummary: fresque.publicSummary
  });
}
