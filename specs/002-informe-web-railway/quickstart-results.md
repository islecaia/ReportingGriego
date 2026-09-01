# Resultados de validación — quickstart.md

**Feature**: [spec.md](./spec.md) · **Quickstart**: [quickstart.md](./quickstart.md)

**Fecha**: 2026-09-01
**Entorno**: `https://reportinggriego.up.railway.app` (Railway, despliegue automático desde GitHub)
**Método**: [test-quickstart.js](../../test-quickstart.js) (escenarios 1, 2, 3, 4, 7, 8) + verificación directa durante la sesión de depuración (escenario 9)

| # | Escenario | Estado | Notas |
|---|---|---|---|
| 1 | Acceso bloqueado sin sesión (FR-001) | ✅ PASS | `GET /api/sites` sin cookie de sesión → `401` |
| 2 | Login y logout (FR-002, FR-003, FR-004) | ✅ PASS | credenciales incorrectas → `401` con mensaje genérico; credenciales correctas → cookie de sesión; logout → `401` de nuevo tras cerrar |
| 3 | Registro mensual (FR-003, FR-004) | ✅ PASS* | *Sin credenciales de fuente reales configuradas: las 5 fuentes fallan por diseño (FR-008) y sus métricas quedan `null` — correcto dado el dato de entrada, pero no ejercita el camino "fuente exitosa sin actividad → `0` explícito". Ese camino requiere al menos una credencial real (PageSpeed es la más simple) |
| 4 | Regenerar no sobrescribe (FR-009) | ✅ PASS | 2 registros tras generar dos veces para el mismo sitio; ninguno sobrescrito |
| 5 | Fallo de fuente no bloquea + alerta por email (FR-008) | ⏳ PENDIENTE | requiere credenciales SMTP reales en `/api/settings` para confirmar la entrega del email de alerta |
| 6 | Alerta de métrica a cero (FR-010) | ⏳ PENDIENTE | requiere al menos una fuente con credenciales reales y datos de dos meses consecutivos para provocar una caída a cero genuina |
| 7 | Oportunidades SEO por tramo (FR-014, FR-015) | ✅ PASS* | *Estructura de la respuesta verificada (`counts.top10`/`counts.top100` presentes); sin credenciales de Squirrly no hay `keywords` reales que agrupar en tramos |
| 8 | Aislamiento entre sitios (FR-006) | ✅ PASS | sitio A: 2 registros, sitio B: 1 registro, sin solape de `id` entre ambos |
| 9 | Despliegue Railway | ✅ PASS | múltiples redeploys automáticos confirmados durante la sesión de depuración (push a GitHub → Railway); variables de entorno (`SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`) confirmadas configuradas; `DATABASE_URL` inyectada automáticamente por el plugin |

## Resumen

**7 de 9 escenarios PASS** (1, 2, 3, 4, 7, 8, 9). **2 pendientes** (5, 6) — bloqueados únicamente por falta de credenciales SMTP/API reales, no por ningún fallo conocido del código.

## Para completar 5 y 6

1. Configurar SMTP real en la pantalla Configuración (o vía `POST /api/settings`) y usar `POST /api/settings/test-email` para confirmar la entrega.
2. Configurar al menos una credencial de fuente real (PageSpeed, por ser la más simple) en un sitio de prueba.
3. Forzar un fallo intencional en otra fuente (credencial inválida) y generar el informe → confirmar que llega el email de alerta de fuente fallida (Escenario 5).
4. Generar dos meses consecutivos donde una métrica pase de tener actividad a `0` → confirmar el email de alerta de métrica a cero y que no se repite el mes siguiente (Escenario 6).
