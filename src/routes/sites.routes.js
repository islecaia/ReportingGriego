const express = require('express');
const { pool } = require('../db/pool');

const router = express.Router();

router.get('/sites', async (_req, res) => {
  const { rows: sites } = await pool.query('SELECT * FROM sites ORDER BY name');
  const withSources = await Promise.all(sites.map(async (site) => {
    const { rows } = await pool.query('SELECT source FROM credentials WHERE site_id = $1', [site.id]);
    return { ...site, configured_sources: rows.map((r) => r.source) };
  }));
  res.json({ ok: true, sites: withSources });
});

router.post('/sites', async (req, res) => {
  const { name, url } = req.body || {};
  if (!url) return res.status(400).json({ ok: false, error: 'La URL no puede estar vacía' });

  const { rows: existing } = await pool.query('SELECT id FROM sites WHERE url = $1', [url]);
  if (existing.length > 0) return res.status(400).json({ ok: false, error: 'Ya existe un sitio con esa URL' });

  const { rows } = await pool.query('INSERT INTO sites (name, url) VALUES ($1,$2) RETURNING id', [name || url, url]);
  res.json({ ok: true, id: rows[0].id });
});

router.post('/sites/:id/deactivate', async (req, res) => {
  // nunca DELETE (Principio I / FR-011)
  await pool.query('UPDATE sites SET active = FALSE WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

router.post('/sites/:id/credentials', async (req, res) => {
  const { source, config } = req.body || {};
  await pool.query(
    `INSERT INTO credentials (site_id, source, config) VALUES ($1,$2,$3)
     ON CONFLICT (site_id, source) DO UPDATE SET config = excluded.config`,
    [req.params.id, source, JSON.stringify(config || {})]
  );
  res.json({ ok: true });
});

module.exports = router;
