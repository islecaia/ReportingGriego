const express = require('express');
const path = require('path');
const { applySchema } = require('./src/db/pool');
const { sessionMiddleware } = require('./src/auth/session');
const { requireAuth } = require('./src/auth/requireAuth');

const authRoutes = require('./src/routes/auth.routes');
const sitesRoutes = require('./src/routes/sites.routes');
const reportRoutes = require('./src/routes/report.routes');
const opportunitiesRoutes = require('./src/routes/opportunities.routes');
const settingsRoutes = require('./src/routes/settings.routes');

const app = express();
app.set('trust proxy', true); // Railway: nº de saltos de proxy no garantizado — confiar en toda la cadena

app.use(express.json());
app.use(sessionMiddleware);

// --- Público (sin sesión): login y los estáticos mínimos que necesita esa pantalla ---
app.use('/api', authRoutes); // POST /api/login, POST /api/logout
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js/login.js', (req, res) => res.sendFile(path.join(__dirname, 'public', 'js', 'login.js')));

// --- A partir de aquí, FR-001: ninguna pantalla ni dato sin sesión ---
app.use(requireAuth);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', sitesRoutes);
app.use('/api', reportRoutes);
app.use('/api', opportunitiesRoutes);
app.use('/api', settingsRoutes);

const PORT = process.env.PORT || 3000;

applySchema()
  .then(() => {
    app.listen(PORT, () => console.log(`ReportingGriego escuchando en :${PORT}`));
  })
  .catch((err) => {
    console.error('No se pudo aplicar el esquema de base de datos:', err);
    process.exit(1);
  });
