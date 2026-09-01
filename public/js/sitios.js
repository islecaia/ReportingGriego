// Pantalla Sitios: lista real (GET /api/sites), alta (POST /api/sites + credentials por
// fuente), baja (POST /api/sites/:id/deactivate). FR-006, FR-011, Principio VIII.

const SOURCE_FIELDS = {
  search_console: () => ({ serviceAccountKeyJson: val('sc-json') }),
  site_kit: () => ({ ga4PropertyId: val('sk-prop'), serviceAccountKeyJson: val('sk-json') }),
  squirrly: () => ({ apiKey: val('sq-key') }),
  pagespeed: () => ({ apiKey: val('ps-key') }),
  security_ninja: () => ({ apiKey: val('sn-key'), siteId: val('sn-siteid') }),
};

function val(id) { return document.getElementById(id).value.trim(); }

function renderRow(site) {
  const badge = site.active
    ? '<span class="badge badge-success">Activo</span>'
    : '<span class="badge badge-neutral">Inactivo</span>';

  const configured = new Set(site.configured_sources || []);
  const dots = Object.keys(SOURCE_FIELDS)
    .map((s) => `<span class="dot ${configured.has(s) ? 'dot-ok' : 'dot-none'}" title="${s}"></span>`)
    .join('');

  const action = site.active
    ? `<button class="btn btn-ghost" data-action="deactivate" data-id="${site.id}">Dar de baja</button>`
    : '';

  return `<tr>
    <td>${site.name}<br/><span style="color:var(--text-muted);font-size:11px">${site.url}</span></td>
    <td>${badge}</td>
    <td><div class="source-dots">${dots}</div></td>
    <td>${action}</td>
  </tr>`;
}

async function loadSites() {
  const res = await fetch('/api/sites').then((r) => r.json());
  const tbody = document.getElementById('sitesBody');
  if (!res.ok) return;
  tbody.innerHTML = res.sites.map(renderRow).join('')
    || '<tr><td colspan="4" style="padding:20px;color:var(--text-muted)">Aún no hay sitios.</td></tr>';

  tbody.querySelectorAll('[data-action="deactivate"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await fetch(`/api/sites/${btn.dataset.id}/deactivate`, { method: 'POST' });
      await loadSites();
    });
  });
}

document.getElementById('addSiteBtn').addEventListener('click', () => {
  document.getElementById('drawerOverlay').classList.add('open');
});
document.getElementById('cancelDrawerBtn').addEventListener('click', () => {
  document.getElementById('drawerOverlay').classList.remove('open');
});

document.getElementById('saveSiteBtn').addEventListener('click', async () => {
  const name = val('siteName');
  const url = val('siteUrl');
  if (!url) { alert('La URL del sitio es obligatoria.'); return; }

  const createRes = await fetch('/api/sites', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name || url, url }),
  }).then((r) => r.json());

  if (!createRes.ok) { alert(createRes.error); return; }

  for (const [source, getConfig] of Object.entries(SOURCE_FIELDS)) {
    const config = getConfig();
    const hasAny = Object.values(config).some((v) => v);
    if (!hasAny) continue;
    await fetch(`/api/sites/${createRes.id}/credentials`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, config }),
    });
  }

  document.getElementById('drawerOverlay').classList.remove('open');
  document.querySelectorAll('.drawer input').forEach((i) => { i.value = ''; });
  await loadSites();
});

loadSites();
