const cards = document.querySelector('#cards');
const trace = document.querySelector('#trace');
const memoryCount = document.querySelector('#memoryCount');
const form = document.querySelector('#teachForm');
const teachStatus = document.querySelector('#teachStatus');

const descriptions = {
  BROTOCULATEUR: 'Source mathématique vivante · lecture seule',
  'BRUTUS-PELL': 'Relations, contre-tests et portes',
  ZELSTEREOS: 'Signal / fréquence / provenance',
  FOURMIS: 'Transport, monde et cristaux',
};

function fmt(value) {
  return value === null || value === undefined ? '—' : new Intl.NumberFormat('fr-CA').format(value);
}

function fmtRate(value) {
  if (value === null || value === undefined) return '—';
  return `${new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 2 }).format(Number(value) * 100)} %`;
}

function fmtRatio(value) {
  if (value === null || value === undefined) return '—';
  return `×${new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 2 }).format(value)}`;
}

function card(module, state) {
  const el = document.createElement('article');
  el.className = 'module-card';
  const live = module.id === 'BROTOCULATEUR' ? state.brotoculateur : null;
  const papillon = live?.papillon || {};
  const sentinels = live?.sentinels || {};
  const papillonState = papillon.enabled === true ? 'ON' : papillon.enabled === false ? 'OFF' : '—';
  const sentinelState = sentinels.total
    ? `${fmt(sentinels.survived)}/${fmt(sentinels.total)}`
    : '—';

  el.innerHTML = `
    <div class="module-head">
      <div>
        <p class="eyebrow">${module.id}</p>
        <h3>${module.status}</h3>
      </div>
      <span class="dot ${module.status === 'RUNNING' ? 'on' : ''}"></span>
    </div>
    <p class="muted">${descriptions[module.id] || ''}</p>
    ${live ? `<dl>
      <div><dt>paquets</dt><dd>${fmt(live.processed_packets)}</dd></div>
      <div><dt>cristaux</dt><dd>${fmt(live.crystals)}</dd></div>
      <div><dt>graines</dt><dd>${fmt(live.active_seeds)}</dd></div>
      <div><dt>Papillon</dt><dd>${papillonState}</dd></div>
      <div><dt>cache</dt><dd>${fmtRate(papillon.cache_hit_rate)}</dd></div>
      <div><dt>ratio</dt><dd>${fmtRatio(papillon.logical_to_physical_ratio)}</dd></div>
      <div><dt>sentinelles</dt><dd>${sentinelState}</dd></div>
      <div><dt>hits</dt><dd>${fmt(sentinels.hits)}</dd></div>
    </dl>` : '<div class="waiting">Carte prête · pas encore connectée</div>'}
  `;
  return el;
}

function renderTrace(events = []) {
  trace.innerHTML = '';
  memoryCount.textContent = `${events.length} événement${events.length === 1 ? '' : 's'}`;
  if (!events.length) {
    trace.innerHTML = '<p class="muted">Aucune mémoire opérateur pour le moment.</p>';
    return;
  }
  for (const event of events.slice(-12).reverse()) {
    const row = document.createElement('div');
    row.className = 'trace-row';
    row.innerHTML = `<span>${event.kind}</span><strong>${event.module}</strong><p></p><time>${new Date(event.at).toLocaleString('fr-CA')}</time>`;
    row.querySelector('p').textContent = event.text;
    trace.appendChild(row);
  }
}

async function refresh() {
  const [stateRes, memoryRes] = await Promise.all([fetch('/api/state'), fetch('/api/memory')]);
  const state = await stateRes.json();
  const memory = await memoryRes.json();
  cards.innerHTML = '';
  for (const module of state.modules) cards.appendChild(card(module, state));
  renderTrace(memory.events || []);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  teachStatus.textContent = 'Écriture de la trace…';
  const payload = {
    module: document.querySelector('#module').value,
    kind: document.querySelector('#kind').value,
    text: document.querySelector('#text').value,
  };
  const response = await fetch('/api/teach', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) {
    teachStatus.textContent = `Refusé : ${result.error || 'erreur'}`;
    return;
  }
  document.querySelector('#text').value = '';
  teachStatus.textContent = 'Mémorisé · hash vérifiable créé.';
  await refresh();
});

refresh().catch((error) => {
  cards.innerHTML = `<article class="panel"><h3>Prototype non initialisé</h3><p class="muted">${error.message}</p></article>`;
});
setInterval(() => refresh().catch(() => {}), 5000);
