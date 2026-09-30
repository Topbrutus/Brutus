import fs from "node:fs";
import { getVersoCardPolicy } from "./verso-card-registry.mjs";

const ANCHOR_REGISTRY_URL = new URL("../registry/anchors.v0.json", import.meta.url);
const PROTOTYPE_SCHEMA = "BRUTUS-PROTOTYPE-MANIFEST-v0.1";
const FIXED_ANCHOR_ID = "ANCHOR-0001";
const REQUIRED_FIELDS = [
  "SCHEMA",
  "PROTOTYPE_ID",
  "VERSION",
  "ANCHOR_ID",
  "TITLE",
  "PURPOSE",
  "STATUS",
  "CARD_IDS",
  "PARAMETERS",
  "EXPECTED_OUTPUTS",
  "PROOF_REFS",
  "NOTES"
];
const ALLOWED_FIELDS = new Set(REQUIRED_FIELDS);
const ALLOWED_STATUS = new Set(["DRAFT", "ACTIVE", "PAUSED", "CLOSED"]);

function reject(reason) {
  throw new Error("ASTRA_STATION_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function assertDataOnly(value, path = "manifest") {
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

function assertString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    reject(field + " must be a non-empty string");
  }
}

function assertStringArray(value, field) {
  if (!Array.isArray(value)) reject(field + " must be an array");
  for (const item of value) assertString(item, field);
}

function readAnchorPolicy() {
  const registry = JSON.parse(fs.readFileSync(ANCHOR_REGISTRY_URL, "utf8"));
  if (registry?.schema !== "BRUTUS-ANCHOR-REGISTRY-v0.1") {
    reject("invalid anchor registry schema");
  }
  if (!Array.isArray(registry.anchors)) reject("anchor registry must contain anchors");

  const anchor = registry.anchors.find((item) => item?.ANCHOR_ID === FIXED_ANCHOR_ID);
  if (!anchor) reject("ANCHOR-0001 is not registered");
  if (anchor.STATUS !== "ESTABLISHED") reject("ANCHOR-0001 is not established");
  if (anchor.RETURN_POINT !== true) reject("ANCHOR-0001 must be a return point");
  if (anchor.VERSO_CORE_MUTATION !== false) reject("Verso Core mutation must remain false");
  if (anchor.WORLD_ROUTER_INVOCATION !== false) reject("World Router invocation must remain false");

  return deepFreeze(anchor);
}

function validateManifest(input) {
  assertDataOnly(input);
  if (!isPlainObject(input)) reject("manifest must be a plain object");

  for (const key of Object.keys(input)) {
    if (!ALLOWED_FIELDS.has(key)) reject("unknown manifest field " + key);
  }
  for (const field of REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) {
      reject("missing manifest field " + field);
    }
  }

  if (input.SCHEMA !== PROTOTYPE_SCHEMA) reject("unsupported SCHEMA");
  if (input.VERSION !== "0.1") reject("unsupported VERSION");
  if (input.ANCHOR_ID !== FIXED_ANCHOR_ID) reject("prototype must live at ANCHOR-0001");
  assertString(input.PROTOTYPE_ID, "PROTOTYPE_ID");
  if (!/^BRUTUS-PROTOTYPE-[A-Z0-9-]+$/.test(input.PROTOTYPE_ID)) {
    reject("invalid PROTOTYPE_ID");
  }
  assertString(input.TITLE, "TITLE");
  assertString(input.PURPOSE, "PURPOSE");
  if (!ALLOWED_STATUS.has(input.STATUS)) reject("unsupported STATUS");

  assertStringArray(input.CARD_IDS, "CARD_IDS");
  assertStringArray(input.EXPECTED_OUTPUTS, "EXPECTED_OUTPUTS");
  assertStringArray(input.PROOF_REFS, "PROOF_REFS");
  assertStringArray(input.NOTES, "NOTES");
  if (!isPlainObject(input.PARAMETERS)) reject("PARAMETERS must be a plain object");

  for (const cardId of input.CARD_IDS) {
    if (getVersoCardPolicy(cardId) === null) {
      reject("unknown prepared CARD_ID " + cardId);
    }
  }

  return deepFreeze(JSON.parse(JSON.stringify(input)));
}

export function createAstraStation() {
  const anchor = readAnchorPolicy();
  const manifests = new Map();

  return Object.freeze({
    get anchorId() {
      return anchor.ANCHOR_ID;
    },

    get anchor() {
      return anchor;
    },

    registerPrototype(manifest) {
      const verified = validateManifest(manifest);
      if (manifests.has(verified.PROTOTYPE_ID)) {
        reject("duplicate PROTOTYPE_ID " + verified.PROTOTYPE_ID);
      }
      manifests.set(verified.PROTOTYPE_ID, verified);
      return verified;
    },

    getPrototype(prototypeId) {
      return manifests.get(prototypeId) ?? null;
    },

    listPrototypes() {
      return Object.freeze(
        [...manifests.values()]
          .map((item) =>
            Object.freeze({
              PROTOTYPE_ID: item.PROTOTYPE_ID,
              TITLE: item.TITLE,
              STATUS: item.STATUS,
              CARD_IDS: Object.freeze([...item.CARD_IDS])
            })
          )
          .sort((a, b) => a.PROTOTYPE_ID.localeCompare(b.PROTOTYPE_ID))
      );
    },

    snapshot() {
      return deepFreeze({
        SCHEMA: "BRUTUS-ASTRA-STATION-SNAPSHOT-v0.1",
        ANCHOR_ID: anchor.ANCHOR_ID,
        NAME: anchor.NAME,
        STATUS: anchor.STATUS,
        RETURN_POINT: anchor.RETURN_POINT,
        VERSO_CORE_MUTATION: anchor.VERSO_CORE_MUTATION,
        WORLD_ROUTER_INVOCATION: anchor.WORLD_ROUTER_INVOCATION,
        PROTOTYPE_COUNT: manifests.size,
        PROTOTYPE_IDS: [...manifests.keys()].sort()
      });
    }
  });
}

export function loadPrototypeManifestFromFile(path) {
  return validateManifest(JSON.parse(fs.readFileSync(path, "utf8")));
}

export const ASTRA_STATION_ANCHOR_ID = FIXED_ANCHOR_ID;
