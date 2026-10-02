const SCHEMA = "BRUTUS-GENESIS-2D-AQUARIUM-v0.1";
const LAYOUT_SCHEMA = "BRUTUS-GENESIS-VISUAL-LAYOUT-v0.1";
const DELTA_SCHEMA = "BRUTUS-READ-ONLY-LIVE-EVENT-DELTA-v0.1";

const EVENT_SCHEMAS = new Set([
  "BRUTUS-LIVE-EVENT-v0.1",
  "BRUTUS-REAL-MECHANISM-EVENT-v0.1"
]);

const MECHANISM_TYPES = new Set([
  "WHEEL",
  "PINEAL",
  "Z_MARKER",
  "DISTRIBUTOR",
  "BASIN"
]);

function reject(reason) {
  throw new Error("GENESIS_2D_AQUARIUM_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function assertUnit(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    reject(label + " must be a finite number in [0,1]");
  }
}

function validatePoint(value, label) {
  if (!isPlainObject(value)) reject(label + " must be a plain object");
  const keys = Object.keys(value).sort();
  if (JSON.stringify(keys) !== JSON.stringify(["X", "Y"])) {
    reject(label + " must contain only X and Y");
  }
  assertUnit(value.X, label + ".X");
  assertUnit(value.Y, label + ".Y");
}

export function validateGenesisVisualLayout(input) {
  if (!isPlainObject(input)) reject("layout must be a plain object");

  const keys = Object.keys(input).sort();
  const expected = [
    "MECHANISM_ANCHORS",
    "READ_ONLY",
    "ROUTING_AUTHORITY",
    "SCHEMA",
    "VERSION",
    "WORLD_POSITIONS"
  ].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    reject("layout has unsupported fields");
  }

  if (input.SCHEMA !== LAYOUT_SCHEMA) reject("unsupported layout SCHEMA");
  if (input.VERSION !== "0.1") reject("unsupported layout VERSION");
  if (input.READ_ONLY !== true) reject("layout READ_ONLY must be true");
  if (input.ROUTING_AUTHORITY !== false) reject("layout ROUTING_AUTHORITY must be false");

  if (!isPlainObject(input.WORLD_POSITIONS)) {
    reject("WORLD_POSITIONS must be a plain object");
  }
  if (!isPlainObject(input.MECHANISM_ANCHORS)) {
    reject("MECHANISM_ANCHORS must be a plain object");
  }

  for (const [ref, point] of Object.entries(input.WORLD_POSITIONS)) {
    if (!/^W:[A-Z0-9-]{1,32}$/.test(ref)) {
      reject("invalid WORLD_POSITIONS key " + ref);
    }
    validatePoint(point, "WORLD_POSITIONS." + ref);
  }

  for (const [ref, point] of Object.entries(input.MECHANISM_ANCHORS)) {
    if (!/^(M|Z):[A-Z0-9-]{1,32}$/.test(ref)) {
      reject("invalid MECHANISM_ANCHORS key " + ref);
    }
    validatePoint(point, "MECHANISM_ANCHORS." + ref);
  }

  return deepFreeze(clone(input));
}

function logicalTypeFromRef(ref) {
  if (typeof ref !== "string") return "OBJECT";
  if (ref.startsWith("C:")) return "CRYSTAL";
  if (ref.startsWith("P:")) return "PART";
  if (ref.startsWith("Z:")) return "Z_MARKER";
  if (ref.startsWith("M:")) return "MECHANISM";
  return "OBJECT";
}

function validateDelta(delta) {
  if (!isPlainObject(delta)) reject("delta must be a plain object");
  if (delta.SCHEMA !== DELTA_SCHEMA) reject("unsupported delta SCHEMA");
  if (delta.VERSION !== "0.1") reject("unsupported delta VERSION");
  if (!Number.isSafeInteger(delta.CURSOR_IN) || delta.CURSOR_IN < 0) {
    reject("delta CURSOR_IN must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(delta.CURSOR_OUT) || delta.CURSOR_OUT < delta.CURSOR_IN) {
    reject("delta CURSOR_OUT must be a safe integer >= CURSOR_IN");
  }
  if (!Array.isArray(delta.EVENTS)) reject("delta EVENTS must be an array");
  if (delta.GAP !== false || delta.RESYNC_REQUIRED !== false) {
    reject("delta with GAP/RESYNC_REQUIRED cannot be applied");
  }
}

function validateEntry(entry) {
  if (!isPlainObject(entry)) reject("stream entry must be a plain object");
  if (!Number.isSafeInteger(entry.OFFSET) || entry.OFFSET < 1) {
    reject("entry OFFSET must be a positive safe integer");
  }
  if (!isPlainObject(entry.EVENT)) reject("entry EVENT must be a plain object");
  if (!EVENT_SCHEMAS.has(entry.EVENT.SCHEMA)) {
    reject("unsupported event schema " + String(entry.EVENT.SCHEMA));
  }
  if (!Number.isSafeInteger(entry.EVENT.TICK) || entry.EVENT.TICK < 0) {
    reject("event TICK must be a non-negative safe integer");
  }
}

function entitySnapshot(map) {
  return [...map.values()]
    .map(clone)
    .sort((a, b) => a.ID.localeCompare(b.ID));
}

function mechanismSnapshot(map) {
  return [...map.values()]
    .map(clone)
    .sort((a, b) => a.ID.localeCompare(b.ID));
}

export function createGenesis2DAquarium({ layout = null } = {}) {
  let visualLayout = layout === null ? null : validateGenesisVisualLayout(layout);

  const entities = new Map();
  const mechanisms = new Map();
  let lastOffset = 0;
  let lastTick = null;
  let resyncRequired = false;

  function pointForWorld(ref) {
    if (visualLayout === null) return null;
    return visualLayout.WORLD_POSITIONS[ref] ?? null;
  }

  function pointForMechanism(ref) {
    if (visualLayout === null) return null;
    return visualLayout.MECHANISM_ANCHORS[ref] ?? null;
  }

  function entityAt(id, type, worldRef, tick) {
    const point = pointForWorld(worldRef);
    return {
      ID: id,
      TYPE: type,
      WORLD_REF: worldRef,
      X: point?.X ?? null,
      Y: point?.Y ?? null,
      PLACED: point !== null,
      MARK_STATE: null,
      LAST_TICK: tick
    };
  }

  function updateEntityMove(id, type, from, to, tick, transitions) {
    const existing = entities.get(id) ?? null;

    if (existing !== null && existing.WORLD_REF !== from) {
      resyncRequired = true;
      reject(
        "entity continuity mismatch for " + id +
        ": current=" + existing.WORLD_REF +
        " event.from=" + from +
        " resync_required=true"
      );
    }

    const fromPoint = pointForWorld(from);
    const toPoint = pointForWorld(to);

    entities.set(id, {
      ID: id,
      TYPE: type,
      WORLD_REF: to,
      X: toPoint?.X ?? null,
      Y: toPoint?.Y ?? null,
      PLACED: toPoint !== null,
      MARK_STATE: existing?.MARK_STATE ?? null,
      LAST_TICK: tick
    });

    transitions.push({
      KIND: "POSITION",
      SUBJECT_ID: id,
      SUBJECT_TYPE: type,
      FROM_WORLD: from,
      TO_WORLD: to,
      FROM_X: fromPoint?.X ?? null,
      FROM_Y: fromPoint?.Y ?? null,
      TO_X: toPoint?.X ?? null,
      TO_Y: toPoint?.Y ?? null,
      DRAWABLE: fromPoint !== null && toPoint !== null,
      TICK: tick
    });
  }

  function mechanismAt(id, type, tick) {
    const point = pointForMechanism(id);
    return {
      ID: id,
      TYPE: type,
      X: point?.X ?? null,
      Y: point?.Y ?? null,
      PLACED: point !== null,
      PHASE_DEG: null,
      LAST_TICK: tick
    };
  }

  function applyStartup(event, transitions) {
    const point = pointForWorld(event.POSITION);
    const existing = entities.get(event.ANT_ID) ?? null;

    if (existing !== null && existing.WORLD_REF !== event.POSITION) {
      resyncRequired = true;
      reject("startup position conflicts with existing ant state; resync_required=true");
    }

    entities.set(
      event.ANT_ID,
      entityAt(event.ANT_ID, "ANT", event.POSITION, event.TICK)
    );

    transitions.push({
      KIND: "PRESENCE",
      SUBJECT_ID: event.ANT_ID,
      SUBJECT_TYPE: "ANT",
      WORLD_REF: event.POSITION,
      X: point?.X ?? null,
      Y: point?.Y ?? null,
      DRAWABLE: point !== null,
      TICK: event.TICK
    });
  }

  function applyMechanismEvent(event, transitions) {
    const type = event.EVENT_TYPE;

    if (type === "ANT_MOVE") {
      updateEntityMove(
        event.SUBJECT.ID,
        "ANT",
        event.PAYLOAD.FROM,
        event.PAYLOAD.TO,
        event.TICK,
        transitions
      );
      return;
    }

    if (type === "CRYSTAL_MOVE") {
      updateEntityMove(
        event.SUBJECT.ID,
        "CRYSTAL",
        event.PAYLOAD.FROM,
        event.PAYLOAD.TO,
        event.TICK,
        transitions
      );
      return;
    }

    if (type === "WHEEL_PHASE" || type === "PINEAL_PHASE") {
      const id = event.SUBJECT.ID;
      const mechanismType = event.SUBJECT.TYPE;
      if (!MECHANISM_TYPES.has(mechanismType)) {
        reject("unsupported mechanism subject type " + mechanismType);
      }

      const existing = mechanisms.get(id) ?? mechanismAt(id, mechanismType, event.TICK);
      if (
        existing.PHASE_DEG !== null &&
        existing.PHASE_DEG !== event.PAYLOAD.FROM_DEG
      ) {
        resyncRequired = true;
        reject("mechanism phase continuity mismatch for " + id + "; resync_required=true");
      }

      const point = pointForMechanism(id);
      mechanisms.set(id, {
        ID: id,
        TYPE: mechanismType,
        X: point?.X ?? null,
        Y: point?.Y ?? null,
        PLACED: point !== null,
        PHASE_DEG: event.PAYLOAD.TO_DEG,
        LAST_TICK: event.TICK
      });

      transitions.push({
        KIND: "PHASE",
        SUBJECT_ID: id,
        SUBJECT_TYPE: mechanismType,
        FROM_DEG: event.PAYLOAD.FROM_DEG,
        TO_DEG: event.PAYLOAD.TO_DEG,
        X: point?.X ?? null,
        Y: point?.Y ?? null,
        DRAWABLE: point !== null,
        TICK: event.TICK
      });
      return;
    }

    if (type === "Z_MARK") {
      const id = event.PAYLOAD.OBJECT_REF;
      const existing = entities.get(id) ?? {
        ID: id,
        TYPE: logicalTypeFromRef(id),
        WORLD_REF: null,
        X: null,
        Y: null,
        PLACED: false,
        MARK_STATE: null,
        LAST_TICK: event.TICK
      };

      if (
        existing.MARK_STATE !== null &&
        existing.MARK_STATE !== event.PAYLOAD.FROM_STATE
      ) {
        resyncRequired = true;
        reject("mark state continuity mismatch for " + id + "; resync_required=true");
      }

      entities.set(id, {
        ...existing,
        MARK_STATE: event.PAYLOAD.TO_STATE,
        LAST_TICK: event.TICK
      });

      transitions.push({
        KIND: "MARK",
        SUBJECT_ID: id,
        SUBJECT_TYPE: existing.TYPE,
        FROM_STATE: event.PAYLOAD.FROM_STATE,
        TO_STATE: event.PAYLOAD.TO_STATE,
        DRAWABLE: existing.PLACED,
        TICK: event.TICK
      });
      return;
    }

    if (type === "DISTRIBUTOR_ROUTE" || type === "BASIN_TRANSFER") {
      const id = event.PAYLOAD.OBJECT_REF;
      updateEntityMove(
        id,
        logicalTypeFromRef(id),
        event.PAYLOAD.FROM,
        event.PAYLOAD.TO,
        event.TICK,
        transitions
      );

      const mechanismId = event.SUBJECT.ID;
      const mechanismType = event.SUBJECT.TYPE;
      const existingMechanism = mechanisms.get(mechanismId) ??
        mechanismAt(mechanismId, mechanismType, event.TICK);
      mechanisms.set(mechanismId, {
        ...existingMechanism,
        LAST_TICK: event.TICK
      });
      return;
    }

    reject("unsupported real mechanism event type " + type);
  }

  function applyEvent(event, transitions) {
    if (event.SCHEMA === "BRUTUS-LIVE-EVENT-v0.1") {
      if (event.EVENT_TYPE !== "STARTUP_OBSERVED") {
        reject("unsupported startup/live event type " + event.EVENT_TYPE);
      }
      applyStartup(event, transitions);
      return;
    }

    if (event.SCHEMA === "BRUTUS-REAL-MECHANISM-EVENT-v0.1") {
      applyMechanismEvent(event, transitions);
      return;
    }

    reject("unsupported event schema");
  }

  function applyDelta(delta) {
    validateDelta(delta);

    if (resyncRequired) {
      reject("aquarium is in RESYNC_REQUIRED state");
    }

    if (delta.CURSOR_IN !== lastOffset) {
      resyncRequired = true;
      reject(
        "cursor continuity mismatch: expected " + lastOffset +
        " got " + delta.CURSOR_IN +
        " resync_required=true"
      );
    }

    const transitions = [];
    let expectedOffset = lastOffset + 1;
    let workingTick = lastTick;

    for (const entry of delta.EVENTS) {
      validateEntry(entry);

      if (entry.OFFSET !== expectedOffset) {
        resyncRequired = true;
        reject(
          "entry offset gap: expected " + expectedOffset +
          " got " + entry.OFFSET +
          " resync_required=true"
        );
      }

      if (workingTick !== null && entry.EVENT.TICK < workingTick) {
        resyncRequired = true;
        reject("event tick moved backward inside delta; resync_required=true");
      }

      applyEvent(entry.EVENT, transitions);

      expectedOffset += 1;
      workingTick = entry.EVENT.TICK;
    }

    const expectedCursorOut =
      delta.EVENTS.length === 0 ? delta.CURSOR_IN : expectedOffset - 1;

    if (delta.CURSOR_OUT !== expectedCursorOut) {
      resyncRequired = true;
      reject(
        "delta CURSOR_OUT mismatch: expected " + expectedCursorOut +
        " got " + delta.CURSOR_OUT +
        " resync_required=true"
      );
    }

    lastOffset = delta.CURSOR_OUT;
    lastTick = workingTick;

    return deepFreeze({
      SCHEMA: "BRUTUS-GENESIS-2D-TRANSITIONS-v0.1",
      VERSION: "0.1",
      CURSOR_OUT: lastOffset,
      LAST_TICK: lastTick,
      TRANSITIONS: transitions.map(clone),
      RESYNC_REQUIRED: false
    });
  }

  function loadLayout(nextLayout) {
    visualLayout = validateGenesisVisualLayout(nextLayout);

    for (const [id, entity] of entities) {
      if (entity.WORLD_REF === null) continue;
      const point = pointForWorld(entity.WORLD_REF);
      entities.set(id, {
        ...entity,
        X: point?.X ?? null,
        Y: point?.Y ?? null,
        PLACED: point !== null
      });
    }

    for (const [id, mechanism] of mechanisms) {
      const point = pointForMechanism(id);
      mechanisms.set(id, {
        ...mechanism,
        X: point?.X ?? null,
        Y: point?.Y ?? null,
        PLACED: point !== null
      });
    }

    return snapshot();
  }

  function snapshot() {
    const entityList = entitySnapshot(entities);
    const mechanismList = mechanismSnapshot(mechanisms);

    return deepFreeze({
      SCHEMA,
      VERSION: "0.1",
      LAST_OFFSET: lastOffset,
      LAST_TICK: lastTick,
      LAYOUT_LOADED: visualLayout !== null,
      ENTITY_COUNT: entityList.length,
      PLACED_ENTITY_COUNT: entityList.filter(item => item.PLACED).length,
      MECHANISM_COUNT: mechanismList.length,
      PLACED_MECHANISM_COUNT: mechanismList.filter(item => item.PLACED).length,
      ENTITIES: entityList,
      MECHANISMS: mechanismList,
      RESYNC_REQUIRED: resyncRequired,
      READ_ONLY: true,
      CREATES_BRUTUS_STATE: false,
      LOGICAL_CLOCK_AUTHORITY: "QUEEN_SERVER_V0_2"
    });
  }

  return Object.freeze({
    SCHEMA,
    VERSION: "0.1",
    applyDelta,
    loadLayout,
    snapshot,
    get lastOffset() {
      return lastOffset;
    },
    get lastTick() {
      return lastTick;
    },
    get resyncRequired() {
      return resyncRequired;
    }
  });
}

export const BRUTUS_GENESIS_2D_AQUARIUM_SCHEMA = SCHEMA;
export const BRUTUS_GENESIS_VISUAL_LAYOUT_SCHEMA = LAYOUT_SCHEMA;
