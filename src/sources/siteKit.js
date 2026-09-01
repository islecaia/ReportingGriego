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

const CHANNEL_FIELD = {
  'Direct': 'traffic_direct',
  'Organic Search': 'traffic_organic',
  'Organic Social': 'traffic_social',
  'Paid Social': 'traffic_social',
  'Referral': 'traffic_referral',
};

// FR-003: sesiones + desglose de canales de tráfico. Misma cuenta de servicio que searchConsole.js.
async function collect(siteConfig, period) {
  const { ga4PropertyId } = siteConfig || {};
  const credentials = resolveCredentials(siteConfig || {});
  if (!credentials || !ga4PropertyId) {
    throw new Error('siteKit: falta serviceAccountKey(Json) o ga4PropertyId en la configuración del sitio');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });

  const analyticsdata = google.analyticsdata({ version: 'v1beta', auth });

  const [year, month] = period.split('-').map(Number);
  const startDate = `${period}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${period}-${String(lastDay).padStart(2, '0')}`;

  const res = await analyticsdata.properties.runReport({
    property: `properties/${ga4PropertyId}`,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
    },
  });

  const rows = res.data?.rows || [];
  const bySessions = { traffic_direct: 0, traffic_organic: 0, traffic_social: 0, traffic_referral: 0 };
  let totalSessions = 0;

  for (const row of rows) {
    const channel = row.dimensionValues?.[0]?.value;
    const sessions = Number(row.metricValues?.[0]?.value || 0);
    totalSessions += sessions;
    const field = CHANNEL_FIELD[channel];
    if (field) bySessions[field] += sessions;
  }

  const pct = (n) => (totalSessions > 0 ? Math.round((n / totalSessions) * 1000) / 10 : 0);

  return {
    sessions: totalSessions,
    traffic_direct: pct(bySessions.traffic_direct),
    traffic_organic: pct(bySessions.traffic_organic),
    traffic_social: pct(bySessions.traffic_social),
    traffic_referral: pct(bySessions.traffic_referral),
    raw_url: `https://analytics.google.com/analytics/web/#/p${ga4PropertyId}/reports/reportinghub`,
  };
}

module.exports = { collect };
