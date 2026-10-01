import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

export function pellMod(n, modulus) {
  const m = BigInt(modulus);
  if (m <= 1n) throw new Error("modulus must be > 1");

  let a = 0n;
  let b = 1n;
  for (let i = 0; i < Number(n); i += 1) {
    const next = (2n * b + a) % m;
    a = b % m;
    b = next;
  }
  return a;
}

export function parseFirstFactor(output, n) {
  const N = BigInt(n);
  const patterns = [
    /Factor found(?: in step \d+)?:\s*(\d+)/g,
    /Found (?:probable )?prime factor of \d+ digits:\s*(\d+)/g,
    /Found factor of \d+ digits:\s*(\d+)/g
  ];

  for (const pattern of patterns) {
    for (const match of output.matchAll(pattern)) {
      const f = BigInt(match[1]);
      if (f > 1n && f < N && N % f === 0n) return f;
    }
  }
  return null;
}

export function verifyPrimeFactorRank({ q, Q, factor }) {
  const qq = BigInt(q);
  const n = BigInt(Q);
  const r = BigInt(factor);

  if (r <= 1n || r > n || n % r !== 0n) {\n    throw new Error("factor does not divide Q_q");\n  }

  const qNumber = Number(q);
  const q2Number = qNumber * qNumber;
  const p1 = pellMod(1, r);
  const pq = pellMod(qNumber, r);
  const pq2 = pellMod(q2Number, r);

  let exactRank = null;
  if (p1 === 0n) exactRank = 1;
  else if (pq === 0n) exactRank = qNumber;
  else if (pq2 === 0n) exactRank = q2Number;

  return Object.freeze({
    q: qNumber,
    prime_factor: r.toString(),
    Q_q_mod_factor: (n % r).toString(),
    P_1_mod_factor: p1.toString(),
    P_q_mod_factor: pq.toString(),
    P_q2_mod_factor: pq2.toString(),
    exact_rank: exactRank,
    witness: exactRank === q2Number
  });
}

export function loadQ47(sourcePath = path.join(
  repoRoot,
  "examples/results/BRUTUS-COUNTER-RESULT-BRUTUS-PELL-L8-PARTIAL-0001.json"
)) {
  const raw = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const ct02 = raw.CHECK_RESULTS.find((item) => item.CHECK_ID === "CT-02");
  if (!ct02?.OBSERVED?.q_47?.Q_q) {
    throw new Error("recorded Q_47 not found");
  }
  return ct02.OBSERVED.q_47;
}

function parseArgs(argv) {
  const out = {
    ecmBin: "ecm",
    curves: 100,
    b1: "1e6",
    b2: null,
    source: null,
    printCommand: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--ecm-bin") out.ecmBin = argv[++i];
    else if (arg === "--curves") out.curves = Number(argv[++i]);
    else if (arg === "--b1") out.b1 = argv[++i];
    else if (arg === "--b2") out.b2 = argv[++i];
    else if (arg === "--source") out.source = argv[++i];
    else if (arg === "--print-command") out.printCommand = true;
    else throw new Error("unknown argument " + arg);
  }

  if (!Number.isInteger(out.curves) || out.curves < 1) {
    throw new Error("--curves must be a positive integer");
  }
  return out;
}

export function buildEcmArgs({ curves, b1, b2 }) {
  const args = ["-one", "-c", String(curves), String(b1)];
  if (b2 !== null) args.push(String(b2));
  return args;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const q47 = loadQ47(options.source || undefined);
  const N = BigInt(q47.Q_q);
  const args = buildEcmArgs(options);

  if (options.printCommand) {
    process.stdout.write(JSON.stringify({
      executable: options.ecmBin,
      args,
      input_digits: q47.Q_digits,
      input_sha256: q47.Q_sha256
    }, null, 2) + "\n");
    return;
  }

  const run = spawnSync(options.ecmBin, args, {
    input: q47.Q_q + "\n",
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });

  if (run.error) {
    throw new Error(
      "GMP-ECM execution failed: " + run.error.message +
      ". Install a native ecm binary or pass --ecm-bin."
    );
  }

  const output = (run.stdout || "") + "\n" + (run.stderr || "");
  const factor = parseFirstFactor(output, N);

  if (factor === null) {
    process.stdout.write(JSON.stringify({
      status: "NO_FACTOR_IN_BOUNDED_CAMPAIGN",
      q: 47,
      curves: options.curves,
      B1: options.b1,
      B2: options.b2,
      Q_digits: q47.Q_digits,
      Q_sha256: q47.Q_sha256
    }, null, 2) + "\n");
    process.exitCode = 2;
    return;
  }

  const verification = verifyPrimeFactorRank({
    q: 47,
    Q: N,
    factor
  });

  process.stdout.write(JSON.stringify({
    status: "FACTOR_FOUND",
    method: "GMP-ECM",
    curves_requested: options.curves,
    B1: options.b1,
    B2: options.b2,
    Q_digits: q47.Q_digits,
    Q_sha256: q47.Q_sha256,
    ...verification
  }, null, 2) + "\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
