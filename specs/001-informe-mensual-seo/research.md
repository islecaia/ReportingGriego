# Research: Automatización del informe mensual de métricas SEO y rendimiento web

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

Este documento resuelve las decisiones técnicas que el Technical Context de `plan.md` no fijó de forma explícita en el input del usuario, más los patrones de integración necesarios para las 5 fuentes de datos.

---

## 1. Granularidad del campo "periodo" en `monthly_records`

**Decision**: `monthly_records` almacena dos campos distintos — `period` (`YYYY-MM`, el mes de negocio, derivado del mes calendario de la fecha real de generación) y `generated_at` (timestamp ISO completo, la fecha/hora exacta del disparo).

**Rationale**: FR-015 exige que la fila registre "la fecha real de generación como periodo", mientras que FR-003 exige mostrar "variación porcentual respecto al periodo anterior" en el histórico — una comparación que solo tiene sentido a granularidad mensual (mes vs. mes anterior). Si `period` fuera una fecha/hora exacta, dos generaciones manuales el mismo mes (edge case de spec.md: "disparo manual dos veces el mismo día") producirían dos "periodos" distintos y romperían la noción de "mes anterior" para el cálculo de variación. Separar ambos campos satisface FR-015 (la fecha real queda registrada en `generated_at`, con precisión de segundo) sin sacrificar FR-003.

**Alternatives considered**:
- Usar la fecha/hora exacta como `period`: rompe la comparación mes-a-mes de FR-003 en cuanto hay más de una generación en el mismo mes calendario.
- Usar solo `generated_at` sin `period`: obliga a derivar el mes en cada consulta de histórico/variación (`strftime('%Y-%m', generated_at)`), más frágil y más caro en cada lectura que tenerlo ya materializado en la fila.

**Comparación "mes anterior" para variación y para la alerta de cero (FR-003, FR-012)**: se define como la fila más reciente (mayor `generated_at`) cuyo `period` sea estrictamente anterior al `period` de la fila actual, para el mismo `site_id`. Si existen varias regeneraciones del mismo mes anterior, se usa la más reciente (la que mejor refleja el estado final conocido de ese mes).

---

## 2. Cliente OAuth2/API para Google Search Console y GA4 (Site Kit)

**Decision**: usar el paquete oficial `googleapis` (Node.js) para ambas integraciones, autenticando con una cuenta de servicio (Service Account) con acceso delegado a Search Console y a la propiedad GA4, cuyo JSON de credenciales se guarda cifrado en `credentials.config` (por sitio, fuente `search_console` y `site_kit` pueden compartir el mismo JSON si la cuenta de servicio tiene acceso a ambas APIs).

**Rationale**: es el cliente mantenido por Google, cubre `searchanalytics.query` (Search Console) y `analyticsdata.v1beta.runReport` (GA4 Data API) con el mismo paquete, evitando añadir dos dependencias distintas. Una cuenta de servicio evita el flujo interactivo OAuth (consent screen) en una app de escritorio sin backend propio para recibir el callback OAuth.

**Alternatives considered**:
- `google-auth-library` + llamadas REST manuales: más control, pero reimplementa lo que `googleapis` ya ofrece; no aporta valor dado el Principio IV (simplicidad).
- OAuth2 "instalado" (flujo interactivo con navegador): requeriría levantar un servidor local temporal para el callback; más complejidad y peor UX para una app de un único usuario que puede usar cuenta de servicio.

---

## 3. Squirrly SEO / Ubersuggest — ranking de palabras clave

**Decision**: intentar primero el endpoint REST autenticado por API Key que exponga la cuenta del usuario (Squirrly o Ubersuggest, según cuál use en cada sitio). Si no hay endpoint accesible de forma fiable, `main/sources/squirrly.js` cae a un import manual de CSV (`data/imports/<site_id>/keywords-YYYY-MM.csv`) como *fallback*, no como camino principal.

**Rationale**: ninguna de las dos herramientas tiene una API pública bien documentada y estable para ranking de palabras clave a nivel de cuenta gratuita/estándar; es la fuente de mayor incertidumbre del proyecto (ya señalado también en el `tasks.md` raíz, T-10). El fallback CSV no viola el Principio V/FR-004 de "sin copiado manual de datos" porque no es el camino normal de operación — es una vía de emergencia documentada para cuando la API cambia o no responde, análoga en espíritu al marcado de fuente fallida (Principio III), no un reemplazo del flujo automático.

**Alternatives considered**: scraping autenticado del dashboard — descartado por fragilidad (rompe con cualquier cambio de UI de terceros) y por más complejidad de mantenimiento que el fallback CSV.

---

## 4. Security Ninja — vulnerabilidades y malware

**Decision**: llamar al REST endpoint propio del plugin Security Ninja (WordPress) autenticado con API Key + Site ID, igual que está descrito en el `tasks.md` raíz (T-11). Cuando el endpoint reporta "sin incidencias", se traduce explícitamente a `{ vulnerabilities: 0, malware: 0 }`, nunca a `null` (Principio II).

**Rationale**: es un plugin de WordPress con API REST propia por sitio; no requiere OAuth, solo credenciales por sitio ya cubiertas por la tabla `credentials`.

**Alternatives considered**: ninguna evaluada — es la única vía de acceso programático documentada por la herramienta.

---

## 5. Evidencia visual de fuentes con sesión OAuth (Search Console, GA4)

**Decision**: para fuentes con datos públicos o semi-públicos por URL (PageSpeed Insights), `screenshotter.js` navega directamente a la `raw_url` devuelta por `collect()`. Para fuentes que requieren sesión autenticada (Search Console, GA4), la captura se acepta como "mejor esfuerzo": si Playwright no tiene sesión autenticada en el contexto headless, se captura lo que cargue (incluida una pantalla de login), documentado como limitación conocida del MVP.

**Rationale**: replicar una sesión OAuth interactiva dentro de un navegador headless sin intervención del usuario añade complejidad significativa (gestión de cookies/tokens de sesión de navegador separados de los tokens de API) que no está pedida por ninguna FR; el requisito (FR-009, Principio IX) es "evidencia visual del dato", no necesariamente del dashboard autenticado. SC-005 solo exige evidencia recuperable de "al menos una fuente" por registro, lo cual queda cubierto igualmente por las fuentes con URL pública/semi-pública.

**Alternatives considered**: reutilizar cookies de sesión del navegador del propio usuario — descartado por complejidad y por superficie de seguridad innecesaria (manejar cookies de sesión reales del usuario) frente al valor que aporta en el MVP.

---

## 6. Reintentos y backoff (FR-005, Principio III)

**Decision**: implementación propia con `await` + `setTimeout` (0s, 5s, 10s), sin librería de reintentos externa.

**Rationale**: 3 intentos con backoff fijo es una lógica de ~10 líneas; añadir una dependencia externa (p. ej. `p-retry`) para esto contradice el Principio IV (simplicidad de infraestructura) sin aportar valor proporcional.

**Alternatives considered**: `p-retry` u otra librería de reintentos — descartada por ser una dependencia innecesaria para una lógica tan acotada.

---

## 7. Ubicación del archivo SQLite por sistema operativo

**Decision**: usar `app.getPath('userData')` (API nativa de Electron) como directorio base, y crear `reportinggriego.db` y `evidencias/` dentro de él. Electron ya resuelve automáticamente `%APPDATA%\ReportingGriego` en Windows y `~/Library/Application Support/ReportingGriego` en macOS.

**Rationale**: es la forma estándar y recomendada por Electron para datos de usuario persistentes por app, evita calcular manualmente rutas por SO (Principio IV — simplicidad, menos código propio que mantener).

**Alternatives considered**: calcular la ruta a mano por `process.platform` — descartado, `app.getPath('userData')` ya resuelve exactamente este caso sin código adicional.

---

## 8. Compilación nativa de `better-sqlite3` para Electron

**Decision**: usar `electron-rebuild` (o el `postinstall` equivalente integrado en `electron-builder`) para recompilar el binario nativo de `better-sqlite3` contra el ABI de Node embebido en Electron 30, ejecutado automáticamente tras `npm install` y antes de `npm run build`.

**Rationale**: `better-sqlite3` incluye código nativo (C++) que debe compilarse contra la versión de Node que trae Electron, no la del sistema; sin este paso el módulo no carga en la app empaquetada. Es un requisito conocido y documentado del propio `better-sqlite3` con Electron, no una decisión de diseño abierta.

**Alternatives considered**: ninguna — es un requisito técnico del par Electron + módulo nativo, no una elección de producto.

---

## 9. Empaquetado multiplataforma (Windows NSIS + macOS DMG)

**Decision**: `electron-builder` con `targets: { win: ['nsis'], mac: ['dmg'] }`, sin target de Linux en el MVP (confirmado en el input del usuario y en la constitución).

**Rationale**: son los dos formatos estándar de instalador para cada SO objetivo, ya soportados de forma nativa por `electron-builder` sin configuración adicional.

**Alternatives considered**: `zip`/portable — descartado como target principal porque no ofrece una experiencia de instalación estándar para un usuario no técnico; puede añadirse más adelante sin romper nada de lo aquí definido.
