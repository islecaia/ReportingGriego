# Data Model: Informe mensual SEO como aplicación web (Railway)

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Research**: [research.md](./research.md)

Almacén: PostgreSQL gestionado por Railway (`DATABASE_URL`), vía `pg.Pool`. Mismo modelo relacional que `001-informe-mensual-seo/data-model.md`, sin la tabla `evidencias` (fuera de alcance, ver Principio IX v3.0.0) y con `JSONB` donde antes había JSON serializado en `TEXT` (research.md §3). Todas las tablas de datos incluyen `site_id` para el Principio VIII (Aislamiento por Sitio).

---

## Sitio (`sites`)

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | |
| `name` | `TEXT NOT NULL` | |
| `url` | `TEXT NOT NULL UNIQUE` | FR-006 |
| `active` | `BOOLEAN NOT NULL DEFAULT TRUE` | dar de baja = `FALSE`, nunca se borra la fila (FR-011) |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | |

## Credenciales por fuente (`credentials`)

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | |
| `site_id` | `INTEGER NOT NULL REFERENCES sites(id)` | |
| `source` | `TEXT NOT NULL` | uno de: `search_console`, `site_kit`, `squirrly`, `pagespeed`, `security_ninja` |
| `config` | `JSONB NOT NULL` | tokens/API keys |

**Restricción**: `UNIQUE (site_id, source)` — `INSERT ... ON CONFLICT (site_id, source) DO UPDATE`.

## Registro mensual (`monthly_records`)

Append-only sin excepciones (Principio I, FR-009).

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | |
| `site_id` | `INTEGER NOT NULL REFERENCES sites(id)` | |
| `period` | `TEXT NOT NULL` | `YYYY-MM` |
| `generated_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | |
| `impressions` | `INTEGER` | |
| `clicks` | `INTEGER` | |
| `sessions` | `INTEGER` | |
| `traffic_direct` | `REAL` | |
| `traffic_organic` | `REAL` | |
| `traffic_social` | `REAL` | |
| `traffic_referral` | `REAL` | |
| `perf_desktop` | `INTEGER` | FR-012 |
| `perf_mobile` | `INTEGER` | FR-012 |
| `vulnerabilities` | `INTEGER` | FR-013 |
| `malware` | `INTEGER` | FR-013 |
| `sources_ok` | `JSONB` | array de fuentes OK |
| `sources_failed` | `JSONB` | array de fuentes fallidas (FR-008) |

**Reglas de negocio**: sin `UNIQUE(site_id, period)` — regenerar un mes añade fila nueva (FR-009). Un campo numérico es `NULL` solo si su fuente está en `sources_failed`; en cualquier otro caso de "sin actividad" el valor es `0` explícito (FR-004). "Mes anterior" (para variación FR-005 y alerta de cero FR-010) = fila más reciente (`generated_at` mayor) con `period < period actual`, mismo `site_id`.

## Palabra clave (`keywords`)

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | |
| `record_id` | `INTEGER NOT NULL REFERENCES monthly_records(id)` | |
| `keyword` | `TEXT NOT NULL` | |
| `position` | `REAL NOT NULL` | |
| `volume` | `INTEGER` | |
| `impressions` | `INTEGER` | |

## Oportunidad SEO (derivada, no persistida)

Igual que en `001-informe-mensual-seo`: `volume >= 50 AND position > 3` sobre `keywords` del registro solicitado; tramo top10 (4–10), tramo top100 (11–100) (FR-014, FR-015).

## Configuración (`settings`)

| Campo | Tipo | Regla |
|---|---|---|
| `key` | `TEXT PRIMARY KEY` | `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`, `notify_email` |
| `value` | `TEXT` | |

No incluye credenciales de acceso a la aplicación — esas son `ADMIN_USERNAME`/`ADMIN_PASSWORD_HASH` en variables de entorno, no en esta tabla (research.md §2).

## Sesión (`session`, gestionada por `connect-pg-simple`)

Tabla creada y gestionada automáticamente por la librería, no forma parte del esquema de negocio. No se referencia desde ninguna otra tabla.

---

## Diagrama de relaciones

```
sites (1) ──< credentials (N)         [UNIQUE(site_id, source)]
sites (1) ──< monthly_records (N)     [append-only, sin UNIQUE(site_id, period)]
monthly_records (1) ──< keywords (N)
settings                              [tabla global, sin FK a sites]
session                               [gestionada por connect-pg-simple, ajena al modelo de negocio]
```
