import { readFile, stat } from "node:fs/promises";

const SCHEMA = "BRUTOTABLEUR-FRESQUE-COLONY-FEED-v0.1";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createBrutotableurFresqueFeed(filePath) {
  if (!filePath) throw new Error("FRESQUE_FEED_REJECTED: filePath is required");
  let cache = null;
  let cacheMtime = -1;

  async function load() {
    const info = await stat(filePath);
    if (cache && info.mtimeMs === cacheMtime) return cache;
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    if (parsed?.schema !== SCHEMA || !Array.isArray(parsed.segments) || parsed.segments.length === 0) {
      throw new Error("FRESQUE_FEED_REJECTED: invalid sanitized feed");
    }
    cache = parsed;
    cacheMtime = info.mtimeMs;
    return cache;
  }

  async function readSegment({ cursor = null, segment_id = null } = {}) {
    const feed = await load();
    const wanted = segment_id ?? cursor;
    let index = wanted === null ? 0 : feed.segments.findIndex((segment) => segment.segment_id === wanted);
    if (index < 0) index = 0;
    const segment = feed.segments[index];
    const next = feed.segments[(index + 1) % feed.segments.length];
    return clone({
      ...segment,
      cursor: segment.segment_id,
      next_cursor: next.segment_id,
      source_repository: feed.source_repository,
      source_commit: feed.source_commit,
      feed_mode: feed.mode
    });
  }

  async function findPeer(sourceSegment = {}) {
    const feed = await load();
    const sourceIndex = feed.segments.findIndex((segment) => segment.segment_id === sourceSegment.segment_id);
    const matches = feed.segments.filter((segment) => {
      if (segment.segment_id === sourceSegment.segment_id) return false;
      if (sourceSegment.kind && segment.kind !== sourceSegment.kind) return false;
      if (sourceSegment.kind === "VIRTUAL_TABLE_7X7") {
        return segment.operator === sourceSegment.operator && segment.anchor === sourceSegment.anchor;
      }
      if (sourceSegment.kind === "CANONICAL_LINEAGE") {
        return segment.category === sourceSegment.category;
      }
      return true;
    });
    if (matches.length === 0) return null;
    const pick = sourceIndex < 0 ? 0 : sourceIndex % matches.length;
    return clone(matches[pick]);
  }

  async function provenance(segmentId) {
    const feed = await load();
    const segment = feed.segments.find((item) => item.segment_id === segmentId);
    return clone({
      schema: feed.schema,
      source_repository: feed.source_repository,
      source_commit: feed.source_commit,
      generated_at: feed.generated_at,
      segment_found: Boolean(segment),
      deterministic_engine: feed.deterministic_engine === true,
      mode: feed.mode,
      stats: feed.stats
    });
  }

  async function publicSummary() {
    const feed = await load();
    return clone({
      schema: feed.schema,
      mode: feed.mode,
      generated_at: feed.generated_at,
      source_repository: feed.source_repository,
      source_commit: feed.source_commit,
      deterministic_engine: feed.deterministic_engine,
      table: feed.table,
      stats: feed.stats,
      discoveries: feed.discoveries
    });
  }

  return Object.freeze({ readSegment, findPeer, provenance, publicSummary });
}

export const BRUTOTABLEUR_FRESQUE_FEED_SCHEMA = SCHEMA;
