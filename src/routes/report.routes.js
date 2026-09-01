const express = require('express');
const { pool } = require('../db/pool');
const reporter = require('../reporter');

const router = express.Router();

function computeVariation(current, previous) {
  if (!previous) return null;
  const fields = ['impressions', 'clicks', 'sessions', 'traffic_direct', 'traffic_organic', 'traffic_social', 'traffic_referral', 'perf_desktop', 'perf_mobile', 'vulnerabilities', 'malware'];
  const variation = {};
  for (const field of fields) {
    const prev = previous[field];
    const curr = current[field];
    if (prev === null || prev === undefined || curr === null || curr === undefined) {
      variation[field] = null;
    } else if (Number(prev) === 0) {
      variation[field] = Number(curr) === 0 ? 0 : null;
    } else {
      variation[field] = Math.round(((curr - prev) / prev) * 1000) / 10;
    }
  }
  return variation;
}

router.post('/report/generate', async (req, res) => {
  const { site_id } = req.body || {};
  const result = await reporter.generateReport(site_id);
  res.json(result);
});

router.get('/records', async (req, res) => {
  const site_id = req.query.site_id;
  const { rows: records } = await pool.query(
    'SELECT * FROM monthly_records WHERE site_id = $1 ORDER BY generated_at DESC',
    [site_id]
  );

  const withVariation = records.map((record, idx) => {
    const previous = records.slice(idx + 1).find((r) => r.period < record.period);
    return { ...record, variation: computeVariation(record, previous) };
  });

  res.json({ ok: true, records: withVariation });
});

module.exports = router;
