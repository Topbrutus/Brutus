import { createHash } from 'node:crypto';

export const EVALUATION_SCHEMA = 'BRUTUS-EVALUATION-v0.1';
export const REQUIRED_CANDIDATE_GATES = [
  'OBSERVED',
  'PROVENANCE',
  'COUNTER_TESTED',
  'REPRODUCED',
  'PRIOR_ART_CHECKED',
  'NOVELTY_CLEARED',
];

const ACTION_BY_GATE = {
  OBSERVED: { kind: 'VERIFY', title: 'Mesurer le candidat sur une source traçable' },
  PROVENANCE: { kind: 'ARCHIVE', title: 'Attacher les sources, versions et hashes de provenance' },
  COUNTER_TESTED: { kind: 'COUNTER_TEST', title: 'Chercher activement un contre-exemple' },
  REPRODUCED: { kind: 'VERIFY', title: 'Reproduire le résultat sur une exécution ou des cristaux indépendants' },
  PRIOR_ART_CHECKED: { kind: 'RESEARCH', title: 'Vérifier l’antériorité et documenter les références trouvées' },
  NOVELTY_CLEARED: { kind: 'VERIFY', title: 'Évaluer la nouveauté après la recherche d’antériorité' },
};

function digest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function gateValue(candidate, gate) {
  return candidate?.gates?.[gate] === true;
}

export function evaluateCandidate(candidate) {
  if (!candidate?.candidate_id) throw new Error('INVALID_EVALUATION_CANDIDATE');
  const counterexample = gateValue(candidate, 'COUNTEREXAMPLE_FOUND');
  const gates = Object.fromEntries(
    [...REQUIRED_CANDIDATE_GATES, 'COUNTEREXAMPLE_FOUND'].map((gate) => [gate, gateValue(candidate, gate)]),
  );
  const missing_gates = REQUIRED_CANDIDATE_GATES.filter((gate) => !gates[gate]);
  const passed_gates = REQUIRED_CANDIDATE_GATES.filter((gate) => gates[gate]);
  const ready_for_astra = !counterexample && missing_gates.length === 0;
  const next_gate = counterexample ? null : (missing_gates[0] ?? null);
  const action = next_gate ? ACTION_BY_GATE[next_gate] : null;

  const core = {
    schema: EVALUATION_SCHEMA,
    object_id: candidate.candidate_id,
    object_type: 'FORMULA_CANDIDATE',
    source: candidate.source || candidate.origin || 'UNKNOWN',
    measured: gates.OBSERVED,
    reproduced: gates.REPRODUCED,
    counter_tested: gates.COUNTER_TESTED,
    provenance: gates.PROVENANCE,
    prior_art_checked: gates.PRIOR_ART_CHECKED,
    novelty_cleared: gates.NOVELTY_CLEARED,
    counterexample_found: counterexample,
    evidence_class: candidate.classification || 'RELATION_CANDIDATE',
    proof_ref: candidate.proof_ref ?? null,
    auto_proof_promotion: false,
    required_gates: [...REQUIRED_CANDIDATE_GATES],
    passed_gates,
    missing_gates,
    publication_state: counterexample ? 'BLOCKED_COUNTEREXAMPLE' : (ready_for_astra ? 'READY_FOR_ASTRA' : 'BLOCKED'),
    ready_for_astra,
    next_action: action ? {
      gate: next_gate,
      kind: action.kind,
      target: candidate.candidate_id,
      title: action.title,
      permissions: ['READ', 'COMPUTE', 'TEST', 'REPORT'],
    } : (counterexample ? {
      gate: 'COUNTEREXAMPLE_FOUND',
      kind: 'VERIFY',
      target: candidate.candidate_id,
      title: 'Examiner le contre-exemple avant toute autre promotion',
      permissions: ['READ', 'COMPUTE', 'TEST', 'REPORT'],
    } : null),
  };

  return { ...core, evaluation_hash: digest(core) };
}

export function evaluateTask(task) {
  if (!task?.task_id) throw new Error('INVALID_EVALUATION_TASK');
  const reports = Array.isArray(task.reports) ? task.reports : [];
  const core = {
    schema: EVALUATION_SCHEMA,
    object_id: task.task_id,
    object_type: 'ANT_TASK',
    source: task.source || 'BRUTUS_QUEEN',
    measured: reports.length > 0,
    reproduced: false,
    counter_tested: task.kind === 'COUNTER_TEST' && reports.some((r) => r.status === 'COMPLETE'),
    provenance: Boolean(task.hash),
    prior_art_checked: task.kind === 'RESEARCH' && reports.some((r) => r.status === 'COMPLETE'),
    novelty_cleared: false,
    counterexample_found: reports.some((r) => r?.result?.counterexample === true),
    evidence_class: 'TASK_TRACE',
    proof_ref: task.proof_ref ?? null,
    auto_proof_promotion: false,
    publication_state: 'NOT_APPLICABLE',
    status: task.status || 'OPEN',
    report_count: reports.length,
    next_action: reports.length ? null : { kind: task.kind, target: task.target, title: 'Attendre ou exécuter la mission assignée' },
  };
  return { ...core, evaluation_hash: digest(core) };
}

export function evaluateCrystal(crystal) {
  const object_id = crystal?.crystal_id ?? crystal?.CRYSTAL_ID ?? null;
  if (!object_id) throw new Error('INVALID_EVALUATION_CRYSTAL');
  const level = crystal?.level ?? crystal?.LEVEL ?? null;
  const coverage = crystal?.coverage ?? crystal?.COVERAGE ?? null;
  const crystalHash = crystal?.hash ?? crystal?.CRYSTAL_H256 ?? null;
  const evidenceClass = crystal?.evidence_class ?? crystal?.EVIDENCE_CLASS ?? 'PACKAGED_OBSERVATION';
  const proofRef = crystal?.proof_ref ?? crystal?.PROOF_REF ?? null;
  const core = {
    schema: EVALUATION_SCHEMA,
    object_id,
    object_type: 'CRYSTAL',
    source: 'BROTOCULATEUR',
    measured: level !== null && coverage !== null,
    reproduced: false,
    counter_tested: false,
    provenance: Boolean(crystalHash),
    prior_art_checked: false,
    novelty_cleared: false,
    counterexample_found: false,
    evidence_class: evidenceClass,
    proof_ref: proofRef,
    auto_proof_promotion: false,
    publication_state: 'NOT_APPLICABLE',
    level,
    coverage,
    source_hash: crystalHash,
    next_action: null,
  };
  return { ...core, evaluation_hash: digest(core) };
}

export function evaluateModule(module) {
  if (!module?.id) throw new Error('INVALID_EVALUATION_MODULE');
  const live = ['RUNNING', 'QUEEN_BUS_READY', 'FRESCO_READY', 'READY', 'ARCHIVE_PASS'].includes(module.status);
  const core = {
    schema: EVALUATION_SCHEMA,
    object_id: module.id,
    object_type: 'MODULE',
    source: 'BRUTUS_RUNTIME',
    measured: live,
    reproduced: false,
    counter_tested: false,
    provenance: false,
    prior_art_checked: false,
    novelty_cleared: false,
    counterexample_found: false,
    evidence_class: 'RUNTIME_STATUS',
    proof_ref: null,
    auto_proof_promotion: false,
    publication_state: 'NOT_APPLICABLE',
    status: module.status,
    next_action: live ? null : { kind: 'VERIFY', target: module.id, title: 'Rétablir ou vérifier la source du module' },
  };
  return { ...core, evaluation_hash: digest(core) };
}

export function summarizeEvaluations(candidates = []) {
  const evaluations = candidates.map((candidate) => candidate.evaluation || evaluateCandidate(candidate));
  return {
    schema: EVALUATION_SCHEMA,
    total: evaluations.length,
    ready_for_astra: evaluations.filter((e) => e.ready_for_astra).length,
    blocked: evaluations.filter((e) => e.publication_state === 'BLOCKED').length,
    blocked_counterexample: evaluations.filter((e) => e.publication_state === 'BLOCKED_COUNTEREXAMPLE').length,
    needing_prior_art: evaluations.filter((e) => e.missing_gates?.includes('PRIOR_ART_CHECKED')).length,
    needing_novelty_review: evaluations.filter((e) => e.missing_gates?.includes('NOVELTY_CLEARED')).length,
  };
}
