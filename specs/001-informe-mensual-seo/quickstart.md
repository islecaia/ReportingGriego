# Quickstart: Automatización del informe mensual de métricas SEO y rendimiento web

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Contracts**: [contracts/ipc-contracts.md](./contracts/ipc-contracts.md)

Guía de validación manual end-to-end (no hay suite de tests automatizados en el MVP — ver constitución, "Alcance y Restricciones Técnicas del MVP"). Cada escenario referencia el requisito que prueba.

## Prerrequisitos

- `npm install` ejecutado en la raíz del repo; `better-sqlite3` recompilado para Electron (research.md §8).
- Al menos un sitio con credenciales de prueba (ficticias sirven para los escenarios que no dependen de datos reales) para las cinco fuentes: `search_console`, `site_kit`, `squirrly`, `pagespeed`, `security_ninja`.
- Configuración SMTP de prueba en la pantalla Configuración (una cuenta tipo Mailtrap es suficiente) para los escenarios de alerta por email.

## Arrancar la app

```
npm start
```

Debe abrir la ventana de Electron con las 6 pantallas navegables (Sitios, Generar informe, Histórico, Oportunidades SEO, Evidencias, Configuración) y crear `reportinggriego.db` en el directorio de datos de usuario del SO (research.md §7).

## Escenario 1 — Registro mensual con cero explícito (FR-001, FR-002)

1. Añadir un sitio de prueba (pantalla Sitios).
2. Configurar sus cinco fuentes con credenciales de prueba (pantalla Configuración).
3. Pulsar GENERAR INFORME.
4. **Esperado**: nueva fila en Histórico con la fecha de hoy; cualquier métrica sin actividad muestra `0` (no vacío, `--text-zero`).

## Escenario 2 — Disparo manual en cualquier fecha, no solo a fin de mes (FR-014, FR-015, FR-016)

1. Con el mismo sitio, pulsar GENERAR INFORME un día que no sea fin de mes.
2. **Esperado**: la app NO rechaza la generación por la fecha; se añade una fila nueva con `period` = mes calendario de hoy y `generated_at` = el momento exacto de la pulsación (ver `contracts/ipc-contracts.md` → `report:generate`).
3. Pulsar GENERAR INFORME de nuevo el mismo día.
4. **Esperado**: se añade una segunda fila nueva (no se deduplica, no se sobrescribe la primera) — confirma el edge case de disparo manual duplicado de spec.md.

## Escenario 3 — Regeneración de un mes ya cerrado tras detectar un error (FR-011, FR-015, US1 escenario 8)

1. Sobre un sitio con al menos un registro de un mes anterior, pulsar GENERAR INFORME.
2. **Esperado**: se añade una fila nueva para el mes en curso; la fila del mes anterior permanece intacta en Histórico (ambas visibles, ninguna se pierde).

## Escenario 4 — Fallo de fuente no bloquea el resto (FR-005, US2 escenario 2-3)

1. Configurar una de las cinco fuentes con credenciales inválidas a propósito.
2. Pulsar GENERAR INFORME.
3. **Esperado**: la barra de progreso marca esa fuente como REINTENTANDO y luego FALLIDO tras 3 intentos; las otras 4 fuentes completan con normalidad; se registra la fila con los valores de las 4 fuentes disponibles; llega un email de alerta (si SMTP está configurado); la fila queda marcada visualmente en Histórico (borde izquierdo de error).

## Escenario 5 — Alerta de métrica que cae a cero por primera vez (FR-012)

1. Generar un mes con una métrica con actividad (p. ej. `traffic_referral > 0`).
2. Editar manualmente (o simular) que el siguiente registro tiene esa métrica en `0`.
3. Generar el siguiente mes.
4. **Esperado**: aparece el banner de aviso en la UI y llega el email de alerta; al generar un tercer mes con la métrica todavía en `0`, el aviso NO se repite.

## Escenario 6 — Oportunidades SEO agrupadas por tramo (FR-008)

1. Insertar en `keywords` (vía la fuente `squirrly` o directamente en SQLite para la prueba) un set con posiciones 1, 5, 12, 50 y volúmenes 10, 200, 80, 60.
2. Abrir pantalla Oportunidades SEO para ese sitio/periodo.
3. **Esperado**: solo aparecen las de posición > 3 y volumen ≥ 50 (posiciones 5, 12, 50); la de posición 5 en tramo top10, las de 12 y 50 en tramo top100; la de posición 1 (volumen 10) no aparece por ninguno de los dos motivos.

## Escenario 7 — Evidencia visual por fuente (FR-009)

1. Generar un informe con al menos 4 de las 5 fuentes respondiendo correctamente.
2. Abrir pantalla Evidencias para ese registro.
3. **Esperado**: una miniatura por cada fuente en `sources_ok`; ninguna para la fuente en `sources_failed`; clic en una miniatura abre el PNG en el visor nativo del SO.

## Escenario 8 — Aislamiento entre sitios (FR-010, Principio VIII)

1. Generar informes para dos sitios distintos en el mismo mes.
2. **Esperado**: el Histórico de cada sitio muestra únicamente sus propias filas; ninguna métrica de un sitio aparece en el histórico del otro.
