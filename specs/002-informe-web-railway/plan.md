# Implementation Plan: Informe mensual SEO como aplicación web (Railway)

**Branch**: `002-informe-web-railway` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-informe-web-railway/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

**Estado de validación** (2026-09-01): 7/9 escenarios de `quickstart.md` en PASS contra el despliegue real de Railway, incluido el escenario 9 (despliegue automático desde GitHub). Escenarios 5 y 6 pendientes de credenciales SMTP/API reales. Detalle: [quickstart-results.md](./quickstart-results.md).

## Summary

Reemplaza la variante de escritorio (`001-informe-mensual-seo`, Electron+SQLite) por una aplicación web de un único servicio Express, alojada en Railway con PostgreSQL gestionado, protegida por login único (`express-session` + `bcrypt`). Conserva el núcleo funcional (registro mensual inmutable, cero explícito, recogida vía API con reintento, oportunidades SEO) y el sistema de diseño de `DESIGN.md`; excluye explícitamente la pantalla Evidencias/capturas de pantalla de este MVP. Esta feature motivó la enmienda de la constitución a v3.0.0: el Principio IV ahora reconoce "web gestionada" como modelo de despliegue válido junto al de escritorio, y el Principio IX condiciona la evidencia visual al alcance declarado de cada variante.

## Technical Context

**Language/Version**: JavaScript (ES2022+) sobre Node.js LTS (≥20.x, la versión que Railway aprovisiona por defecto para Node).

**Primary Dependencies**: `express`, `pg` (cliente PostgreSQL), `express-session` + `connect-pg-simple` (sesión persistida en la misma base de datos, research.md §1), `bcrypt`, `nodemailer`, `googleapis`. Sin framework de frontend: HTML/CSS/JS vanilla en `public/`, tokens de `DESIGN.md` en CSS nativo.

**Storage**: PostgreSQL gestionado por el plugin de Railway; conexión vía `DATABASE_URL` inyectada automáticamente. Sin SQLite, sin base de datos local.

**Testing**: Fuera de alcance en v1 (constitución, "Alcance y Restricciones Técnicas del MVP" — aplica a todas las variantes). Verificación manual documentada en `tasks.md`/`quickstart.md`.

**Target Platform**: Railway (contenedor Linux gestionado), despliegue automático desde GitHub en cada push a la rama de producción; arranque vía `Procfile` (`web: node server.js`).

**Project Type**: Servicio web único (un solo proceso Express sirve la API bajo `/api/...` y los estáticos de `public/`) — sin separación backend/frontend en despliegues distintos.

**Performance Goals**: Sin objetivo de throughput (uso single-tenant, un equipo de agencia). La generación de informe es asíncrona (I/O de red hacia las 5 fuentes); el peor caso por fuente fallida añade hasta ~15s de backoff acumulado (0s+5s+10s) antes de marcarla fallida, sin bloquear las demás (Principio III).

**Constraints**:
- Toda ruta HTTP protegida (todo excepto `/login` y sus estáticos) DEBE exigir sesión iniciada (FR-001); sin sesión válida, redirección/`401` según el tipo de petición.
- `SESSION_SECRET` y las credenciales de administrador (`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`) se leen de variables de entorno de Railway, nunca hardcodeadas ni en el repositorio.
- `monthly_records` sigue siendo **append-only** en PostgreSQL: ninguna ruta ejecuta `UPDATE`/`DELETE` sobre ella, sin excepciones (Principio I, heredado de FR-009 de este spec).
- Sin infraestructura adicional a un único servicio Express + una única base de datos gestionada (Principio IV, rama "web gestionada") — sin colas, sin caché distribuida, sin microservicios.
- Sin captura de pantalla ni tabla `evidencias` — Evidencias queda fuera de alcance de este MVP (Principio IX, excepción documentada en `spec.md` → Assumptions).

**Scale/Scope**: Misma cartera de sitios de agencia que la variante de escritorio (decenas de sitios, no miles); un único conjunto de credenciales compartidas (sin multi-usuario). 5 páginas (login, sitios, generar, histórico, oportunidades, configuración) — una más que las pantallas "de datos" de la variante de escritorio (login nuevo) y una menos (sin evidencias).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Contra constitución **v3.0.0** (enmendada en esta misma sesión para reconocer esta variante — ver Sync Impact Report en `.specify/memory/constitution.md`).

| # | Principio | Chequeo | Estado |
|---|---|---|---|
| I | Integridad del Histórico | `monthly_records` en PostgreSQL es INSERT-only; ninguna ruta de `src/routes/` emite UPDATE/DELETE sobre ella (ver `data-model.md`) | PASS |
| II | Cero Ambigüedad en los Datos | Métricas sin actividad se insertan como `0` explícito; fuentes fallidas se listan en `sources_failed`, nunca se omiten | PASS |
| III | El Fallo No Bloquea | Mismo `withRetry` (3×, backoff 0s/5s/10s) portado de `001-informe-mensual-seo`; el registro se inserta con los valores disponibles aunque una fuente falle | PASS |
| IV | Simplicidad de Infraestructura Proporcional al Modelo de Despliegue | Rama "web gestionada": un único servicio Express + una única PostgreSQL gestionada por Railway, sin colas/caché/microservicios | PASS |
| V | La UI Refleja la Marca | `public/` reutiliza los tokens de `DESIGN.md` en CSS nativo; sin framework de UI que los sustituya | PASS |
| VI | Textos Directos y Accionables | Gate de contenido; se aplica al redactar las páginas de `public/` durante la implementación | PASS (n/a a nivel de arquitectura) |
| VII | Oportunidades SEO como Output Accionable | `src/opportunities.js` (portado de `001`) agrupa en tramos antes de responder por `/api/keywords/opportunities` | PASS |
| VIII | Aislamiento por Sitio | Todas las tablas incluyen `site_id`; toda ruta de lectura exige `site_id` explícito y filtra por él (ver `contracts/`) | PASS |
| IX | Evidencia Visual como Respaldo (Cuando Esté en Alcance) | Fuera de alcance en este MVP, documentado explícitamente en `spec.md` → Assumptions — excepción válida según la redefinición v3.0.0, no requiere justificación adicional en Complexity Tracking | PASS (exento por alcance declarado) |

Sin violaciones no justificadas. No aplica `Complexity Tracking` más allá de la excepción ya cubierta por el propio Principio IX.

**Re-chequeo post-diseño (tras Phase 1)**: `data-model.md` y `contracts/api-contracts.md` confirman lo anterior — ninguna ruta nueva introduce `UPDATE`/`DELETE` sobre `monthly_records`, y `POST /api/report/generate` exige `site_id` y sesión válida en todos los casos. Gate sigue en PASS.

## Project Structure

### Documentation (this feature)

```text
specs/002-informe-web-railway/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── api-contracts.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
server.js                    # arranque de Express, monta middleware de sesión y rutas, sirve public/

src/
├── db/
│   ├── pool.js               # singleton `pg.Pool` sobre DATABASE_URL
│   └── schema.sql             # CREATE TABLE IF NOT EXISTS — sites, credentials, monthly_records, keywords, settings
├── auth/
│   ├── session.js             # configuración de express-session + connect-pg-simple
│   └── requireAuth.js         # middleware: sin sesión válida → 401 (API) o redirect a /login (páginas)
├── sources/                   # portado casi sin cambios desde 001-informe-mensual-seo/main/sources/
│   ├── searchConsole.js
│   ├── siteKit.js
│   ├── squirrly.js
│   ├── pagespeed.js
│   └── securityNinja.js
├── reporter.js                 # orquesta recogida + INSERT append-only (sin paso de captura de pantalla)
├── retry.js                    # withRetry — 3 intentos, backoff 0s/5s/10s (portado de 001)
├── opportunities.js            # tramos top10/top100 (portado de 001)
├── mailer.js                   # Nodemailer — alerta de fuente fallida y de métrica a cero
└── routes/
    ├── auth.routes.js          # POST /api/login, POST /api/logout
    ├── sites.routes.js         # GET/POST /api/sites, POST /api/sites/:id/deactivate
    ├── credentials.routes.js   # POST /api/sites/:id/credentials
    ├── report.routes.js        # POST /api/report/generate, GET /api/records
    ├── opportunities.routes.js # GET /api/keywords/opportunities
    └── settings.routes.js      # GET/POST /api/settings, POST /api/settings/test-email

public/
├── login.html
├── sitios.html
├── generar.html
├── historico.html
├── oportunidades.html
├── configuracion.html
├── css/
│   └── tokens.css              # tokens de DESIGN.md extraídos una sola vez (no duplicados por página)
└── js/
    ├── sitios.js
    ├── generar.js
    ├── historico.js
    ├── oportunidades.js
    └── configuracion.js

Procfile                        # web: node server.js
```

**Structure Decision**: servicio web único (Principio IV, rama "web gestionada"). Sin separación de despliegue backend/frontend: Express sirve tanto `/api/*` como los estáticos de `public/`. Estructura exigida explícitamente por el usuario (`server.js` + `src/routes/` + `src/sources/` + `public/`); se añade `src/db/`, `src/auth/` y los módulos de nivel superior (`reporter.js`, `retry.js`, `opportunities.js`, `mailer.js`) para no amontonar toda la lógica de negocio dentro de `src/routes/`.

## Complexity Tracking

Sin violaciones que justificar — todos los gates de la Constitution Check pasan (la ausencia de Evidencias está cubierta como excepción declarada del Principio IX v3.0.0, no como una violación de Complexity Tracking).
