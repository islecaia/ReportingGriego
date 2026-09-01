-- Sitios gestionados. Nunca se borra una fila (Principio I / FR-011): dar de baja = active:false.
CREATE TABLE IF NOT EXISTS sites (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  url         TEXT NOT NULL UNIQUE,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Credenciales de API por sitio y fuente. Única fila por (site_id, source).
CREATE TABLE IF NOT EXISTS credentials (
  id       SERIAL PRIMARY KEY,
  site_id  INTEGER NOT NULL REFERENCES sites(id),
  source   TEXT NOT NULL,
  config   JSONB NOT NULL,
  UNIQUE (site_id, source)
);

-- Registro mensual. APPEND-ONLY sin excepciones (Principio I, FR-009): nunca UPDATE/DELETE.
CREATE TABLE IF NOT EXISTS monthly_records (
  id                SERIAL PRIMARY KEY,
  site_id           INTEGER NOT NULL REFERENCES sites(id),
  period            TEXT NOT NULL,             -- 'YYYY-MM'
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  impressions       INTEGER,
  clicks            INTEGER,
  sessions          INTEGER,
  traffic_direct    REAL,
  traffic_organic   REAL,
  traffic_social    REAL,
  traffic_referral  REAL,
  perf_desktop      INTEGER,
  perf_mobile       INTEGER,
  vulnerabilities   INTEGER,
  malware           INTEGER,
  sources_ok        JSONB,
  sources_failed    JSONB
);

CREATE INDEX IF NOT EXISTS idx_monthly_records_site_period
  ON monthly_records (site_id, period, generated_at);

-- Palabras clave del ranking, ligadas al registro mensual.
CREATE TABLE IF NOT EXISTS keywords (
  id          SERIAL PRIMARY KEY,
  record_id   INTEGER NOT NULL REFERENCES monthly_records(id),
  keyword     TEXT NOT NULL,
  position    REAL NOT NULL,
  volume      INTEGER,
  impressions INTEGER
);

CREATE INDEX IF NOT EXISTS idx_keywords_record ON keywords (record_id);

-- Configuración global (SMTP, etc.)
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
