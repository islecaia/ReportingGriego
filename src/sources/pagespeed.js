const https = require('https');

class FetchError extends Error {}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

// FR-012: rendimiento desktop/mobile independientes. API Key pública, sin OAuth.
async function collect(siteConfig, _period) {
  const apiKey = siteConfig?.apiKey;
  const targetUrl = siteConfig?.url;
  if (!apiKey || !targetUrl) throw new FetchError('pagespeed: falta apiKey o url en la configuración del sitio');

  const strategies = { desktop: 'perf_desktop', mobile: 'perf_mobile' };
  const metrics = {};

  for (const [strategy, field] of Object.entries(strategies)) {
    const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&strategy=${strategy}&key=${apiKey}`;
    const { status, body } = await get(endpoint);
    if (status !== 200) throw new FetchError(`pagespeed: HTTP ${status}`);

    let json;
    try {
      json = JSON.parse(body);
    } catch (err) {
      throw new FetchError('pagespeed: respuesta no es JSON válido');
    }
    const score = json?.lighthouseResult?.categories?.performance?.score;
    if (score === undefined || score === null) throw new FetchError('pagespeed: falta lighthouseResult en la respuesta');
    metrics[field] = Math.round(score * 100);
  }

  return {
    perf_desktop: metrics.perf_desktop,
    perf_mobile: metrics.perf_mobile,
    raw_url: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(targetUrl)}`,
  };
}

module.exports = { collect, FetchError };
