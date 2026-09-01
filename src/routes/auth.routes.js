const express = require('express');
const bcrypt = require('bcrypt');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  console.log('[login] intento:', username);

  const validUser = username === process.env.ADMIN_USERNAME;
  const validPass = validUser && password
    ? await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH || '')
    : false;

  console.log('[login] validUser:', validUser, 'validPass:', validPass);

  if (!validUser || !validPass) {
    return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos' });
  }

  req.session.userId = username;
  console.log('[login] session id antes de save:', req.session.id);

  res.setHeader('Cache-Control', 'no-store, no-cache, private');
  req.session.save((err) => {
    if (err) {
      console.error('[login] session.save error:', err);
      return res.status(500).json({ ok: false, error: 'Error de sesión' });
    }
    console.log('[login] session guardada OK, id:', req.session.id);
    return res.json({ ok: true });
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Ruta de diagnóstico temporal
router.get('/debug-session', (req, res) => {
  res.json({
    sessionId: req.session.id,
    userId: req.session.userId || null,
    cookie: req.session.cookie,
    headers: {
      cookie: req.headers.cookie || null,
      host: req.headers.host,
    },
  });
});

module.exports = router;
