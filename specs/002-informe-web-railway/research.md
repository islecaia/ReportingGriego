# Research: Informe mensual SEO como aplicación web (Railway)

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

## 1. Almacén de sesión

**Decision**: `connect-pg-simple`, guardando las sesiones en la misma base PostgreSQL (tabla `session` que la librería crea automáticamente), en vez de sesión en memoria o un almacén separado tipo Redis.

**Rationale**: Railway puede reiniciar o redesplegar el único dyno web en cualquier momento (cada push a GitHub dispara un deploy); una sesión en memoria se perdería en cada reinicio, forzando relogin constante. Añadir Redis introduciría un segundo servicio gestionado, violando el Principio IV ("web gestionada" = un único servicio de aplicación + una única base de datos). Reutilizar la PostgreSQL ya provisionada no añade infraestructura nueva.

**Alternatives considered**: sesión en memoria (`express-session` sin store — se pierde en cada redeploy, inaceptable para un login "único" que se supone estable); Redis (añade un segundo servicio gestionado, contradice Principio IV).

## 2. Verificación de credenciales de acceso

**Decision**: `ADMIN_USERNAME` y `ADMIN_PASSWORD_HASH` (hash bcrypt) como variables de entorno de Railway, no como fila en la base de datos. El login compara `req.body.username === process.env.ADMIN_USERNAME` y `bcrypt.compare(req.body.password, process.env.ADMIN_PASSWORD_HASH)`.

**Rationale**: spec.md (Key Entities → "Cuenta de acceso") define una única credencial compartida, no una tabla de usuarios con gestión de altas/bajas. Guardarla como variable de entorno evita necesitar una tabla `users` y un flujo de gestión de contraseñas que el producto no pide; rotar la contraseña es cambiar una variable de entorno en Railway, sin migración de datos.

**Alternatives considered**: tabla `users` en PostgreSQL con una sola fila — añade un CRUD de usuarios y una superficie de gestión (reset de contraseña, etc.) que ninguna historia de usuario pide; se descarta por YAGNI.

## 3. Esquema PostgreSQL (portado desde SQLite de 001-informe-mensual-seo)

**Decision**: mismo modelo relacional que `001-informe-mensual-seo/data-model.md` (sites, credentials, monthly_records, keywords, settings), sin la tabla `evidencias` (fuera de alcance), con tipos adaptados a PostgreSQL:
- `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`
- `TEXT` → `TEXT` (sin cambio)
- `REAL` → `REAL` (sin cambio)
- `datetime('now')` / `date('now')` → `NOW()`
- Los campos JSON (`credentials.config`, `sources_ok`, `sources_failed`) se guardan como `JSONB` en lugar de `TEXT`, aprovechando el tipo nativo de PostgreSQL (permite consultar/depurar directamente en SQL sin parsear).

**Rationale**: mantener el mismo modelo de datos entre variantes reduce el riesgo de introducir inconsistencias de negocio (p. ej. olvidar la regla de "mes anterior" en una de las dos). `JSONB` es una mejora directa disponible en PostgreSQL sin coste añadido.

**Alternatives considered**: mantener `sources_ok`/`sources_failed`/`config` como `TEXT` con JSON serializado a mano, igual que en SQLite — descartado porque `JSONB` es estrictamente mejor en PostgreSQL (indexable, consultable) sin ninguna desventaja para este caso de uso.

## 4. Aplicación del esquema al arrancar

**Decision**: `src/db/schema.sql` con sentencias `CREATE TABLE IF NOT EXISTS`, ejecutado una vez contra `DATABASE_URL` en el arranque de `server.js` (antes de aceptar peticiones), igual patrón que `db.js` en la variante de escritorio pero contra `pg.Pool` en lugar de `better-sqlite3`.

**Rationale**: sin un framework de migraciones (Knex, Prisma, etc.) que el usuario no pidió y que añadiría una dependencia no solicitada; `CREATE TABLE IF NOT EXISTS` es idempotente y suficiente para un esquema que aún no tiene versiones en producción.

**Alternatives considered**: herramienta de migraciones dedicada — descartada por ahora (YAGNI); si el esquema evoluciona con datos ya en producción, revisar esta decisión en una futura enmienda de plan.

## 5. Fuentes de datos (searchConsole, siteKit, squirrly, pagespeed, securityNinja)

**Decision**: portar `main/sources/*.js` de `001-informe-mensual-seo` a `src/sources/*.js` casi sin cambios — su lógica (llamadas HTTPS/`googleapis`, backoff, contrato `collect(siteConfig, period)`) no depende de Electron ni de SQLite. Único cambio: `squirrly.js` pierde el fallback a `app.getPath('userData')` (API de Electron); su fallback a CSV pasa a usar una ruta configurable por variable de entorno o se elimina si no se pide explícitamente en tasks.

**Rationale**: es lógica de integración con APIs externas, agnóstica de la plataforma de la app anfitriona; reescribirla desde cero sería trabajo redundante y arriesgaría introducir regresiones ya resueltas en `001-informe-mensual-seo`.

**Alternatives considered**: reescribir las 5 integraciones desde cero para la variante web — descartado, sin beneficio y con riesgo de regresión.

## 6. Middleware de autenticación sobre páginas y API

**Decision**: un único middleware `requireAuth` aplicado a todas las rutas excepto `/login`, `/api/login` y los estáticos necesarios para pintar la pantalla de login. Para peticiones a `/api/*` sin sesión responde `401 { ok:false, error:'No autenticado' }`; para peticiones de página (navegación normal) redirige a `/login`.

**Rationale**: FR-001 exige que ninguna pantalla ni dato sea accesible sin sesión — un único middleware montado antes de todas las rutas protegidas es más difícil de olvidar en una ruta nueva que proteger cada ruta individualmente.

**Alternatives considered**: proteger cada ruta una a una con el middleware repetido — descartado, mayor riesgo de que una ruta nueva olvide añadirlo.

## 7. Retry/backoff y alertas por email

**Decision**: mismo `withRetry` (3 intentos, backoff fijo 0s/5s/10s, sin librería externa) y mismo `mailer.js` (Nodemailer) que `001-informe-mensual-seo/research.md` §6, portados sin cambios de lógica — solo cambia de dónde lee la configuración SMTP (misma tabla `settings`, ahora en PostgreSQL en lugar de SQLite).

**Rationale**: es lógica de negocio pura (FR-008 de este spec, equivalente a FR-005 de la variante de escritorio), no ligada a la plataforma; no hay motivo para reinventarla.

**Alternatives considered**: ninguna — decisión ya tomada y validada en la variante anterior.

## 8. Despliegue en Railway

**Decision**: `Procfile` con `web: node server.js`; despliegue automático en cada push a la rama de producción vía la integración GitHub↔Railway; `DATABASE_URL` la inyecta automáticamente el plugin de PostgreSQL de Railway; `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` y la configuración SMTP se fijan como variables de entorno del servicio en el panel de Railway.

**Rationale**: es exactamente lo que el usuario especificó como restricción del stack; Railway no requiere un `Dockerfile` para un servicio Node.js simple si detecta `Procfile`/`package.json`.

**Alternatives considered**: ninguna — restricción dada, no una decisión abierta.
