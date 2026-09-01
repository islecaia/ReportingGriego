const express = require('express');
const { pool } = require('../db/pool');
const mailer = require('../mailer');

const router = express.Router();

router.get('/settings', async (req, res) => {
  const { key } = req.query;
  if (key) {
    const { rows } = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
    return res.json({ ok: true, settings: { [key]: rows[0] ? rows[0].value : null } });
  }
  const { rows } = await pool.query('SELECT key, value FROM settings');
  const settings = {};
  rows.forEach((row) => { settings[row.key] = row.value; });
  res.json({ ok: true, settings });
});

router.post('/settings', async (req, res) => {
  const { key, value } = req.body || {};
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1,$2)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
  res.json({ ok: true });
});

router.post('/settings/test-email', async (_req, res) => {
  const result = await mailer.testEmail();
  res.json(result);
});

module.exports = router;
