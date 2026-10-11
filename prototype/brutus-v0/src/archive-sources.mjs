import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function checks(result) {
  return Array.isArray(result?.CHECK_RESULTS)
    ? result.CHECK_RESULTS.map((item) => ({ id: item.CHECK_ID, status: item.STATUS }))
    : [];
}

export async function readPellArchive({ repoRoot = REPO_ROOT } = {}) {
  const relationPath = join(repoRoot, 'examples', 'records', 'BRUTUS-RECORD-BRUTUS-PELL-L7-L8-0001.json');
  const resultPath = join(repoRoot, 'examples', 'results', 'BRUTUS-COUNTER-RESULT-BRUTUS-PELL-L8-EXACT-WITNESS-0004.json');
  try {
    const [record, result] = await Promise.all([readJson(relationPath), readJson(resultPath)]);
    const ct03 = result.CHECK_RESULTS?.find((item) => item.CHECK_ID === 'CT-03');
    return {
      available: true,
      source_mode: 'ARCHIVE_READ_ONLY',
      record_id: record.RECORD_ID ?? null,
      claim_status: record.DATA?.claim_status ?? null,
      relation: record.DATA?.L8?.Q_q ?? null,
      domain: record.DATA?.L8?.q_domain ?? null,
      novelty_boundary: record.DATA?.L8?.novelty_boundary ?? null,
      result_id: result.RESULT_ID ?? null,
      verdict: result.VERDICT ?? null,
      evidence_level: result.EVIDENCE_LEVEL ?? null,
      proof_ref: result.PROOF_REF ?? null,
      auto_proof_promotion: result.AUTO_PROOF_PROMOTION ?? false,
      executed_at_utc: result.EXECUTED_AT_UTC ?? null,
      checks: checks(result),
      witness: ct03?.OBSERVED ? {
        q: ct03.OBSERVED.q_targeted ?? null,
        prime_factor: ct03.OBSERVED.prime_factor ?? null,
        exact_rank: ct03.OBSERVED.exact_rank ?? null,
        expected_rank: ct03.OBSERVED.expected_rank ?? null,
        primality_verified: ct03.OBSERVED.factor_primality_verified ?? null,
        witness: ct03.OBSERVED.witness ?? false,
      } : null,
      summary: result.SUMMARY ?? null,
      source_files: [relationPath, resultPath],
    };
  } catch (error) {
    return {
      available: false,
      source_mode: 'ARCHIVE_READ_ONLY',
      error: String(error?.message || error),
      proof_ref: null,
      auto_proof_promotion: false,
    };
  }
}

export async function readZelArchive({ repoRoot = REPO_ROOT } = {}) {
  const recordPath = join(repoRoot, 'examples', 'records', 'BRUTUS-RECORD-ZELSTEREOS-369-396-0001.json');
  const resultPath = join(repoRoot, 'examples', 'results', 'BRUTUS-COUNTER-RESULT-ZELSTEREOS-369-396-0001.json');
  try {
    const [record, result] = await Promise.all([readJson(recordPath), readJson(resultPath)]);
    const ct03 = result.CHECK_RESULTS?.find((item) => item.CHECK_ID === 'CT-03');
    const ct04 = result.CHECK_RESULTS?.find((item) => item.CHECK_ID === 'CT-04');
    return {
      available: true,
      source_mode: 'ARCHIVE_READ_ONLY',
      record_id: record.RECORD_ID ?? null,
      claim_status: record.DATA?.claim_status ?? null,
      inputs: record.DATA?.inputs ?? [],
      result_id: result.RESULT_ID ?? null,
      verdict: result.VERDICT ?? null,
      evidence_level: result.EVIDENCE_LEVEL ?? null,
      proof_ref: result.PROOF_REF ?? null,
      auto_proof_promotion: result.AUTO_PROOF_PROMOTION ?? false,
      executed_at_utc: result.EXECUTED_AT_UTC ?? null,
      protocol_version: result.PROTOCOL_VERSION ?? null,
      checks: checks(result),
      machine: ct03?.OBSERVED ? {
        branches_369: ct03.OBSERVED.branches_369 ?? null,
        branches_396: ct03.OBSERVED.branches_396 ?? null,
        inverse_369: ct03.OBSERVED.inverse_369 ?? null,
        inverse_396: ct03.OBSERVED.inverse_396 ?? null,
        audio_369: ct03.OBSERVED.audio_369 ?? null,
        audio_396: ct03.OBSERVED.audio_396 ?? null,
        version: ct03.OBSERVED.zelstereos_version ?? null,
      } : null,
      comparison: ct04?.OBSERVED ? {
        branches_equal: ct04.OBSERVED.branches_equal ?? null,
        branches_different: ct04.OBSERVED.branches_different ?? null,
        total: ct04.OBSERVED.total ?? null,
      } : null,
      summary: result.SUMMARY ?? null,
      source_files: [recordPath, resultPath],
    };
  } catch (error) {
    return {
      available: false,
      source_mode: 'ARCHIVE_READ_ONLY',
      error: String(error?.message || error),
      proof_ref: null,
      auto_proof_promotion: false,
    };
  }
}
