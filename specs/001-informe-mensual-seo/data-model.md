# Data Model: Automatización del informe mensual de métricas SEO y rendimiento web

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Research**: [research.md](./research.md)

Almacén: SQLite local de archivo único (`better-sqlite3`), en `app.getPath('userData')/reportinggriego.db` (research.md §7). Todas las tablas de datos incluyen `site_id` o descienden de una fila que lo incluye, para cumplir el Principio VIII (Aislamiento por Sitio) en toda consulta.

---

## Sitio (`sites`)

Un sitio web gestionado por el usuario. Corresponde a la entidad "Sitio web" de spec.md.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | INTEGER PK | autogenerado |
| `name` | TEXT NOT NULL | nombre visible del sitio |
| `url` | TEXT NOT NULL UNIQUE | identifica el sitio; no se permiten duplicados (FR-010) |
| `active` | INTEGER NOT NULL DEFAULT 1 | 1 = activo, 0 = dado de baja. **Nunca se borra una fila de `sites`** al dar de baja (FR-013) |
| `created_at` | TEXT NOT NULL DEFAULT (date('now')) | |

**Reglas de negocio**: dar de baja un sitio (`active = 0`) detiene la generación de nuevas filas en `monthly_records` para ese `site_id`, pero no afecta a ninguna fila ya existente (Principio I).

---

## Credenciales por fuente (`credentials`)

Configuración de acceso a una fuente de datos, por sitio. Corresponde a "Fuente de datos" en spec.md, en su vertiente de configuración.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | INTEGER PK | |
| `site_id` | INTEGER NOT NULL REFERENCES sites(id) | Aislamiento por sitio (Principio VIII) |
| `source` | TEXT NOT NULL | uno de: `search_console`, `site_kit`, `squirrly`, `pagespeed`, `security_ninja` — lista cerrada (constitución, Alcance del MVP) |
| `config` | TEXT NOT NULL | JSON con tokens/API keys |

**Restricción**: única fila por `(site_id, source)` — `INSERT OR REPLACE` al guardar, nunca credenciales duplicadas para la misma fuente del mismo sitio.

---

## Registro mensual (`monthly_records`)

La entidad central. Corresponde a "Registro mensual" en spec.md. **Append-only sin excepciones** (Principio I, FR-011, FR-015): ninguna ruta de código ejecuta `UPDATE` ni `DELETE` sobre esta tabla.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | INTEGER PK | |
| `site_id` | INTEGER NOT NULL REFERENCES sites(id) | Aislamiento por sitio |
| `period` | TEXT NOT NULL | `YYYY-MM`, mes de negocio derivado de `generated_at` (research.md §1) |
| `generated_at` | TEXT NOT NULL DEFAULT (datetime('now')) | fecha/hora real del disparo — satisface FR-015 ("fecha real de generación") |
| `impressions` | INTEGER | Search Console. `0` explícito si no hay actividad (FR-002), nunca `NULL` salvo que la fuente haya fallado (ver `sources_failed`) |
| `clicks` | INTEGER | Search Console |
| `sessions` | INTEGER | GA4/Site Kit |
| `traffic_direct` | REAL | % canal directo |
| `traffic_organic` | REAL | % canal orgánico |
| `traffic_social` | REAL | % redes sociales |
| `traffic_referral` | REAL | % referidos |
| `perf_desktop` | INTEGER | PageSpeed, 0–100 (FR-006) |
| `perf_mobile` | INTEGER | PageSpeed, 0–100 (FR-006) |
| `vulnerabilities` | INTEGER | Security Ninja, `0` si no hay incidencias (FR-007) |
| `malware` | INTEGER | Security Ninja, `0` si no hay incidencias (FR-007) |
| `sources_ok` | TEXT | JSON array de fuentes que respondieron OK |
| `sources_failed` | TEXT | JSON array de fuentes que fallaron tras 3 reintentos (FR-005) |

**Reglas de negocio**:
- Sin restricción `UNIQUE` sobre `(site_id, period)` — regenerar un mes, o disparar dos veces el mismo día, añade filas nuevas (FR-011, FR-015, edge case de disparo duplicado).
- Un campo numérico es `NULL` únicamente cuando su fuente está en `sources_failed` para esa fila; en cualquier otro caso de "sin actividad" el valor es `0` explícito (Principio II).
- "Mes anterior" para variación (FR-003) y para la alerta de cero (FR-012) = fila más reciente (mayor `generated_at`) con `period < period actual` para el mismo `site_id` (research.md §1).

---

## Palabra clave (`keywords`)

Corresponde a "Palabra clave" en spec.md. Vinculada a un registro mensual concreto (no al sitio directamente), porque el ranking cambia por periodo.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | INTEGER PK | |
| `record_id` | INTEGER NOT NULL REFERENCES monthly_records(id) | hereda el aislamiento por sitio del registro padre |
| `keyword` | TEXT NOT NULL | |
| `position` | REAL NOT NULL | posición actual en el ranking |
| `volume` | INTEGER | búsquedas/mes |
| `impressions` | INTEGER | |

---

## Oportunidad SEO (derivada, no persistida)

Corresponde a "Oportunidad SEO" en spec.md. **No es una tabla**: se calcula en consulta (`opportunities.js`, FR-008, Principio VII) sobre `keywords` del registro más reciente (o el solicitado) de un sitio:

- Filtro: `volume >= 50 AND position > 3`.
- Tramo "top 10": `position` entre 4 y 10 (inclusive).
- Tramo "top 100": `position` entre 11 y 100 (inclusive).
- Palabras clave con `position <= 3` se excluyen (ya optimizadas).

---

## Captura de pantalla (`evidencias`)

Corresponde a "Captura de pantalla" en spec.md. Satisface FR-009 / Principio IX.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | INTEGER PK | |
| `record_id` | INTEGER NOT NULL REFERENCES monthly_records(id) | |
| `source` | TEXT NOT NULL | qué fuente generó la captura |
| `file_path` | TEXT NOT NULL | ruta relativa dentro de `data/evidencias/<site_id>/<period>/` |
| `captured_at` | TEXT NOT NULL DEFAULT (datetime('now')) | |

**Regla de negocio**: solo se genera una fila de `evidencias` por fuente que esté en `sources_ok` de su registro; una fuente en `sources_failed` no tiene captura asociada (US4, escenario 2).

---

## Configuración (`settings`)

Configuración global no ligada a un sitio (p. ej. SMTP para las alertas de `mailer.js`).

| Campo | Tipo | Regla |
|---|---|---|
| `key` | TEXT PK | p. ej. `smtp_host`, `smtp_user`, `smtp_pass`, `notify_email` |
| `value` | TEXT | |

---

## Diagrama de relaciones

```
sites (1) ──< credentials (N)         [aislamiento por sitio: source único por site_id]
sites (1) ──< monthly_records (N)     [append-only, sin UNIQUE(site_id, period)]
monthly_records (1) ──< keywords (N)
monthly_records (1) ──< evidencias (N)
settings                              [tabla global, sin FK a sites]
```
