import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createLivingColonyLiveAdapters } from "../src/adapters/living-colony-live-adapter.mjs";

async function listen(handler) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()))
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

function json(res, value) {
  const body = JSON.stringify(value);
  res.writeHead(200, { "content-type": "application/json", "content-length": Buffer.byteLength(body) });
  res.end(body);
}

async function makeFeed(dir) {
  const file = path.join(dir, "fresque.json");
  const feed = {
    schema: "BRUTOTABLEUR-FRESQUE-COLONY-FEED-v0.1",
    mode: "SANITIZED_DETERMINISTIC_BOUNDED_WINDOW",
    generated_at: "2026-10-12T02:00:00Z",
    source_repository: "Topbrutus/Brutotableur",
    source_commit: "abc123",
    deterministic_engine: true,
    table: { base: 7, depth: 1183, page_size: 49 },
    stats: { segments: 3 },
    discoveries: [],
    segments: [
      { segment_id: "TABLE:ADD:7:0", kind: "VIRTUAL_TABLE_7X7", operator: "ADD", anchor: "7", values: ["7","8","9","10","11","12"] },
      { segment_id: "TABLE:ADD:7:49", kind: "VIRTUAL_TABLE_7X7", operator: "ADD", anchor: "7", values: ["56","57","58","59","60","61"] },
      { segment_id: "TABLE:MUL:7:0", kind: "VIRTUAL_TABLE_7X7", operator: "MUL", anchor: "7", values: ["0","7","14","21","28","35"] }
    ]
  };
  await writeFile(file, JSON.stringify(feed), "utf8");
  return file;
}

test("live adapter uses isolated Brotoculateur worker and never resets main", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "brutus-live-adapter-"));
  const calls = { main: [], worker: [] };
  const main = await listen(async (req, res) => {
    calls.main.push(`${req.method} ${req.url}`);
    json(res, { run_id: "main-1", state: "RUNNING", brutomagique: { emitted_by_level: { L1: 100, L4: 4, L5: 1 } } });
  });
  const worker = await listen(async (req, res) => {
    const body = await readBody(req);
    calls.worker.push({ method: req.method, url: req.url, body });
    if (req.url === "/api/reset") return json(res, { run_id: "worker-reset" });
    if (req.url === "/api/step") return json(res, { run_id: "worker-1", processed_packets: 256, top_values: [] });
    json(res, { error: "unknown" });
  });

  try {
    const fresquePath = await makeFeed(dir);
    const adapters = createLivingColonyLiveAdapters({
      brotoculateurMainUrl: main.url,
      brotoculateurWorkerUrl: worker.url,
      fresquePath,
      workerSteps: 256
    });

    const crystal = await adapters.runCalculationQuest({ type: "CRYSTAL_VERIFY", target: "L5", payload: {} });
    assert.equal(crystal.status, "PASS");
    assert.equal(crystal.count, 1);

    const calculation = await adapters.runCalculationQuest({
      type: "CALCULATE",
      payload: { source_segment: { values: ["7","8","9","10","11","12"] } }
    });
    assert.equal(calculation.status, "PASS");
    assert.equal(calculation.meaning, "BROTOCULATEUR_QUEST_EXECUTED_NOT_PROOF");
    assert.equal(calls.main.some((call) => call.includes("POST")), false);
    assert.deepEqual(calls.worker.map((call) => call.url), ["/api/reset", "/api/step"]);
    assert.deepEqual(calls.worker[0].body.seeds, [7,8,9,10,11,12]);
  } finally {
    await main.close();
    await worker.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("counter-test checks a separate Fresque peer segment and provenance stays non-novelty", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "brutus-fresque-adapter-"));
  const main = await listen((req, res) => json(res, { brutomagique: { emitted_by_level: { L1: 1 } } }));
  try {
    const fresquePath = await makeFeed(dir);
    const adapters = createLivingColonyLiveAdapters({ brotoculateurMainUrl: main.url, fresquePath });
    const source = await adapters.readFresqueSegment({ segment_id: "TABLE:ADD:7:0" });
    const counter = await adapters.runCounterTestQuest({
      payload: { source_segment: source, pattern: { expression: "D1(a[n])=1" } }
    });
    assert.equal(counter.status, "PASS");
    assert.equal(counter.counterexample_found, false);
    assert.equal(counter.tested_segment, "TABLE:ADD:7:49");

    const provenance = await adapters.runProvenanceQuest({ payload: { source_segment: source } });
    assert.equal(provenance.status, "PASS");
    assert.equal(provenance.checked, true);
    assert.equal(provenance.external_prior_art_checked, false);
    assert.equal(provenance.novelty_claimed, false);
    assert.equal(provenance.astra_must_review_external_prior_art, true);
  } finally {
    await main.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("worker URL cannot be the main Brotoculateur", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "brutus-isolation-"));
  try {
    const fresquePath = await makeFeed(dir);
    assert.throws(
      () => createLivingColonyLiveAdapters({ brotoculateurMainUrl: "http://127.0.0.1:8781", brotoculateurWorkerUrl: "http://127.0.0.1:8781", fresquePath }),
      /worker must be isolated/
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});


test("main status includes measured filesystem pressure when L1 directory is configured", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "brutus-disk-pressure-"));
  const main = await listen((req, res) => json(res, { state: "RUNNING", brutomagique: { emitted_by_level: { L1: 1 } } }));
  try {
    const fresquePath = await makeFeed(dir);
    const adapters = createLivingColonyLiveAdapters({
      brotoculateurMainUrl: main.url,
      fresquePath,
      l1CrystalDir: dir
    });
    const status = await adapters.readBrotoculateurStatus();
    assert.equal(status.state, "RUNNING");
    assert.equal(typeof status.storage?.disk_usage_percent, "number");
    assert.ok(status.storage.disk_usage_percent >= 0 && status.storage.disk_usage_percent <= 100);
  } finally {
    await main.close();
    await rm(dir, { recursive: true, force: true });
  }
});
