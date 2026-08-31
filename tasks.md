# Tareas de construcción — ReportingGriego MVP

> Cada tarea está dimensionada para una sesión de trabajo (2–4 h).  
> Construye en orden: cada bloque depende del anterior.  
> El criterio de verificación al final de cada tarea es la señal de que puedes cerrar la sesión.

---

## Vista rápida

| ID | Título | Fase | Est. |
|---|---|---|---|
| T-01 | Inicializar proyecto Electron | 0 | 1–2 h |
| T-02 | Cargar mockups en Electron con switcher | 0 | 1–2 h |
| T-03 | Esquema SQLite y esqueleto IPC | 0 | 1–2 h |
| T-04 | CRUD de sitios en main process | 1 | 2–3 h |
| T-05 | Pantalla Sitios conectada con IPC | 1 | 1–2 h |
| T-06 | Guardar credenciales + pantalla Configuración | 1 | 2–3 h |
| T-07 | Integrar PageSpeed Insights | 2 | 1–2 h |
| T-08 | Integrar Google Search Console | 2 | 2–3 h |
| T-09 | Integrar Google Site Kit / GA4 | 2 | 2–3 h |
| T-10 | Integrar Squirrly SEO / Ubersuggest | 2 | 2–4 h |
| T-11 | Integrar Security Ninja | 2 | 1–3 h |
| T-12 | Orquestador reporter.js (reintentos + progreso) | 2 | 2–3 h |
| T-13 | Barra de progreso en UI conectada al reporter | 3 | 1–2 h |
| T-14 | Insertar monthly_records + alerta cero (FR-013) | 3 | 2–3 h |
| T-15 | Pantalla Histórico con variación mensual | 3 | 2–3 h |
| T-16 | Notificación email por fallo de fuente | 3 | 1–2 h |
| T-17 | Insertar keywords durante recogida de Squirrly | 4 | 1–2 h |
| T-18 | Oportunidades SEO: lógica + pantalla | 4 | 2–3 h |
| T-19 | Capturas de pantalla con Playwright | 5 | 2–3 h |
| T-20 | Pantalla Evidencias: galería por registro | 5 | 1–2 h |
| T-21 | Empaquetado con electron-builder | 6 | 2–3 h |

---

## Detalle de tareas

---

### T-01 — Inicializar proyecto Electron
**Fase**: 0 · **Estimación**: 1–2 h · **Prerrequisito**: ninguno

**Qué se construye**

- `package.json` con scripts `start`, `build` y las dependencias:
  `electron`, `better-sqlite3`, `exceljs`, `nodemailer`, `playwright`, `electron-builder`.
- `main/index.js` mínimo: crea `BrowserWindow` (1 280 × 800, `nodeIntegration: false`, `contextIsolation: true`) y carga `renderer/index.html`.
- `.gitignore` cubriendo `node_modules/`, `data/`, `.env`, `dist/`.
- `electron-builder.yml` vacío con `appId`, `productName` y targets comentados (se completa en T-21).

**Cómo se verifica**

`npm start` abre una ventana de Electron en blanco sin errores en consola.

---

### T-02 — Cargar mockups en Electron con switcher
**Fase**: 0 · **Estimación**: 1–2 h · **Prerrequisito**: T-01

**Qué se construye**

- Copiar los 6 archivos de pantalla a `renderer/screens/`.
- `renderer/index.html`: barra switcher fija de 32 px (fondo `#0F000A`, borde inferior `#E91E8C`) con un botón por pantalla; el contenido de cada pantalla se carga en un `<div class="screen">` con `display:none` / `display:block`.
- `renderer/js/app.js`: función `showScreen(id)` que activa la pantalla correcta y marca el botón como activo.
- `main/index.js`: añadir `preload.js` vacío (se rellena en T-03) y la política CSP básica.

**Cómo se verifica**

`npm start` → las 6 pantallas son navegables haciendo clic en los botones del switcher, sin rotura visual. Los estilos y fuentes de cada mockup cargan correctamente.

---

### T-03 — Esquema SQLite y esqueleto IPC
**Fase**: 0 · **Estimación**: 1–2 h · **Prerrequisito**: T-02

**Qué se construye**

- `main/db/schema.sql`: las tablas `sites`, `credentials`, `monthly_records`, `keywords`, `evidencias`, `settings` (exactamente como están en `plan.md`).
- `main/db/db.js`: singleton `better-sqlite3`; al primer arranque, ejecuta `schema.sql` y crea `data/reportinggriego.db` si no existe.
- `main/ipc.js`: registra todos los canales IPC del plan con handlers que devuelven `{ ok: false, error: 'not implemented' }` por ahora.
- `preload.js`: expone `window.api.invoke(channel, payload)` vía `contextBridge`.

**Cómo se verifica**

`npm start` → abrir DevTools del renderer → `await window.api.invoke('sites:list')` devuelve `{ ok: false, error: 'not implemented' }` sin excepción. Verificar que `data/reportinggriego.db` existe y tiene las 6 tablas (con cualquier cliente SQLite o `sqlite3` en CLI).

---

### T-04 — CRUD de sitios en main process
**Fase**: 1 · **Estimación**: 2–3 h · **Prerrequisito**: T-03

**Qué se construye**

Implementar en `main/ipc.js` los tres handlers de sitios:

- `sites:list` → `SELECT * FROM sites ORDER BY name`.
- `sites:create` → `INSERT INTO sites (name, url) VALUES (?, ?)`. Valida que `url` no esté vacía y que no exista ya un sitio con esa URL; devuelve el `id` del nuevo sitio.
- `sites:deactivate` → `UPDATE sites SET active = 0 WHERE id = ?`. Nunca borra filas.

**Cómo se verifica**

Desde DevTools:
```js
await window.api.invoke('sites:create', { name: 'Test', url: 'https://test.com' })
// → { ok: true, id: 1 }
await window.api.invoke('sites:list')
// → { ok: true, sites: [{ id:1, name:'Test', url:'https://test.com', active:1 }] }
await window.api.invoke('sites:deactivate', { id: 1 })
await window.api.invoke('sites:list')
// → el sitio aparece con active:0, no desaparece
```

---

### T-05 — Pantalla Sitios conectada con IPC
**Fase**: 1 · **Estimación**: 1–2 h · **Prerrequisito**: T-04

**Qué se construye**

- `renderer/js/sitios.js`:
  - Al cargar la pantalla: `window.api.invoke('sites:list')` y renderizar la lista de tarjetas con nombre, URL y badge de estado (activo / dado de baja).
  - Botón "Añadir sitio": abre el drawer del mockup; al confirmar, llama a `sites:create` y recarga la lista.
  - Botón "Dar de baja" en cada tarjeta: pide confirmación (diálogo nativo `dialog.showMessageBox`), llama a `sites:deactivate` y recarga la lista.
- Badge de fuentes: por ahora todos en estado PENDIENTE (gris `--status-neutral`); se actualizan en T-06.

**Cómo se verifica**

Añadir dos sitios desde la UI → aparecen en la lista. Dar de baja uno → el badge cambia y ya no aparece en la lista activa, pero sigue visible si se filtra por "todos" (o en la BD).

---

### T-06 — Guardar credenciales + pantalla Configuración
**Fase**: 1 · **Estimación**: 2–3 h · **Prerrequisito**: T-05

**Qué se construye**

- Implementar `credentials:save` en `main/ipc.js`: `INSERT OR REPLACE INTO credentials (site_id, source, config) VALUES (?, ?, ?)`. El campo `config` almacena JSON (tokens, API keys).
- `renderer/js/configuracion.js`:
  - Selector de sitio activo (dropdown con los sitios de `sites:list`).
  - Para cada una de las 5 fuentes: un formulario con los campos necesarios (API Key, ruta al JSON OAuth, Site ID…) y un botón GUARDAR que llama a `credentials:save`.
- Actualizar `renderer/js/sitios.js`: después de guardar credenciales, los badges de la pantalla Sitios muestran CONECTADO (verde) para las fuentes que ya tienen credenciales guardadas.

**Cómo se verifica**

Abrir pantalla Configuración → seleccionar un sitio → introducir una API Key ficticia para PageSpeed → guardar → volver a pantalla Sitios → el badge de PageSpeed del sitio muestra CONECTADO.

---

### T-07 — Integrar PageSpeed Insights
**Fase**: 2 · **Estimación**: 1–2 h · **Prerrequisito**: T-06

**Qué se construye**

- `main/sources/pagespeed.js`:
  ```js
  async function collect(siteConfig, period) {
    // GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed
    //     ?url=<siteUrl>&strategy=desktop|mobile&key=<apiKey>
    // Devuelve { perf_desktop, perf_mobile, raw_url }
  }
  ```
- La `raw_url` es la URL del informe de PageSpeed de ese dominio (para la captura de pantalla en T-19).
- Manejo de error: lanza `FetchError` si el status HTTP no es 200 o si `lighthouseResult` no existe en la respuesta.

**Cómo se verifica**

Desde `node main/sources/pagespeed.js` (script de prueba inline o `test:pagespeed` en package.json) con una API Key real y un dominio real → devuelve dos puntuaciones numéricas entre 0 y 100.

---

### T-08 — Integrar Google Search Console
**Fase**: 2 · **Estimación**: 2–3 h · **Prerrequisito**: T-06

**Qué se construye**

- `main/sources/searchConsole.js`:
  - Autenticación OAuth2 con el JSON de credenciales de cuenta de servicio o flujo instalado (usar `googleapis` npm).
  - Llamada a `searchanalytics.query` con `startDate`/`endDate` del periodo (primer y último día del mes).
  - Devuelve `{ impressions, clicks, raw_url }`.
- `raw_url`: URL a Search Console del sitio para captura en T-19.

**Cómo se verifica**

Script de prueba con un JSON de credenciales real y un sitio verificado en Search Console → devuelve impresiones y clics del mes anterior.

---

### T-09 — Integrar Google Site Kit / GA4
**Fase**: 2 · **Estimación**: 2–3 h · **Prerrequisito**: T-08

**Qué se construye**

- `main/sources/siteKit.js`:
  - Reutiliza la misma auth OAuth2 que T-08 (mismo JSON de credenciales o cuenta de servicio con acceso a GA4).
  - Llamada a GA4 Data API (`analyticsdata.v1beta.runReport`) con las dimensiones `sessionDefaultChannelGroup` y la métrica `sessions`.
  - Calcula `sessions` total y los porcentajes de canal (Organic Search, Direct, Social, Referral).
  - Devuelve `{ sessions, traffic_direct, traffic_organic, traffic_social, traffic_referral, raw_url }`.

**Cómo se verifica**

Script de prueba → los porcentajes de canal suman ~100 % (puede haber un residual "Other" ignorado en el MVP).

---

### T-10 — Integrar Squirrly SEO / Ubersuggest
**Fase**: 2 · **Estimación**: 2–4 h · **Prerrequisito**: T-06

> Esta es la fuente más incierta del proyecto. Reservar el extremo superior del rango si la API no está bien documentada o requiere scraping autenticado.

**Qué se construye**

- `main/sources/squirrly.js`:
  - Llamada al endpoint de ranking de palabras clave de Squirrly (o Ubersuggest según lo que use el usuario) autenticada con API Key.
  - Devuelve un array `keywords[]` con `{ keyword, position, volume, impressions }` para el dominio y el periodo.
  - También devuelve `raw_url` (URL del dashboard de ranking del dominio).
- Si la API no es accesible directamente, alternativa documentada en un comentario: exportar CSV manualmente y colocarlo en `data/imports/<site_id>/keywords-YYYY-MM.csv`; el source lo detecta y lo parsea como fallback.

**Cómo se verifica**

Script de prueba → lista de al menos 5 palabras clave con posición, volumen e impresiones. El fallback CSV también funciona si se coloca el archivo.

---

### T-11 — Integrar Security Ninja
**Fase**: 2 · **Estimación**: 1–3 h · **Prerrequisito**: T-06

**Qué se construye**

- `main/sources/securityNinja.js`:
  - Llamada al endpoint de Security Ninja con API Key + Site ID.
  - Devuelve `{ vulnerabilities, malware, raw_url }`.
  - `vulnerabilities` y `malware` son conteos enteros (0 si no hay incidencias).

**Cómo se verifica**

Script de prueba → devuelve dos enteros sin lanzar excepción. Si el endpoint devuelve un estado de "sin incidencias", el source lo traduce a `{ vulnerabilities: 0, malware: 0 }` (no a `null`).

---

### T-12 — Orquestador reporter.js (reintentos + progreso)
**Fase**: 2 · **Estimación**: 2–3 h · **Prerrequisito**: T-07, T-08, T-09, T-10, T-11

**Qué se construye**

- `main/reporter.js`:
  ```
  Para cada fuente del sitio:
    1. Llamar a collect() con backoff: 0 s / 5 s / 10 s entre intentos
    2. Emitir evento IPC 'report:progress' con { source, status: 'ok'|'retrying'|'failed' }
    3. Si falla las 3 veces: añadir a sources_failed
  Al terminar:
    Acumular métricas (las de fuentes fallidas quedan null)
    Devolver { metrics, keywords, sources_ok, sources_failed }
  ```
- Implementar handler `report:generate` en `main/ipc.js` que llama al reporter y devuelve el resultado.

**Cómo se verifica**

Llamar a `report:generate` desde DevTools con un sitio real → en la consola del main process se ven los logs de cada fuente con su estado. Si se pasa una API Key incorrecta a una fuente, el sistema reintenta 3 veces y continúa con las demás.

---

### T-13 — Barra de progreso en UI conectada al reporter
**Fase**: 3 · **Estimación**: 1–2 h · **Prerrequisito**: T-12

**Qué se construye**

- `renderer/js/generar.js`:
  - Botón GENERAR INFORME llama a `report:generate`.
  - Escucha eventos `report:progress` vía `window.api.on('report:progress', cb)` (añadir canal de escucha en `preload.js`).
  - Por cada evento: actualiza el badge de la fuente (CONECTADO / REINTENTANDO / FALLIDO) y avanza la barra de progreso (1 fuente = 20 %).
  - Al completar: muestra mensaje de éxito o error según el tono de DESIGN.md.
- La barra usa el degradado `--gradient-brand` y `transition: width 300ms ease`.

**Cómo se verifica**

Pulsar GENERAR INFORME → la barra avanza suavemente en 5 pasos → al final aparece un mensaje del tipo "Informe de agosto generado correctamente. 5 fuentes conectadas." o "1 fuente falló. El resto del informe está completo."

---

### T-14 — Insertar monthly_records + alerta de métrica cero
**Fase**: 3 · **Estimación**: 2–3 h · **Prerrequisito**: T-13

**Qué se construye**

- En `main/reporter.js`, tras recoger todas las métricas:
  - Insertar fila en `monthly_records` (nunca UPDATE, siempre INSERT — FR-012).
  - Escribir `0` explícito para cualquier métrica numérica que sea `null` por ausencia de actividad, no por fallo de fuente (FR-002).
- Lógica FR-013 en `main/reporter.js` o en un helper `zerochecker.js`:
  - Consultar el registro del periodo anterior para el mismo sitio.
  - Si una métrica era > 0 y ahora es 0 por primera vez: añadir aviso a la respuesta de `report:generate` (`{ zeroAlerts: ['sessions', ...] }`).
  - En el renderer: mostrar banner inline amarillo (`--status-warning`) por cada alerta de cero.

**Cómo se verifica**

Generar informe para un mes → verificar la fila en SQLite con cualquier visor. Regenerar el mismo mes → aparece una segunda fila, la primera sigue intacta. Simular una métrica que cae a 0 → aparece el banner amarillo en la UI.

---

### T-15 — Pantalla Histórico con variación mensual
**Fase**: 3 · **Estimación**: 2–3 h · **Prerrequisito**: T-14

**Qué se construye**

- Handler `records:list` en `main/ipc.js`: devuelve todas las filas de `monthly_records` para un `site_id`, ordenadas por `period` desc.
- `renderer/js/historico.js`:
  - Selector de sitio → carga el histórico del sitio seleccionado.
  - Tabla con columnas: Periodo, Impresiones, Clics, Sesiones, % Canales, Rendimiento Desktop/Mobile, Vulnerabilidades, Malware, Fuentes OK/Fallidas.
  - Fuente tipográfica `JetBrains Mono` para los valores numéricos; `tabular-nums`.
  - El valor `0` en color `--text-zero` (visible pero apagado).
  - Columna de variación (▲ verde / ▼ rojo / — si no hay mes anterior) calculada en el renderer comparando la fila actual con la anterior en el array.
  - Filas con `sources_failed` no vacío llevan `border-left: 3px solid var(--status-error)`.

**Cómo se verifica**

Con 2–3 meses de datos generados (incluso ficticios insertados directamente en SQLite): la tabla muestra los triángulos correctos, el cero se ve apagado, las filas con fallo tienen el borde rojo.

---

### T-16 — Notificación email por fallo de fuente
**Fase**: 3 · **Estimación**: 1–2 h · **Prerrequisito**: T-14

**Qué se construye**

- `main/mailer.js`: función `sendAlert({ to, subject, html })` usando Nodemailer con la configuración SMTP de la tabla `settings`.
- Llamada desde `reporter.js` si `sources_failed.length > 0`:
  - Asunto: `ReportingGriego — Fallo en [sitio]: [fuentes]`
  - Cuerpo: lista de fuentes fallidas, sitio afectado, periodo y un recordatorio de revisar las credenciales.
- `renderer/js/configuracion.js`: sección SMTP con campos `host`, `puerto`, `usuario`, `contraseña`, `email de notificación` y botón ENVIAR PRUEBA que llama a un handler `settings:test-email`.

**Cómo se verifica**

Configurar SMTP con una cuenta de prueba (p.ej. Mailtrap) → forzar un fallo de fuente pasando credenciales incorrectas → al terminar la generación, el email de alerta llega a la bandeja de entrada de Mailtrap.

---

### T-17 — Insertar keywords durante recogida de Squirrly
**Fase**: 4 · **Estimación**: 1–2 h · **Prerrequisito**: T-12

**Qué se construye**

- En `main/reporter.js`, tras el INSERT de `monthly_records`, insertar las palabras clave devueltas por `squirrly.collect()` en la tabla `keywords`:
  - `INSERT INTO keywords (record_id, keyword, position, volume, impressions) VALUES (?, ?, ?, ?, ?)`.
  - Hacerlo en una transacción (todo o nada).
- Si Squirrly falla y está en `sources_failed`, no se insertan keywords para ese registro (columna queda vacía, no es un error bloqueante).

**Cómo se verifica**

Generar informe con Squirrly funcionando → en SQLite, la tabla `keywords` tiene filas ligadas al `record_id` generado. Contar filas: deben ser >= 1.

---

### T-18 — Oportunidades SEO: lógica + pantalla
**Fase**: 4 · **Estimación**: 2–3 h · **Prerrequisito**: T-17

**Qué se construye**

- `main/opportunities.js`:
  - Handler `keywords:opportunities` recibe `{ site_id, period? }`.
  - Si `period` no se pasa, usa el último registro del sitio.
  - Consulta `keywords` del registro: filtra `volume >= 50 AND position > 3`.
  - Agrupa en tramos: top 10 (4–10), top 100 (11–100); excluye top 3 (≤ 3).
  - Devuelve `{ opportunities: [...], counts: { top10: N, top100: M } }`.
- `renderer/js/oportunidades.js`:
  - Selector de sitio + periodo → carga oportunidades.
  - Dos contadores de tramo (badge ámbar con el número).
  - Lista de keywords con columnas: Palabra clave, Posición, Volumen, badge OPORTUNIDAD.

**Cómo se verifica**

Insertar en SQLite un set de keywords de prueba con posiciones 1, 5, 12, 50 y volúmenes 10, 200, 80, 60 → la pantalla debe mostrar solo las de posición > 3 con volumen ≥ 50 (posiciones 5, 12, 50), agrupadas correctamente en los dos tramos.

---

### T-19 — Capturas de pantalla con Playwright
**Fase**: 5 · **Estimación**: 2–3 h · **Prerrequisito**: T-12

**Qué se construye**

- `main/screenshotter.js`:
  - Función `capture(url, destPath)`: lanza Chromium headless con Playwright, navega a `url` con las cookies de sesión si las tiene (o sin autenticación si la URL es pública, como PageSpeed), espera `networkidle`, hace screenshot PNG, lo guarda en `destPath`.
  - Llamada desde `reporter.js` para cada fuente que devuelva un `raw_url`: guarda en `data/evidencias/<site_id>/<period>/<source>.png`.
  - Insertar fila en tabla `evidencias` con la ruta relativa.
- Las capturas de fuentes que requieren login OAuth (Search Console, GA4) apuntan al dashboard del sitio; si la sesión no está autenticada en el Chromium headless, se guarda igualmente lo que haya cargado (puede ser la pantalla de login) — esto es aceptable en el MVP.

**Cómo se verifica**

Generar informe → verificar que `data/evidencias/1/2026-08/` contiene archivos `.png`. Abrir uno con el visor de imágenes: debe ser una captura real de la página (no en blanco).

---

### T-20 — Pantalla Evidencias: galería por registro
**Fase**: 5 · **Estimación**: 1–2 h · **Prerrequisito**: T-19

**Qué se construye**

- Handler `evidencias:list` en `main/ipc.js`: `SELECT * FROM evidencias WHERE record_id = ?`.
- Handler auxiliar `evidencias:open` que llama a `shell.openPath(absolutePath)` para abrir la imagen en el visor del SO.
- `renderer/js/evidencias.js`:
  - Selector de sitio + periodo → carga los registros → selector de registro (si hay varios del mismo mes) → lista de miniaturas.
  - Cada miniatura muestra la fuente (etiqueta) y la fecha de captura.
  - Clic en la miniatura: llama a `evidencias:open` para abrir la imagen a pantalla completa con el visor nativo.
  - Si no hay evidencias para el registro seleccionado: estado vacío con mensaje proactivo ("Genera un informe para ver las evidencias de este mes.").

**Cómo se verifica**

Abrir pantalla Evidencias → seleccionar un sitio y mes con informe generado → aparecen las miniaturas → clic en una → se abre la imagen PNG en el visor de imágenes del SO.

---

### T-21 — Empaquetado con electron-builder
**Fase**: 6 · **Estimación**: 2–3 h · **Prerrequisito**: T-01 … T-20

**Qué se construye**

- Completar `electron-builder.yml`:
  - `appId: net.elgriego.reportinggriego`
  - `productName: ReportingGriego`
  - Targets: `nsis` (Windows `.exe` con instalador) + `dmg` (macOS).
  - Incluir el icono en `assets/icon.png` (formato: 512 × 512 PNG, o `.icns` / `.ico` según plataforma).
  - Excluir `data/`, `node_modules/` de desarrollo y archivos de test del bundle.
- Verificar que `better-sqlite3` se recompila para Electron en el `postinstall` (`electron-rebuild`).
- `npm run build` genera el instalador en `dist/`.
- Smoke test en una máquina limpia (sin Node.js instalado): instalar, abrir la app, añadir un sitio, verificar que la base de datos se crea en la ubicación correcta.

**Cómo se verifica**

El instalador generado en `dist/` se ejecuta en una máquina sin entorno de desarrollo; la app arranca, las 6 pantallas cargan y `data/reportinggriego.db` se crea en `%APPDATA%/ReportingGriego/` (Windows) o `~/Library/Application Support/ReportingGriego/` (macOS).

---

## Notas de sesión

**Cuándo dar una tarea por terminada**: cuando el criterio de verificación pasa sin errores en consola y el commit está hecho en la rama correspondiente.

**Si una tarea se alarga más de 4 h**: es señal de que esconde complejidad no prevista. Partir la tarea en dos y actualizar este fichero antes de continuar.

**Orden de ataque en la Fase 2**: empezar por T-07 (PageSpeed, la más simple y con API Key pública) para validar el patrón del orquestador antes de meterse con OAuth. Dejar T-10 (Squirrly) para después de T-08 y T-09, porque su API puede requerir investigación adicional.

---

*tasks.md v1.0 — agosto 2026 — ReportingGriego / elGriegoNET®*
