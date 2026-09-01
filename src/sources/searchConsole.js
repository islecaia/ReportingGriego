const { google } = require('googleapis');

function resolveCredentials({ serviceAccountKey, serviceAccountKeyJson }) {
  if (serviceAccountKey) {
    return typeof serviceAccountKey === 'string' ? JSON.parse(serviceAccountKey) : serviceAccountKey;
  }
  if (serviceAccountKeyJson) {
    return typeof serviceAccountKeyJson === 'string' ? JSON.parse(serviceAccountKeyJson) : serviceAccountKeyJson;
  }
  return null;
}

// FR-007: recogida vía API, sin visita manual. En la variante web las credenciales se
// pegan como JSON directamente (no hay filesystem persistente de usuario como en Electron).
async function collect(siteConfig, period) {
  const { url } = siteConfig || {};
  const credentials = resolveCredentials(siteConfig || {});
  if (!credentials || !url) {
    throw new Error('searchConsole: falta serviceAccountKey(Json) o url en la configuración del sitio');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  const searchconsole = google.searchconsole({ version: 'v1', auth });

  const [year, month] = period.split('-').map(Number);
  const startDate = `${period}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${period}-${String(lastDay).padStart(2, '0')}`;

  const res = await searchconsole.searchanalytics.query({
    siteUrl: url,
    requestBody: { startDate, endDate, dimensions: [] },
  });

  const row = res.data?.rows?.[0];

  return {
    impressions: row ? Math.round(row.impressions) : 0,
    clicks: row ? Math.round(row.clicks) : 0,
    raw_url: `https://search.google.com/search-console/performance/search-analytics?resource_id=${encodeURIComponent(url)}`,
  };
}

module.exports = { collect };
