import { createHash } from 'node:crypto';
import { readBrotoculateur } from './brotoculateur.mjs';
import {
  readQueenEvents, reduceQueenState, createCandidate, setCandidateGate,
  createTask, reportTask,
} from './queen-ledger.mjs';

const MIN_SHARED = 6;
const MAX_ABS_AFFINE = 1_000_000n;

function asInteger(value) {
  const text = String(value ?? '');
  return /^-?\d+$/.test(text) ? BigInt(text) : null;
}

function abs(value) {
  return value < 0n ? -value : value;
}

function sampleMap(crystal) {
  const map = new Map();
  for (const sample of crystal?.samples || []) {
    if (sample?.validation_state && sample.validation_state !== 'EXACT') continue;
    const input = asInteger(sample?.input);
    const output = asInteger(sample?.output);
    if (input === null || output === null) continue;
    if (!map.has(input.toString())) map.set(input.toString(), { input, output });
  }
  return map;
}

function sharedRows(a, b) {
  const ma = sampleMap(a);
  const mb = sampleMap(b);
  const rows = [];
  for (const [key, av] of ma) {
    const bv = mb.get(key);
    if (bv) rows.push({ input: av.input, a: av.output, b: bv.output });
  }
  return rows.sort((x, y) => x.input < y.input ? -1 : x.input > y.input ? 1 : 0);
}

function splitRows(rows) {
  const train = rows.filter((_, index) => index % 2 === 0);
  const holdout = rows.filter((_, index) => index % 2 === 1);
  return { train, holdout };
}

function allMatch(rows, evaluator) {
  return rows.length > 0 && rows.every((row) => evaluator(row.a) === row.b);
}

function signedTerm(value) {
  if (value === 0n) return '';
  return value > 0n ? ` + ${value}` : ` - ${-value}`;
}

function affineExpression(target, source, a, b) {
  const factor = a === 1n ? '' : a === -1n ? '-' : `${a}*`;
  return `${target}(n) = ${factor}${source}(n)${signedTerm(b)}`;
}

function shiftedSquareExpression(target, source, shift) {
  const inside = shift === 0n ? `${source}(n)` : `${source}(n)${signedTerm(shift)}`;
  return `${target}(n) = (${inside})^2`;
}

function fingerprint(expression, sourceA, sourceB, method) {
  return createHash('sha256').update(`${method}\n${sourceA}\n${sourceB}\n${expression}`).digest('hex');
}

function suggestion(base, expression, method, train, holdout, complexity) {
  return {
    ...base,
    expression,
    method,
    complexity,
    shared_count: train.length + holdout.length,
    train_inputs: train.map((row) => row.input.toString()),
    holdout_inputs: holdout.map((row) => row.input.toString()),
    fingerprint: fingerprint(expression, base.source_formula, base.target_formula, method),
  };
}

function mineDirection(sourceCrystal, targetCrystal) {
  const rows = sharedRows(sourceCrystal, targetCrystal);
  if (rows.length < MIN_SHARED) return [];
  const { train, holdout } = splitRows(rows);
  if (train.length < 3 || holdout.length < 3) return [];

  const base = {
    source_formula: sourceCrystal.formula_id,
    target_formula: targetCrystal.formula_id,
    source_crystal_ids: [sourceCrystal.crystal_id, targetCrystal.crystal_id],
    source_hashes: [sourceCrystal.hash, targetCrystal.hash],
  };
  const found = [];

  let p1 = null;
  let p2 = null;
  for (const row of train) {
    if (!p1) p1 = row;
    else if (row.a !== p1.a) { p2 = row; break; }
  }
  if (p1 && p2) {
    const da = p2.a - p1.a;
    const db = p2.b - p1.b;
    if (da !== 0n && db % da === 0n) {
      const coefficient = db / da;
      const intercept = p1.b - coefficient * p1.a;
      if (abs(coefficient) <= MAX_ABS_AFFINE && !(coefficient === 1n && intercept === 0n)) {
        const evaluator = (x) => coefficient * x + intercept;
        if (allMatch(train, evaluator) && allMatch(holdout, evaluator)) {
          found.push(suggestion(
            base,
            affineExpression(base.target_formula, base.source_formula, coefficient, intercept),
            'INTEGER_AFFINE', train, holdout, 1,
          ));
        }
      }
    }
  }

  for (let c = -5n; c <= 5n; c += 1n) {
    const evaluator = (x) => (x + c) * (x + c);
    if (allMatch(train, evaluator) && allMatch(holdout, evaluator)) {
      found.push(suggestion(
        base,
        shiftedSquareExpression(base.target_formula, base.source_formula, c),
        'SHIFTED_SQUARE', train, holdout, 2,
      ));
      break;
    }
  }

  return found;
}

export function discoverRelations(brotoculateur, { maxSuggestions = 6 } = {}) {
  const crystals = (brotoculateur?.latest_crystals || [])
    .filter((crystal) => crystal?.formula_id && (crystal?.samples?.length || 0) >= MIN_SHARED);
  const results = [];
  const seen = new Set();

  for (let i = 0; i < crystals.length; i += 1) {
    for (let j = i + 1; j < crystals.length; j += 1) {
      for (const candidate of [
        ...mineDirection(crystals[i], crystals[j]),
        ...mineDirection(crystals[j], crystals[i]),
      ]) {
        if (seen.has(candidate.fingerprint)) continue;
        seen.add(candidate.fingerprint);
        results.push(candidate);
      }
    }
  }

  return results
    .sort((a, b) => b.shared_count - a.shared_count || a.complexity - b.complexity || a.expression.localeCompare(b.expression))
    .slice(0, maxSuggestions);
}

function sameFingerprint(candidate, relation) {
  return candidate?.metadata?.fingerprint === relation.fingerprint;
}

function freshCrystals(candidate, relation) {
  const initial = candidate?.metadata?.source_hashes || [];
  const current = relation.source_hashes || [];
  return initial.length === current.length && current.length > 0 && current.every((hash, index) => hash && hash !== initial[index]);
}

async function ensureBoundedCounterTest(path, state, candidate, relation) {
  if (candidate.gates?.COUNTER_TESTED) return null;
  let task = state.tasks.find((item) => item.kind === 'COUNTER_TEST' && item.target === candidate.candidate_id);
  if (!task) {
    task = await createTask(path, {
      kind: 'COUNTER_TEST',
      target: candidate.candidate_id,
      title: `Contre-test local sur échantillon réservé · ${relation.expression}`,
      permissions: ['READ', 'COMPUTE', 'TEST', 'REPORT'],
      payload: {
        method: relation.method,
        holdout_inputs: relation.holdout_inputs,
        evidence_scope: 'CURRENT_LIVE_CRYSTALS_ONLY',
      },
    });
  }
  if (task.status !== 'COMPLETE') {
    await reportTask(path, {
      task_id: task.task_id,
      ant_id: 'ANT-COUNTERTEST-LOCAL-001',
      status: 'COMPLETE',
      result: {
        passed: true,
        holdout_count: relation.holdout_inputs.length,
        scope: 'BOUNDED_LOCAL_HOLDOUT',
        proof: false,
      },
    });
  }
  await setCandidateGate(path, {
    candidate_id: candidate.candidate_id,
    gate: 'COUNTER_TESTED',
    value: true,
    note: `BOUNDED_LOCAL_HOLDOUT passed=${relation.holdout_inputs.length}; this is not an external proof`,
  });
  return task;
}

export async function runDiscoveryCycle(path, {
  readSource = readBrotoculateur,
  maxNew = 3,
  maxSuggestions = 6,
} = {}) {
  const source = await readSource();
  if (!source?.reachable) return { status: 'SOURCE_OFFLINE', created: [], reproduced: [], suggestions: [] };
  const suggestions = discoverRelations(source, { maxSuggestions });
  let state = reduceQueenState(await readQueenEvents(path));
  const created = [];
  const reproduced = [];

  for (const relation of suggestions) {
    let candidate = state.candidates.find((item) => sameFingerprint(item, relation));

    if (!candidate && created.length < maxNew) {
      const event = await createCandidate(path, {
        title: `Relation détectée · ${relation.source_formula} ↔ ${relation.target_formula}`,
        expression: relation.expression,
        domain: `Entrées entières partagées; ${relation.shared_count} observations dans les cristaux live du cycle`,
        classification: 'RELATION_CANDIDATE',
        origin: 'BRUTUS_DISCOVERY',
        metadata: {
          fingerprint: relation.fingerprint,
          method: relation.method,
          source_formula: relation.source_formula,
          target_formula: relation.target_formula,
          source_crystal_ids: relation.source_crystal_ids,
          source_hashes: relation.source_hashes,
          train_inputs: relation.train_inputs,
          holdout_inputs: relation.holdout_inputs,
        },
      });
      candidate = reduceQueenState(await readQueenEvents(path)).candidates.find((item) => item.candidate_id === event.candidate_id);
      await setCandidateGate(path, {
        candidate_id: candidate.candidate_id,
        gate: 'OBSERVED',
        value: true,
        note: `Automated pattern scan on ${relation.shared_count} shared live observations`,
      });
      await setCandidateGate(path, {
        candidate_id: candidate.candidate_id,
        gate: 'PROVENANCE',
        value: true,
        note: `crystals=${relation.source_crystal_ids.join(',')} hashes=${relation.source_hashes.filter(Boolean).join(',')}`,
      });
      state = reduceQueenState(await readQueenEvents(path));
      candidate = state.candidates.find((item) => item.candidate_id === event.candidate_id);
      await ensureBoundedCounterTest(path, state, candidate, relation);
      created.push(candidate.candidate_id);
      state = reduceQueenState(await readQueenEvents(path));
      continue;
    }

    if (candidate) {
      if (!candidate.gates?.OBSERVED) {
        await setCandidateGate(path, {
          candidate_id: candidate.candidate_id,
          gate: 'OBSERVED',
          value: true,
          note: `Automated pattern scan on ${relation.shared_count} shared live observations`,
        });
      }
      if (!candidate.gates?.PROVENANCE) {
        await setCandidateGate(path, {
          candidate_id: candidate.candidate_id,
          gate: 'PROVENANCE',
          value: true,
          note: `crystals=${relation.source_crystal_ids.join(',')} hashes=${relation.source_hashes.filter(Boolean).join(',')}`,
        });
      }
      state = reduceQueenState(await readQueenEvents(path));
      candidate = state.candidates.find((item) => item.candidate_id === candidate.candidate_id);
      await ensureBoundedCounterTest(path, state, candidate, relation);
      state = reduceQueenState(await readQueenEvents(path));
      candidate = state.candidates.find((item) => item.candidate_id === candidate.candidate_id);
    }

    if (candidate && !candidate.gates?.REPRODUCED && freshCrystals(candidate, relation)) {
      await setCandidateGate(path, {
        candidate_id: candidate.candidate_id,
        gate: 'REPRODUCED',
        value: true,
        note: `Relation observed again on fresh crystal hashes: ${relation.source_hashes.filter(Boolean).join(',')}`,
      });
      reproduced.push(candidate.candidate_id);
      state = reduceQueenState(await readQueenEvents(path));
    }
  }

  return { status: 'OK', created, reproduced, suggestions };
}

export function startDiscoveryWorker(path, {
  intervalMs = 60_000,
  readSource = readBrotoculateur,
  onError = console.error,
} = {}) {
  let busy = false;
  const run = async () => {
    if (busy) return;
    busy = true;
    try { await runDiscoveryCycle(path, { readSource }); }
    catch (error) { onError(error); }
    finally { busy = false; }
  };
  run();
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
