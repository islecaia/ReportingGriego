const session = require('express-session');

// DIAGNÓSTICO TEMPORAL: MemoryStore en vez de connect-pg-simple, para aislar si el
// problema de Set-Cookie viene del store de PostgreSQL. Revertir a la versión con
// connect-pg-simple en cuanto se confirme la causa — MemoryStore no sirve en producción
// (se pierde en cada redeploy/reinicio, no comparte sesión entre instancias).
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 12,
  },
});

module.exports = { sessionMiddleware };
