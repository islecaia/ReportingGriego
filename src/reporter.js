const { pool } = require('./db/pool');
const { withRetry } = require('./retry');
const mailer = require('./mailer');

const pagespeed = require('./sources/pagespeed');
const searchConsole = require('./sources/searchConsole');
const siteKit = require('./sources/siteKit');
const squirrly = require('./sources/squirrly');
const securityNinja = require('./sources/securityNinja');

// US2→US4: registro configurable de fuentes, todas envueltas en withRetry (FR-008, Principio III).
const SOURCES = {
  pagespeed: { collect: pagespeed.collect, fields: ['perf_desktop', 'perf_mobile'] },
  search_console: { collect: searchConsole.collect, fields: ['impressions', 'clicks'] },
  site_kit: { collect: siteKit.collect, fields: ['sessions', 'traffic_direct', 'traffic_organic', 'traffic_social', 'traffic_referral'] },
  squirrly: { collect: squirrly.collect, fields: [] }, // alimenta `keywords`, no columnas de monthly_records
  security_ninja: { collect: securityNinja.collect, fields: ['vulnerabilities', 'malware'] },
};

function currentPeriodAndTimestamp() {
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return { period, generated_at: now.toISOString() };
}

async function loadSiteConfig(site_id, source) {
  const { rows: siteRows } = await pool.query('SELECT * FROM sites WHERE id = $1', [site_id]);
  const { rows: credRows } = await pool.query('SELECT config FROM credentials WHERE site_id = $1 AND source = $2', [site_id, source]);
  const site = siteRows[0];
  const cred = credRows[0];
  if (!site || !cred) return null;

  return { url: site.url, site_id, ...cred.config };
}

async function previousPeriodRow(site_id, period) {
  const { rows } = await pool.query(
    `SELECT * FROM monthly_records
     WHERE site_id = $1 AND period < $2
     ORDER BY period DESC, generated_at DESC LIMIT 1`,
    [site_id, period]
  );
  return rows[0];
}

function computeZeroAlerts(previousRow, metrics) {
  if (!previousRow) return [];
  const numericFields = ['impressions', 'clicks', 'sessions', 'traffic_direct', 'traffic_organic', 'traffic_social', 'traffic_referral', 'perf_desktop', 'perf_mobile', 'vulnerabilities', 'malware'];
  const alerts = [];
  for (const field of numericFields) {
    const prev = previousRow[field];
    const curr = metrics[field];
    if (prev !== null && prev !== undefined && prev > 0 && curr === 0) {
      alerts.push(field);
    }
  }
  return alerts;
}

/**
 * Genera el informe mensual de un sitio. Callable en cualquier momento, sin validación
 * de calendario (heredado del criterio de FR-014/015/016 de 001-informe-mensual-seo).
 */
async function generateReport(site_id) {
  const { rows: siteRows } = await pool.query('SELECT * FROM sites WHERE id = $1', [site_id]);
  const site = siteRows[0];
  if (!site) return { ok: false, error: 'Sitio no encontrado' };

  const { period, generated_at } = currentPeriodAndTimestamp();

  const metrics = {
    impressions: null, clicks: null, sessions: null,
    traffic_direct: null, traffic_organic: null, traffic_social: null, traffic_referral: null,
    perf_desktop: null, perf_mobile: null, vulnerabilities: null, malware: null,
  };
  const sources_ok = [];
  const sources_failed = [];
  let keywords = [];

  for (const [source, def] of Object.entries(SOURCES)) {
    const siteConfig = await loadSiteConfig(site_id, source);
    if (!siteConfig) {
      sources_failed.push(source); // sin credenciales configuradas se trata como fuente fallida (FR-008)
      continue;
    }

    const outcome = await withRetry(() => def.collect(siteConfig, period));

    if (outcome.ok) {
      sources_ok.push(source);
      const data = outcome.result;
      if (source === 'squirrly') {
        keywords = data.keywords || [];
      } else {
        def.fields.forEach((field) => { metrics[field] = data[field] ?? 0; }); // FR-004: 0 explícito
      }
    } else {
      sources_failed.push(source);
    }
  }

  const previousRow = await previousPeriodRow(site_id, period);
  const zeroAlerts = computeZeroAlerts(previousRow, metrics);

  // INSERT append-only — nunca UPDATE/DELETE (Principio I, FR-009).
  const { rows: inserted } = await pool.query(
    `INSERT INTO monthly_records
       (site_id, period, generated_at, impressions, clicks, sessions,
        traffic_direct, traffic_organic, traffic_social, traffic_referral,
        perf_desktop, perf_mobile, vulnerabilities, malware, sources_ok, sources_failed)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING id`,
    [
      site_id, period, generated_at, metrics.impressions, metrics.clicks, metrics.sessions,
      metrics.traffic_direct, metrics.traffic_organic, metrics.traffic_social, metrics.traffic_referral,
      metrics.perf_desktop, metrics.perf_mobile, metrics.vulnerabilities, metrics.malware,
      JSON.stringify(sources_ok), JSON.stringify(sources_failed),
    ]
  );
  const record_id = inserted[0].id;

  // FR-014/Historia 4: keywords en la misma transacción que su registro.
  if (keywords.length > 0) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const kw of keywords) {
        await client.query(
          'INSERT INTO keywords (record_id, keyword, position, volume, impressions) VALUES ($1,$2,$3,$4,$5)',
          [record_id, kw.keyword, kw.position, kw.volume ?? 0, kw.impressions ?? 0]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }

  // FR-008: alerta por fuente fallida.
  if (sources_failed.length > 0) {
    await mailer.sendAlert({
      subject: `ReportingGriego — Fallo en ${site.name}: ${sources_failed.join(', ')}`,
      html: `<p>Sitio: ${site.name} (${site.url})</p><p>Periodo: ${period}</p><p>Fuentes fallidas: ${sources_failed.join(', ')}</p><p>Revisa las credenciales configuradas para esas fuentes.</p>`,
    });
  }

  // FR-010: alerta por métrica a cero por primera vez.
  if (zeroAlerts.length > 0) {
    await mailer.sendAlert({
      subject: `ReportingGriego — Métricas a cero en ${site.name}`,
      html: `<p>Sitio: ${site.name}</p><p>Periodo: ${period}</p><p>Métricas que han caído a 0 por primera vez: ${zeroAlerts.join(', ')}</p>`,
    });
  }

  return {
    ok: true,
    record: { id: record_id, period, generated_at, sources_ok, sources_failed },
    zeroAlerts,
  };
}

module.exports = { generateReport, SOURCES };
