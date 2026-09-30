const ANT_IDENTITY_SCHEMA = "BRUTUS-ANT-IDENTITY-v0.1";

export function assertLiveRoutingAuthorized(antIdentity) {
  if (!antIdentity || antIdentity.SCHEMA !== ANT_IDENTITY_SCHEMA) {
    throw new Error("LIVE_ROUTING_DENIED: normalized ANT identity required");
  }

  if (antIdentity.ROUTING_AUTHORIZATION !== "AUTHORIZED") {
    throw new Error(
      "LIVE_ROUTING_DENIED: routing authorization is " +
      String(antIdentity.ROUTING_AUTHORIZATION ?? "MISSING")
    );
  }

  return true;
}
