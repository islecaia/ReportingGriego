// Pantalla Oportunidades SEO: GET /api/keywords/opportunities — volumen ≥50 fuera del top 3,
// agrupadas en tramos top10/top100 (FR-014, FR-015).

function renderRow(opp) {
  const label = opp.tier === 'top10' ? 'Top 4–10' : 'Top 11–100';
  return `<tr>
    <td>${opp.keyword}</td>
    <td>${opp.volume}</td>
    <td>${opp.position}</td>
    <td><span class="badge badge-warning">${label}</span></td>
  </tr>`;
}

async function loadOpportunities(site_id) {
  const tbody = document.getElementById('oppBody');
  if (!site_id) { tbody.innerHTML = ''; return; }

  const res = await fetch(`/api/keywords/opportunities?site_id=${site_id}`).then((r) => r.json());
  if (!res.ok) return;

  tbody.innerHTML = res.opportunities.map(renderRow).join('')
    || '<tr><td colspan="4" style="padding:20px;color:var(--text-muted)">Sin oportunidades para este sitio todavía.</td></tr>';
  document.getElementById('countTop10').textContent = res.counts.top10;
  document.getElementById('countTop100').textContent = res.counts.top100;
}

async function init() {
  const select = document.getElementById('siteSelect');
  const res = await fetch('/api/sites').then((r) => r.json());
  if (res.ok) select.innerHTML = res.sites.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
  select.addEventListener('change', () => loadOpportunities(Number(select.value)));
  if (select.value) await loadOpportunities(Number(select.value));
}

init();
