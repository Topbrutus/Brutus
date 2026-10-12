const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const viewport = $('viewport');
const wall = $('wall');
let feed = null;
let zoom = 1;
let cursorId = '';
let hotIds = new Set();
let dragging = false;
let dragX = 0, dragY = 0, scrollX = 0, scrollY = 0;

function setZoom(next) {
  zoom = Math.max(0.55, Math.min(1.6, next));
  document.documentElement.style.setProperty('--cell-w', `${Math.round(118 * zoom)}px`);
  document.documentElement.style.setProperty('--row-h', `${Math.round(52 * Math.max(.78, zoom))}px`);
  document.documentElement.style.setProperty('--wall-w', `${Math.round(260 + 49 * 118 * zoom)}px`);
  $('zoomLabel').textContent = `${Math.round(zoom * 100)} %`;
}

function segmentRow(seg) {
  const row = document.createElement('div');
  row.className = 'segment-row';
  row.dataset.segmentId = seg.segment_id;
  const label = document.createElement('div');
  label.className = 'segment-label';
  label.innerHTML = `<strong>${esc(seg.segment_id)}</strong><span>${esc(seg.symbol || seg.operator)} · ${esc(seg.start_operand)} → ${esc(seg.end_operand)}</span>`;
  row.appendChild(label);
  const expressions = Array.isArray(seg.expressions) ? seg.expressions : [];
  const values = Array.isArray(seg.values) ? seg.values : [];
  const statuses = Array.isArray(seg.statuses) ? seg.statuses : [];
  for (let i = 0; i < 49; i++) {
    const cell = document.createElement('div');
    cell.className = `cell ${statuses[i] && statuses[i] !== 'OK' ? 'bad' : ''}`;
    cell.title = `${expressions[i] || ''} = ${values[i] ?? '—'}`;
    cell.innerHTML = `<span class="expr">${esc(expressions[i] || `#${Number(seg.start_operand || 0) + i}`)}</span><span class="value">${esc(values[i] ?? '—')}</span>`;
    row.appendChild(cell);
  }
  return row;
}

function renderFeed(data) {
  feed = data;
  const stats = data.stats || {};
  const table = data.table || {};
  $('sourceMeta').innerHTML = `SOURCE ${esc(String(data.source_commit || '').slice(0,12))}<br>${esc(stats.segments)} SEGMENTS · ${esc(stats.lineages)} LIGNÉES · ${esc(stats.discoveries)} OBSERVATIONS<br>BASE ${esc(table.base)} · PROFONDEUR ${esc(table.depth)} · PAGE ${esc(table.page_size)}`;

  const lineages = (data.segments || []).filter((s) => s.kind === 'CANONICAL_LINEAGE');
  $('lineages').innerHTML = lineages.map((s) => `<article class="lineage"><div class="eyebrow">${esc(s.category || 'LIGNÉE')}</div><h3>${esc(s.lineage_name || s.segment_id)}</h3><code>${esc(s.expression || '')}</code><div class="vals">${esc((s.values || []).join(' · '))}</div></article>`).join('');

  const segments = (data.segments || []).filter((s) => s.kind === 'VIRTUAL_TABLE_7X7');
  const byOperator = new Map();
  for (const seg of segments) {
    if (!byOperator.has(seg.operator)) byOperator.set(seg.operator, new Map());
    const byAnchor = byOperator.get(seg.operator);
    if (!byAnchor.has(String(seg.anchor))) byAnchor.set(String(seg.anchor), []);
    byAnchor.get(String(seg.anchor)).push(seg);
  }

  const tables = $('tables');
  tables.innerHTML = '';
  for (const operator of table.operators || [...byOperator.keys()]) {
    const anchors = byOperator.get(operator);
    if (!anchors) continue;
    const opBlock = document.createElement('section');
    opBlock.className = 'operator-block';
    const symbol = [...anchors.values()][0]?.[0]?.symbol || operator;
    opBlock.innerHTML = `<div class="operator-title">${esc(operator)} · ${esc(symbol)} · FRESQUE 7×7</div>`;
    for (const anchor of table.exported_anchors || [...anchors.keys()]) {
      const rows = anchors.get(String(anchor));
      if (!rows) continue;
      rows.sort((a,b) => Number(a.start_operand) - Number(b.start_operand));
      const block = document.createElement('div');
      block.className = 'anchor-block';
      block.innerHTML = `<div class="anchor-title">ANCRE ${esc(anchor)} · ${rows.length} BLOCS</div>`;
      for (const seg of rows) block.appendChild(segmentRow(seg));
      opBlock.appendChild(block);
    }
    tables.appendChild(opBlock);
  }
  updateLiveClasses();
}

function updateLiveClasses() {
  document.querySelectorAll('.segment-row').forEach((row) => {
    const id = row.dataset.segmentId || '';
    row.classList.toggle('hot', hotIds.has(id));
    row.classList.toggle('current', id === cursorId);
  });
}

async function refreshColony() {
  try {
    const r = await fetch('../colony-state.json?t=' + Date.now(), {cache:'no-store'});
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    const f = d?.colony?.fresque || {};
    cursorId = f.cursor || f.last_segment_id || '';
    hotIds = new Set((f.hot_segments || []).map((x) => x.segment_id).filter(Boolean));
    $('scanStat').textContent = `PARCOURUS ${Number(f.segments_scanned || 0).toLocaleString('fr-CA')} / ${feed?.stats?.segments || '—'}`;
    $('cursorStat').textContent = cursorId ? `FOURMIS ${cursorId}` : 'FOURMIS —';
    updateLiveClasses();
  } catch (_) {
    $('cursorStat').textContent = 'FOURMIS · FLUX PARTIEL';
  }
}

function goToCursor() {
  if (!cursorId) return;
  const row = document.querySelector(`[data-segment-id="${CSS.escape(cursorId)}"]`);
  if (row) row.scrollIntoView({behavior:'smooth', block:'center', inline:'center'});
}

viewport.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  dragging = true; dragX = e.clientX; dragY = e.clientY; scrollX = viewport.scrollLeft; scrollY = viewport.scrollTop;
  viewport.classList.add('dragging'); viewport.setPointerCapture(e.pointerId);
});
viewport.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  viewport.scrollLeft = scrollX - (e.clientX - dragX);
  viewport.scrollTop = scrollY - (e.clientY - dragY);
});
function stopDrag(e){ dragging = false; viewport.classList.remove('dragging'); try{viewport.releasePointerCapture(e.pointerId)}catch(_){} }
viewport.addEventListener('pointerup', stopDrag);
viewport.addEventListener('pointercancel', stopDrag);

$('zoomOut').addEventListener('click', () => setZoom(zoom - .1));
$('zoomIn').addEventListener('click', () => setZoom(zoom + .1));
$('goCursor').addEventListener('click', goToCursor);
$('resetView').addEventListener('click', () => { setZoom(1); viewport.scrollTo({left:0,top:0,behavior:'smooth'}); });
viewport.addEventListener('wheel', (e) => { if (e.ctrlKey) { e.preventDefault(); setZoom(zoom + (e.deltaY < 0 ? .08 : -.08)); } }, {passive:false});

(async function boot(){
  try {
    const r = await fetch('./fresque.json?t=' + Date.now(), {cache:'no-store'});
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    renderFeed(await r.json());
    await refreshColony();
    setInterval(refreshColony, 3000);
  } catch (e) {
    wall.innerHTML = `<section class="intro"><div><div class="eyebrow">ERREUR</div><h1>Fresque indisponible</h1><p>${esc(e.message)}</p></div></section>`;
  }
})();
