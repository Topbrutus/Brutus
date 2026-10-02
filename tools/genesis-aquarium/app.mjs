import { createGenesis2DAquarium } from "../../src/genesis-2d-aquarium.mjs";

const root = document.querySelector("[data-genesis-root]");
const canvas = root?.querySelector("canvas");
const statusEl = root?.querySelector("[data-status]");
const detailEl = root?.querySelector("[data-detail]");

if (!root || !canvas || !statusEl || !detailEl) {
  throw new Error("GENESIS_AQUARIUM_BOOT_REJECTED: required DOM nodes are missing");
}

const ctx = canvas.getContext("2d", { alpha: false });
if (!ctx) {
  throw new Error("GENESIS_AQUARIUM_BOOT_REJECTED: 2D canvas context unavailable");
}

const aquarium = createGenesis2DAquarium();
const visualPositions = new Map();
const visualPhases = new Map();
const animations = new Map();

let frameHandle = null;
let lastCssWidth = 0;
let lastCssHeight = 0;

const VISUAL_DURATION_MS = 650;

function setStatus(label, detail) {
  statusEl.textContent = label;
  detailEl.textContent = detail;
}

function normalizedToCanvas(x, y) {
  const pad = Math.max(18, Math.min(lastCssWidth, lastCssHeight) * 0.05);
  return {
    x: pad + x * Math.max(1, lastCssWidth - pad * 2),
    y: pad + y * Math.max(1, lastCssHeight - pad * 2)
  };
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, Math.round(rect.width));
  const height = Math.max(260, Math.round(rect.height));
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  if (width === lastCssWidth && height === lastCssHeight) return false;

  lastCssWidth = width;
  lastCssHeight = height;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return true;
}

function drawBackground() {
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, lastCssWidth, lastCssHeight);

  const pad = Math.max(18, Math.min(lastCssWidth, lastCssHeight) * 0.05);
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 7]);
  ctx.strokeRect(pad, pad, lastCssWidth - pad * 2, lastCssHeight - pad * 2);
  ctx.setLineDash([]);

  ctx.fillStyle = "#aaa";
  ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.fillText("GENESIS · READ ONLY", pad + 8, pad + 18);
}

function drawAnt(x, y) {
  ctx.strokeStyle = "#fff";
  ctx.fillStyle = "#fff";
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.arc(x - 7, y, 3, 0, Math.PI * 2);
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.arc(x + 8, y, 5, 0, Math.PI * 2);
  ctx.fill();

  for (const dx of [-2, 4]) {
    ctx.beginPath();
    ctx.moveTo(x + dx, y - 2);
    ctx.lineTo(x + dx - 6, y - 8);
    ctx.moveTo(x + dx, y + 2);
    ctx.lineTo(x + dx - 6, y + 8);
    ctx.stroke();
  }
}

function drawCrystal(x, y, marked = false) {
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = marked ? 2 : 1.4;
  ctx.beginPath();
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x + 7, y);
  ctx.lineTo(x, y + 8);
  ctx.lineTo(x - 7, y);
  ctx.closePath();
  ctx.stroke();

  if (marked) {
    ctx.fillStyle = "#fff";
    ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillText("Z", x + 9, y - 8);
  }
}

function drawPart(x, y, marked = false) {
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = marked ? 2 : 1.2;
  ctx.strokeRect(x - 6, y - 6, 12, 12);
  if (marked) {
    ctx.fillStyle = "#fff";
    ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillText("Z", x + 9, y - 8);
  }
}

function drawObject(entity, x, y) {
  if (entity.TYPE === "ANT") {
    drawAnt(x, y);
    return;
  }
  if (entity.TYPE === "CRYSTAL") {
    drawCrystal(x, y, entity.MARK_STATE === "Z_MARKED");
    return;
  }
  drawPart(x, y, entity.MARK_STATE === "Z_MARKED");
}

function drawWheel(x, y, phaseDeg, pineal = false) {
  const radius = pineal ? 15 : 20;
  const phase = ((phaseDeg ?? 0) * Math.PI) / 180;

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(phase) * radius, y + Math.sin(phase) * radius);
  ctx.stroke();

  if (pineal) {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }
}

function drawMechanism(mechanism, x, y, phase) {
  if (mechanism.TYPE === "WHEEL") {
    drawWheel(x, y, phase, false);
    return;
  }
  if (mechanism.TYPE === "PINEAL") {
    drawWheel(x, y, phase, true);
    return;
  }

  ctx.strokeStyle = "#aaa";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x - 10, y - 10, 20, 20);
  ctx.fillStyle = "#bbb";
  ctx.font = "8px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  const label =
    mechanism.TYPE === "DISTRIBUTOR" ? "D" :
    mechanism.TYPE === "BASIN" ? "B" :
    mechanism.TYPE === "Z_MARKER" ? "Z" : "M";
  ctx.fillText(label, x - 3, y + 3);
}

function currentPosition(entity) {
  const live = visualPositions.get(entity.ID);
  if (live) return live;
  if (entity.PLACED && entity.X !== null && entity.Y !== null) {
    return { x: entity.X, y: entity.Y };
  }
  return null;
}

function currentPhase(mechanism) {
  if (visualPhases.has(mechanism.ID)) return visualPhases.get(mechanism.ID);
  return mechanism.PHASE_DEG;
}

function render() {
  resizeCanvas();
  drawBackground();

  const state = aquarium.snapshot();

  for (const mechanism of state.MECHANISMS) {
    if (!mechanism.PLACED || mechanism.X === null || mechanism.Y === null) continue;
    const point = normalizedToCanvas(mechanism.X, mechanism.Y);
    drawMechanism(mechanism, point.x, point.y, currentPhase(mechanism));
  }

  for (const entity of state.ENTITIES) {
    const pos = currentPosition(entity);
    if (!pos) continue;
    const point = normalizedToCanvas(pos.x, pos.y);
    drawObject(entity, point.x, point.y);
  }

  const unplaced =
    (state.ENTITY_COUNT - state.PLACED_ENTITY_COUNT) +
    (state.MECHANISM_COUNT - state.PLACED_MECHANISM_COUNT);

  if (state.RESYNC_REQUIRED) {
    setStatus(
      "RESYNC REQUIRED",
      "Le renderer refuse de continuer tant qu’un état Brutus autoritaire n’a pas été rechargé."
    );
  } else if (!state.LAYOUT_LOADED) {
    setStatus(
      "WAITING FOR LAYOUT",
      "Aucune coordonnée visuelle n’est inventée. Charge un layout Genesis explicite."
    );
  } else if (state.ENTITY_COUNT === 0 && state.MECHANISM_COUNT === 0) {
    setStatus(
      "WAITING FOR BRUTUS",
      "Le monde est vide parce qu’aucun événement réel n’a encore été reçu."
    );
  } else {
    setStatus(
      "LIVE · READ ONLY",
      "tick " + String(state.LAST_TICK ?? "—") +
      " · offset " + state.LAST_OFFSET +
      " · " + state.ENTITY_COUNT + " entité(s)" +
      " · " + state.MECHANISM_COUNT + " mécanisme(s)" +
      (unplaced > 0 ? " · " + unplaced + " non placé(s)" : "")
    );
  }
}

function stopAnimationLoopIfIdle() {
  if (animations.size === 0 && frameHandle !== null) {
    cancelAnimationFrame(frameHandle);
    frameHandle = null;
  }
}

function animateFrame(now) {
  frameHandle = null;

  for (const [key, animation] of animations) {
    const elapsed = Math.max(0, now - animation.startedAt);
    const t = Math.min(1, elapsed / animation.durationMs);
    const eased = t * t * (3 - 2 * t);

    if (animation.kind === "POSITION") {
      visualPositions.set(animation.id, {
        x: animation.fromX + (animation.toX - animation.fromX) * eased,
        y: animation.fromY + (animation.toY - animation.fromY) * eased
      });
    } else if (animation.kind === "PHASE") {
      visualPhases.set(
        animation.id,
        animation.fromDeg + (animation.toDeg - animation.fromDeg) * eased
      );
    }

    if (t >= 1) {
      animations.delete(key);
      if (animation.kind === "POSITION") {
        visualPositions.delete(animation.id);
      } else if (animation.kind === "PHASE") {
        visualPhases.delete(animation.id);
      }
    }
  }

  render();

  if (animations.size > 0) {
    frameHandle = requestAnimationFrame(animateFrame);
  } else {
    stopAnimationLoopIfIdle();
  }
}

function scheduleTransitions(result) {
  const now = performance.now();

  for (const transition of result.TRANSITIONS) {
    if (!transition.DRAWABLE) continue;

    if (transition.KIND === "POSITION") {
      animations.set("POSITION:" + transition.SUBJECT_ID, {
        kind: "POSITION",
        id: transition.SUBJECT_ID,
        fromX: transition.FROM_X,
        fromY: transition.FROM_Y,
        toX: transition.TO_X,
        toY: transition.TO_Y,
        startedAt: now,
        durationMs: VISUAL_DURATION_MS
      });
    } else if (transition.KIND === "PHASE") {
      animations.set("PHASE:" + transition.SUBJECT_ID, {
        kind: "PHASE",
        id: transition.SUBJECT_ID,
        fromDeg: transition.FROM_DEG,
        toDeg: transition.TO_DEG,
        startedAt: now,
        durationMs: VISUAL_DURATION_MS
      });
    }
  }

  if (animations.size > 0 && frameHandle === null) {
    frameHandle = requestAnimationFrame(animateFrame);
  }
}

function emitState() {
  window.dispatchEvent(
    new CustomEvent("brutus:genesis-state", {
      detail: aquarium.snapshot()
    })
  );
}

function loadLayout(layout) {
  if (frameHandle !== null) {
    cancelAnimationFrame(frameHandle);
    frameHandle = null;
  }
  animations.clear();
  visualPositions.clear();
  visualPhases.clear();

  const state = aquarium.loadLayout(layout);
  render();
  emitState();
  return state;
}

function consumeDelta(delta) {
  try {
    const result = aquarium.applyDelta(delta);
    scheduleTransitions(result);
    render();
    emitState();
    return result;
  } catch (error) {
    render();
    setStatus(
      aquarium.resyncRequired ? "RESYNC REQUIRED" : "INPUT REJECTED",
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

window.addEventListener("brutus:genesis-layout", event => {
  loadLayout(event.detail);
});

window.addEventListener("brutus:genesis-delta", event => {
  consumeDelta(event.detail);
});

window.addEventListener("resize", () => {
  if (resizeCanvas()) render();
});

window.BrutusGenesisAquarium = Object.freeze({
  loadLayout,
  consumeDelta,
  snapshot: () => aquarium.snapshot()
});

resizeCanvas();
render();
