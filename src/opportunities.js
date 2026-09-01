const { pool } = require('./db/pool');

// FR-014, FR-015, Principio VII — nunca expone un ranking crudo, siempre agrupado en tramos.
async function getOpportunities(site_id, period) {
  let record;
  if (period) {
    const { rows } = await pool.query(
      'SELECT id FROM monthly_records WHERE site_id = $1 AND period = $2 ORDER BY generated_at DESC LIMIT 1',
      [site_id, period]
    );
    record = rows[0];
  } else {
    const { rows } = await pool.query(
      'SELECT id FROM monthly_records WHERE site_id = $1 ORDER BY generated_at DESC LIMIT 1',
      [site_id]
    );
    record = rows[0];
  }

  if (!record) return { opportunities: [], counts: { top10: 0, top100: 0 } };

  const { rows } = await pool.query(
    'SELECT keyword, position, volume, impressions FROM keywords WHERE record_id = $1 AND volume >= 50 AND position > 3 ORDER BY position ASC',
    [record.id]
  );

  const opportunities = rows.map((row) => ({
    ...row,
    tier: row.position <= 10 ? 'top10' : 'top100',
  }));

  const counts = {
    top10: opportunities.filter((o) => o.tier === 'top10').length,
    top100: opportunities.filter((o) => o.tier === 'top100').length,
  };

  return { opportunities, counts };
}

module.exports = { getOpportunities };
