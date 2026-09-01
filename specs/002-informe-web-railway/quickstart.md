# Quickstart: Informe mensual SEO como aplicación web (Railway)

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Contracts**: [contracts/api-contracts.md](./contracts/api-contracts.md)

Validación manual (sin tests automatizados en v1, ver constitución). Cada escenario referencia el requisito que prueba.

## Prerrequisitos

- Variables de entorno fijadas (local: `.env`; Railway: panel de variables del servicio): `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` (hash bcrypt), y la configuración SMTP vía `/api/settings` una vez la app está arriba.
- PostgreSQL accesible en `DATABASE_URL` (local: contenedor Postgres; Railway: el plugin ya provisionado).
- `npm install && node server.js` (o `npm run dev` si hay watch mode) arranca el servicio y aplica `src/db/schema.sql`.

## Escenario 1 — Acceso bloqueado sin sesión (FR-001)

1. Sin haber iniciado sesión, visitar `/sitios`, `/generar`, `/historico` u `/oportunidades` directamente por URL.
2. **Esperado**: redirección a `/login`; ninguna de esas páginas ni sus datos son visibles.
3. Llamar directamente a `GET /api/sites` sin cookie de sesión.
4. **Esperado**: `401 { ok:false, error:'No autenticado' }`.

## Escenario 2 — Login y logout (FR-002, FR-003, FR-004)

1. Enviar `POST /api/login` con credenciales incorrectas.
2. **Esperado**: `401`, mensaje genérico (no distingue usuario de contraseña).
3. Enviar `POST /api/login` con las credenciales correctas (`ADMIN_USERNAME`/contraseña que hashea a `ADMIN_PASSWORD_HASH`).
4. **Esperado**: `200 { ok:true }`; a partir de aquí, `/sitios` y el resto de páginas cargan con normalidad con la misma cookie de sesión.
5. Enviar `POST /api/logout`.
6. **Esperado**: siguiente petición a `/api/sites` vuelve a devolver `401`.

## Escenario 3 — Registro mensual con cero explícito (FR-003, FR-004)

1. Con sesión iniciada, añadir un sitio de prueba (`POST /api/sites`) y sus 5 credenciales (`POST /api/sites/:id/credentials`).
2. Llamar a `POST /api/report/generate` con ese `site_id`.
3. **Esperado**: `ok:true`, `record` con un `id` nuevo; cualquier métrica sin actividad aparece como `0`, no `null`, en `GET /api/records`.

## Escenario 4 — Regenerar no sobrescribe (FR-009)

1. Repetir `POST /api/report/generate` para el mismo sitio.
2. **Esperado**: `GET /api/records` devuelve dos filas para ese sitio (la nueva y la anterior intacta), ninguna borrada ni modificada.

## Escenario 5 — Fallo de fuente no bloquea (FR-008)

1. Configurar una fuente con credenciales inválidas a propósito.
2. Llamar a `POST /api/report/generate`.
3. **Esperado**: `sources_failed` incluye esa fuente tras 3 reintentos; `record` se inserta igualmente con las demás fuentes; llega email de alerta si SMTP está configurado (`POST /api/settings/test-email` para verificar el envío primero).

## Escenario 6 — Alerta de métrica a cero (FR-010)

1. Generar un mes con una métrica con actividad.
2. Generar el mes siguiente con esa métrica en `0`.
3. **Esperado**: `zeroAlerts` en la respuesta de `POST /api/report/generate` incluye esa métrica la primera vez; en un tercer mes con la métrica todavía en `0`, `zeroAlerts` no vuelve a incluirla.

## Escenario 7 — Oportunidades SEO por tramo (FR-014, FR-015)

1. Con un registro que tenga `keywords` en posiciones 1, 5, 12, 50 y volúmenes 10, 200, 80, 60.
2. Llamar a `GET /api/keywords/opportunities?site_id=...`.
3. **Esperado**: solo posiciones 5, 12, 50 (volumen ≥50 y fuera del top 3); 5 en `top10`, 12 y 50 en `top100`.

## Escenario 8 — Aislamiento entre sitios (FR-006)

1. Generar informes para dos sitios distintos.
2. **Esperado**: `GET /api/records?site_id=A` no devuelve ninguna fila de B, y viceversa.

## Escenario 9 — Despliegue Railway

1. Push a la rama de producción en GitHub.
2. **Esperado**: Railway despliega automáticamente; `DATABASE_URL` ya está inyectada; el servicio arranca con `Procfile` (`web: node server.js`) sin configuración manual adicional en el servidor.
