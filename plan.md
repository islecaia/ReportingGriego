# Plan de construcción — ReportingGriego MVP

**Proyecto**: ReportingGriego  
**Agencia**: elGriegoNET®  
**Spec de referencia**: `001-automatizacion-informe-metricas-seo`  
**Fecha**: 2026-08-31  
**Estado**: Borrador aprobado para desarrollo

---

## 1. Decisión tecnológica

### Stack elegido: Electron + Node.js + SQLite

| Capa | Tecnología | Razón |
|---|---|---|
| Shell de escritorio | **Electron 30** | Los 6 mockups ya son HTML/CSS/JS; no se tira nada |
| Lógica de negocio | **Node.js** (main process de Electron) | Mismo ecosistema, acceso nativo a sistema de archivos |
| Almacenamiento local | **SQLite** vía `better-sqlite3` | Sin servidor, un solo archivo, consultas síncronas simples |
| Exportación Excel | **ExcelJS** | Genera `.xlsx` reales con fórmulas y formato, no CSV |
| Capturas de pantalla | **Playwright** (bundled Chromium) | Ya incluido en el entorno; captura páginas de APIs que tienen UI web |
| Notificaciones email | **Nodemailer** | Minimalista; usa la cuenta SMTP que el usuario configure |
| Empaquetado | **electron-builder** | Genera instalador `.exe` / `.dmg` en un comando |

### Lo que queda fuera del MVP

- Autenticación multi-usuario (herramienta de uso personal/agencia).
- Sincronización en la nube (todo es local; backup = copiar el archivo SQLite).
- Simulación de comportamiento humano / mapas de calor (fuera de alcance por decisión del usuario en la spec).

---

## 2. Estructura del repositorio

```
reportinggriego/
├── package.json
├── electron-builder.yml
│
├── main/                        ← Node.js (main process)
│   ├── index.js                 ← arranque de Electron, crea la ventana
│   ├── db/
│   │   ├── schema.sql           ← CREATE TABLE declarativas
│   │   └── db.js                ← singleton better-sqlite3
│   ├── sources/                 ← un archivo por fuente de datos
│   │   ├── searchConsole.js
│   │   ├── siteKit.js
│   │   ├── squirrly.js
│   │   ├── pagespeed.js
│   │   └── securityNinja.js
│   ├── reporter.js              ← orquesta la recogida y llama a cada source
│   ├── opportunities.js         ← lógica de oportunidades SEO (FR-004, FR-005)
│   ├── mailer.js                ← Nodemailer (FR-011, FR-013)
│   ├── screenshotter.js         ← Playwright screenshot (FR-008)
│   └── ipc.js                   ← define todos los handlers IPC entre main y renderer
│
├── renderer/                    ← HTML/CSS/JS (renderer process, los mockups)
│   ├── index.html               ← contenedor con switcher de pantallas
│   ├── screens/
│   │   ├── sitios.html
│   │   ├── generar.html
│   │   ├── historico.html
│   │   ├── oportunidades.html
│   │   ├── evidencias.html
│   │   └── configuracion.html
│   └── js/
│       ├── app.js               ← switcher de pantallas, IPC bridge
│       ├── sitios.js
│       ├── generar.js
│       ├── historico.js
│       ├── oportunidades.js
│       ├── evidencias.js
│       └── configuracion.js
│
├── assets/
│   └── icon.png
│
└── data/                        ← generado en runtime, no en git
    ├── reportinggriego.db       ← SQLite
    └── evidencias/              ← capturas de pantalla por sitio/mes
```

---

## 3. Modelo de datos (SQLite)

```sql
-- Sitios gestionados
CREATE TABLE sites (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  url         TEXT NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1,   -- 1 = activo, 0 = dado de baja
  created_at  TEXT NOT NULL DEFAULT (date('now'))
);

-- Credenciales de API por sitio y fuente
CREATE TABLE credentials (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id  INTEGER NOT NULL REFERENCES sites(id),
  source   TEXT NOT NULL,   -- 'search_console' | 'site_kit' | 'squirrly' | 'pagespeed' | 'security_ninja'
  config   TEXT NOT NULL    -- JSON con tokens/api_keys, cifrado en reposo (opcional v2)
);

-- Registro mensual de métricas (una fila por sitio × mes)
CREATE TABLE monthly_records (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id         INTEGER NOT NULL REFERENCES sites(id),
  period          TEXT NOT NULL,   -- 'YYYY-MM'
  generated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  -- Search Console
  impressions     INTEGER,
  clicks          INTEGER,
  -- Site Kit / GA4
  sessions        INTEGER,
  traffic_direct  REAL,    -- % canal directo
  traffic_organic REAL,    -- % canal orgánico
  traffic_social  REAL,    -- % redes sociales
  traffic_referral REAL,   -- % referidos
  -- PageSpeed
  perf_desktop    INTEGER,
  perf_mobile     INTEGER,
  -- Security Ninja
  vulnerabilities INTEGER,
  malware         INTEGER,
  -- Metadatos de generación
  sources_ok      TEXT,    -- JSON array de fuentes que respondieron OK
  sources_failed  TEXT     -- JSON array de fuentes que fallaron tras 3 reintentos
);

-- Palabras clave con posición e impresiones (por registro mensual)
CREATE TABLE keywords (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id   INTEGER NOT NULL REFERENCES monthly_records(id),
  keyword     TEXT NOT NULL,
  position    REAL NOT NULL,
  volume      INTEGER,        -- búsquedas/mes (de Squirrly/Ubersuggest)
  impressions INTEGER
);

-- Evidencias visuales asociadas a un registro mensual
CREATE TABLE evidencias (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id   INTEGER NOT NULL REFERENCES monthly_records(id),
  source      TEXT NOT NULL,   -- qué fuente capturó
  file_path   TEXT NOT NULL,   -- ruta relativa dentro de data/evidencias/
  captured_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Configuración global de la app
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
-- Ejemplos de claves: 'smtp_host', 'smtp_user', 'smtp_pass', 'notify_email'
```

---

## 4. Comunicación main ↔ renderer (IPC)

Electron separa el proceso Node (main) del proceso de UI (renderer). Toda llamada a base de datos o API externa pasa por IPC:

```
renderer  →  ipcRenderer.invoke('channel', payload)
main      →  ipcMain.handle('channel', handler)
```

Canales planificados:

| Canal | Dirección | Qué hace |
|---|---|---|
| `sites:list` | renderer → main | Devuelve todos los sitios activos |
| `sites:create` | renderer → main | Añade un sitio nuevo |
| `sites:deactivate` | renderer → main | Marca un sitio como dado de baja |
| `credentials:save` | renderer → main | Guarda/actualiza credenciales de un sitio |
| `report:generate` | renderer → main | Lanza la generación de informe; emite eventos de progreso |
| `report:progress` | main → renderer | Evento de progreso fuente a fuente (para la barra animada) |
| `records:list` | renderer → main | Histórico de registros de un sitio |
| `keywords:opportunities` | renderer → main | Lista de oportunidades SEO calculadas |
| `evidencias:list` | renderer → main | Lista de capturas asociadas a un registro |
| `settings:get` | renderer → main | Lee una o todas las claves de configuración |
| `settings:set` | renderer → main | Guarda una clave de configuración |

---

## 5. Fases de desarrollo

Las fases siguen las prioridades de la spec (P1 → P2 → P3) y están pensadas para que cada una entregue algo funcional y verificable.

---

### Fase 0 — Proyecto base (3–4 horas)

**Objetivo**: tener la app arrancando con los mockups ya navegables dentro de Electron.

Tareas:
1. `npm init` + instalar dependencias base (Electron, better-sqlite3, electron-builder).
2. `main/index.js`: crear `BrowserWindow`, cargar `renderer/index.html`.
3. Copiar los 6 mockups de pantalla al directorio `renderer/screens/`.
4. `renderer/js/app.js`: el switcher de pantallas (ya existe en el prototipo HTML combinado; se porta tal cual).
5. `main/db/schema.sql` + `main/db/db.js`: crear la base de datos SQLite con el esquema completo al primer arranque.
6. `main/ipc.js`: estructura vacía con todos los canales registrados (handlers pendientes de implementar).

Verificación: `npm start` abre la app con las 6 pantallas navegables; la base de datos se crea en `data/`.

---

### Fase 1 — Gestión de sitios y configuración (4–6 horas)

**Objetivo**: el usuario puede añadir sitios, introducir credenciales y verlos listados.  
**Requisitos cubiertos**: FR-009, FR-014.

Tareas:
1. Implementar handlers IPC: `sites:list`, `sites:create`, `sites:deactivate`.
2. `renderer/js/sitios.js`: conectar el drawer "Añadir sitio" con `sites:create`; renderizar la lista desde `sites:list`.
3. Implementar `credentials:save` + UI en pantalla Configuración para introducir API keys / tokens OAuth por fuente.
4. Mostrar el badge de estado de cada fuente (CONECTADO / PENDIENTE) en la pantalla Sitios en función de si hay credenciales guardadas.

Verificación: añadir un sitio de prueba con credenciales ficticias; verificar que aparece en la lista y que darlo de baja no lo elimina del histórico (que por ahora estará vacío).

---

### Fase 2 — Integración con fuentes de datos (8–12 horas)

**Objetivo**: el sistema obtiene métricas reales de las 5 fuentes sin intervención manual.  
**Requisitos cubiertos**: FR-010, FR-011.

Un archivo por fuente en `main/sources/`. Interfaz común:

```js
// Cada source exporta esta función
async function collect(siteConfig, period) {
  // period = 'YYYY-MM'
  // Devuelve { metrics: {...}, raw_url: '...' } o lanza FetchError
}
```

Fuentes y mecanismo de acceso:

| Fuente | Auth | Endpoint principal |
|---|---|---|
| **Google Search Console** | OAuth2 (JSON de credenciales descargado de GCP) | `searchanalytics.query` |
| **Google Site Kit / GA4** | OAuth2 (mismas credenciales GCP o cuenta de servicio) | `reports.runReport` (GA4 Data API) |
| **Squirrly SEO / Ubersuggest** | API Key | REST endpoint propio (documentado en la cuenta) |
| **Google PageSpeed Insights** | API Key pública (gratuita) | `pagespeedonline.v5.runpagespeed` |
| **Security Ninja** | API Key + Site ID | REST endpoint propio |

`main/reporter.js` — orquestador:
```
Para cada fuente del sitio:
  1. Intentar collect() hasta 3 veces con backoff de 5 s entre intentos
  2. Si falla las 3: registrar en sources_failed, emitir evento 'report:progress' con estado ERROR
  3. Si tiene éxito: acumular métricas, emitir evento 'report:progress' con estado OK
Al terminar todas las fuentes:
  Insertar fila en monthly_records (valores nulos donde la fuente falló)
  Si hay sources_failed: llamar a mailer.js (FR-011)
```

Verificación: generar informe para un sitio real con las 5 credenciales configuradas; revisar fila en SQLite y que la barra de progreso avanza fuente a fuente en la UI.

---

### Fase 3 — Histórico y pantalla Generar Informe (4–5 horas)

**Objetivo**: el usuario puede generar el informe y ver el histórico con variación respecto al mes anterior.  
**Requisitos cubiertos**: FR-001, FR-002, FR-003, FR-006, FR-007, FR-012, FR-013.

Tareas:
1. Handler `records:list`: devuelve las filas de `monthly_records` para un sitio, ordenadas por `period` desc.
2. `renderer/js/historico.js`: renderiza la tabla con valores numéricos (JetBrains Mono), el `0` explícito en color `--text-zero`, y el triángulo ▲/▼ de variación calculado en el renderer.
3. `renderer/js/generar.js`: barra de progreso animada conectada a eventos `report:progress`; mensaje de éxito/error al final siguiendo el tono de DESIGN.md (p.ej. "Informe de agosto generado correctamente. 4 fuentes conectadas.").
4. Lógica FR-013: antes de insertar, comparar con la fila del periodo anterior; si una métrica pasa de >0 a 0 por primera vez, encolar aviso por email (además del aviso de la UI).

Verificación: regenerar el informe de un mes ya registrado; verificar que se añade una segunda fila sin sobrescribir la anterior (FR-012).

---

### Fase 4 — Oportunidades SEO (3–4 horas)

**Objetivo**: el sistema señala automáticamente qué palabras clave trabajar.  
**Requisitos cubiertos**: FR-004, FR-005.

Tareas:
1. En `reporter.js`, al recoger datos de Squirrly/Ubersuggest, insertar las palabras clave en la tabla `keywords` vinculadas al `record_id`.
2. `main/opportunities.js`:
   - Handler `keywords:opportunities(recordId)`.
   - Filtro: `volume >= 50 AND position > 3`.
   - Agrupación de tramos: top 100 (posición 4–100), top 10 (posición 4–10), top 3 (ya optimizadas → excluidas).
3. `renderer/js/oportunidades.js`: renderizar la lista con badge OPORTUNIDAD en ámbar, posición y volumen.

Verificación: cargar un dataset de prueba de keywords; comprobar que las que están en el top 3 no aparecen y que el recuento por tramo es correcto.

---

### Fase 5 — Evidencias (capturas de pantalla) (3–4 horas)

**Objetivo**: cada generación de informe guarda una captura visual de la fuente de datos.  
**Requisitos cubiertos**: FR-008.

Tareas:
1. `main/screenshotter.js`: lanza Playwright en modo headless; navega a la URL de la fuente que devuelve `collect()` (el campo `raw_url`); hace screenshot PNG; lo guarda en `data/evidencias/<site_id>/<period>/<source>.png`.
2. Insertar fila en tabla `evidencias` con la ruta del archivo.
3. Handler `evidencias:list(recordId)`.
4. `renderer/js/evidencias.js`: galería de miniaturas clicables; al hacer clic abre la imagen a pantalla completa con `shell.openPath()`.

Verificación: generar informe; abrir pantalla Evidencias; verificar que aparecen las capturas de las fuentes que tienen `raw_url`.

---

### Fase 6 — Empaquetado y entrega (2–3 horas)

**Objetivo**: instalador que el usuario puede ejecutar en su equipo sin instalar nada más.

Tareas:
1. Configurar `electron-builder.yml` (nombre app, iconos, targets: `nsis` para Windows, `dmg` para macOS).
2. Firmar la app si hay certificado disponible; si no, documentar el paso de "permitir app no firmada" en macOS/Windows.
3. Smoke test del instalador en limpio (sin Node instalado en la máquina de destino).

---

## 6. Resumen de fases y estimación

| Fase | Qué entrega | Prioridad spec | Estimación |
|---|---|---|---|
| 0 — Proyecto base | App Electron arrancando con los 6 mockups | — | 3–4 h |
| 1 — Gestión de sitios | Añadir, listar, dar de baja sitios + credenciales | P1 (soporte) | 4–6 h |
| 2 — Integración APIs | Recogida real de datos de las 5 fuentes | **P1** | 8–12 h |
| 3 — Histórico + Generar | Registro mensual, variación, alertas cero | **P1** | 4–5 h |
| 4 — Oportunidades SEO | Lista de keywords a trabajar, tramos de posición | P2 | 3–4 h |
| 5 — Evidencias | Capturas de pantalla por informe | P3 | 3–4 h |
| 6 — Empaquetado | Instalador listo para distribuir | — | 2–3 h |
| **Total** | | | **27–38 h** |

La parte más variable es la Fase 2 (APIs): el tiempo real depende de la documentación y comportamiento de Squirrly/Ubersuggest y Security Ninja, que son los dos endpoints más opacos. Google y PageSpeed son estables y bien documentados.

---

## 7. Convenciones de desarrollo

- **Un commit por tarea** del plan; mensaje en español, imperativo (`Añadir handler sites:list`).
- **No hay tests unitarios en el MVP** por velocidad, pero cada fase tiene su verificación manual descrita. Tests se añaden en v1.1.
- **Secrets nunca van a git**: las credenciales se guardan en SQLite local y en un `.env` para el entorno de desarrollo; `.gitignore` cubre `data/` y `.env`.
- **IPC tipado**: todos los payloads y respuestas IPC llevan un campo `ok: boolean` + `error?: string` para que el renderer siempre sepa si algo falló sin parsear excepciones.
- **Cero dependencias de UI externa**: el renderer usa el sistema de tokens de DESIGN.md en variables CSS nativas; no se introduce ningún framework de componentes.

---

*Plan v1.0 — agosto 2026 — ReportingGriego / elGriegoNET®*
