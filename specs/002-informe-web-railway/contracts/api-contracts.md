# API Contracts: Informe mensual SEO como aplicación web (Railway)

**Feature**: [../spec.md](../spec.md) · **Plan**: [../plan.md](../plan.md) · **Data model**: [../data-model.md](../data-model.md)

Todas las rutas bajo `/api/*` **excepto `/api/login`** exigen sesión válida (FR-001, FR-002); sin ella responden `401 { ok:false, error:'No autenticado' }`. Todas las respuestas siguen el contrato uniforme `{ ok: boolean, error?: string, ...datos }`, igual convención que `001-informe-mensual-seo/contracts/ipc-contracts.md`, adaptada de IPC a HTTP.

---

## `POST /api/login`

**Cubre**: FR-001, FR-002, FR-003 (US1)

- **Request body**: `{ username: string, password: string }`
- **Response éxito** (`200`): `{ ok: true }` — crea la sesión (cookie de sesión vía `express-session`).
- **Response error** (`401`): `{ ok: false, error: 'Usuario o contraseña incorrectos' }` — mismo mensaje genérico tanto si falla el usuario como la contraseña (FR-003, no revela cuál fue incorrecto).

## `POST /api/logout`

**Cubre**: FR-002, FR-004 (US1)

- **Request**: sin body.
- **Response**: `{ ok: true }` — destruye la sesión.

## `GET /api/sites`

**Cubre**: FR-006

- **Response**: `{ ok: true, sites: [{ id, name, url, active, configured_sources: string[] }] }`

## `POST /api/sites`

**Cubre**: FR-006

- **Request body**: `{ name: string, url: string }`
- **Response éxito**: `{ ok: true, id: number }`
- **Response error**: `{ ok: false, error: string }` (URL vacía o ya existente — `sites.url` es `UNIQUE`)

## `POST /api/sites/:id/deactivate`

**Cubre**: FR-011

- **Response**: `{ ok: true }` — nunca borra la fila, solo `active = FALSE`.

## `POST /api/sites/:id/credentials`

**Cubre**: FR-007

- **Request body**: `{ source: 'search_console'|'site_kit'|'squirrly'|'pagespeed'|'security_ninja', config: object }`
- **Response**: `{ ok: true }`

## `POST /api/report/generate`

**Cubre**: FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-012, FR-013

- **Request body**: `{ site_id: number }`
- **Response éxito**:
  ```json
  {
    "ok": true,
    "record": {
      "id": 123,
      "period": "2026-08",
      "generated_at": "2026-08-31T10:32:00Z",
      "sources_ok": ["search_console", "site_kit", "pagespeed", "security_ninja"],
      "sources_failed": ["squirrly"]
    },
    "zeroAlerts": ["traffic_referral"]
  }
  ```
  `record` está siempre presente aunque `sources_failed` no esté vacío (FR-008 — un fallo de fuente nunca impide la inserción del registro).
- **Response error** (`ok:false`): reservado a fallos que impiden insertar cualquier registro (`site_id` inexistente o dado de baja). Un fallo de fuente individual no produce `ok:false`.

> Esta versión no expone un equivalente a `report:progress` de la variante de escritorio (no hay WebSocket/SSE en el alcance de este MVP): el frontend muestra un estado de "generando…" y recibe el resultado final de una sola vez al completarse la petición. Ver `research.md` de una futura iteración si se requiere progreso en tiempo real.

## `GET /api/records?site_id=`

**Cubre**: FR-005, FR-009

- **Response**: `{ ok: true, records: [{ ...campos de monthly_records, variation: {...} | null }] }`, ordenado por `generated_at` descendente. `variation` es `null` en la fila más antigua del sitio.

## `GET /api/keywords/opportunities?site_id=&period=`

**Cubre**: FR-014, FR-015

- `period` es opcional; si se omite, usa el registro más reciente del sitio.
- **Response**: `{ ok: true, opportunities: [{ keyword, position, volume, impressions, tier: 'top10'|'top100' }], counts: { top10, top100 } }`

## `GET /api/settings` / `POST /api/settings`

**Cubre**: configuración SMTP para `mailer.js` (FR-008, FR-010)

- `GET` — **Response**: `{ ok: true, settings: { [key]: value } }`
- `POST` — **Request**: `{ key: string, value: string }`. **Response**: `{ ok: true }`

## `POST /api/settings/test-email`

**Cubre**: validar configuración SMTP antes de depender de ella

- **Response éxito**: `{ ok: true }`
- **Response error**: `{ ok: false, error: string }`
