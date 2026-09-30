import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PROVIDER_SCHEMA = "BRUTUS-X72-ADAPTER-PROVIDER-v0.1";
const DEFAULT_MAX_BUFFER = 1024 * 1024;

function reject(reason) {
  throw new Error("X72_PROVIDER_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function requireNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    reject(field + " must be a non-empty string");
  }
  return value.trim();
}

function validateBaseUrl(value) {
  const raw = requireNonEmptyString(value, "baseUrl");
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    reject("baseUrl must be a valid URL");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    reject("baseUrl protocol must be http or https");
  }
  if (parsed.username || parsed.password) {
    reject("baseUrl must not contain credentials");
  }
  return parsed.toString().replace(/\/$/, "");
}

function parseEnvelope(stdout) {
  if (typeof stdout !== "string" || stdout.trim().length === 0) {
    reject("bridge returned empty stdout");
  }

  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    reject("bridge stdout is not valid JSON");
  }

  if (!isPlainObject(parsed)) {
    reject("bridge JSON must be a plain object");
  }
  return parsed;
}

async function defaultRunProcess(command, args, options) {
  return execFileAsync(command, args, options);
}

export function createX72AdapterProcessProvider({
  pythonExecutable = "python3",
  bridgeScript,
  antmuxRoot,
  baseUrl,
  timeoutMs = 5000,
  maxBuffer = DEFAULT_MAX_BUFFER,
  runProcess = defaultRunProcess
}) {
  const python = requireNonEmptyString(pythonExecutable, "pythonExecutable");
  const bridge = requireNonEmptyString(bridgeScript, "bridgeScript");
  const root = requireNonEmptyString(antmuxRoot, "antmuxRoot");
  const url = validateBaseUrl(baseUrl);

  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) {
    reject("timeoutMs must be an integer from 100 to 30000");
  }
  if (!Number.isInteger(maxBuffer) || maxBuffer < 1024 || maxBuffer > 4 * 1024 * 1024) {
    reject("maxBuffer must be an integer from 1024 to 4194304");
  }
  if (typeof runProcess !== "function") reject("runProcess must be a function");

  async function readObservation() {
    const args = [
      bridge,
      "--antmux-root",
      root,
      "--base-url",
      url,
      "--mode",
      "state"
    ];

    let result;
    try {
      result = await runProcess(python, args, {
        timeout: timeoutMs,
        maxBuffer,
        windowsHide: true,
        shell: false,
        encoding: "utf8"
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error("X72_PROVIDER_UNAVAILABLE: " + detail);
    }

    return parseEnvelope(result?.stdout);
  }

  return Object.freeze({
    SCHEMA: PROVIDER_SCHEMA,
    MODE: "STATE_ONLY",
    readObservation
  });
}

export const BRUTUS_X72_PROVIDER_SCHEMA = PROVIDER_SCHEMA;
