// FR-001: ninguna pantalla ni dato es accesible sin sesión iniciada.
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();

  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ ok: false, error: 'No autenticado' });
  }
  return res.redirect('/login.html');
}

module.exports = { requireAuth };
