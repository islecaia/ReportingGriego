# Implementation Plan: Automatización del informe mensual de métricas SEO y rendimiento web

**Branch**: `001-informe-mensual-seo` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-informe-mensual-seo/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

La feature sustituye el proceso 100% manual de preparación del informe mensual de SEO/rendimiento de una agencia digital (Google Search Console, GA4/Site Kit, Squirrly SEO/Ubersuggest, PageSpeed Insights, Security Ninja → hoja de cálculo copiada a mano) por una app de escritorio que recoge las cinco fuentes vía API, registra un histórico inmutable en SQLite local, calcula oportunidades SEO accionables, adjunta evidencia visual (captura de pantalla) por fuente, y avisa de forma visible (nunca silenciosa) ante fallos de fuente o caídas de métrica a cero. La generación puede dispararse manualmente en cualquier momento — no solo a fin de mes — sin que eso cambie ninguna garantía de inmutabilidad.

Enfoque técnico: Electron 30 (main process en Node.js + renderer HTML/CSS/JS vanilla reutilizando los mockups ya diseñados en `Pantallas/` y los tokens de `DESIGN.md`), SQLite local vía `better-sqlite3` con `monthly_records` estrictamente append-only, IPC con `contextIsolation` y contrato de respuesta uniforme, orquestador `reporter.js` con reintento 3×/backoff 0s-5s-10s por fuente, y empaquetado con `electron-builder` para Windows (NSIS) y macOS (DMG).

## Technical Context

**Language/Version**: JavaScript (ES2022+) sobre el Node.js embebido en Electron 30 (~Node 20.x) para el proceso main; HTML/CSS/JS vanilla sin transpilación para el renderer.

**Primary Dependencies**: Electron 30, `better-sqlite3`, `exceljs`, `playwright` (Chromium headless bundled), `nodemailer`, `electron-builder`. Sin framework de UI en el renderer (CSS custom properties de `DESIGN.md`). El cliente OAuth2/API para Search Console y GA4 se fija en `research.md` (Phase 0), ya que el usuario no especificó el paquete concreto.

**Storage**: SQLite local de archivo único (`reportinggriego.db`) vía `better-sqlite3`. Sin servidor, sin sincronización en la nube (Principio IV). Ubicación exacta del archivo resuelta en `research.md`.

**Testing**: Fuera de alcance en v1 (constitución, sección "Alcance y Restricciones Técnicas del MVP": tests automatizados fuera de alcance). Verificación manual por tarea, documentada en `tasks.md` (formato "Cómo se verifica" ya establecido en el `tasks.md` raíz).

**Target Platform**: Escritorio Windows (instalador NSIS) y macOS (DMG); sin Linux en el MVP. La app no requiere que el usuario tenga Node.js instalado (el runtime va embebido en el instalador de Electron).

**Project Type**: Aplicación de escritorio (single project) — Electron con separación main/renderer vía IPC.

**Performance Goals**: Sin objetivo de throughput (uso single-user, no concurrente). La UI debe permanecer responsive durante la generación: el proceso main hace todo el I/O de red/disco de forma asíncrona y emite eventos `report:progress` fuente a fuente para animar la barra sin bloquear el hilo de renderer. El peor caso por fuente fallida añade hasta ~15s de backoff acumulado (0s+5s+10s) antes de marcarla como fallida, sin bloquear las demás fuentes (Principio III).

**Constraints**:
- `contextIsolation: true`, `nodeIntegration: false`; todo acceso a BD o APIs externas vive exclusivamente en el main process (nunca en el renderer).
- Toda respuesta IPC lleva `{ ok: boolean, error?: string }`.
- `monthly_records` es **append-only**: ninguna ruta de código ejecuta `UPDATE` ni `DELETE` sobre esa tabla, sin excepciones (Principio I, FR-011, FR-015).
- La generación de informe DEBE poder dispararse en cualquier fecha, nunca rechazada por no ser fin de mes (FR-014, FR-016).
- Backup = copiar el único archivo `.db` (Principio IV); sin dependencia de red para el histórico ya registrado.

**Scale/Scope**: Cartera de sitios de una agencia (decenas de sitios, no miles); un único usuario por instalación (sin autenticación multi-usuario, fuera de alcance v1). 6 pantallas ya diseñadas en `Pantallas/` (Sitios, Generar informe, Histórico, Oportunidades SEO, Evidencias, Configuración).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principio | Chequeo | Estado |
|---|---|---|---|
| I | Integridad del Histórico por Encima de Todo | `monthly_records` es INSERT-only; ninguna operación de escritura definida en este plan emite UPDATE/DELETE sobre esa tabla (ver `data-model.md`) | PASS |
| II | Cero Ambigüedad en los Datos | Las métricas sin actividad se insertan como `0` explícito; las fuentes fallidas se listan en `sources_failed`, nunca se omiten en silencio | PASS |
| III | El Fallo No Bloquea | `reporter.js` reintenta 3× con backoff 0s/5s/10s por fuente; el registro final se inserta con los valores disponibles aunque una fuente falle | PASS |
| IV | Simplicidad de Infraestructura | SQLite local de archivo único vía `better-sqlite3`; sin servidor; instalador autocontenido vía `electron-builder`, sin requerir Node.js en la máquina destino | PASS |
| V | La UI Refleja la Marca, No el Backend | Renderer HTML/CSS/JS vanilla que reutiliza los mockups de `Pantallas/` y los tokens de `DESIGN.md`; no se introduce ningún framework de UI que los sustituya | PASS |
| VI | Textos del Sistema Directos y Accionables | Gate de contenido/copy, no de arquitectura; se aplica al redactar los mensajes de cada pantalla durante la implementación, no afecta a las decisiones de este plan | PASS (n/a a nivel de arquitectura) |
| VII | Oportunidades SEO como Output Accionable | `opportunities.js` calcula y agrupa en tramos top10/top100 antes de exponer nada al renderer; el renderer nunca recibe un ranking crudo sin procesar | PASS |
| VIII | Aislamiento por Sitio | Toda tabla de datos incluye `site_id`; todo canal IPC de lectura recibe `site_id` explícito y filtra por él (ver `contracts/ipc-contracts.md`) | PASS |
| IX | Evidencia Visual como Respaldo | `screenshotter.js` captura cada fuente que respondió con éxito y la asocia al `record_id` vía la tabla `evidencias` | PASS |

Sin violaciones detectadas. No aplica `Complexity Tracking`.

**Re-chequeo post-diseño (tras Phase 1)**: `data-model.md` y `contracts/ipc-contracts.md` confirman las decisiones anteriores sin introducir ninguna nueva — en particular, `report:generate` (contracts) nunca ejecuta `UPDATE`/`DELETE` sobre `monthly_records` (Principio I) y siempre exige `site_id` (Principio VIII). Gate sigue en PASS para los 9 principios.

## Project Structure

### Documentation (this feature)

```text
specs/001-informe-mensual-seo/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── ipc-contracts.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
main/                        # Node.js — proceso main de Electron
├── index.js                 # arranque de Electron, crea BrowserWindow (contextIsolation:true, nodeIntegration:false)
├── preload.js                # contextBridge → window.api.invoke/on
├── db/
│   ├── schema.sql            # sites, credentials, monthly_records, keywords, evidencias, settings
│   └── db.js                 # singleton better-sqlite3, ruta vía app.getPath('userData')
├── sources/                  # un módulo por fuente, todos exportan collect(siteConfig, period)
│   ├── searchConsole.js
│   ├── siteKit.js
│   ├── squirrly.js
│   ├── pagespeed.js
│   └── securityNinja.js
├── reporter.js               # orquestador: reintentos, backoff, progreso IPC, INSERT append-only
├── opportunities.js          # tramos top10/top100 (FR-008, Principio VII)
├── mailer.js                 # Nodemailer — alertas de fuente fallida y de métrica a cero
├── screenshotter.js          # Playwright headless — evidencia visual (FR-009, Principio IX)
└── ipc.js                    # registro de todos los canales IPC (contracts/ipc-contracts.md)

renderer/                    # HTML/CSS/JS vanilla — proceso renderer
├── index.html                # switcher de pantallas
├── screens/                  # los 6 mockups ya diseñados, portados tal cual
│   ├── sitios.html
│   ├── generar.html
│   ├── historico.html
│   ├── oportunidades.html
│   ├── evidencias.html
│   └── configuracion.html
└── js/
    ├── app.js
    ├── sitios.js
    ├── generar.js
    ├── historico.js
    ├── oportunidades.js
    ├── evidencias.js
    └── configuracion.js

assets/
└── icon.png                  # + .ico/.icns para electron-builder

data/                        # generado en runtime, NO en git
├── reportinggriego.db
└── evidencias/<site_id>/<period>/<source>.png
```

**Structure Decision**: proyecto único (Electron main/renderer), sin split backend/frontend en el sentido web del término — main e IPC hacen de "backend" local. Esta estructura reutiliza y no contradice la ya validada en el `plan.md`/`tasks.md` de la raíz del repositorio (mismo repo, mismo stack); este plan la adopta como la estructura de código fuente para la feature `001-informe-mensual-seo`.

## Complexity Tracking

Sin violaciones que justificar — todos los gates de la Constitution Check pasan sin excepciones.
