const express = require('express');
const bcrypt = require('bcrypt');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  const validUser = username === process.env.ADMIN_USERNAME;
  const validPass = validUser && password
    ? await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH || '')
    : false;

  if (!validUser || !validPass) {
    return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos' });
  }

  req.session.userId = username;
  req.session.save((err) => {
    if (err) return res.status(500).json({ ok: false, error: 'Error de sesión' });
    return res.json({ ok: true });
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

module.exports = router;
