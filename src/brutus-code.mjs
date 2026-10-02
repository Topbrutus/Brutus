const BRUTUS_CODE_SCHEMA = "BRUTUS-CODE-MESSAGE-v0.1";

const ALLOWED_ACTIONS = new Set([
  "SEE",
  "QUERY",
  "TAKE",
  "DROP",
  "MOVE",
  "JOIN",
  "SPLIT",
  "TEST",
  "RECYCLE",
  "FOLLOW",
  "TEACH",
  "LEARN",
  "REPORT",
  "WAIT",
  "STORE",
  "READ",
  "BUILD",
  "COMPARE"
]);

const ALLOWED_MARKERS = new Set(["?", "!", "+", "-", "=", "~", "#", "*"]);

const ALLOWED_SIGNALS = new Set([
  "🟢",
  "🟡",
  "🔴",
  "🔵",
  "🟣",
  "🔁",
  "🔒",
  "🔓",
  "❓",
  "✅"
]);

const ALLOWED_STATES = new Set([
  "B:0",
  "B:1",
  "S:UNKNOWN",
  "S:READY",
  "S:CLOSED",
  "S:OPEN",
  "S:PASS",
  "S:FAIL",
  "S:INCONCLUSIVE",
  "S:ACTIVE",
  "S:IDLE",
  "S:LOCKED"
]);

const REQUIRED_FIELDS = [
  "SCHEMA",
  "VERSION",
  "MESSAGE_ID",
  "SENDER",
  "RECIPIENT",
  "ACTION",
  "ARGS",
  "MARKERS",
  "SIGNAL",
  "NATURAL_LANGUAGE",
  "EXECUTABLE",
  "PROOF_CLAIM",
  "GATE_AUTHORITY"
];

const ALLOWED_FIELDS = new Set(REQUIRED_FIELDS);
const ENTITY_PATTERN = /^@[A-Z][A-Z0-9-]{1,31}$/;
const MESSAGE_ID_PATTERN = /^BCM-[A-Z0-9-]{4,64}$/;
const REF_PATTERN = /^(P|C|L|G|T|M|Z|W|A):[A-Z0-9-]{1,32}$/;
const INTEGER_PATTERN = /^N:-?(0|[1-9][0-9]{0,15})$/;

function reject(reason) {
  throw new Error("BRUTUS_CODE_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function assertDataOnly(value, path = "message") {
  if (value === null) return;
  const type = typeof value;

  if (type === "string" || type === "boolean") return;
  if (type === "number") {
    if (!Number.isFinite(value)) reject(path + " contains a non-finite number");
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertDataOnly(item, path + "[" + index + "]"));
    return;
  }
  if (type === "object" && isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      assertDataOnly(item, path + "." + key);
    }
    return;
  }
  reject(path + " must contain data only");
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

function validateEntity(value, field) {
  if (typeof value !== "string" || !ENTITY_PATTERN.test(value)) {
    reject(field + " must be a Brutus Code entity identifier");
  }
}

function validateAtom(value) {
  if (typeof value !== "string" || value.length === 0) {
    reject("ARGS must contain non-empty strings only");
  }

  if (
    REF_PATTERN.test(value) ||
    INTEGER_PATTERN.test(value) ||
    ALLOWED_STATES.has(value)
  ) {
    return;
  }

  reject("unknown argument token " + value);
}

function validateMarkers(markers) {
  if (!Array.isArray(markers)) reject("MARKERS must be an array");
  if (markers.length > 4) reject("MARKERS exceeds v0.1 limit");

  const seen = new Set();
  for (const marker of markers) {
    if (!ALLOWED_MARKERS.has(marker)) reject("unknown marker " + marker);
    if (seen.has(marker)) reject("MARKERS cannot contain duplicates");
    seen.add(marker);
  }
}

function validateSignal(signal) {
  if (signal === null) return;
  if (!ALLOWED_SIGNALS.has(signal)) reject("unknown signal " + String(signal));
}

export function validateBrutusCodeMessage(input) {
  assertDataOnly(input);
  if (!isPlainObject(input)) reject("message must be a plain object");

  for (const key of Object.keys(input)) {
    if (!ALLOWED_FIELDS.has(key)) reject("unknown message field " + key);
  }
  for (const field of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) {
      reject("missing message field " + field);
    }
  }

  if (input.SCHEMA !== BRUTUS_CODE_SCHEMA) reject("unsupported SCHEMA");
  if (input.VERSION !== "0.1") reject("unsupported VERSION");

  if (typeof input.MESSAGE_ID !== "string" || !MESSAGE_ID_PATTERN.test(input.MESSAGE_ID)) {
    reject("invalid MESSAGE_ID");
  }

  validateEntity(input.SENDER, "SENDER");
  validateEntity(input.RECIPIENT, "RECIPIENT");

  if (!ALLOWED_ACTIONS.has(input.ACTION)) reject("unknown ACTION " + String(input.ACTION));

  if (!Array.isArray(input.ARGS)) reject("ARGS must be an array");
  if (input.ARGS.length > 16) reject("ARGS exceeds v0.1 limit");
  input.ARGS.forEach(validateAtom);

  validateMarkers(input.MARKERS);
  validateSignal(input.SIGNAL);

  if (input.NATURAL_LANGUAGE !== false) reject("NATURAL_LANGUAGE must be false");
  if (input.EXECUTABLE !== false) reject("EXECUTABLE must be false");
  if (input.PROOF_CLAIM !== false) reject("PROOF_CLAIM must be false");
  if (input.GATE_AUTHORITY !== false) reject("GATE_AUTHORITY must be false");

  if (
    input.ACTION === "QUERY" &&
    !input.MARKERS.includes("?") &&
    input.SIGNAL !== "❓"
  ) {
    reject("QUERY requires ? marker or ❓ signal");
  }

  return deepFreeze(JSON.parse(JSON.stringify(input)));
}

export function renderBrutusCodeLine(input) {
  const message = validateBrutusCodeMessage(input);
  const tokens = [
    message.SENDER,
    message.RECIPIENT,
    message.ACTION,
    ...message.ARGS,
    ...message.MARKERS
  ];
  if (message.SIGNAL !== null) tokens.push(message.SIGNAL);
  return tokens.join(" ");
}

export function parseBrutusCodeLine(line, { messageId } = {}) {
  if (typeof line !== "string" || line.length === 0) reject("line must be a non-empty string");
  if (typeof messageId !== "string" || !MESSAGE_ID_PATTERN.test(messageId)) {
    reject("parse requires a valid messageId");
  }
  if (line.trim() !== line || /[\r\n\t]/u.test(line) || / {2,}/u.test(line)) {
    reject("line must use canonical single-space formatting");
  }

  const tokens = line.split(" ");
  if (tokens.length < 3) reject("line requires sender recipient action");

  const [sender, recipient, action, ...tail] = tokens;
  let rest = [...tail];
  let signal = null;

  if (rest.length > 0 && ALLOWED_SIGNALS.has(rest.at(-1))) {
    signal = rest.pop();
  }

  const markers = [];
  while (rest.length > 0 && ALLOWED_MARKERS.has(rest.at(-1))) {
    markers.unshift(rest.pop());
  }

  for (const token of rest) {
    if (ALLOWED_MARKERS.has(token) || ALLOWED_SIGNALS.has(token)) {
      reject("markers and signals must appear after arguments");
    }
  }

  return validateBrutusCodeMessage({
    SCHEMA: BRUTUS_CODE_SCHEMA,
    VERSION: "0.1",
    MESSAGE_ID: messageId,
    SENDER: sender,
    RECIPIENT: recipient,
    ACTION: action,
    ARGS: rest,
    MARKERS: markers,
    SIGNAL: signal,
    NATURAL_LANGUAGE: false,
    EXECUTABLE: false,
    PROOF_CLAIM: false,
    GATE_AUTHORITY: false
  });
}

export const BRUTUS_CODE_MESSAGE_SCHEMA = BRUTUS_CODE_SCHEMA;
export const BRUTUS_CODE_ACTIONS = Object.freeze([...ALLOWED_ACTIONS]);
export const BRUTUS_CODE_MARKERS = Object.freeze([...ALLOWED_MARKERS]);
export const BRUTUS_CODE_SIGNALS = Object.freeze([...ALLOWED_SIGNALS]);
