---

description: "Task list template for feature implementation"
---

# Tasks: Automatización del informe mensual de métricas SEO y rendimiento web

**Input**: Design documents from `/specs/001-informe-mensual-seo/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/ipc-contracts.md](./contracts/ipc-contracts.md)

**Tests**: Fuera de alcance en v1 (constitución, "Alcance y Restricciones Técnicas del MVP"). No se generan tareas de test automatizado; la validación es manual vía [quickstart.md](./quickstart.md), un escenario por historia de usuario.

**Organization**: Tareas agrupadas por historia de usuario de `spec.md`, para poder implementar y validar cada una de forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivo distinto, sin dependencias pendientes)
- **[Story]**: A qué historia de usuario pertenece (US1, US2, US3, US4)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Proyecto único Electron (main/renderer), según `plan.md` → Project Structure:
- `main/` — proceso main de Node.js (BD, IPC, integraciones, orquestador)
- `renderer/` — HTML/CSS/JS vanilla (los 6 mockups de `Pantallas/`)
- Rutas relativas a la raíz del repositorio.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialización del proyecto Electron.

- [ ] T001 Crear `package.json` en la raíz con scripts `start`/`build` y dependencias: `electron`, `better-sqlite3`, `exceljs`, `playwright`, `nodemailer`, `electron-builder`, `googleapis` (research.md §2)
- [ ] T002 [P] Crear `.gitignore` en la raíz cubriendo `node_modules/`, `data/`, `.env`, `dist/`
- [ ] T003 [P] Crear `electron-builder.yml` en la raíz con `appId`, `productName` y targets `nsis`/`dmg` comentados (se completa en T048)
- [ ] T004 Crear `main/index.js`: `BrowserWindow` 1280×800, `contextIsolation:true`, `nodeIntegration:false`, carga `renderer/index.html`

**Checkpoint**: `npm start` abre una ventana de Electron en blanco sin errores en consola.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura que TODAS las historias de usuario necesitan — sin sitios ni credenciales configurados, ninguna historia puede generarse.

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta que esta fase esté completa.

- [ ] T005 [P] Crear `main/db/schema.sql` con las tablas `sites`, `credentials`, `monthly_records`, `keywords`, `evidencias`, `settings` (data-model.md)
- [ ] T006 Crear `main/db/db.js`: singleton `better-sqlite3`, archivo en `app.getPath('userData')/reportinggriego.db` (research.md §7), ejecuta `schema.sql` en el primer arranque (depende de T005)
- [ ] T007 [P] Crear `main/preload.js`: `contextBridge` exponiendo `window.api.invoke(channel, payload)` y `window.api.on(channel, cb)`
- [ ] T008 [P] Crear `main/ipc.js`: registrar todos los canales de `contracts/ipc-contracts.md` con handlers stub `{ ok:false, error:'not implemented' }`
- [ ] T009 Conectar `main/index.js` para cargar `preload.js` e inicializar `ipc.js` (depende de T004, T007, T008)
- [ ] T010 [P] Copiar las 6 pantallas de `Pantallas/` a `renderer/screens/` (`sitios.html`, `generar.html`, `historico.html`, `oportunidades.html`, `evidencias.html`, `configuracion.html`)
- [ ] T011 Crear `renderer/index.html` + `renderer/js/app.js`: barra switcher fija 32px (tokens de DESIGN.md), `showScreen(id)` (depende de T010)
- [ ] T012 Implementar `sites:list` / `sites:create` / `sites:deactivate` en `main/ipc.js` (`deactivate` = `active:0`, nunca `DELETE` — Principio I) (depende de T005, T006, T008)
- [ ] T013 Implementar `credentials:save` en `main/ipc.js` (`INSERT OR REPLACE` sobre `(site_id, source)`) (depende de T005, T006, T008)
- [ ] T014 [P] Crear `renderer/js/sitios.js`: listar sitios (`sites:list`), drawer "Añadir sitio" → `sites:create`, "Dar de baja" → `sites:deactivate` (depende de T010, T011, T012)
- [ ] T015 [P] Crear `renderer/js/configuracion.js`: selector de sitio + formulario por fuente (search_console, site_kit, squirrly, pagespeed, security_ninja) → `credentials:save` (depende de T010, T011, T013)
- [ ] T016 Implementar `settings:get` / `settings:set` en `main/ipc.js` sobre la tabla `settings` (depende de T005, T006, T008)

**Checkpoint**: alta/baja de sitios y guardado de credenciales funciona de extremo a extremo desde la UI; la BD tiene las 6 tablas; las 6 pantallas son navegables.

---

## Phase 3: User Story 1 - Registro automático de las métricas mensuales por sitio (Priority: P1) 🎯 MVP

**Goal**: al pulsar GENERAR INFORME, el sistema registra una fila nueva, inmutable, con ceros explícitos, aislada por sitio, con variación respecto al mes anterior — y funciona en cualquier fecha, no solo a fin de mes (FR-001, FR-002, FR-003, FR-006, FR-010, FR-011, FR-012, FR-014, FR-015, FR-016). Se prueba de extremo a extremo con PageSpeed Insights como única fuente real (la más simple, sin OAuth — orden recomendado en el input del usuario); las 4 fuentes restantes se añaden en la Historia 2 sin tocar esta capa.

**Independent Test**: generar el registro de un mes para un sitio y comprobar que los valores aparecen correctamente en la fila de esa fecha, sin intervención manual (spec.md, US1).

### Implementation for User Story 1

- [ ] T017 [P] [US1] Crear `main/sources/pagespeed.js`: `collect(siteConfig, period)` contra PageSpeed Insights (desktop + mobile), devuelve `{ perf_desktop, perf_mobile, raw_url }`; lanza `FetchError` si el status no es 200 o falta `lighthouseResult` (FR-006)
- [ ] T018 [US1] Crear `main/reporter.js`: `generateReport(site_id)` — recorre un registro `SOURCES` configurable (de momento solo `{ pagespeed }`), acumula métricas, calcula `period` = mes calendario de hoy y `generated_at` = ahora (FR-015, data-model.md §1), escribe `0` explícito en cualquier métrica numérica sin actividad que no venga de una fuente fallida (FR-002), e inserta SIEMPRE una fila nueva en `monthly_records` — nunca `UPDATE` (Principio I, FR-011) (depende de T005, T006, T017)
- [ ] T019 [US1] En `main/reporter.js`, añadir el chequeo de alerta de cero (FR-012): antes de insertar, consultar la fila más reciente del "mes anterior" del sitio (regla de data-model.md §1: mayor `generated_at` con `period` estrictamente anterior); por cada métrica que era `>0` y ahora es `0` por primera vez, añadirla al array `zeroAlerts` devuelto (depende de T018)
- [ ] T020 [P] [US1] Crear `main/mailer.js`: `sendAlert({ to, subject, html })` con Nodemailer, usando la configuración SMTP de la tabla `settings` (depende de T016)
- [ ] T021 [US1] En `main/reporter.js`, llamar a `mailer.sendAlert()` cuando `zeroAlerts` no esté vacío (FR-012) (depende de T019, T020)
- [ ] T022 [US1] Implementar `report:generate` en `main/ipc.js` llamando a `reporter.generateReport(site_id)`, devolviendo `{ ok, record, zeroAlerts }` según `contracts/ipc-contracts.md`; NO DEBE validar ni rechazar por la fecha del calendario (FR-014, FR-016) (depende de T021)
- [ ] T023 [US1] Implementar `records:list` en `main/ipc.js`: filas de `monthly_records` por `site_id` ordenadas por `generated_at` desc, con `variation` por fila calculada según la regla de "mes anterior" (`null` en la primera fila del sitio) (depende de T005, T006)
- [ ] T024 [P] [US1] Crear `renderer/js/generar.js`: botón GENERAR INFORME (FR-016, en `renderer/screens/generar.html`) llama a `report:generate`, muestra barra de progreso (`--gradient-brand`, `transition: width 300ms ease`) y mensaje de éxito/error según el tono de DESIGN.md; el botón NUNCA se deshabilita ni rechaza por la fecha de hoy (depende de T010, T011, T022)
- [ ] T025 [P] [US1] Crear `renderer/js/historico.js`: tabla desde `records:list` — JetBrains Mono `tabular-nums`, el `0` explícito en `--text-zero`, triángulo ▲/▼ de variación, `—` cuando `variation` es `null` (depende de T010, T011, T023)
- [ ] T026 [US1] En `renderer/js/generar.js`, añadir banner inline amarillo (`--status-warning`) por cada entrada de `zeroAlerts` devuelta por `report:generate` (depende de T024)

**Checkpoint**: Historia 1 completamente funcional de forma independiente — pulsar GENERAR INFORME cualquier día inserta una fila real (PageSpeed) con ceros explícitos, variación en Histórico, y regenerar un mes añade fila sin sobrescribir.

---

## Phase 4: User Story 2 - Recogida de datos vía API en lugar de visita manual a cada sitio (Priority: P1)

**Goal**: extender el pipeline de la Historia 1 con reintentos/backoff y las 4 fuentes restantes, para que ninguna requiera visita manual y ningún fallo bloquee el resto del informe (FR-004, FR-005, FR-007).

**Independent Test**: conectar una fuente de datos concreta y comprobar que el sistema recupera el valor de una métrica sin que el usuario visite manualmente el panel de esa herramienta (spec.md, US2).

### Implementation for User Story 2

- [ ] T027 [P] [US2] Crear `main/retry.js`: `withRetry(fn, { attempts: 3, backoffMs: [0, 5000, 10000] })`, emite el evento IPC `report:progress` (`{ source, status, attempt }`) en cada intento (research.md §6, contracts/ipc-contracts.md)
- [ ] T028 [US2] En `main/reporter.js`, envolver toda llamada a `collect()` (incluida `pagespeed`) con `withRetry()`; una fuente solo pasa a `sources_failed` tras agotar los 3 intentos (depende de T027, T018)
- [ ] T029 [P] [US2] Crear `main/sources/searchConsole.js`: `collect(siteConfig, period)` vía `googleapis` `searchanalytics.query` (cuenta de servicio OAuth2, research.md §2), devuelve `{ impressions, clicks, raw_url }`
- [ ] T030 [P] [US2] Crear `main/sources/siteKit.js`: `collect(siteConfig, period)` vía GA4 Data API `analyticsdata.v1beta.runReport` (misma cuenta de servicio), devuelve `{ sessions, traffic_direct, traffic_organic, traffic_social, traffic_referral, raw_url }`
- [ ] T031 [P] [US2] Crear `main/sources/squirrly.js`: `collect(siteConfig, period)` vía el endpoint REST de Squirrly/Ubersuggest (API key), devuelve `{ keywords: [{keyword,position,volume,impressions}], raw_url }`; fallback a `data/imports/<site_id>/keywords-YYYY-MM.csv` si el endpoint no responde (research.md §3)
- [ ] T032 [P] [US2] Crear `main/sources/securityNinja.js`: `collect(siteConfig, period)` vía el endpoint REST de Security Ninja (API key + Site ID), devuelve `{ vulnerabilities, malware, raw_url }`; traduce "sin incidencias" a `{ vulnerabilities:0, malware:0 }`, nunca `null` (research.md §4, FR-007)
- [ ] T033 [US2] Registrar `searchConsole`, `siteKit`, `squirrly`, `securityNinja` en el mapa `SOURCES` de `main/reporter.js`, junto a `pagespeed` (depende de T029, T030, T031, T032, T028)
- [ ] T034 [US2] En `main/reporter.js`, llamar a `mailer.sendAlert()` cuando `sources_failed` no esté vacío tras los reintentos (FR-005), indicando sitio y fuentes afectadas (depende de T020, T033)
- [ ] T035 [US2] Actualizar `renderer/js/generar.js`: badges por fuente (CONECTADO/REINTENTANDO/FALLIDO) alimentados por `report:progress`, 1 fuente = 20% de la barra con las 5 fuentes activas (depende de T024, T027)
- [ ] T036 [US2] Actualizar `renderer/js/historico.js`: filas con `sources_failed` no vacío llevan `border-left: 3px solid var(--status-error)` (depende de T025, T033)
- [ ] T037 [US2] Actualizar `renderer/js/sitios.js`: badge CONECTADO/PENDIENTE por fuente según existan credenciales guardadas (depende de T014, T013)

**Checkpoint**: las 5 fuentes están integradas con reintento/backoff; un fallo de fuente nunca bloquea el resto del informe; llega email de alerta tras 3 fallos.

---

## Phase 5: User Story 3 - Identificación de oportunidades SEO a partir del ranking de palabras clave (Priority: P2)

**Goal**: señalar qué palabras clave (volumen ≥ 50, fuera del top 3) merecen trabajo de contenido, agrupadas en tramos top10/top100 (FR-008).

**Independent Test**: cargar un conjunto de palabras clave con su posición y volumen de búsqueda, y comprobar que el sistema devuelve la lista de oportunidades esperada, agrupada por tramos (spec.md, US3).

### Implementation for User Story 3

- [ ] T038 [US3] En `main/reporter.js`, insertar en la tabla `keywords` el array `keywords[]` devuelto por `squirrly.collect()`, vinculado al `record_id` recién insertado, en la misma transacción (depende de T031, T033)
- [ ] T039 [P] [US3] Crear `main/opportunities.js`: `keywords:opportunities(site_id, period?)` — filtro `volume >= 50 AND position > 3`, tramo top10 (posiciones 4–10) / top100 (posiciones 11–100), excluye `position <= 3` (data-model.md, FR-008)
- [ ] T040 [US3] Implementar el handler `keywords:opportunities` en `main/ipc.js` llamando a `opportunities.js` (depende de T039)
- [ ] T041 [US3] Crear `renderer/js/oportunidades.js`: selector de sitio/periodo, dos contadores de tramo (badge ámbar), lista de keywords con badge OPORTUNIDAD (depende de T010, T011, T040)

**Checkpoint**: la pantalla Oportunidades SEO muestra correctamente la lista filtrada y agrupada por tramos para cualquier sitio/periodo con datos de keywords.

---

## Phase 6: User Story 4 - Captura de evidencia visual del informe (Priority: P3)

**Goal**: cada fuente que respondió con éxito queda respaldada por una captura de pantalla asociada al registro mensual (FR-009).

**Independent Test**: generar el informe de un mes y comprobar que queda asociada al menos una captura de pantalla a esa fila/registro por cada fuente que respondió correctamente (spec.md, US4).

### Implementation for User Story 4

- [ ] T042 [P] [US4] Crear `main/screenshotter.js`: `capture(url, destPath)` con Playwright headless Chromium, espera `networkidle`, guarda PNG (research.md §5)
- [ ] T043 [US4] En `main/reporter.js`, llamar a `screenshotter.capture()` para cada fuente en `sources_ok` que devolvió `raw_url`, guardando en `data/evidencias/<site_id>/<period>/<source>.png` e insertando la fila correspondiente en `evidencias` (depende de T042, T033)
- [ ] T044 [US4] Implementar `evidencias:list` y `evidencias:open` en `main/ipc.js` (`SELECT` por `record_id`; `shell.openPath()` para abrir) (depende de T005, T006)
- [ ] T045 [US4] Crear `renderer/js/evidencias.js`: selector de sitio/periodo/registro, galería de miniaturas, clic → `evidencias:open`; estado vacío proactivo cuando no hay evidencias (depende de T010, T011, T044)

**Checkpoint**: toda fuente exitosa tiene una captura de pantalla navegable ligada a su registro mensual.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: cierre de configuración SMTP, empaquetado y validación end-to-end.

- [ ] T046 [P] Añadir sección SMTP a `renderer/js/configuracion.js` (host, puerto, usuario, contraseña, email de notificación, botón ENVIAR PRUEBA) (depende de T015)
- [ ] T047 Implementar `settings:test-email` en `main/ipc.js` usando `main/mailer.js` (depende de T020, T046)
- [ ] T048 [P] Completar `electron-builder.yml`: `appId: net.elgriego.reportinggriego`, `productName: ReportingGriego`, targets `nsis` (Windows) + `dmg` (macOS), icono en `assets/icon.png` (+ `.ico`/`.icns`) (depende de T003)
- [ ] T049 Configurar recompilación nativa de `better-sqlite3` para Electron (`electron-rebuild` en `postinstall` de `package.json`, research.md §8) (depende de T001)
- [ ] T050 Ejecutar los 8 escenarios de [quickstart.md](./quickstart.md) de extremo a extremo y registrar los resultados
- [ ] T051 Smoke test del instalador empaquetado en una máquina sin entorno de desarrollo (sin Node.js instalado) — Windows NSIS y macOS DMG (depende de T048, T049)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede empezar de inmediato.
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las historias de usuario.
- **Historias de usuario (Phase 3+)**: todas dependen de que Foundational esté completo.
  - **US1 (P1)** puede empezar justo después de Foundational; es la base append-only/UI de la que dependen las demás.
  - **US2 (P1)** depende de `main/reporter.js` creado en US1 (T018) — extiende ese pipeline con reintento y las 4 fuentes restantes; sigue siendo independientemente probable con una fuente cualquiera en aislamiento.
  - **US3 (P2)** depende de que US2 haya integrado `squirrly.js` (T031) para tener `keywords` que analizar.
  - **US4 (P3)** depende de que exista al menos una fuente con `raw_url` (US1) y del pipeline de reintento (US2) para saber qué fuentes están en `sources_ok`.
- **Polish (Final Phase)**: depende de que las historias que se vayan a entregar estén completas.

### Within Each User Story

- Historia 1: `pagespeed.js` (fuente) → `reporter.js` (registro + alerta cero) → `mailer.js` → handlers IPC → UI (generar.js, historico.js).
- Historia 2: `retry.js` (utilidad) → envolver `reporter.js` → añadir las 4 fuentes restantes (en paralelo entre sí) → registrarlas en `reporter.js` → UI de progreso/error.
- Historia 3: `keywords` en `reporter.js` → `opportunities.js` → handler IPC → UI.
- Historia 4: `screenshotter.js` → `reporter.js` → handlers IPC → UI.

### Parallel Opportunities

- Setup: T002, T003 en paralelo.
- Foundational: T005, T007, T008, T010 en paralelo (archivos distintos, sin dependencias entre sí); T014 y T015 en paralelo una vez T012/T013 están listos.
- US1: T017 y T020 en paralelo (fuente vs. mailer, archivos distintos); T024 y T025 en paralelo una vez T022/T023 están listos.
- US2: T027 en paralelo con el resto; **T029, T030, T031, T032 en paralelo entre sí** (4 módulos de fuente independientes, sin dependencias cruzadas) — es el mayor bloque paralelizable del proyecto.
- US3: T039 en paralelo con T038.
- US4: T042 en paralelo con el resto de Foundational/US1/US2 ya cerradas.

---

## Parallel Example: User Story 2 (mayor bloque paralelizable)

```bash
# Una vez T027 (retry.js) y T028 (reporter.js envuelto) están listos, lanzar juntas:
Task: "Crear main/sources/searchConsole.js"
Task: "Crear main/sources/siteKit.js"
Task: "Crear main/sources/squirrly.js"
Task: "Crear main/sources/securityNinja.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 únicamente)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (bloqueante)
3. Completar Phase 3: User Story 1 (con PageSpeed como única fuente real)
4. **Parar y validar**: escenarios 1-3 de `quickstart.md` (registro, disparo en cualquier fecha, regeneración de mes cerrado)
5. Demo: se puede generar un informe real, con histórico e inmutabilidad, aunque solo con una fuente

### Incremental Delivery

1. Setup + Foundational → base lista
2. + US1 → validar independientemente → MVP demostrable (una fuente real, pipeline completo)
3. + US2 → validar independientemente → las 5 fuentes con reintento, ningún fallo bloquea
4. + US3 → validar independientemente → oportunidades SEO accionables
5. + US4 → validar independientemente → evidencia visual por fuente
6. Polish → empaquetado e instalador

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes entre sí.
- Casi todas las tareas que editan `main/ipc.js` o `main/reporter.js` comparten archivo con otras tareas de la misma fase — **deliberadamente no están marcadas [P] entre sí** aunque su lógica sea independiente, para evitar conflictos de edición simultánea sobre el mismo archivo.
- Commit por tarea, en español, imperativo (convención ya usada en el `tasks.md` raíz del repo).
- Parar en cualquier checkpoint para validar la historia correspondiente de forma aislada.
