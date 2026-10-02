import { validateCrystal } from "./crystal-contract.mjs";
import { verifyCrystalLocalSources } from "./crystal-source-integrity.mjs";

const ADMISSION_SCHEMA = "BRUTUS-CRYSTAL-ADMISSION-v0.1";

function reject(reason) {
  throw new Error("CRYSTAL_ADMISSION_REJECTED: " + reason);
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

export function createCrystalAdmissionGate({ repositoryRoot }) {
  if (typeof repositoryRoot !== "string" || repositoryRoot.length === 0) {
    reject("repositoryRoot must be a non-empty string");
  }

  return Object.freeze({
    qualify(crystalInput) {
      const crystal = validateCrystal(crystalInput);
      const integrity = verifyCrystalLocalSources(crystal, {
        repoRoot: repositoryRoot
      });

      if (integrity.CRYSTAL_ID !== crystal.CRYSTAL_ID) {
        reject("source integrity CRYSTAL_ID mismatch");
      }
      if (integrity.VERDICT !== "PASS") {
        reject("source integrity must PASS; got " + integrity.VERDICT);
      }
      if (
        integrity.COUNTS.TOTAL !== crystal.SOURCE_REFS.length ||
        integrity.COUNTS.PASS !== crystal.SOURCE_REFS.length ||
        integrity.COUNTS.FAIL !== 0 ||
        integrity.COUNTS.NOT_VERIFIED !== 0
      ) {
        reject("source integrity counts are not fully verified");
      }

      return deepFreeze({
        SCHEMA: ADMISSION_SCHEMA,
        VERSION: "0.1",
        CRYSTAL_ID: crystal.CRYSTAL_ID,
        PAYLOAD_H256: crystal.PAYLOAD_H256,
        EVIDENCE_LABEL: crystal.EVIDENCE_LABEL,
        SOURCE_INTEGRITY_SCHEMA: integrity.SCHEMA,
        SOURCE_INTEGRITY_VERDICT: "PASS",
        VERIFIED_SOURCE_COUNT: integrity.COUNTS.PASS,
        STATUS: "ADMISSIBLE",
        REGISTRY_WRITE_PERFORMED: false,
        MUTATION_PERFORMED: false,
        NETWORK_USED: false,
        PROCESS_EXECUTION_USED: false,
        WORLD_ROUTER_INVOKED: false,
        PROOF_PROMOTION: false
      });
    }
  });
}

export const BRUTUS_CRYSTAL_ADMISSION_SCHEMA = ADMISSION_SCHEMA;
