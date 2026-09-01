const https = require('https');

function get(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

// FR-014: ranking de palabras clave, base de las oportunidades SEO.
// research.md §5 (002): sin filesystem persistente de usuario en Railway — a diferencia
// de la variante Electron, no hay fallback a un CSV local; si el endpoint falla, la
// fuente se marca como fallida (FR-008) igual que cualquier otra.
async function collect(siteConfig, period) {
  const { apiKey, url } = siteConfig || {};
  if (!apiKey || !url) throw new Error('squirrly: falta apiKey o url en la configuración del sitio');

  const endpoint = `https://api.squirrly.co/v1/keywords?domain=${encodeURIComponent(url)}&period=${period}&key=${apiKey}`;
  const { status, body } = await get(endpoint, { Authorization: `Bearer ${apiKey}` });
  if (status !== 200) throw new Error(`squirrly: HTTP ${status}`);

  const json = JSON.parse(body);
  const keywords = (json.keywords || []).map((k) => ({
    keyword: k.keyword,
    position: Number(k.position),
    volume: Number(k.volume || 0),
    impressions: Number(k.impressions || 0),
  }));

  return { keywords, raw_url: `https://app.squirrly.co/seo/rankings?domain=${encodeURIComponent(url)}` };
}

module.exports = { collect };
