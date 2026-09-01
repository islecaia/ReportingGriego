// Pantalla Generar informe: dispara POST /api/report/generate y pinta el resultado final.
// Sin barra de progreso en tiempo real (contracts/api-contracts.md: sin SSE en este MVP) —
// FR-007, FR-008, FR-009, FR-010.

const SOURCE_LABEL = {
  search_console: 'Search Console', site_kit: 'Site Kit', squirrly: 'Squirrly SEO',
  pagespeed: 'PageSpeed Insights', security_ninja: 'Security Ninja',
};

async function loadSites() {
  const res = await fetch('/api/sites').then((r) => r.json());
  const select = document.getElementById('siteSelect');
  if (!res.ok) return;
  const active = res.sites.filter((s) => s.active);
  select.innerHTML = active.map((s) => `<option value="${s.id}">${s.name}</option>`).join('')
    || '<option value="">Sin sitios activos</option>';
}

document.getElementById('genBtn').addEventListener('click', async () => {
  const site_id = Number(document.getElementById('siteSelect').value);
  if (!site_id) { alert('Selecciona un sitio activo primero.'); return; }

  const statusMsg = document.getElementById('statusMsg');
  const summary = document.getElementById('summary');
  statusMsg.textContent = 'Generando…';
  summary.style.display = 'none';

  const result = await fetch('/api/report/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ site_id }),
  }).then((r) => r.json());

  if (!result.ok) {
    statusMsg.textContent = `No se pudo generar el informe: ${result.error}`;
    return;
  }

  statusMsg.textContent = '';
  summary.style.display = 'block';

  const { record, zeroAlerts } = result;
  document.getElementById('summaryTitle').textContent = record.sources_failed.length === 0
    ? `Informe de ${record.period} generado correctamente. ${record.sources_ok.length} fuentes conectadas.`
    : `${record.sources_failed.length} fuente(s) fallaron. El resto del informe está completo.`;
  document.getElementById('summaryMeta').textContent = `${record.period} · ${record.sources_ok.length} OK · ${record.sources_failed.length} fallidas`;

  const sourceList = document.getElementById('sourceList');
  sourceList.innerHTML = [
    ...record.sources_ok.map((s) => `<span class="badge badge-success">${SOURCE_LABEL[s] || s}</span>`),
    ...record.sources_failed.map((s) => `<span class="badge badge-error">${SOURCE_LABEL[s] || s}</span>`),
  ].join('');

  const zeroEl = document.getElementById('zeroAlerts');
  zeroEl.innerHTML = zeroAlerts.length > 0
    ? `<div class="alert alert-warning">Atención: estas métricas han caído a 0 por primera vez este mes: ${zeroAlerts.join(', ')}.</div>`
    : '';
});

loadSites();
