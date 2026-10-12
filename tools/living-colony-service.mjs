#!/usr/bin/env node
import http from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { createPersistentLivingColony, atomicJsonWrite, verifyLivingColonyJournal } from "../src/living-colony-persistence.mjs";
import { createLivingColonyLiveAdapters } from "../src/adapters/living-colony-live-adapter.mjs";

const SERVICE_SCHEMA = "BRUTUS-LIVING-COLONY-SERVICE-v0.1";
const PUBLIC_SCHEMA = "BRUTUS-LIVING-COLONY-SITE-v0.1";

function envInt(name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} must be an integer between ${min} and ${max}`);
  return value;
}

function envPath(name, fallback) {
  return path.resolve(process.env[name] || fallback);
}

function iso() { return new Date().toISOString(); }

async function readJsonBody(req, maxBytes = 64_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("REQUEST_TOO_LARGE");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(res, code, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(body.length),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  res.end(body);
}

function sanitizeError(error) {
  return `${error?.name || "Error"}: ${error?.message || error}`.slice(0, 1000);
}

export async function createLivingColonyService(options = {}) {
  const stateDir = options.stateDir ?? envPath("BRUTUS_COLONY_STATE_DIR", ".brutus-colony");
  const statePath = options.statePath ?? path.join(stateDir, "state.json");
  const journalPath = options.journalPath ?? path.join(stateDir, "journal.jsonl");
  const publicPath = options.publicPath ?? envPath("BRUTUS_COLONY_PUBLIC_PATH", path.join(stateDir, "public-state.json"));
  const fresquePath = options.fresquePath ?? envPath("BRUTUS_COLONY_FRESQUE_PATH", "data/brutotableur-fresque-public.json");
  const mainUrl = options.mainUrl ?? process.env.BRUTUS_COLONY_MAIN_URL ?? "http://127.0.0.1:8781";
  const workerUrl = options.workerUrl ?? process.env.BRUTUS_COLONY_WORKER_URL ?? null;
  const cycleMs = options.cycleMs ?? envInt("BRUTUS_COLONY_CYCLE_MS", 30_000, { min: 1_000, max: 3_600_000 });
  const port = options.port ?? envInt("BRUTUS_COLONY_PORT", 8812, { min: 1024, max: 65535 });
  const host = options.host ?? process.env.BRUTUS_COLONY_HOST ?? "127.0.0.1";
  const workerSteps = options.workerSteps ?? envInt("BRUTUS_COLONY_WORKER_STEPS", 256, { min: 1, max: 1000 });
  const l1CrystalDir = options.l1CrystalDir ?? (process.env.BRUTUS_COLONY_L1_CRYSTAL_DIR ? path.resolve(process.env.BRUTUS_COLONY_L1_CRYSTAL_DIR) : null);
  const compactionBatchSize = options.compactionBatchSize ?? envInt("BRUTUS_COLONY_COMPACTION_BATCH_SIZE", 50, { min: 1, max: 1000 });
  const compactionMinAgeSeconds = options.compactionMinAgeSeconds ?? envInt("BRUTUS_COLONY_COMPACTION_MIN_AGE_SECONDS", 600, { min: 0, max: 31_536_000 });

  if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
    throw new Error("BRUTUS_COLONY_HOST must remain loopback-only");
  }

  await mkdir(stateDir, { recursive: true });
  await mkdir(path.dirname(publicPath), { recursive: true });

  const adapters = options.adapters ?? createLivingColonyLiveAdapters({
    brotoculateurMainUrl: mainUrl,
    brotoculateurWorkerUrl: workerUrl,
    fresquePath,
    workerSteps,
    l1CrystalDir,
    compactionBatchSize,
    compactionMinAgeSeconds
  });

  const colony = await createPersistentLivingColony({
    statePath,
    journalPath,
    colonyOptions: {
      readBrotoculateurStatus: adapters.readBrotoculateurStatus,
      readFresqueSegment: adapters.readFresqueSegment,
      runCalculationQuest: adapters.runCalculationQuest,
      runCounterTestQuest: adapters.runCounterTestQuest,
      runProvenanceQuest: adapters.runProvenanceQuest,
      runCompactionQuest: adapters.runCompactionQuest,
      limits: {
        maxActiveAnts: envInt("BRUTUS_COLONY_MAX_ACTIVE_ANTS", 24, { min: 1, max: 256 }),
        maxQuestsPerCycle: envInt("BRUTUS_COLONY_MAX_QUESTS_PER_CYCLE", 12, { min: 1, max: 256 }),
        fresqueSegmentSize: envInt("BRUTUS_COLONY_FRESQUE_SEGMENT_SIZE", 256, { min: 4, max: 4096 }),
        compactionDiskThreshold: envInt("BRUTUS_COLONY_COMPACTION_DISK_THRESHOLD", 70, { min: 1, max: 100 }),
        l1CompactionMinimum: envInt("BRUTUS_COLONY_L1_COMPACTION_MINIMUM", 100000, { min: 1, max: 1_000_000_000 })
      }
    }
  });

  const runtime = {
    schema: SERVICE_SCHEMA,
    started_at: iso(),
    status: "STARTING",
    cycle_ms: cycleMs,
    main_brotoculateur: mainUrl,
    worker_configured: Boolean(workerUrl),
    last_cycle_started_at: null,
    last_cycle_finished_at: null,
    last_cycle_error: null,
    cycles_completed: 0,
    public_writes: 0
  };

  let runningCycle = false;
  let timer = null;
  let server = null;
  let stopping = false;

  async function buildPublicPayload() {
    const fresque = await adapters.fresquePublicSummary();
    return {
      schema: PUBLIC_SCHEMA,
      generated_at: iso(),
      public_scope: "READ_ONLY_SANITIZED",
      service: {
        status: runtime.status,
        started_at: runtime.started_at,
        cycle_ms: runtime.cycle_ms,
        worker_configured: runtime.worker_configured,
        last_cycle_finished_at: runtime.last_cycle_finished_at,
        last_cycle_error: runtime.last_cycle_error,
        cycles_completed: runtime.cycles_completed
      },
      colony: colony.getPublicState(),
      fresque
    };
  }

  async function publish() {
    const payload = await buildPublicPayload();
    await atomicJsonWrite(publicPath, payload);
    runtime.public_writes += 1;
    return payload;
  }

  async function cycle() {
    if (runningCycle || stopping) return { skipped: true, reason: runningCycle ? "CYCLE_ALREADY_RUNNING" : "STOPPING" };
    runningCycle = true;
    runtime.status = "RUNNING";
    runtime.last_cycle_started_at = iso();
    runtime.last_cycle_error = null;
    try {
      const result = await colony.runCycle();
      runtime.cycles_completed += 1;
      runtime.last_cycle_finished_at = iso();
      await publish();
      return result;
    } catch (error) {
      runtime.status = "DEGRADED";
      runtime.last_cycle_error = sanitizeError(error);
      runtime.last_cycle_finished_at = iso();
      try { await publish(); } catch {}
      throw error;
    } finally {
      runningCycle = false;
    }
  }

  async function handler(req, res) {
    const requestUrl = new URL(req.url || "/", `http://${host}:${port}`);
    try {
      if (req.method === "GET" && requestUrl.pathname === "/health") {
        const journal = await verifyLivingColonyJournal(journalPath);
        sendJson(res, 200, {
          schema: SERVICE_SCHEMA,
          status: runtime.status,
          running_cycle: runningCycle,
          cycles_completed: runtime.cycles_completed,
          last_cycle_finished_at: runtime.last_cycle_finished_at,
          last_cycle_error: runtime.last_cycle_error,
          journal
        });
        return;
      }
      if (req.method === "GET" && requestUrl.pathname === "/api/public") {
        sendJson(res, 200, await buildPublicPayload());
        return;
      }
      if (req.method === "GET" && requestUrl.pathname === "/api/state") {
        sendJson(res, 200, { schema: SERVICE_SCHEMA, runtime: { ...runtime }, colony: colony.getState() });
        return;
      }
      if (req.method === "GET" && requestUrl.pathname === "/api/astra/mailbox") {
        const state = colony.getState();
        sendJson(res, 200, {
          schema: "BRUTUS-ASTRA-MAILBOX-v0.1",
          letters: state.astra_mailbox,
          replies: state.astra_replies
        });
        return;
      }
      if (req.method === "POST" && requestUrl.pathname === "/api/astra/reply") {
        const body = await readJsonBody(req);
        if (!body.letter_id || !body.decision) {
          sendJson(res, 400, { error: "letter_id and decision are required" });
          return;
        }
        const reply = await colony.replyFromAstra(body.letter_id, {
          decision: body.decision,
          message: body.message ?? ""
        });
        await publish();
        sendJson(res, 200, { accepted: true, reply });
        return;
      }
      sendJson(res, 404, { error: "not found" });
    } catch (error) {
      sendJson(res, 400, { error: sanitizeError(error) });
    }
  }

  async function start({ withHttp = true, immediateCycle = true } = {}) {
    if (withHttp) {
      server = http.createServer(handler);
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, resolve);
      });
    }
    runtime.status = "RUNNING";
    await publish();
    if (immediateCycle) await cycle();
    timer = setInterval(() => cycle().catch(() => {}), cycleMs);
    timer.unref?.();
    return { host, port, publicPath, statePath, journalPath };
  }

  async function stop() {
    if (stopping) return;
    stopping = true;
    runtime.status = "STOPPING";
    if (timer) clearInterval(timer);
    while (runningCycle) await new Promise((resolve) => setTimeout(resolve, 20));
    await colony.checkpointNow("SERVICE_STOP");
    runtime.status = "STOPPED";
    await publish();
    if (server) await new Promise((resolve) => server.close(resolve));
  }

  return Object.freeze({ start, stop, cycle, publish, handler, colony, runtime, config: { host, port, cycleMs, publicPath, statePath, journalPath, fresquePath, mainUrl, workerUrl } });
}

async function main() {
  const once = process.argv.includes("--once");
  const noHttp = process.argv.includes("--no-http") || once;
  const service = await createLivingColonyService();
  await service.start({ withHttp: !noHttp, immediateCycle: true });
  if (once) {
    await service.stop();
    process.stdout.write(`${JSON.stringify({ status: "PASS", publicPath: service.config.publicPath, statePath: service.config.statePath })}\n`);
    return;
  }

  const shutdown = async (signal) => {
    try {
      process.stderr.write(`BRUTUS_COLONY_SHUTDOWN ${signal}\n`);
      await service.stop();
      process.exit(0);
    } catch (error) {
      process.stderr.write(`${sanitizeError(error)}\n`);
      process.exit(1);
    }
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.stdout.write(`${JSON.stringify({ schema: SERVICE_SCHEMA, status: "RUNNING", host: service.config.host, port: service.config.port })}\n`);
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}` || process.argv[1]?.endsWith("living-colony-service.mjs")) {
  main().catch((error) => {
    process.stderr.write(`${sanitizeError(error)}\n`);
    process.exit(1);
  });
}

export { SERVICE_SCHEMA, PUBLIC_SCHEMA };
