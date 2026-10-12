import { createHash } from "node:crypto";
import { mkdir, readFile, rename, appendFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createLivingColony } from "./living-colony.mjs";

const JOURNAL_SCHEMA = "BRUTUS-LIVING-COLONY-JOURNAL-v0.1";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function sha(value) {
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function atomicJsonWrite(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tmp, `${JSON.stringify(value)}\n`, "utf8");
  await rename(tmp, filePath);
}

async function lastJournalHash(journalPath) {
  try {
    const text = await readFile(journalPath, "utf8");
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (!lines.length) return null;
    const last = JSON.parse(lines.at(-1));
    return typeof last.entry_hash === "string" ? last.entry_hash : null;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export async function createPersistentLivingColony({
  statePath,
  journalPath,
  colonyOptions = {},
  now = () => new Date()
} = {}) {
  if (!statePath || !journalPath) {
    throw new Error("LIVING_COLONY_PERSISTENCE_REJECTED: statePath and journalPath are required");
  }

  const initialState = await readJsonIfExists(statePath);
  const colony = createLivingColony({ ...colonyOptions, initialState, now });
  let previousHash = await lastJournalHash(journalPath);

  async function journal(eventType, payload) {
    await mkdir(path.dirname(journalPath), { recursive: true });
    const entry = {
      schema: JOURNAL_SCHEMA,
      event_type: eventType,
      recorded_at: now().toISOString(),
      previous_hash: previousHash,
      payload
    };
    entry.entry_hash = sha(entry);
    await appendFile(journalPath, `${JSON.stringify(entry)}\n`, "utf8");
    previousHash = entry.entry_hash;
    return entry;
  }

  async function checkpoint(eventType, payload = {}) {
    const state = colony.getState();
    await atomicJsonWrite(statePath, state);
    return journal(eventType, {
      ...payload,
      queen_cycle: state.queen.cycle,
      queen_generation: state.queen.generation,
      state_hash: sha(state)
    });
  }

  async function runCycle() {
    const result = await colony.runCycle();
    await checkpoint("CYCLE_COMMITTED", {
      report_count: result.reports.length,
      public_hash: sha(result.public_state)
    });
    return result;
  }

  async function replyFromAstra(letterId, reply) {
    const record = colony.replyFromAstra(letterId, reply);
    await checkpoint("ASTRA_REPLY_COMMITTED", {
      reply_id: record.reply_id,
      letter_id: record.letter_id,
      decision: record.decision
    });
    return record;
  }

  async function checkpointNow(reason = "MANUAL_CHECKPOINT") {
    return checkpoint(reason, {});
  }

  return Object.freeze({
    runCycle,
    replyFromAstra,
    checkpointNow,
    getState: colony.getState,
    getPublicState: colony.getPublicState,
    enqueueQuest: colony.enqueueQuest,
    statePath,
    journalPath
  });
}

export async function verifyLivingColonyJournal(journalPath) {
  let text;
  try {
    text = await readFile(journalPath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return { valid: true, entries: 0, last_hash: null };
    throw error;
  }

  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  let previous = null;
  for (let index = 0; index < lines.length; index += 1) {
    const entry = JSON.parse(lines[index]);
    if (entry.schema !== JOURNAL_SCHEMA) {
      return { valid: false, entries: index, reason: "SCHEMA_MISMATCH", last_hash: previous };
    }
    if (entry.previous_hash !== previous) {
      return { valid: false, entries: index, reason: "CHAIN_MISMATCH", last_hash: previous };
    }
    const expected = sha(Object.fromEntries(Object.entries(entry).filter(([key]) => key !== "entry_hash")));
    if (entry.entry_hash !== expected) {
      return { valid: false, entries: index, reason: "HASH_MISMATCH", last_hash: previous };
    }
    previous = entry.entry_hash;
  }
  return { valid: true, entries: lines.length, last_hash: previous };
}

export { atomicJsonWrite };
