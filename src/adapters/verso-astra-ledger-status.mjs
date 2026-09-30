const SOURCE = "ASTRA_STATION";
const TARGET = "ASTRA_LEDGER_STATUS";

function reject(reason) {
  throw new Error("VERSO_ASTRA_LEDGER_STATUS_REJECTED: " + reason);
}

export function createVersoAstraLedgerStatusAdapter({ ledger }) {
  if (!ledger || typeof ledger.snapshot !== "function" || typeof ledger.verify !== "function") {
    reject("Anchor ledger runtime is required");
  }

  return async function versoAstraLedgerStatusAdapter(request) {
    if (!request || typeof request !== "object") reject("request is required");
    if (request.source !== SOURCE) reject("unexpected source");
    if (request.target !== TARGET) reject("unexpected target");
    if (!Array.isArray(request.read) || request.read.length !== 1 || request.read[0] !== "anchor.ledger.status") {
      reject("unsupported READ contract");
    }
    if (!Array.isArray(request.measure) || request.measure.length !== 1 || request.measure[0] !== "ledger_validity") {
      reject("unsupported MEASURE contract");
    }
    if (!request.values || typeof request.values !== "object" || Array.isArray(request.values)) {
      reject("values must be a plain object");
    }
    if (Object.keys(request.values).length !== 0) {
      reject("ledger status card accepts no mutable VALUES");
    }

    const snapshot = ledger.snapshot();
    const verify = ledger.verify();

    const data = {};
    for (const key of request.returnData) {
      if (key === "anchor_id") data.anchor_id = snapshot.ANCHOR_ID;
      if (key === "mode") data.mode = snapshot.MODE;
      if (key === "entry_count") data.entry_count = snapshot.ENTRY_COUNT;
      if (key === "head_h256") data.head_h256 = snapshot.HEAD_H256;
      if (key === "valid") data.valid = snapshot.VALID;
    }

    return Object.freeze({
      SOURCE,
      TARGET,
      DATA: Object.freeze(data),
      PROOF: Object.freeze({
        ledger_validity: verify.VALID,
        failure_sequence: verify.FAILURE_SEQUENCE
      })
    });
  };
}

export const BRUTUS_ASTRA_LEDGER_STATUS_TARGET = TARGET;
