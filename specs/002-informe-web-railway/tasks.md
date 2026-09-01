---

description: "Task list template for feature implementation"
---

# Tasks: Informe mensual SEO como aplicación web (Railway)

**Input**: Design documents from `/specs/002-informe-web-railway/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/api-contracts.md](./contracts/api-contracts.md)

**Tests**: Fuera de alcance en v1 (constitución v3.0.0, "Alcance y Restricciones Técnicas del MVP", aplica a todas las variantes). Validación manual vía [quickstart.md](./quickstart.md).

**Organization**: Tareas agrupadas por historia de usuario de `spec.md` (login → registro → recogida API → oportunidades SEO), para implementar y validar cada una de forma independiente.

**Estado de partida**: `package.json` (deps del stack web), `.gitignore` y `public/` ya existen en el repo, pero `public/` es todavía una copia literal del `renderer/` de Electron (`window.api.invoke`, pantalla Evidencias incluida, switcher de un solo `index.html`) — no sirve tal cual para la web. Varias tareas de este documento son explícitamente de **reescritura**, no de creación desde cero.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivo distinto, sin dependencias pendientes)
- **[Story]**: A qué historia de usuario pertenece (US1, US2, US3, US4)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Servicio web único (Express), según `plan.md` → Project Structure:
- `server.js` — arranque, estáticos, montaje de rutas
- `src/db/`, `src/auth/`, `src/sources/`, `src/routes/` — lógica del proceso servidor
- `public/` — páginas HTML/CSS/JS servidas como estáticas

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Completar `package.json` en la raíz: confirmar que `dependencies` cubre `express`, `pg`, `express-session`, `connect-pg-simple`, `bcrypt`, `nodemailer`, `googleapis` (ya presentes) y que los scripts `start`/`dev` apuntan a `server.js`
- [X] T002 [P] Crear `Procfile` en la raíz con `web: node server.js`
- [X] T003 [P] Limpiar `.gitignore` en la raíz (hay líneas duplicadas de `.env`/`node_modules/`); confirmar que cubre `node_modules/`, `.env`, `.env.*`, `dist/`
- [X] T004 Crear `server.js`: `express()`, `express.json()`, sirve `public/` como estático, escucha en `process.env.PORT` — sin montar todavía sesión, auth ni rutas de API

**Checkpoint**: `node server.js` arranca sin errores y sirve archivos estáticos de `public/`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: ninguna historia de usuario puede empezar hasta que esta fase esté completa.

- [X] T005 [P] Crear `src/db/schema.sql`: `CREATE TABLE IF NOT EXISTS` para `sites`, `credentials`, `monthly_records`, `keywords`, `settings` (tipos PostgreSQL/`JSONB`, ver data-model.md) — sin tabla `evidencias`
- [X] T006 Crear `src/db/pool.js`: singleton `pg.Pool` sobre `process.env.DATABASE_URL`, ejecuta `schema.sql` una vez al conectar (depende de T005)
- [X] T007 [P] Crear `src/auth/session.js`: configuración de `express-session` con store `connect-pg-simple` sobre el mismo pool, `secret: process.env.SESSION_SECRET` (research.md §1)
- [X] T008 [P] Crear `src/auth/requireAuth.js`: middleware — sin `req.session.userId`, responde `401 { ok:false, error:'No autenticado' }` para peticiones a `/api/*`, o redirige a `/login.html` para peticiones de página (research.md §6)
- [X] T009 [P] Crear `public/css/tokens.css`: tokens de `DESIGN.md` (colores, tipografía, espaciado) extraídos una sola vez, para no duplicarlos por página como hacían los mockups de Electron
- [X] T010 Conectar `src/db/pool.js` (T006) en el arranque de `server.js`: la app no debe aceptar peticiones hasta que el esquema esté aplicado (depende de T004, T006)

**Checkpoint**: el servidor arranca, aplica el esquema contra PostgreSQL, y expone los módulos de sesión/auth listos para montarse (aún no montados).

---

## Phase 3: User Story 1 - Acceso protegido por login (Priority: P1) 🎯 MVP

**Goal**: ninguna pantalla ni dato es accesible sin sesión iniciada; login/logout funcionan de extremo a extremo (FR-001, FR-002, FR-003, FR-004).

**Independent Test**: visitar la URL de la aplicación sin sesión iniciada y comprobar que ninguna pantalla ni dato es accesible hasta introducir las credenciales correctas; con sesión iniciada, se accede con normalidad (spec.md, US1).

### Implementation for User Story 1

- [X] T011 [P] [US1] Crear `public/login.html`: página nueva (no existía en la variante Electron) con formulario usuario/contraseña, usando `public/css/tokens.css`
- [X] T012 [P] [US1] Crear `src/routes/auth.routes.js`: `POST /api/login` (compara `req.body.username` con `process.env.ADMIN_USERNAME` y `bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH)`, guarda `req.session.userId` si es válido) y `POST /api/logout` (`req.session.destroy()`) (depende de T007, research.md §2)
- [X] T013 [US1] Montar `express-session` (T007) y `auth.routes.js` (T012) en `server.js`, antes de cualquier otra ruta protegida (depende de T010, T012)
- [X] T014 [US1] Montar `requireAuth` (T008) en `server.js` sobre todas las rutas excepto `/login.html`, `/api/login`, y los estáticos de `public/css/` y `public/js/login.js` (depende de T013)
- [X] T015 [P] [US1] Crear `public/js/login.js`: envía el formulario a `POST /api/login` vía `fetch`, redirige a `/sitios.html` si `ok:true`, muestra el mensaje de error genérico si `ok:false` (FR-003) (depende de T011, T012)

**Checkpoint**: login/logout funcionan; cualquier otra página o `/api/*` sin sesión redirige o devuelve `401`.

---

## Phase 4: User Story 2 - Registro automático de las métricas mensuales (Priority: P1)

**Goal**: al generar el informe de un sitio, se inserta un registro inmutable con ceros explícitos y variación respecto al mes anterior (FR-003, FR-004, FR-005, FR-006, FR-009, FR-010, FR-012, FR-013). Se prueba con PageSpeed Insights como única fuente real (igual criterio que `001-informe-mensual-seo`: la más simple, sin OAuth); las 4 restantes se añaden en la Historia 3.

**Independent Test**: generar el registro de un mes para un sitio (con sesión iniciada) y comprobar que los valores aparecen correctamente, sin intervención manual (spec.md, US2).

### Implementation for User Story 2

- [X] T016 [P] [US2] Crear `src/retry.js`: `withRetry(fn, onAttempt)` — 3 intentos, backoff 0s/5s/10s (portado de `001-informe-mensual-seo/main/retry.js`, sin cambios de lógica)
- [X] T017 [P] [US2] Crear `src/sources/pagespeed.js`: `collect(siteConfig, period)` contra PageSpeed Insights (portado de `001-informe-mensual-seo/main/sources/pagespeed.js`, sin cambios — no depende de Electron)
- [X] T018 [US2] Crear `src/reporter.js`: `generateReport(site_id)` — mapa `SOURCES` configurable (de momento solo `{ pagespeed }`), `period`/`generated_at` reales, `0` explícito en métricas sin actividad que no vengan de fuente fallida, INSERT append-only en `monthly_records` (nunca UPDATE) (depende de T006, T017)
- [X] T019 [P] [US2] Crear `src/mailer.js`: `sendAlert({ to, subject, html })` con Nodemailer, config SMTP desde la tabla `settings` (portado de `001-informe-mensual-seo/main/mailer.js`, adaptado a `pg` en vez de `better-sqlite3`)
- [X] T020 [US2] En `src/reporter.js`, añadir el chequeo de alerta de cero (FR-010): comparar con la fila más reciente de "mes anterior" (data-model.md), llamar a `mailer.sendAlert()` si aplica (depende de T018, T019)
- [X] T021 [US2] Crear `src/routes/sites.routes.js`: `GET /api/sites`, `POST /api/sites`, `POST /api/sites/:id/deactivate`, `POST /api/sites/:id/credentials` (depende de T006)
- [X] T022 [US2] Crear `src/routes/report.routes.js`: `POST /api/report/generate` (llama a `reporter.generateReport`), `GET /api/records` (con `variation` calculada) (depende de T020)
- [X] T023 [US2] Montar `sites.routes.js` y `report.routes.js` en `server.js`, protegidos por `requireAuth` (depende de T014, T021, T022)
- [X] T024 [P] [US2] Reescribir `public/sitios.html` a partir de `public/screens/sitios.html`: mismo markup/CSS, quitar el `<script>` de demo y las referencias a Electron
- [X] T025 [US2] Reescribir `public/js/sitios.js` a partir del ya existente: sustituir `window.api.invoke(...)` por `fetch('/api/...')` equivalente, mismo comportamiento de alta/baja de sitios y guardado de credenciales por fuente (depende de T024, T021)
- [X] T026 [P] [US2] Reescribir `public/generar.html` a partir de `public/screens/generar.html`: mismo markup/CSS, quitar el `<script>` de demo
- [X] T027 [US2] Reescribir `public/js/generar.js`: botón GENERAR INFORME llama a `POST /api/report/generate` vía `fetch` y pinta el resultado final (sin eventos de progreso en tiempo real — contracts/api-contracts.md no expone SSE en este MVP); banner de `zeroAlerts` (depende de T026, T022)
- [X] T028 [P] [US2] Reescribir `public/historico.html` a partir de `public/screens/historico.html`: mismo markup/CSS
- [X] T029 [US2] Reescribir `public/js/historico.js`: tabla desde `GET /api/records`, `0` explícito visible, variación ▲/▼ (depende de T028, T022)

**Checkpoint**: login → añadir sitio → generar informe con PageSpeed → ver histórico, extremo a extremo sobre PostgreSQL real.

---

## Phase 5: User Story 3 - Recogida de datos vía API en lugar de visita manual (Priority: P1)

**Goal**: las 5 fuentes se recogen vía API con reintento, sin bloquear el informe por un fallo (FR-007, FR-008).

**Independent Test**: conectar una fuente de datos concreta y comprobar que el sistema recupera el valor de una métrica sin que el usuario visite manualmente el panel de esa herramienta (spec.md, US3).

### Implementation for User Story 3

- [X] T030 [P] [US3] Crear `src/sources/searchConsole.js` (portado de `001-informe-mensual-seo/main/sources/searchConsole.js`, sin cambios)
- [X] T031 [P] [US3] Crear `src/sources/siteKit.js` (portado, sin cambios)
- [X] T032 [P] [US3] Crear `src/sources/squirrly.js` (portado; el fallback CSV pasa de `app.getPath('userData')` — API de Electron no disponible aquí — a una ruta configurable por variable de entorno, research.md §5)
- [X] T033 [P] [US3] Crear `src/sources/securityNinja.js` (portado, sin cambios)
- [X] T034 [US3] Registrar `search_console`, `site_kit`, `squirrly`, `security_ninja` en el mapa `SOURCES` de `src/reporter.js`, junto a `pagespeed` (depende de T030, T031, T032, T033, T018)
- [X] T035 [US3] En `src/reporter.js`, envolver toda llamada a `collect()` con `withRetry` (T016); una fuente solo pasa a `sources_failed` tras agotar los 3 intentos (depende de T016, T034)
- [X] T036 [US3] En `src/reporter.js`, llamar a `mailer.sendAlert()` cuando `sources_failed` no esté vacío tras los reintentos (FR-008) (depende de T019, T035)
- [X] T037 [US3] Actualizar `public/js/generar.js`: mostrar `sources_ok`/`sources_failed` de las 5 fuentes en el resultado final (sin barra de progreso en vivo, ver T027) (depende de T027, T035)
- [X] T038 [US3] Actualizar `public/js/sitios.js`: badge real CONECTADO/PENDIENTE por fuente según `configured_sources` devuelto por `GET /api/sites` (depende de T025, T021)

**Checkpoint**: las 5 fuentes integradas con reintento/backoff; un fallo de fuente nunca bloquea el resto del informe; llega email de alerta.

---

## Phase 6: User Story 4 - Identificación de oportunidades SEO (Priority: P2)

**Goal**: palabras clave con volumen ≥50 fuera del top 3, agrupadas en tramos top10/top100 (FR-014, FR-015).

**Independent Test**: cargar un conjunto de palabras clave con su posición y volumen de búsqueda, y comprobar que el sistema devuelve la lista de oportunidades esperada (spec.md, US4).

### Implementation for User Story 4

- [X] T039 [US4] En `src/reporter.js`, insertar en la tabla `keywords` el array devuelto por `squirrly.collect()`, vinculado al `record_id` recién insertado (depende de T032, T034)
- [X] T040 [P] [US4] Crear `src/opportunities.js` (portado de `001-informe-mensual-seo/main/opportunities.js`, adaptado a `pg`)
- [X] T041 [US4] Crear `src/routes/opportunities.routes.js`: `GET /api/keywords/opportunities` (depende de T040)
- [X] T042 [US4] Montar `opportunities.routes.js` en `server.js`, protegida por `requireAuth` (depende de T014, T041)
- [X] T043 [P] [US4] Reescribir `public/oportunidades.html` a partir de `public/screens/oportunidades.html`
- [X] T044 [US4] Reescribir `public/js/oportunidades.js`: llama a `GET /api/keywords/opportunities` vía `fetch`, agrupa por tramo (depende de T043, T041)

**Checkpoint**: pantalla Oportunidades SEO muestra la lista filtrada y agrupada por tramos para cualquier sitio/periodo con datos de keywords.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T045 [P] Reescribir `public/configuracion.html` a partir de `public/screens/configuracion.html`: mantener la sección SMTP, quitar o marcar como no funcional la sección de "Credenciales globales" que no aplica igual en el modelo de acceso único de esta variante
- [X] T046 Reescribir `public/js/configuracion.js`: SMTP host/puerto/usuario/contraseña/destinatarios vía `fetch` a `GET`/`POST /api/settings`, botón de prueba vía `POST /api/settings/test-email` (depende de T045)
- [X] T047 [P] Crear `src/routes/settings.routes.js`: `GET /api/settings`, `POST /api/settings`, `POST /api/settings/test-email` (depende de T019)
- [X] T048 Montar `settings.routes.js` en `server.js`, protegida por `requireAuth` (depende de T014, T047)
- [X] T049 Eliminar `public/index.html`, `public/screens/` y cualquier `public/js/*.js` que siga referenciando `window.api` — ya sustituidos por las páginas standalone de las Historias 1-4
- [ ] T050 Ejecutar los 9 escenarios de [quickstart.md](./quickstart.md) de extremo a extremo y registrar los resultados
- [ ] T051 Configurar en Railway las variables de entorno (`SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`; `DATABASE_URL` la inyecta el plugin automáticamente) y verificar que un push a la rama de producción dispara el despliegue automático (research.md §8)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las historias.
- **US1 (P1)**: depende de Foundational; es la puerta de entrada de la que dependen operativamente todas las demás (sin login no se puede probar nada más en un despliegue real), aunque su lógica interna no depende de US2/US3/US4.
- **US2 (P1)**: depende de Foundational; usa `requireAuth` montado en US1 para proteger sus rutas (T023 depende de T014).
- **US3 (P1)**: depende de que `src/reporter.js` exista (US2, T018) — extiende ese pipeline con reintento y las 4 fuentes restantes.
- **US4 (P2)**: depende de que US3 haya integrado `squirrly.js` (T032) para tener `keywords` que analizar.
- **Polish**: depende de las historias que se vayan a entregar.

### Parallel Opportunities

- Foundational: T005, T007, T008, T009 en paralelo.
- US1: T011 y T012 en paralelo.
- US2: T016 y T017 en paralelo; T024 y T026 y T028 en paralelo (páginas HTML distintas) una vez sus rutas backend correspondientes existen.
- US3: **T030, T031, T032, T033 en paralelo entre sí** (4 módulos de fuente independientes) — mayor bloque paralelizable, igual que en `001-informe-mensual-seo`.
- US4: T040 en paralelo con el resto.

---

## Parallel Example: User Story 3 (mayor bloque paralelizable)

```bash
# Una vez src/retry.js (T016) y el reporter base (T018) existen, lanzar juntas:
Task: "Crear src/sources/searchConsole.js"
Task: "Crear src/sources/siteKit.js"
Task: "Crear src/sources/squirrly.js"
Task: "Crear src/sources/securityNinja.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2 con una sola fuente)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational
3. Completar Phase 3: User Story 1 (login) — sin esto, nada más es demostrable en un despliegue real
4. Completar Phase 4: User Story 2 (con PageSpeed como única fuente real)
5. **Parar y validar**: escenarios 1-4 de `quickstart.md`
6. Desplegar a Railway (T051) y confirmar acceso protegido en la URL pública

### Incremental Delivery

1. Setup + Foundational → base lista
2. + US1 (login) → validar independientemente → acceso protegido demostrable
3. + US2 (registro, 1 fuente) → validar independientemente → MVP funcional end-to-end
4. + US3 (5 fuentes + reintento) → validar independientemente
5. + US4 (oportunidades SEO) → validar independientemente
6. Polish → limpieza de `public/` heredado de Electron + despliegue Railway

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes entre sí.
- Las tareas que editan `server.js`, `src/reporter.js` o un mismo archivo `public/js/*.js` en más de una historia comparten archivo — deliberadamente no están marcadas [P] entre sí, aunque su lógica sea independiente.
- Varias tareas de fuente de datos (`src/sources/*.js`, `src/retry.js`, `src/mailer.js`, `src/opportunities.js`) son **portes directos** de `001-informe-mensual-seo` — no hay que rediseñarlas, solo confirmar que no dependen de APIs de Electron (ninguna lo hace salvo el fallback CSV de `squirrly.js`, ya señalado en T032).
- Commit por tarea, en español, imperativo (misma convención que el resto del repo).
