const $ = (s) => document.querySelector(s);
const fmt = (v) => v === null || v === undefined ? '—' : new Intl.NumberFormat('fr-CA').format(v);
const pct = (v) => v === null || v === undefined ? '—' : `${new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 2 }).format(Number(v) * 100)} %`;
const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

const descriptions = {
  BROTOCULATEUR: 'Forge mathématique vivante · lecture seule',
  'BRUTUS-PELL': 'Relations, portes et contre-tests',
  ZELSTEREOS: 'Signal / fréquence / provenance',
  FOURMIS: 'Bus Reine ↔ travailleuses',
  BRUTOTABLEUR: 'Fresque des connaissances',
  'ASTRA-MAILBOX': 'Dernier sas avant publication',
};

async function post(url, payload = {}) {
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `HTTP_${response.status}`);
  return result;
}

function renderLive(state, queen) {
  const b = state.brotoculateur;
  $('#brotoState').textContent = b.reachable ? b.state : 'OFFLINE';
  $('#pellState').textContent = state.pell?.available ? `${state.pell.verdict} · ARCHIVE` : 'WAITING';
  $('#zelState').textContent = state.zel?.available ? `${state.zel.verdict} · ARCHIVE` : 'WAITING';
  $('#packets').textContent = fmt(b.processed_packets);
  $('#crystals').textContent = fmt(b.crystals);
  $('#papillon').textContent = b.papillon?.enabled ? `${pct(b.papillon.cache_hit_rate)} · ×${fmt(b.papillon.logical_to_physical_ratio)}` : 'OFF';
  $('#sentinels').textContent = `${fmt(b.sentinels?.survived)}/${fmt(b.sentinels?.total)}`;
  $('#obsCount').textContent = fmt(queen.counts?.observations || 0);
  $('#taskCount').textContent = `${queen.counts?.tasks || 0} mission${queen.counts?.tasks === 1 ? '' : 's'}`;
  $('#mailCount').textContent = `${queen.counts?.mailbox || 0} quête${queen.counts?.mailbox === 1 ? '' : 's'}`;
}

function renderFresco(state) {
  const b = state.brotoculateur;
  const formulas = $('#formulaFresco');
  formulas.innerHTML = '';
  for (const id of b.formula_ids || []) {
    const chip = document.createElement('span');
    chip.className = 'formula-chip';
    chip.textContent = id;
    formulas.appendChild(chip);
  }
  if (state.pell?.available) {
    const chip = document.createElement('span');
    chip.className = 'formula-chip';
    chip.textContent = `L8 · ${state.pell.relation || 'BRUTUS–PELL'}`;
    formulas.appendChild(chip);
  }
  if (state.zel?.available) {
    const chip = document.createElement('span');
    chip.className = 'formula-chip';
    chip.textContent = `ZEL · ${(state.zel.inputs || []).join('↔') || 'ARCHIVE'}`;
    formulas.appendChild(chip);
  }
  if (!formulas.children.length) formulas.innerHTML = '<p class="muted">Aucune formule visible.</p>';

  const crystals = $('#crystalFresco');
  crystals.innerHTML = '';
  for (const c of b.latest_crystals || []) {
    const item = document.createElement('div');
    item.className = 'crystal';
    item.innerHTML = `<span>◆</span><div><strong>${esc(c.formula_id || 'CRISTAL')}</strong><small>${esc(c.crystal_id || '')}</small><em>${esc(c.evidence_class || 'OBSERVATION')} · preuve ${c.proof_ref ? 'liée' : 'non'}</em></div>`;
    crystals.appendChild(item);
  }
  if (!crystals.children.length) crystals.innerHTML = '<p class="muted">Aucun cristal résumé dans la source.</p>';
}

function renderTasks(tasks) {
  $('#openTasks').textContent = fmt(tasks.filter((t) => !['COMPLETE', 'FAILED'].includes(t.status)).length);
  const list = $('#taskList');
  list.innerHTML = '';
  for (const t of tasks.slice(0, 8)) {
    const item = document.createElement('div');
    item.className = 'list-card';
    item.innerHTML = `<div class="row"><strong>${esc(t.kind)}</strong><span class="status">${esc(t.status)}</span></div><p>${esc(t.title)}</p><small>${esc(t.target)} · ${t.reports?.length || 0} rapport(s)</small>`;
    list.appendChild(item);
  }
  if (!list.children.length) list.innerHTML = '<p class="muted">Aucune mission. La Reine attend.</p>';
}

const gateLabels = {
  OBSERVED: 'observé', REPRODUCED: 'reproduit', COUNTER_TESTED: 'contre-testé',
  PROVENANCE: 'provenance', PRIOR_ART_CHECKED: 'antériorité', NOVELTY_CLEARED: 'nouveauté', COUNTEREXAMPLE_FOUND: 'contre-exemple',
};

function renderCandidates(candidates) {
  $('#candidateCount').textContent = fmt(candidates.length);
  const list = $('#candidateList');
  list.innerHTML = '';
  for (const c of candidates.slice(0, 8)) {
    const item = document.createElement('div');
    item.className = `list-card candidate ${c.ready_for_astra ? 'ready' : ''}`;
    const gates = Object.entries(c.gates || {}).map(([gate, value]) => `<button type="button" class="gate ${value ? 'pass' : ''} ${gate === 'COUNTEREXAMPLE_FOUND' && value ? 'danger' : ''}" data-candidate="${esc(c.candidate_id)}" data-gate="${gate}" data-value="${value ? 'false' : 'true'}">${esc(gateLabels[gate] || gate)} ${value ? '✓' : '○'}</button>`).join('');
    item.innerHTML = `<div class="row"><strong>${esc(c.title)}</strong><span class="status">${esc(c.classification)}</span></div><code>${esc(c.expression)}</code><small>${esc(c.domain)}</small><div class="gates">${gates}</div><div class="candidate-actions"><span>${c.ready_for_astra ? 'PRÊT POUR ASTRA' : 'portes incomplètes'}</span><button type="button" class="send-astra" data-send-astra="${esc(c.candidate_id)}" ${c.ready_for_astra ? '' : 'disabled'}>📬 ENVOYER À ASTRA</button></div>`;
    list.appendChild(item);
  }
  if (!list.children.length) list.innerHTML = '<p class="muted">Aucune formule candidate. Les observations restent des observations tant qu’un candidat n’est pas créé.</p>';
}

function renderMailbox(items) {
  const box = $('#mailbox');
  box.innerHTML = '';
  for (const q of items.slice(0, 10)) {
    const item = document.createElement('div');
    item.className = 'letter';
    item.innerHTML = `<div class="stamp">ASTRA</div><div><strong>${esc(q.title)}</strong><p>${esc(q.message)}</p><small>${esc(q.candidate_id)} · ${esc(q.status)}</small><div class="mail-actions"><button type="button" data-quest="${esc(q.quest_id)}" data-status="IN_REVIEW">EN REVUE</button><button type="button" data-quest="${esc(q.quest_id)}" data-status="RETURN_TO_COLONY">RETOUR COLONIE</button><button type="button" data-quest="${esc(q.quest_id)}" data-status="READY_TO_PUBLISH">PRÊT À PUBLIER</button></div></div>`;
    box.appendChild(item);
  }
  if (!box.children.length) box.innerHTML = '<p class="muted">Boîte vide. Brutus n’envoie une quête qu’après les portes minimales.</p>';
}

function renderCards(state) {
  const cards = $('#cards');
  cards.innerHTML = '';
  for (const module of state.modules) {
    const el = document.createElement('article');
    el.className = 'module-card';
    let details = '<div class="waiting">Connecteur prêt · pas encore branché</div>';

    if (module.id === 'BROTOCULATEUR') {
      const live = state.brotoculateur;
      details = `<dl><div><dt>paquets</dt><dd>${fmt(live.processed_packets)}</dd></div><div><dt>cristaux</dt><dd>${fmt(live.crystals)}</dd></div><div><dt>graines</dt><dd>${fmt(live.active_seeds)}</dd></div><div><dt>cache</dt><dd>${pct(live.papillon?.cache_hit_rate)}</dd></div><div><dt>sentinelles</dt><dd>${fmt(live.sentinels?.survived)}/${fmt(live.sentinels?.total)}</dd></div></dl>`;
    } else if (module.id === 'BRUTUS-PELL' && state.pell?.available) {
      const pell = state.pell;
      details = `<dl><div><dt>relation</dt><dd>${esc(pell.relation)}</dd></div><div><dt>verdict archive</dt><dd>${esc(pell.verdict)}</dd></div><div><dt>témoin q</dt><dd>${fmt(pell.witness?.q)}</dd></div><div><dt>rang exact</dt><dd>${fmt(pell.witness?.exact_rank)}</dd></div><div><dt>preuve</dt><dd>${pell.proof_ref ? 'liée' : 'non'}</dd></div></dl>`;
    } else if (module.id === 'ZELSTEREOS' && state.zel?.available) {
      const zel = state.zel;
      details = `<dl><div><dt>entrées</dt><dd>${esc((zel.inputs || []).join(' ↔ '))}</dd></div><div><dt>verdict archive</dt><dd>${esc(zel.verdict)}</dd></div><div><dt>branches diff.</dt><dd>${fmt(zel.comparison?.branches_different)}/${fmt(zel.comparison?.total)}</dd></div><div><dt>retour 369</dt><dd>${esc(zel.machine?.inverse_369)}</dd></div><div><dt>preuve</dt><dd>${zel.proof_ref ? 'liée' : 'non'}</dd></div></dl>`;
    } else if (module.id === 'FOURMIS') {
      details = `<dl><div><dt>missions</dt><dd>${fmt(state.colony?.tasks || 0)}</dd></div><div><dt>candidats</dt><dd>${fmt(state.colony?.candidates || 0)}</dd></div></dl>`;
    } else if (module.id === 'BRUTOTABLEUR') {
      details = `<dl><div><dt>formules live</dt><dd>${fmt(state.brotoculateur?.formula_ids?.length || 0)}</dd></div><div><dt>cristaux visibles</dt><dd>${fmt(state.brotoculateur?.latest_crystals?.length || 0)}</dd></div></dl>`;
    } else if (module.id === 'ASTRA-MAILBOX') {
      details = `<dl><div><dt>quêtes</dt><dd>${fmt(state.colony?.mailbox || 0)}</dd></div><div><dt>auto-publication</dt><dd>NON</dd></div></dl>`;
    }

    const active = ['RUNNING', 'QUEEN_BUS_READY', 'FRESCO_READY', 'ARCHIVE_PASS'].includes(module.status);
    el.innerHTML = `<div class="module-head"><div><p class="eyebrow">${esc(module.id)}</p><h3>${esc(module.status)}</h3></div><span class="dot ${active ? 'on' : ''}"></span></div><p class="muted">${esc(descriptions[module.id] || '')}</p>${details}`;
    cards.appendChild(el);
  }
}
function renderMemory(events = []) {
  $('#memoryCount').textContent = `${events.length} événement${events.length === 1 ? '' : 's'}`;
  const trace = $('#trace');
  trace.innerHTML = '';
  for (const event of events.slice(-12).reverse()) {
    const row = document.createElement('div');
    row.className = 'trace-row';
    row.innerHTML = `<span>${esc(event.kind)}</span><strong>${esc(event.module)}</strong><p></p><time>${new Date(event.at).toLocaleString('fr-CA')}</time>`;
    row.querySelector('p').textContent = event.text;
    trace.appendChild(row);
  }
  if (!trace.children.length) trace.innerHTML = '<p class="muted">Aucune mémoire opérateur pour le moment.</p>';
}

async function refresh() {
  const [stateRes, queenRes, memoryRes] = await Promise.all([fetch('/api/state'), fetch('/api/queen'), fetch('/api/memory')]);
  if (!stateRes.ok || !queenRes.ok || !memoryRes.ok) throw new Error('API indisponible');
  const state = await stateRes.json();
  const { queen, brotoculateur } = await queenRes.json();
  const memory = await memoryRes.json();
  state.brotoculateur = brotoculateur;
  renderLive(state, queen);
  renderFresco(state);
  renderTasks(queen.tasks || []);
  renderCandidates(queen.candidates || []);
  renderMailbox(queen.mailbox || []);
  renderCards(state);
  renderMemory(memory.events || []);
}

$('#atelierToggle').addEventListener('click', () => { $('#atelier').hidden = false; $('#atelier').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
$('#atelierClose').addEventListener('click', () => { $('#atelier').hidden = true; window.scrollTo({ top: 0, behavior: 'smooth' }); });

$('#taskForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('#taskStatus').textContent = 'Mission en préparation…';
  try {
    await post('/api/tasks', { kind: $('#taskKind').value, target: $('#taskTarget').value, title: $('#taskTitle').value, permissions: ['READ', 'COMPUTE', 'TEST', 'REPORT'] });
    $('#taskTarget').value = ''; $('#taskTitle').value = ''; $('#taskStatus').textContent = 'Mission déposée dans la colonie.'; await refresh();
  } catch (error) { $('#taskStatus').textContent = `Refusé : ${error.message}`; }
});

$('#candidateForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('#candidateStatus').textContent = 'Création du candidat…';
  try {
    await post('/api/candidates', { title: $('#candidateTitle').value, classification: $('#candidateClass').value, expression: $('#candidateExpression').value, domain: $('#candidateDomain').value, origin: 'OPERATOR' });
    $('#candidateTitle').value = ''; $('#candidateExpression').value = ''; $('#candidateDomain').value = ''; $('#candidateStatus').textContent = 'Candidat créé. Aucune preuve promue.'; await refresh();
  } catch (error) { $('#candidateStatus').textContent = `Refusé : ${error.message}`; }
});

$('#candidateList').addEventListener('click', async (event) => {
  const gate = event.target.closest('[data-gate]');
  const send = event.target.closest('[data-send-astra]');
  try {
    if (gate) {
      const value = gate.dataset.value === 'true';
      let note = '';
      if (value && gate.dataset.gate !== 'OBSERVED') {
        note = window.prompt('Référence de trace / test / source pour valider cette porte :')?.trim() || '';
        if (!note) return;
      }
      await post(`/api/candidates/${encodeURIComponent(gate.dataset.candidate)}/gate`, { gate: gate.dataset.gate, value, note });
    }
    if (send) await post(`/api/candidates/${encodeURIComponent(send.dataset.sendAstra)}/send-astra`);
    if (gate || send) await refresh();
  } catch (error) { $('#candidateStatus').textContent = `Refusé : ${error.message}`; }
});

$('#mailbox').addEventListener('click', async (event) => {
  const action = event.target.closest('[data-quest]');
  if (!action) return;
  try { await post(`/api/quests/${encodeURIComponent(action.dataset.quest)}/status`, { status: action.dataset.status }); await refresh(); }
  catch (error) { console.error(error); }
});

$('#teachForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('#teachStatus').textContent = 'Écriture de la trace…';
  try {
    await post('/api/teach', { module: $('#module').value, kind: $('#kind').value, text: $('#text').value });
    $('#text').value = ''; $('#teachStatus').textContent = 'Mémorisé · hash vérifiable créé.'; await refresh();
  } catch (error) { $('#teachStatus').textContent = `Refusé : ${error.message}`; }
});

refresh().catch((error) => { $('#brotoState').textContent = error.message; });
setInterval(() => refresh().catch(() => {}), 5000);
