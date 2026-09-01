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

// FR-013: vulnerabilidades/malware, 0 explícito si no hay incidencias (nunca null).
async function collect(siteConfig, _period) {
  const { apiKey, siteId, url } = siteConfig || {};
  if (!apiKey || !siteId) {
    throw new Error('securityNinja: falta apiKey o siteId en la configuración del sitio');
  }

  const endpoint = `${url}/wp-json/security-ninja/v1/scan-results?site_id=${encodeURIComponent(siteId)}`;
  const { status, body } = await get(endpoint, { 'X-API-Key': apiKey });
  if (status !== 200) throw new Error(`securityNinja: HTTP ${status}`);

  const json = JSON.parse(body);

  return {
    vulnerabilities: Number(json.vulnerabilities || 0),
    malware: Number(json.malware || 0),
    raw_url: `${url}/wp-admin/admin.php?page=security-ninja`,
  };
}

module.exports = { collect };
