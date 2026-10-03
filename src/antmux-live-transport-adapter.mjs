import { sha256HexUtf8 } from "./sha256-utf8.mjs";
import { validateFourmiMathMaterial } from "./fourmi-math-material-admission.mjs";
import {
  computeLiveFourmiTransportStateH256,
  validateLiveFourmiTransportState
} from "./one-step-live-transport-runtime.mjs";

const SOURCE_SCHEMA = "ANTMUX-LIVE-FOURMI-TRANSPORT-v0.1";
const QUEEN_SOURCE = "QUEEN_SERVER_V0_2";
const SIGNATURE_METHOD = "BRUTUS-CANONICAL-JSON-SHA256-v0.1";

function reject(reason) {
  throw new Error("ANTMUX_LIVE_TRANSPORT_ADAPTER_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

function h256(value) {
  return sha256HexUtf8(JSON.stringify(canonicalize(value)));
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

function assertExactKeys(value, keys, label) {
  if (!isPlainObject(value)) reject(label + " must be a plain object");
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    reject(label + " has unsupported fields");
  }
}

function assertSha256(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) {
    reject(label + " must be SHA-256 hex");
  }
}

function assertWorldRef(value, label) {
  if (typeof value !== "string" || !/^W:[A-Z0-9-]{1,32}$/.test(value)) {
    reject(label + " must be a W: reference");
  }
}

function assertAntId(value, label = "ANT_ID") {
  if (typeof value !== "string" || !/^ANT-[0-9A-F]{12}$/.test(value)) {
    reject(label + " invalid");
  }
}

function assertMaterialId(value, label = "MATERIAL_ID") {
  if (typeof value !== "string" || !/^MAT-MATH-[A-F0-9]{24}$/.test(value)) {
    reject(label + " invalid");
  }
}

function assertUtc(value, label) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    reject(label + " must be a valid date-time");
  }
}

function normalizedBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    reject("baseUrl must be a valid URL");
  }

  const loopback =
    url.protocol === "http:" &&
    (url.hostname === "127.0.0.1" || url.hostname === "localhost");

  if (url.protocol !== "https:" && !loopback) {
    reject("baseUrl must use HTTPS except loopback HTTP");
  }
  if (url.username || url.password) reject("baseUrl credentials are forbidden");
  if (url.search || url.hash) reject("baseUrl query/hash are forbidden");

  return url.toString().replace(/\/$/, "");
}

function validateToken(value) {
  if (
    typeof value !== "string" ||
    value.length < 16 ||
    value.length > 1024 ||
    /[\r\n]/.test(value)
  ) {
    reject("transport token invalid");
  }
  return value;
}

function normalizeServerTransportState(body, expectedMaterial = null, expectedAntId = null) {
  assertExactKeys(
    body,
    [
      "schema",
      "authority",
      "source_endpoint",
      "observed_at_utc",
      "tick",
      "queen",
      "ant_id",
      "position",
      "material",
      "attached_tick",
      "updated_tick",
      "last_move_tick",
      "last_command_id",
      "last_authorization_id",
      "state_version",
      "state_h256",
      "integrity_match"
    ],
    "server transport state"
  );

  if (body.schema !== SOURCE_SCHEMA) reject("unexpected transport source schema");
  if (body.authority !== QUEEN_SOURCE) reject("unexpected transport authority");
  if (body.source_endpoint !== "/api/live-transport/state") {
    reject("unexpected transport source endpoint");
  }
  assertUtc(body.observed_at_utc, "observed_at_utc");
  if (!Number.isSafeInteger(body.tick) || body.tick < 0) reject("invalid transport tick");
  if (body.integrity_match !== true) reject("transport integrity_match must be true");
  assertSha256(body.state_h256, "state_h256");

  assertExactKeys(
    body.queen,
    [
      "entity_id",
      "tick_count",
      "generation",
      "queen_mode",
      "integrity_match",
      "reference_h256"
    ],
    "queen"
  );
  if (typeof body.queen.entity_id !== "string" || !body.queen.entity_id) {
    reject("queen.entity_id missing");
  }
  if (!Number.isSafeInteger(body.queen.tick_count) || body.queen.tick_count < 0) {
    reject("queen.tick_count invalid");
  }
  if (body.queen.tick_count !== body.tick) reject("transport/Queen tick mismatch");
  if (!Number.isSafeInteger(body.queen.generation) || body.queen.generation < 0) {
    reject("queen.generation invalid");
  }
  if (typeof body.queen.queen_mode !== "string" || !body.queen.queen_mode) {
    reject("queen.queen_mode missing");
  }
  if (body.queen.integrity_match !== true) reject("queen integrity mismatch");
  assertSha256(body.queen.reference_h256, "queen.reference_h256");

  assertAntId(body.ant_id, "server ant_id");
  assertWorldRef(body.position, "server position");

  assertExactKeys(
    body.material,
    ["material_id", "material_h256", "binding_state"],
    "server material"
  );
  assertMaterialId(body.material.material_id, "server material_id");
  assertSha256(body.material.material_h256, "server material_h256");
  if (body.material.binding_state !== "ATTACHED") {
    reject("server material must be ATTACHED");
  }
  if (!Number.isSafeInteger(body.state_version) || body.state_version < 1) {
    reject("state_version invalid");
  }

  for (const key of ["attached_tick", "updated_tick", "last_move_tick"]) {
    if (
      body[key] !== null &&
      (!Number.isSafeInteger(body[key]) || body[key] < 0)
    ) {
      reject(key + " invalid");
    }
  }
  for (const key of ["last_command_id", "last_authorization_id"]) {
    if (body[key] !== null && (typeof body[key] !== "string" || !body[key])) {
      reject(key + " invalid");
    }
  }

  const hashPayload = clone(body);
  delete hashPayload.state_h256;
  delete hashPayload.integrity_match;
  if (body.state_h256.toLowerCase() !== h256(hashPayload)) {
    reject("server state_h256 mismatch");
  }

  if (expectedAntId !== null && body.ant_id !== expectedAntId) {
    reject("server ANT_ID mismatch");
  }
  if (expectedMaterial !== null) {
    if (body.material.material_id !== expectedMaterial.MATERIAL_ID) {
      reject("server MATERIAL_ID mismatch");
    }
    if (
      body.material.material_h256.toLowerCase() !==
      expectedMaterial.MATERIAL_H256.toLowerCase()
    ) {
      reject("server MATERIAL_H256 mismatch");
    }
  }

  const suffix = body.state_h256.slice(0, 20).toUpperCase();
  const state = {
    SCHEMA: "BRUTUS-LIVE-FOURMI-TRANSPORT-STATE-v0.1",
    VERSION: "0.1",
    OBSERVATION_ID: `LTS-T${body.tick}-${suffix}`,
    TICK: body.tick,
    CLOCK_AUTHORITY: QUEEN_SOURCE,
    SOURCE: {
      SOURCE_SCHEMA: SOURCE_SCHEMA,
      SOURCE_ENDPOINT: body.source_endpoint,
      OBSERVED_AT_UTC: body.observed_at_utc,
      INTEGRITY_MATCH: true
    },
    ANT_ID: body.ant_id,
    POSITION: body.position,
    MATERIAL: {
      MATERIAL_ID: body.material.material_id,
      MATERIAL_H256: body.material.material_h256,
      BINDING_STATE: "ATTACHED"
    },
    TRACE_ID: `TRACE-ANTMUX-LIVE-STATE-T${body.tick}`,
    PROOF_REF: null,
    SIGNATURE_METHOD,
    SIGNATURE_H256: "0".repeat(64),
    EXECUTABLE: false,
    PROOF_CLAIM: false,
    GATE_AUTHORITY: false,
    ROUTING_AUTHORIZATION: "UNDECIDED"
  };
  state.SIGNATURE_H256 = computeLiveFourmiTransportStateH256(state);

  const queenEnvelope = {
    status: "FRESH",
    source_schema: QUEEN_SOURCE,
    source_endpoint: "/api/live-transport/state",
    entity_id: body.queen.entity_id,
    freshness_ms: 0,
    observed_at_utc: body.observed_at_utc,
    condition: "LIVE_TRANSPORT_COMBINED_STATE",
    payload: {
      source: QUEEN_SOURCE,
      entity_id: body.queen.entity_id,
      tick_count: body.queen.tick_count,
      generation: body.queen.generation,
      queen_mode: body.queen.queen_mode,
      integrity_match: true,
      reference_h256: body.queen.reference_h256
    }
  };

  return deepFreeze({
    queenEnvelope,
    transportState: validateLiveFourmiTransportState(state),
    serverStateH256: body.state_h256,
    stateVersion: body.state_version
  });
}

function validateCommand(command, material, antId) {
  assertExactKeys(
    command,
    [
      "SCHEMA",
      "VERSION",
      "COMMAND_ID",
      "AUTHORIZATION_ID",
      "AUTHORIZATION_H256",
      "ANT_ID",
      "MATERIAL_ID",
      "MATERIAL_H256",
      "REQUESTED_AT_TICK",
      "CLOCK_AUTHORITY",
      "FROM",
      "TO",
      "MAX_MOVES",
      "SINGLE_USE",
      "PROOF_REF",
      "EXECUTABLE",
      "GATE_AUTHORITY",
      "ROUTING_AUTHORIZATION"
    ],
    "transport command"
  );

  if (command.SCHEMA !== "BRUTUS-LIVE-FOURMI-TRANSPORT-COMMAND-v0.1") {
    reject("unsupported command SCHEMA");
  }
  if (command.VERSION !== "0.1") reject("unsupported command VERSION");
  if (command.ANT_ID !== antId) reject("command ANT_ID mismatch");
  if (command.MATERIAL_ID !== material.MATERIAL_ID) reject("command MATERIAL_ID mismatch");
  if (
    command.MATERIAL_H256.toLowerCase() !== material.MATERIAL_H256.toLowerCase()
  ) {
    reject("command MATERIAL_H256 mismatch");
  }
  assertSha256(command.AUTHORIZATION_H256, "command AUTHORIZATION_H256");
  if (!Number.isSafeInteger(command.REQUESTED_AT_TICK) || command.REQUESTED_AT_TICK < 0) {
    reject("command REQUESTED_AT_TICK invalid");
  }
  if (command.CLOCK_AUTHORITY !== QUEEN_SOURCE) reject("command clock authority mismatch");
  assertWorldRef(command.FROM, "command FROM");
  assertWorldRef(command.TO, "command TO");
  if (command.FROM === command.TO) reject("command route requires movement");
  if (command.MAX_MOVES !== 1 || command.SINGLE_USE !== true) {
    reject("command must be single-use one-move");
  }
  if (command.PROOF_REF !== null) reject("command PROOF_REF must be null");
  if (command.EXECUTABLE !== false) reject("command EXECUTABLE must be false");
  if (command.GATE_AUTHORITY !== false) reject("command GATE_AUTHORITY must be false");
  if (command.ROUTING_AUTHORIZATION !== "AUTHORIZED") {
    reject("command routing must be AUTHORIZED");
  }

  return command;
}

function validateAck(body, command) {
  assertExactKeys(
    body,
    [
      "STATUS",
      "COMMAND_ID",
      "AUTHORIZATION_ID",
      "ANT_ID",
      "MATERIAL_ID",
      "FROM",
      "TO"
    ],
    "transport acknowledgment"
  );
  if (body.STATUS !== "ACCEPTED") reject("transport action was not accepted");
  for (const key of [
    "COMMAND_ID",
    "AUTHORIZATION_ID",
    "ANT_ID",
    "MATERIAL_ID",
    "FROM",
    "TO"
  ]) {
    if (body[key] !== command[key]) {
      reject("transport acknowledgment " + key + " mismatch");
    }
  }
  return deepFreeze(clone(body));
}

export function createAntmuxLiveTransportAdapter({
  baseUrl,
  token,
  antId,
  material,
  fetchImpl = globalThis.fetch
}) {
  const base = normalizedBaseUrl(baseUrl);
  const secret = validateToken(token);
  assertAntId(antId);
  const validMaterial = validateFourmiMathMaterial(material);

  if (validMaterial.CARRIER.ANT_ID !== antId) {
    reject("material carrier ANT_ID does not match adapter ANT_ID");
  }
  if (typeof fetchImpl !== "function") reject("fetch implementation is required");

  async function request(path, { method = "GET", body = null, authenticated = true } = {}) {
    const headers = { Accept: "application/json" };
    if (authenticated) headers.Authorization = `Bearer ${secret}`;
    if (body !== null) headers["Content-Type"] = "application/json";

    const response = await fetchImpl(base + path, {
      method,
      headers,
      body: body === null ? undefined : JSON.stringify(body),
      redirect: "error"
    });

    if (!response || typeof response.ok !== "boolean") {
      reject("invalid HTTP response object");
    }
    if (!response.ok) {
      let detail = "";
      try {
        const payload = await response.json();
        detail = typeof payload?.detail === "string" ? payload.detail : "";
      } catch {
        detail = "";
      }
      reject(`HTTP ${response.status}${detail ? ": " + detail.slice(0, 240) : ""}`);
    }

    const payload = await response.json();
    if (!isPlainObject(payload)) reject("HTTP response JSON must be an object");
    return payload;
  }

  async function readAntBirthReceipt() {
    const receipt = await request(
      `/api/live-transport/ant/${encodeURIComponent(antId)}`
    );
    if (receipt.schema !== "ANTMUX-ANT-BIRTH-v1") {
      reject("unexpected ant birth schema");
    }
    if (receipt.ant_id !== antId) reject("ant birth ANT_ID mismatch");
    if (receipt.role !== "SYNAPSE") reject("ant birth role must be SYNAPSE");
    return deepFreeze(clone(receipt));
  }

  async function readCombinedState() {
    const body = await request(
      `/api/live-transport/state/${encodeURIComponent(antId)}/${encodeURIComponent(validMaterial.MATERIAL_ID)}`
    );
    return normalizeServerTransportState(body, validMaterial, antId);
  }

  async function attachMaterial({ position, traceId }) {
    assertWorldRef(position, "attach position");
    if (
      typeof traceId !== "string" ||
      !/^TRACE-[A-Z0-9-]{4,64}$/.test(traceId)
    ) {
      reject("attach traceId invalid");
    }

    const body = await request("/api/live-transport/attach", {
      method: "POST",
      body: {
        ANT_ID: antId,
        MATERIAL_ID: validMaterial.MATERIAL_ID,
        MATERIAL_H256: validMaterial.MATERIAL_H256,
        POSITION: position,
        TRACE_ID: traceId
      }
    });

    return normalizeServerTransportState(body, validMaterial, antId);
  }

  async function performAuthorizedMove(commandInput) {
    const command = validateCommand(commandInput, validMaterial, antId);

    const body = await request("/api/live-transport/move", {
      method: "POST",
      body: {
        COMMAND_ID: command.COMMAND_ID,
        AUTHORIZATION_ID: command.AUTHORIZATION_ID,
        AUTHORIZATION_H256: command.AUTHORIZATION_H256,
        ANT_ID: command.ANT_ID,
        MATERIAL_ID: command.MATERIAL_ID,
        MATERIAL_H256: command.MATERIAL_H256,
        REQUESTED_AT_TICK: command.REQUESTED_AT_TICK,
        CLOCK_AUTHORITY: command.CLOCK_AUTHORITY,
        FROM: command.FROM,
        TO: command.TO,
        MAX_MOVES: command.MAX_MOVES,
        SINGLE_USE: command.SINGLE_USE,
        PROOF_REF: command.PROOF_REF,
        EXECUTABLE: command.EXECUTABLE,
        GATE_AUTHORITY: command.GATE_AUTHORITY,
        ROUTING_AUTHORIZATION: command.ROUTING_AUTHORIZATION
      }
    });

    return validateAck(body, command);
  }

  return Object.freeze({
    SOURCE_SCHEMA,
    baseUrl: base,
    antId,
    materialId: validMaterial.MATERIAL_ID,
    readAntBirthReceipt,
    readCombinedState,
    attachMaterial,
    performAuthorizedMove
  });
}

export function createAntmuxLiveTransportRuntimeBindings(adapter) {
  if (
    !adapter ||
    typeof adapter.readCombinedState !== "function" ||
    typeof adapter.readAntBirthReceipt !== "function" ||
    typeof adapter.performAuthorizedMove !== "function"
  ) {
    reject("valid Antmux live transport adapter is required");
  }

  let cachedTransportState = null;

  return Object.freeze({
    async readObservation() {
      if (cachedTransportState !== null) {
        reject("previous combined state was not consumed");
      }
      const combined = await adapter.readCombinedState();
      cachedTransportState = combined.transportState;
      return combined.queenEnvelope;
    },

    async readTransportState() {
      if (cachedTransportState === null) {
        reject("readObservation must run before readTransportState");
      }
      const value = cachedTransportState;
      cachedTransportState = null;
      return value;
    },

    async readAntBirthReceipt() {
      return adapter.readAntBirthReceipt();
    },

    async performAuthorizedMove(command) {
      return adapter.performAuthorizedMove(command);
    }
  });
}

export const BRUTUS_ANTMUX_LIVE_TRANSPORT_SOURCE_SCHEMA = SOURCE_SCHEMA;
