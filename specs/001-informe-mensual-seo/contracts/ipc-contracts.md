# IPC Contracts: Automatización del informe mensual de métricas SEO y rendimiento web

**Feature**: [../spec.md](../spec.md) · **Plan**: [../plan.md](../plan.md) · **Data model**: [../data-model.md](../data-model.md)

ReportingGriego es una app de escritorio Electron sin API HTTP: su única superficie de interfaz es el canal IPC entre `renderer` y `main`, expuesto al renderer como `window.api.invoke(channel, payload)` (petición/respuesta) y `window.api.on(channel, callback)` (eventos main→renderer), vía `contextBridge` en `preload.js` (`contextIsolation: true`).

**Contrato de respuesta uniforme**: toda invocación de tipo petición/respuesta devuelve `{ ok: boolean, error?: string, ...datos }`. El renderer nunca necesita capturar excepciones para saber si algo falló.

---

## `sites:list`

**Dirección**: renderer → main · **Cubre**: FR-010, Principio VIII

- **Request**: `{}`
- **Response**: `{ ok: true, sites: [{ id, name, url, active }] }`

---

## `sites:create`

**Dirección**: renderer → main · **Cubre**: FR-010

- **Request**: `{ name: string, url: string }`
- **Response éxito**: `{ ok: true, id: number }`
- **Response error**: `{ ok: false, error: string }` (p. ej. `url` vacía o ya existente — `sites.url` es `UNIQUE`)

---

## `sites:deactivate`

**Dirección**: renderer → main · **Cubre**: FR-013, Principio I

- **Request**: `{ id: number }`
- **Response**: `{ ok: true }` — nunca borra la fila; solo `active = 0`.

---

## `credentials:save`

**Dirección**: renderer → main · **Cubre**: FR-004

- **Request**: `{ site_id: number, source: 'search_console'|'site_kit'|'squirrly'|'pagespeed'|'security_ninja', config: object }`
- **Response**: `{ ok: true }` — `INSERT OR REPLACE` sobre `(site_id, source)`.

---

## `report:generate`

**Dirección**: renderer → main · **Cubre**: FR-001–FR-009, FR-011, FR-012, FR-014, FR-015, FR-016, Principios I–III, VII, IX

Contrato central de la feature: **DEBE poder invocarse en cualquier momento**, sin validar contra el calendario. Nunca devuelve un error de tipo "no es fecha de corte" (FR-014, FR-016).

- **Request**: `{ site_id: number }`
- **Response éxito**:
  ```json
  {
    "ok": true,
    "record": {
      "id": 123,
      "period": "2026-08",
      "generated_at": "2026-08-15T10:32:00Z",
      "sources_ok": ["search_console", "site_kit", "pagespeed", "security_ninja"],
      "sources_failed": ["squirrly"]
    },
    "zeroAlerts": ["traffic_referral"]
  }
  ```
  - `record.period` es siempre el mes calendario de `generated_at` (research.md §1), independientemente de si se dispara a fin de mes, a mitad de mes, o dos veces el mismo día.
  - `zeroAlerts` lista las métricas que han caído a `0` por primera vez respecto al mes anterior (FR-012); vacío si ninguna aplica.
  - El campo `record` siempre está presente aunque `sources_failed` no esté vacío — un fallo de fuente nunca impide la inserción de la fila (Principio III).
- **Response error** (`ok: false`): reservado a fallos que impiden insertar cualquier fila (p. ej. `site_id` inexistente o dado de baja). Un fallo de una fuente individual **no** produce `ok: false` — se refleja en `sources_failed` dentro de una respuesta `ok: true`.

---

## `report:progress` (evento)

**Dirección**: main → renderer · **Cubre**: FR-005, Principio III

- **Payload**: `{ site_id: number, source: string, status: 'ok'|'retrying'|'failed', attempt: number }`
- Se emite una vez por cada intento (inicial + reintentos) de cada fuente durante una ejecución de `report:generate`, para animar la barra de progreso (1 fuente = 20% con las 5 fuentes actuales).

---

## `records:list`

**Dirección**: renderer → main · **Cubre**: FR-003, FR-011

- **Request**: `{ site_id: number }`
- **Response**: `{ ok: true, records: [{ ...campos de monthly_records, variation: { impressions: +12.4, clicks: null, ... } | null }] }`
  - `variation` es `null` en la fila más antigua de un sitio (no hay periodo anterior, FR-003 / US1 escenario 4); en cualquier otra fila contiene el % de variación por métrica respecto al "mes anterior" definido en `data-model.md`.
  - Ordenado por `generated_at` descendente.

---

## `keywords:opportunities`

**Dirección**: renderer → main · **Cubre**: FR-008, Principio VII

- **Request**: `{ site_id: number, period?: string }` — si se omite `period`, usa el registro más reciente del sitio.
- **Response**: `{ ok: true, opportunities: [{ keyword, position, volume, impressions, tier: 'top10'|'top100' }], counts: { top10: number, top100: number } }`
  - Nunca incluye palabras clave con `position <= 3` ni `volume < 50`.

---

## `evidencias:list`

**Dirección**: renderer → main · **Cubre**: FR-009, Principio IX

- **Request**: `{ record_id: number }`
- **Response**: `{ ok: true, evidencias: [{ id, source, file_path, captured_at }] }`

---

## `evidencias:open`

**Dirección**: renderer → main · **Cubre**: FR-009 (consumo de la evidencia)

- **Request**: `{ evidence_id: number }`
- **Response**: `{ ok: true }` — abre el PNG con `shell.openPath()` en el visor nativo del SO; no devuelve el archivo por IPC.

---

## `settings:get` / `settings:set`

**Dirección**: renderer → main · **Cubre**: configuración SMTP para `mailer.js` (FR-005, FR-012)

- `settings:get` — **Request**: `{ key?: string }` (omitido = todas). **Response**: `{ ok: true, settings: { [key]: value } }`
- `settings:set` — **Request**: `{ key: string, value: string }`. **Response**: `{ ok: true }`

---

## `settings:test-email`

**Dirección**: renderer → main · **Cubre**: validación de configuración SMTP antes de depender de ella para FR-005/FR-012

- **Request**: `{}` (usa la configuración SMTP ya guardada en `settings`)
- **Response éxito**: `{ ok: true }` — email de prueba enviado.
- **Response error**: `{ ok: false, error: string }` — credenciales SMTP inválidas o envío fallido.
