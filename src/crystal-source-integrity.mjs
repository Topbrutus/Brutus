import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { validateCrystal } from "./crystal-contract.mjs";

const RESULT_SCHEMA = "BRUTUS-CRYSTAL-SOURCE-INTEGRITY-v0.1";
const LOCAL_SOURCE_KINDS = new Set(["BRUTUS_RECORD", "BRUTUS_PROOF"]);

function reject(reason) {
  throw new Error("CRYSTAL_SOURCE_INTEGRITY_REJECTED: " + reason);
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(".." + path.sep) &&
      !path.isAbsolute(relative))
  );
}

function resolveRepositoryRoot(repoRoot) {
  if (typeof repoRoot !== "string" || repoRoot.length === 0) {
    reject("repoRoot must be a non-empty string");
  }

  let realRoot;
  try {
    realRoot = fs.realpathSync(path.resolve(repoRoot));
  } catch {
    reject("repoRoot must exist");
  }

  if (!fs.statSync(realRoot).isDirectory()) reject("repoRoot must be a directory");
  return realRoot;
}

function resultFor(source, index, status, reason, computedDigest = null) {
  return {
    INDEX: index,
    KIND: source.KIND,
    REF: source.REF,
    DIGEST_ALGORITHM: source.DIGEST_ALGORITHM,
    DECLARED_DIGEST: source.DIGEST,
    COMPUTED_DIGEST: computedDigest,
    STATUS: status,
    REASON: reason
  };
}

export function computeGitBlobSha1(bytes) {
  if (!(bytes instanceof Uint8Array)) reject("git blob input must be bytes");
  const buffer = Buffer.from(bytes);
  const header = Buffer.from(`blob ${buffer.length}\0`, "utf8");
  return createHash("sha1").update(header).update(buffer).digest("hex");
}

export function verifyCrystalLocalSources(crystalInput, { repoRoot } = {}) {
  const crystal = validateCrystal(crystalInput);
  const root = resolveRepositoryRoot(repoRoot);
  const sourceResults = [];

  crystal.SOURCE_REFS.forEach((source, index) => {
    if (!LOCAL_SOURCE_KINDS.has(source.KIND)) {
      sourceResults.push(
        resultFor(source, index, "NOT_VERIFIED", "UNSUPPORTED_SOURCE_KIND")
      );
      return;
    }

    if (source.DIGEST_ALGORITHM !== "GIT_SHA1") {
      sourceResults.push(
        resultFor(source, index, "NOT_VERIFIED", "UNSUPPORTED_DIGEST_ALGORITHM")
      );
      return;
    }

    const lexicalPath = path.resolve(root, source.REF);
    if (!isInside(root, lexicalPath)) {
      sourceResults.push(resultFor(source, index, "FAIL", "PATH_OUTSIDE_REPOSITORY"));
      return;
    }

    if (!fs.existsSync(lexicalPath)) {
      sourceResults.push(resultFor(source, index, "FAIL", "SOURCE_MISSING"));
      return;
    }

    let realPath;
    try {
      realPath = fs.realpathSync(lexicalPath);
    } catch {
      sourceResults.push(resultFor(source, index, "FAIL", "SOURCE_UNRESOLVABLE"));
      return;
    }

    if (!isInside(root, realPath)) {
      sourceResults.push(resultFor(source, index, "FAIL", "PATH_OUTSIDE_REPOSITORY"));
      return;
    }

    let stat;
    try {
      stat = fs.statSync(realPath);
    } catch {
      sourceResults.push(resultFor(source, index, "FAIL", "SOURCE_UNREADABLE"));
      return;
    }

    if (!stat.isFile()) {
      sourceResults.push(resultFor(source, index, "FAIL", "SOURCE_NOT_FILE"));
      return;
    }

    let bytes;
    try {
      bytes = fs.readFileSync(realPath);
    } catch {
      sourceResults.push(resultFor(source, index, "FAIL", "SOURCE_UNREADABLE"));
      return;
    }

    const computedDigest = computeGitBlobSha1(bytes);
    if (computedDigest !== source.DIGEST.toLowerCase()) {
      sourceResults.push(
        resultFor(source, index, "FAIL", "DIGEST_MISMATCH", computedDigest)
      );
      return;
    }

    sourceResults.push(resultFor(source, index, "PASS", "DIGEST_MATCH", computedDigest));
  });

  const counts = {
    TOTAL: sourceResults.length,
    PASS: sourceResults.filter((item) => item.STATUS === "PASS").length,
    FAIL: sourceResults.filter((item) => item.STATUS === "FAIL").length,
    NOT_VERIFIED: sourceResults.filter((item) => item.STATUS === "NOT_VERIFIED").length
  };

  const verdict =
    counts.FAIL > 0 ? "FAIL" : counts.NOT_VERIFIED > 0 ? "INCONCLUSIVE" : "PASS";

  return deepFreeze({
    SCHEMA: RESULT_SCHEMA,
    VERSION: "0.1",
    CRYSTAL_ID: crystal.CRYSTAL_ID,
    REPOSITORY_SCOPE: "CALLER_SUPPLIED_LOCAL_ROOT",
    VERDICT: verdict,
    SOURCE_RESULTS: sourceResults,
    COUNTS: counts,
    MUTATION_PERFORMED: false,
    NETWORK_USED: false,
    PROCESS_EXECUTION_USED: false,
    WORLD_ROUTER_INVOKED: false,
    PROOF_PROMOTION: false
  });
}

export const BRUTUS_CRYSTAL_SOURCE_INTEGRITY_SCHEMA = RESULT_SCHEMA;
