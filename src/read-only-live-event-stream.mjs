import { validateFourminizerLiveEvent } from "./fourminizer-live-event.mjs";
import { validateRealMechanismEvent } from "./real-mechanism-event.mjs";

const STREAM_SCHEMA = "BRUTUS-READ-ONLY-LIVE-EVENT-STREAM-v0.1";
const VERSION = "0.1";
const DEFAULT_CAPACITY = 256;
const MAX_CAPACITY = 4096;

const SUPPORTED_SCHEMAS = new Set([
  "BRUTUS-LIVE-EVENT-v0.1",
  "BRUTUS-REAL-MECHANISM-EVENT-v0.1"
]);

function reject(reason) {
  throw new Error("READ_ONLY_LIVE_EVENT_STREAM_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validateEvent(input) {
  if (!isPlainObject(input)) reject("event must be a plain object");
  if (!SUPPORTED_SCHEMAS.has(input.SCHEMA)) {
    reject("unsupported event SCHEMA " + String(input.SCHEMA));
  }

  if (input.SCHEMA === "BRUTUS-LIVE-EVENT-v0.1") {
    return validateFourminizerLiveEvent(input);
  }

  return validateRealMechanismEvent(input);
}

function eventId(event) {
  if (typeof event.EVENT_ID !== "string" || event.EVENT_ID.length === 0) {
    reject("event EVENT_ID is required");
  }
  return event.EVENT_ID;
}

function eventTick(event) {
  if (!Number.isSafeInteger(event.TICK) || event.TICK < 0) {
    reject("event TICK must be a non-negative safe integer");
  }
  return event.TICK;
}

export function createReadOnlyLiveEventStream({
  capacity = DEFAULT_CAPACITY
} = {}) {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > MAX_CAPACITY) {
    reject("capacity must be an integer from 1 to " + MAX_CAPACITY);
  }

  const buffer = [];
  let nextOffset = 1;
  let lastTick = null;
  let droppedCount = 0;
  let currentTick = null;
  let currentTickIds = new Set();

  function append(input) {
    const event = validateEvent(input);
    const tick = eventTick(event);
    const id = eventId(event);

    if (lastTick !== null && tick < lastTick) {
      reject("backward time: event tick " + tick + " < last tick " + lastTick);
    }

    if (currentTick === null || tick > currentTick) {
      currentTick = tick;
      currentTickIds = new Set();
    }

    if (currentTickIds.has(id)) {
      reject("duplicate EVENT_ID at tick " + tick + ": " + id);
    }

    if (currentTickIds.size >= capacity) {
      reject("per-tick event limit reached for bounded v0.1 stream");
    }

    const entry = deepFreeze({
      OFFSET: nextOffset,
      EVENT: clone(event)
    });

    nextOffset += 1;
    lastTick = tick;
    currentTickIds.add(id);
    buffer.push(entry);

    if (buffer.length > capacity) {
      buffer.shift();
      droppedCount += 1;
    }

    return entry;
  }

  function snapshot() {
    const firstOffset = buffer.length === 0 ? null : buffer[0].OFFSET;
    const lastOffset = buffer.length === 0 ? null : buffer[buffer.length - 1].OFFSET;

    return deepFreeze({
      SCHEMA: STREAM_SCHEMA,
      VERSION,
      CAPACITY: capacity,
      SIZE: buffer.length,
      FIRST_OFFSET: firstOffset,
      LAST_OFFSET: lastOffset,
      LAST_TICK: lastTick,
      DROPPED_COUNT: droppedCount,
      EVENTS: buffer.map(entry => clone(entry)),
      READ_ONLY: true,
      CREATES_EVENTS: false,
      LOGICAL_CLOCK_AUTHORITY: "QUEEN_SERVER_V0_2"
    });
  }

  function readAfter(offset) {
    if (!Number.isSafeInteger(offset) || offset < 0) {
      reject("cursor offset must be a non-negative safe integer");
    }

    const lastOffset = nextOffset - 1;
    if (offset > lastOffset) {
      reject("cursor offset is ahead of stream");
    }

    if (buffer.length === 0) {
      return deepFreeze({
        SCHEMA: "BRUTUS-READ-ONLY-LIVE-EVENT-DELTA-v0.1",
        VERSION,
        CURSOR_IN: offset,
        CURSOR_OUT: offset,
        EVENTS: [],
        GAP: false,
        RESYNC_REQUIRED: false
      });
    }

    const firstAvailable = buffer[0].OFFSET;
    if (offset < firstAvailable - 1) {
      reject(
        "STREAM_CURSOR_GAP: cursor=" + offset +
        " first_available=" + firstAvailable +
        " resync_required=true"
      );
    }

    const events = buffer
      .filter(entry => entry.OFFSET > offset)
      .map(entry => clone(entry));

    return deepFreeze({
      SCHEMA: "BRUTUS-READ-ONLY-LIVE-EVENT-DELTA-v0.1",
      VERSION,
      CURSOR_IN: offset,
      CURSOR_OUT: events.length === 0 ? offset : events[events.length - 1].OFFSET,
      EVENTS: events,
      GAP: false,
      RESYNC_REQUIRED: false
    });
  }

  return Object.freeze({
    SCHEMA: STREAM_SCHEMA,
    VERSION,
    CAPACITY: capacity,
    append,
    snapshot,
    readAfter,
    get size() {
      return buffer.length;
    },
    get lastTick() {
      return lastTick;
    },
    get lastOffset() {
      return nextOffset - 1;
    },
    get droppedCount() {
      return droppedCount;
    }
  });
}

export const BRUTUS_READ_ONLY_LIVE_EVENT_STREAM_SCHEMA = STREAM_SCHEMA;
export const BRUTUS_READ_ONLY_LIVE_EVENT_STREAM_DEFAULT_CAPACITY = DEFAULT_CAPACITY;
export const BRUTUS_READ_ONLY_LIVE_EVENT_STREAM_MAX_CAPACITY = MAX_CAPACITY;
export const BRUTUS_READ_ONLY_LIVE_EVENT_STREAM_SUPPORTED_SCHEMAS =
  Object.freeze([...SUPPORTED_SCHEMAS]);
