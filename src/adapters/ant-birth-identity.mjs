const SOURCE_SCHEMA = "ANTMUX-ANT-BIRTH-v1";
const BRUTUS_SCHEMA = "BRUTUS-ANT-IDENTITY-v0.1";
const ANT_ID_RE = /^ANT-[0-9A-F]{12}$/;

function reject(reason) {
  throw new Error("ANT_IDENTITY_REJECTED: " + reason);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function lifecycleDone(lifecycle, state) {
  return Array.isArray(lifecycle) && lifecycle.some(
    step => isPlainObject(step) && step.state === state && step.status === "DONE"
  );
}

export function normalizeAntIdentity(receipt) {
  if (!isPlainObject(receipt)) reject("birth receipt must be a plain object");
  if (receipt.schema !== SOURCE_SCHEMA) reject("unexpected source schema");
  if (typeof receipt.ant_id !== "string" || !ANT_ID_RE.test(receipt.ant_id)) {
    reject("invalid ant_id");
  }
  if (receipt.role !== "SYNAPSE") reject("role must be SYNAPSE");
  if (typeof receipt.state !== "string" || receipt.state.length === 0) {
    reject("state is required");
  }
  if (typeof receipt.form !== "string" || receipt.form.length === 0) {
    reject("form is required");
  }

  const soul = receipt.project_soul;
  if (!isPlainObject(soul)) reject("project_soul is required");
  if (typeof soul.memory_id !== "string" || soul.memory_id.length === 0) {
    reject("memory_id is required");
  }
  if (!Number.isInteger(soul.birth_tick_ms) || soul.birth_tick_ms < 0) {
    reject("birth_tick_ms must be a non-negative integer");
  }
  if (!Array.isArray(soul.lineage) || soul.lineage.length === 0) {
    reject("lineage is required");
  }
  if (soul.lineage[0] !== receipt.ant_id) {
    reject("lineage root must equal ant_id");
  }

  const lifeClockAssigned = lifecycleDone(receipt.lifecycle, "LIFE_CLOCK_ASSIGNMENT");
  const becomeSynapseDone = lifecycleDone(receipt.lifecycle, "BECOME_SYNAPSE");

  if (!lifeClockAssigned) reject("LIFE_CLOCK_ASSIGNMENT must be DONE");
  if (!becomeSynapseDone) reject("BECOME_SYNAPSE must be DONE");

  return Object.freeze({
    SCHEMA: BRUTUS_SCHEMA,
    SOURCE_SCHEMA,
    ANT_ID: receipt.ant_id,
    ROLE: receipt.role,
    STATE: receipt.state,
    FORM: receipt.form,
    MEMORY_ID: soul.memory_id,
    LINEAGE: Object.freeze([...soul.lineage]),
    BIRTH_WALLCLOCK_MS: soul.birth_tick_ms,
    LIFE_CLOCK_ASSIGNED: true,
    BECOME_SYNAPSE_DONE: true,
    ROUTING_AUTHORIZATION: "UNDECIDED"
  });
}

export const BRUTUS_ANT_IDENTITY_SCHEMA = BRUTUS_SCHEMA;
