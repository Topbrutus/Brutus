import fs from "node:fs";

const REGISTRY_PATH = new URL("../registry/verso-cards.v0.json", import.meta.url);
const RAW_REGISTRY = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));

function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) freeze(item);
  }
  return value;
}

function validateRegistry(registry) {
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
    throw new Error("VERSO_CARD_REGISTRY_INVALID: registry must be an object");
  }
  if (registry.schema !== "BRUTUS-VERSO-CARD-REGISTRY-v0.1") {
    throw new Error("VERSO_CARD_REGISTRY_INVALID: unsupported schema");
  }
  if (!Array.isArray(registry.cards) || registry.cards.length === 0) {
    throw new Error("VERSO_CARD_REGISTRY_INVALID: cards are required");
  }

  const ids = new Set();
  for (const card of registry.cards) {
    if (!card || typeof card !== "object" || Array.isArray(card)) {
      throw new Error("VERSO_CARD_REGISTRY_INVALID: card policy must be an object");
    }
    if (typeof card.CARD_ID !== "string" || card.CARD_ID.length === 0) {
      throw new Error("VERSO_CARD_REGISTRY_INVALID: CARD_ID is required");
    }
    if (ids.has(card.CARD_ID)) {
      throw new Error("VERSO_CARD_REGISTRY_INVALID: duplicate CARD_ID " + card.CARD_ID);
    }
    ids.add(card.CARD_ID);
    if (!Array.isArray(card.MUTABLE_VALUES)) {
      throw new Error("VERSO_CARD_REGISTRY_INVALID: MUTABLE_VALUES must be an array");
    }
  }
}

validateRegistry(RAW_REGISTRY);
const REGISTRY = freeze(RAW_REGISTRY);
const POLICY_BY_ID = new Map(REGISTRY.cards.map((policy) => [policy.CARD_ID, policy]));

export function getVersoCardPolicy(cardId) {
  if (typeof cardId !== "string") return null;
  return POLICY_BY_ID.get(cardId) ?? null;
}

export function listVersoCardIds() {
  return Object.freeze([...POLICY_BY_ID.keys()]);
}

export const VERSO_CARD_REGISTRY = REGISTRY;
