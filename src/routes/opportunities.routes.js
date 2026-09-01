const express = require('express');
const opportunities = require('../opportunities');

const router = express.Router();

router.get('/keywords/opportunities', async (req, res) => {
  const { site_id, period } = req.query;
  const result = await opportunities.getOpportunities(site_id, period);
  res.json({ ok: true, ...result });
});

module.exports = router;
