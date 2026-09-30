const SOURCE = "ASTRA_STATION";
const TARGET = "ASTRA_STATION_STATUS";
const ALLOWED_READ = new Set(["anchor.identity", "anchor.prototypes"]);
const ALLOWED_MEASURE = new Set(["fixed_return_point", "safety_boundary"]);
const ALLOWED_RETURN = new Set([
  "anchor_id",
  "name",
  "status",
  "return_point",
  "prototype_count",
  "prototypes"
]);

function reject(reason) {
  throw new Error("VERSO_ASTRA_STATION_STATUS_REJECTED: " + reason);
}

function assertExactItems(actual, allowed, field) {
  if (!Array.isArray(actual)) reject(field + " must be an array");
  for (const item of actual) {
    if (!allowed.has(item)) reject(field + " contains unsupported item " + String(item));
  }
}

export function createVersoAstraStationStatusAdapter({ station }) {
  if (!station || typeof station.snapshot !== "function" || typeof station.listPrototypes !== "function") {
    reject("Astra Station runtime is required");
  }

  return async function versoAstraStationStatusAdapter(request) {
    if (!request || typeof request !== "object") reject("request is required");
    if (request.source !== SOURCE) reject("unexpected source");
    if (request.target !== TARGET) reject("unexpected target");
    if (!request.values || typeof request.values !== "object" || Array.isArray(request.values)) {
      reject("values must be a plain object");
    }
    if (Object.keys(request.values).length !== 0) {
      reject("station status card accepts no mutable VALUES");
    }

    assertExactItems(request.read, ALLOWED_READ, "READ");
    assertExactItems(request.measure, ALLOWED_MEASURE, "MEASURE");
    assertExactItems(request.returnData, ALLOWED_RETURN, "RETURN_DATA");

    const snapshot = station.snapshot();
    const prototypes = station.listPrototypes();

    const data = {};
    for (const key of request.returnData) {
      if (key === "anchor_id") data.anchor_id = snapshot.ANCHOR_ID;
      if (key === "name") data.name = snapshot.NAME;
      if (key === "status") data.status = snapshot.STATUS;
      if (key === "return_point") data.return_point = snapshot.RETURN_POINT;
      if (key === "prototype_count") data.prototype_count = snapshot.PROTOTYPE_COUNT;
      if (key === "prototypes") data.prototypes = prototypes;
    }

    return Object.freeze({
      SOURCE,
      TARGET,
      DATA: Object.freeze(data),
      PROOF: Object.freeze({
        fixed_return_point: snapshot.RETURN_POINT === true,
        verso_core_mutation: snapshot.VERSO_CORE_MUTATION,
        world_router_invocation: snapshot.WORLD_ROUTER_INVOCATION,
        safety_boundary:
          snapshot.VERSO_CORE_MUTATION === false &&
          snapshot.WORLD_ROUTER_INVOCATION === false
      })
    });
  };
}

export const BRUTUS_ASTRA_STATION_STATUS_TARGET = TARGET;
