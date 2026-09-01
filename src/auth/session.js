const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool } = require('../db/pool');

const sessionMiddleware = session({
  store: new pgSession({ pool, tableName: 'session', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,   // TEST: desactivado para diagnosticar problema de cookie
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 12,
  },
});

module.exports = { sessionMiddleware };
