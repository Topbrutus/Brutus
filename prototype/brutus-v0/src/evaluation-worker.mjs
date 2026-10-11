import { readQueenEvents, reduceQueenState, createTask } from './queen-ledger.mjs';
import { evaluateCandidate } from './evaluator.mjs';

function hasEvaluationTask(state, candidateId, gate) {
  return state.tasks.some((task) =>
    task.target === candidateId &&
    task?.payload?.evaluation_gate === gate &&
    !['FAILED', 'BLOCKED'].includes(task.status),
  );
}

export async function dispatchEvaluationTasks(path, { maxNew = 4 } = {}) {
  let state = reduceQueenState(await readQueenEvents(path));
  const created = [];

  for (const candidate of state.candidates) {
    if (created.length >= maxNew) break;
    const evaluation = candidate.evaluation || evaluateCandidate(candidate);
    const action = evaluation.next_action;
    if (!action || evaluation.ready_for_astra || evaluation.counterexample_found) continue;
    if (hasEvaluationTask(state, candidate.candidate_id, action.gate)) continue;

    const task = await createTask(path, {
      kind: action.kind,
      target: candidate.candidate_id,
      title: action.title,
      permissions: action.permissions,
      payload: {
        evaluation_gate: action.gate,
        evaluation_hash: evaluation.evaluation_hash,
        auto_gate_promotion: false,
        auto_proof_promotion: false,
      },
    });
    created.push(task.task_id);
    state = reduceQueenState(await readQueenEvents(path));
  }

  return { status: 'OK', created, candidate_count: state.candidates.length };
}

export function startEvaluationWorker(path, {
  intervalMs = 45_000,
  onError = console.error,
} = {}) {
  let busy = false;
  const run = async () => {
    if (busy) return;
    busy = true;
    try { await dispatchEvaluationTasks(path); }
    catch (error) { onError(error); }
    finally { busy = false; }
  };
  run();
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
