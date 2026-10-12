const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const fmt = (v) => Number.isFinite(Number(v)) ? new Intl.NumberFormat('fr-CA').format(Number(v)) : '—';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const when = (v) => v ? new Date(v).toLocaleString('fr-CA') : '—';

function activateTab(name) {
  $$('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  $$('.view').forEach((view) => view.classList.toggle('active', view.dataset.view === name));
  document.body.dataset.activeTab = name;
}

$$('.tab').forEach((button) => button.addEventListener('click', () => activateTab(button.dataset.tab)));
activateTab($('.tab.active')?.dataset.tab || 'queen');

$('#brotoFullscreen')?.addEventListener('click', async () => {
  const frame = $('#brotoFrame');
  if (!frame) return;
  try {
    if (!document.fullscreenElement) await frame.requestFullscreen();
    else await document.exitFullscreen();
  } catch (_) {
    window.open('/laboratoire/brotoculateur/', '_blank', 'noopener');
  }
});

document.addEventListener('fullscreenchange', () => {
  const button = $('#brotoFullscreen');
  if (button) button.textContent = document.fullscreenElement ? '× QUITTER PLEIN ÉCRAN' : '⛶ PLEIN ÉCRAN';
});

function stat(label, value, detail = '') {
  return `<div><span>${esc(label)}</span><b>${esc(value)}</b>${detail ? `<small>${esc(detail)}</small>` : ''}</div>`;
}

function renderSummary(publicState, colonySite) {
  const b = publicState?.brotoculateur || {};
  const cp = colonySite?.colony || {};
  const q = cp.queen || {};
  const c = cp.colony || {};
  const a = cp.astra || {};
  const highest = cp.crystal_watch?.highest_level || Object.entries(b.levels || {}).filter(([,n]) => Number(n) > 0).sort((x,y) => Number(x[0].slice(1))-Number(y[0].slice(1))).at(-1)?.[0] || '—';
  $('#summary').innerHTML = [
    stat('REINE', colonySite?.service?.status || '—', `cycle ${q.cycle ?? '—'}`),
    stat('FOURMIS NÉES', fmt(c.total_ants_born), `${fmt(c.active_ants)} actives`),
    stat('CRISTAUX', fmt(b.crystals), `sommet ${highest}`),
    stat('PAQUETS', fmt(b.processed_packets)),
    stat('QUÊTES', fmt(c.completed_quests), `${fmt(c.queued_quests)} en attente`),
    stat('ASTRA', fmt(a.awaiting_review), 'lettres à vérifier')
  ].join('');
}

function renderQueen(site) {
  const cp = site?.colony || {};
  const q = cp.queen || {};
  const c = cp.colony || {};
  const a = cp.astra || {};
  $('#colonyStatus').textContent = site?.service?.status || 'HORS LIGNE';
  $('#queenStats').innerHTML = [
    stat('Génération', fmt(q.generation)), stat('Cycle', fmt(q.cycle)),
    stat('Fourmis nées', fmt(c.total_ants_born)), stat('Recyclées', fmt(c.recycled_ants)),
    stat('Quêtes complétées', fmt(c.completed_quests)), stat('Rapports', fmt(c.reports))
  ].join('');

  const letters = a.latest_letters || [];
  $('#astraLetters').innerHTML = letters.length ? letters.slice().reverse().map((l) => `<div class="card"><div><strong>${esc(l.subject)}</strong><small>${esc(l.candidate_id)}</small></div><span class="status ${l.status === 'AWAITING_ASTRA_REVIEW' ? 'hot' : ''}">${esc(l.status)}</span><small>${when(l.sent_at)}</small></div>`).join('') : '<p class="note">Aucune lettre Astra pour le moment.</p>';

  const quests = c.recent_quests || [];
  $('#quests').innerHTML = quests.length ? quests.slice().reverse().slice(0, 30).map((qv) => `<div class="row"><code>${esc(qv.quest_id)}</code><strong>${esc(qv.type)}</strong><span>${esc(qv.reason || '')}</span><b class="status ${qv.status === 'DONE' ? 'ok' : 'wait'}">${esc(qv.status)}</b></div>`).join('') : '<p class="note">La Reine n’a pas encore distribué de nouvelle quête.</p>';

  const ants = c.recent_ants || [];
  $('#ants').innerHTML = ants.length ? ants.slice().reverse().slice(0, 40).map((ant) => `<div class="ant"><span>🐜</span><strong>${esc(ant.ant_id)}</strong><small>${esc(ant.specialty)}</small><b>${esc(ant.state)}</b></div>`).join('') : '<p class="note">Aucune naissance enregistrée.</p>';

  const candidates = cp.candidates || [];
  $('#candidates').innerHTML = candidates.length ? candidates.slice().reverse().map((x) => {
    const gates = Object.entries(x.gates || {}).map(([k,v]) => `<span class="gate ${v ? 'yes' : ''}">${esc(k)} ${v ? '✓' : '○'}</span>`).join('');
    return `<div class="candidate"><div><strong>${esc(x.title)}</strong><code>${esc(x.expression)}</code><small>${esc(x.candidate_id)}</small></div><div class="gates">${gates}</div><b class="status ${x.ready_for_astra ? 'hot' : 'wait'}">${esc(x.status)}</b></div>`;
  }).join('') : '<p class="note">Aucun candidat de la nouvelle colonie.</p>';
}

function renderCrystals(publicState, site) {
  const b = publicState?.brotoculateur || {};
  const state = $('#brotoState');
  if (state) state.textContent = b.state || '—';
}
function renderFresque(site) {
  const f = site?.fresque || {};
  const c = site?.colony?.fresque || {};
  $('#fresqueStats').innerHTML = [
    stat('Segments exportés', fmt(f.stats?.segments)), stat('Découvertes observatoire', fmt(f.stats?.discoveries)),
    stat('Segments parcourus', fmt(c.segments_scanned)), stat('Motifs observés', fmt(c.patterns_observed)),
    stat('Motifs de fond', fmt(c.background_patterns)), stat('Source', f.source_commit ? String(f.source_commit).slice(0,12) : '—')
  ].join('');
  const hot = c.hot_segments || [];
  $('#fresqueActivity').innerHTML = hot.slice(0,12).map((x) => `<div class="card"><strong>${esc(x.segment_id || 'segment')}</strong><small>motifs: ${esc((x.patterns || []).join(', ') || '—')}</small><span>${when(x.observed_at)}</span></div>`).join('') || '<p class="note">La Fresque attend sa première inspection.</p>';
}

async function getJson(url) {
  const response = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} HTTP ${response.status}`);
  return response.json();
}

async function refresh() {
  let publicState = null, site = null;
  const errors = [];
  try { publicState = await getJson('./public-state.json'); } catch (e) { errors.push(e.message); }
  try { site = await getJson('./colony-state.json'); } catch (e) { errors.push(e.message); }
  renderSummary(publicState, site);
  renderQueen(site);
  renderCrystals(publicState, site);
  renderFresque(site);
  $('#stamp').textContent = errors.length ? `Partiel · ${errors.join(' · ')}` : `Dernière mesure · ${new Date().toLocaleString('fr-CA')}`;
}

refresh();
setInterval(refresh, 3000);
