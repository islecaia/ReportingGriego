// Pantalla Histórico: GET /api/records — valor absoluto + variación (FR-005), 0 explícito
// visible (FR-004), borde rojo en filas con sources_failed.

function fmtVal(value) {
  const isZero = Number(value) === 0;
  const display = value === null || value === undefined ? '—' : value;
  return `<span class="${isZero ? 'zero' : ''}">${display}</span>`;
}

function fmtVar(value) {
  if (value === null || value === undefined) return '<span class="neu">—</span>';
  if (value === 0) return '<span class="neu">sin cambio</span>';
  return value > 0 ? `<span class="up">▲ +${value}</span>` : `<span class="down">▼ ${value}</span>`;
}

function renderRow(record) {
  const ok = record.sources_ok || [];
  const failed = record.sources_failed || [];
  const v = record.variation || {};
  const style = failed.length > 0 ? 'border-left:3px solid var(--status-error)' : '';

  const cell = (field, unit = '') => `${fmtVal(record[field])}${unit} ${fmtVar(v[field])}`;

  return `<tr style="${style}">
    <td>${record.period}</td>
    <td style="font-size:10px;color:var(--text-muted)">${ok.length}/${ok.length + failed.length} OK</td>
    <td>${cell('impressions')}</td>
    <td>${cell('clicks')}</td>
    <td>${cell('sessions')}</td>
    <td>${cell('traffic_organic', '%')}</td>
    <td>${cell('traffic_direct', '%')}</td>
    <td>${cell('traffic_social', '%')}</td>
    <td>${cell('traffic_referral', '%')}</td>
    <td>${cell('perf_desktop')}</td>
    <td>${cell('perf_mobile')}</td>
    <td>${fmtVal((record.vulnerabilities ?? 0) + (record.malware ?? 0))}</td>
  </tr>`;
}

async function loadRecords(site_id) {
  const tbody = document.getElementById('recordsBody');
  if (!site_id) { tbody.innerHTML = ''; return; }
  const res = await fetch(`/api/records?site_id=${site_id}`).then((r) => r.json());
  if (!res.ok) return;
  tbody.innerHTML = res.records.map(renderRow).join('')
    || '<tr><td colspan="12" style="padding:20px;color:var(--text-muted)">Aún no hay registros para este sitio. Genera el primer informe mensual para empezar el histórico.</td></tr>';
}

async function init() {
  const select = document.getElementById('siteSelect');
  const res = await fetch('/api/sites').then((r) => r.json());
  if (res.ok) {
    select.innerHTML = res.sites.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
  }
  select.addEventListener('change', () => loadRecords(Number(select.value)));
  if (select.value) await loadRecords(Number(select.value));
}

init();
