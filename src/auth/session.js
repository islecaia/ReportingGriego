const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool } = require('../db/pool');

// research.md §1: sesión persistida en la misma PostgreSQL (no en memoria, no Redis) —
// Railway puede reiniciar el dyno en cualquier redeploy.
const sessionMiddleware = session({
  store: new pgSession({ pool, tableName: 'session', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 12, // 12h
  },
});

module.exports = { sessionMiddleware };
