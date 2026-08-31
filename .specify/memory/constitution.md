<!--
Sync Impact Report
==================
Version change: 2.0.0 → 2.1.0
Rationale: MINOR bump. Following user confirmation, two principles that were
dropped in the 2.0.0 rewrite are restored as explicit Core Principles VIII
and IX, because they correspond directly to already-ratified requirements
(FR-009 site isolation, FR-008 evidence screenshots) in spec.md. Restoring
principles that don't redefine or remove anything else is additive → MINOR,
not MAJOR.

Added principles (restored from v1.0.0, renumbered):
  VIII. Aislamiento por Sitio             (was Principio IV in v1.0.0)
  IX.   Evidencia Visual como Respaldo    (was Principio VIII in v1.0.0)

Open items carried over from the 2.0.0 Sync Impact Report, NOT resolved by
this amendment (user was asked only about isolation/evidence; these two were
flagged but not raised as a question, resolved by agent judgment call —
revisit if that call was wrong):
  - Principio IX de v1.0.0 (Ante Ambigüedad, NON-NEGOTIABLE) remains demoted
    to a "Flujo de Trabajo de Desarrollo" bullet rather than a numbered Core
    Principle. Functionally unchanged (still MUST-worded).
  - Escalabilidad (80% time-reduction target, was Principio VII in v1.0.0,
    SC-001 in spec.md) remains descriptive prose in the intro paragraph, not
    an enforceable Core Principle.

--- Original v1.0.0 → v2.0.0 Sync Impact Report (superseded, kept for
    history) ---
Version change: 1.0.0 → 2.0.0
Rationale: MAJOR bump. The user re-ran /speckit-constitution with a fully
re-authored principle set (7 principles, explicit count per user directive,
overriding the previous 9). Several v1.0.0 principles were removed or
demoted as standalone Core Principles — a backward-incompatible governance
redefinition, which is a MAJOR change per this document's own versioning
policy.

Principle mapping (v1.0.0 → v2.0.0):
  II.  Histórico Inmutable                          → I.   Integridad del Histórico por Encima de Todo (renamed)
  I.   Cero Valores Implícitos                       → II.  Cero Ambigüedad en los Datos (merged/renamed)
  III. Fallar de Forma Visible, Nunca en Silencio    → III. El Fallo No Bloquea (renamed, narrower wording)
  V.   Fuentes de Datos Cerradas y Vía API           → demoted: now in "Alcance y Restricciones Técnicas del MVP" (no longer a Core Principle)
  IX.  Ante Ambigüedad, Parar y Preguntar (NON-NEG.) → demoted: now a bullet in "Flujo de Trabajo de Desarrollo" (no longer a Core Principle)
  IV.  Aislamiento por Sitio                         → REMOVED in 2.0.0, RESTORED in 2.1.0 as Principio VIII
  VI.  Automatizar la Recogida, No el Criterio       → REMOVED (not present in new input; not merged elsewhere)
  VII. Escalabilidad sin Coste Manual Añadido        → REMOVED as a testable principle; the 80% target survives only as prose in the new intro paragraph, not as an enforceable MUST
  VIII. Evidencia Visual como Respaldo               → REMOVED in 2.0.0, RESTORED in 2.1.0 as Principio IX

Added sections in 2.0.0:
  - Unnumbered intro/purpose paragraph under the title (project purpose, the
    5 data sources, the >1h/site → 80% reduction goal)
  - "Alcance y Restricciones Técnicas del MVP" (replaces/expands the old
    "Alcance del MVP"; now also encodes the stack: Electron + Node.js +
    SQLite + ExcelJS + Playwright + Nodemailer, no UI framework, IPC-only
    main↔renderer with contextIsolation)

Templates requiring follow-up review (not modified by this command):
  - .specify/templates/plan-template.md — its Constitution Check section may
    still reference an older principle set/count; re-verify on next
    /speckit-plan.
  - CLAUDE.md — already states "Lee .specify/memory/constitution.md primero"
    and an ambiguity-stop rule; still consistent with this version, no change
    needed.
-->

# ReportingGriego Constitution

ReportingGriego es una herramienta de escritorio interna para elGriegoNET® que
automatiza el informe mensual de SEO y rendimiento web de varios sitios. Su
propósito es eliminar el trabajo manual de copiar métricas desde cinco fuentes
(Google Search Console, GA4/Site Kit, Squirrly SEO/Ubersuggest, PageSpeed
Insights, Security Ninja) y registrarlas en una hoja de cálculo. Hoy el
usuario dedica más de 1 hora por sitio; el objetivo es reducir ese tiempo en
al menos un 80%.

## Core Principles

### I. Integridad del Histórico por Encima de Todo

Los registros mensuales DEBEN ser inmutables: NUNCA se sobrescriben, NUNCA se
borran. Regenerar el informe de un mes ya registrado DEBE añadir una fila
nueva, conservando la anterior. Dar de baja un sitio DEBE detener la
generación de nuevas filas, pero NUNCA DEBE eliminar las filas existentes.

**Razón**: el histórico es el activo de valor a largo plazo del producto; una
sola sobrescritura o un solo borrado lo invalidan de forma irreversible.

### II. Cero Ambigüedad en los Datos

Una celda vacía no existe: si no hay actividad en el periodo, el sistema DEBE
escribir el valor `0` de forma explícita. Un `0` NUNCA se trata como
equivalente a un dato no disponible. Los fallos de una fuente de datos se
marcan de forma visible en la fila correspondiente; NUNCA se silencian.

**Razón**: eliminar la ambigüedad entre "es cero" y "falta el dato" es la base
de la confianza en un informe generado sin supervisión manual.

### III. El Fallo No Bloquea

Si una fuente de datos no responde tras 3 reintentos automáticos, el sistema
DEBE avisar al usuario por email, DEBE marcar la fila afectada, y DEBE
continuar generando el resto del informe con las demás fuentes. Un informe
parcial es preferible a ningún informe.

**Razón**: bloquear todo el proceso por el fallo de una sola fuente
penalizaría innecesariamente a las fuentes que sí respondieron correctamente.

### IV. Simplicidad de Infraestructura

Toda la infraestructura DEBE ser local: SQLite es la única base de datos, sin
servidor y sin sincronización en la nube. El backup DEBE poder resolverse
copiando un único archivo. La aplicación DEBE instalarse mediante un
ejecutable, sin requerir que el usuario tenga Node.js instalado.

**Razón**: es una herramienta de uso interno de una agencia; añadir
infraestructura de servidor o nube introduciría coste operativo y superficie
de fallo sin aportar valor al caso de uso.

### V. La UI Refleja la Marca, No el Backend

El sistema de diseño de elGriegoNET® (tema vinoso oscuro `#0F000A`, rosa
eléctrico `#E91E8C`, tipografía Bebas Neue/Inter/JetBrains Mono, barra
arcoíris de marca) DEBE aplicarse con la misma energía en esta herramienta
interna que en la web pública de la agencia. La estética NO es un extra: es
parte del producto.

**Razón**: la interfaz transmite que quien usa esta herramienta trabaja a otro
nivel; degradar la estética por tratarse de "solo una herramienta interna"
contradice la identidad de marca que la agencia proyecta hacia fuera.

### VI. Los Textos del Sistema Son Directos y Accionables

Los textos de la interfaz DEBEN usar verbos en infinitivo, sin jerga técnica y
sin apología. Los mensajes de error DEBEN explicar qué falló y qué ocurre a
continuación. Los mensajes de éxito DEBEN ser breves y sin aspavientos.

**Razón**: coherente con el Principio II (cero ambigüedad) — un texto vago o
una disculpa innecesaria generan la misma incertidumbre que un dato ausente.

### VII. Oportunidades SEO como Output Accionable, No como Dato en Bruto

El sistema NUNCA DEBE limitarse a mostrar un ranking de palabras clave. DEBE
señalar explícitamente qué palabras clave (volumen ≥ 50 búsquedas/mes,
posición > 3) merecen trabajo de contenido, agrupadas en tramos top 10 y top
100.

**Razón**: el valor del producto está en reducir el trabajo de interpretación
del usuario, no solo el de recolección; un ranking sin procesar traslada ese
trabajo de vuelta a la persona.

### VIII. Aislamiento por Sitio

Los datos de cada sitio web se recogen y registran de forma completamente
independiente. Las métricas de un sitio NUNCA se mezclan con las de otro, ni
en la recogida, ni en el almacenamiento, ni en la presentación.

**Razón**: la herramienta gestiona múltiples sitios/clientes de una agencia;
mezclar datos entre sitios sería un error de integridad grave y, en contexto
de agencia con clientes distintos, una fuga de datos entre clientes.

### IX. Evidencia Visual como Respaldo

Cada registro mensual generado DEBE ir acompañado de una captura de pantalla
de la fuente de datos, como evidencia verificable del dato registrado.

**Razón**: ante una discrepancia futura o una consulta de un cliente, la
captura permite verificar qué mostraba realmente la fuente en el momento de la
recogida, sin depender solo de la cifra ya procesada.

## Alcance y Restricciones Técnicas del MVP

- **Fuentes de datos**: el MVP integra exactamente cinco fuentes — Google
  Search Console, GA4/Site Kit, Squirrly SEO/Ubersuggest, PageSpeed Insights y
  Security Ninja. Los datos se obtienen vía API; no se introducen pasos de
  copiado/pegado manual desde el panel de una herramienta (ver Principio II).
- **Stack**: Electron + Node.js + SQLite + ExcelJS + Playwright + Nodemailer.
  Sin framework de UI. La comunicación entre el proceso main y el renderer se
  realiza exclusivamente por IPC, con `contextIsolation` activado.
- **Fuera de alcance en v1**: autenticación multi-usuario, sincronización en
  la nube, mapas de calor/grabación de sesión, y tests automatizados.

## Flujo de Trabajo de Desarrollo

- Todo trabajo de especificación, planificación e implementación sigue el
  flujo de Spec Kit: `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` →
  `/speckit-implement`, en ese orden.
- Esta constitución es la fuente de verdad autoritativa del proyecto:
  `spec.md`, `plan.md` y `tasks.md` DEBEN ser consistentes con ella.
- **Ante ambigüedad**: si un requisito de `spec.md`, `plan.md` o `tasks.md`
  está incompleto, es ambiguo, o entra en conflicto con esta constitución, el
  agente DEBE detenerse y preguntar al usuario. NUNCA DEBE asumir ni inventar
  un valor por defecto para resolverlo por su cuenta.

## Governance

Esta constitución prevalece sobre cualquier otra práctica, plantilla o
preferencia de implementación dentro de este repositorio. En caso de conflicto
entre esta constitución y `spec.md`, `plan.md`, `tasks.md`, o cualquier otro
documento del proyecto, esta constitución tiene prioridad y el conflicto se
resuelve deteniéndose y preguntando al usuario (ver "Ante ambigüedad"), nunca
por interpretación unilateral.

**Procedimiento de enmienda**: cualquier cambio a esta constitución (añadir,
eliminar o redefinir un principio o sección) requiere:
1. Propuesta explícita del cambio y su justificación.
2. Aprobación del usuario/propietario del proyecto.
3. Actualización de este documento vía `/speckit-constitution`, incluyendo el
   Sync Impact Report correspondiente.
4. Revisión de si `plan.md`, `tasks.md` o el `spec.md` activo necesitan
   actualizarse para seguir siendo consistentes con la nueva versión.

**Política de versionado** (SemVer aplicado a gobernanza):
- MAJOR: eliminación o redefinición incompatible de un principio existente.
- MINOR: añadir un principio o sección nueva, o expandir materialmente una
  guía existente.
- PATCH: aclaraciones, correcciones de redacción, cambios no semánticos.

**Revisión de cumplimiento**: cualquier `plan.md` o `tasks.md` generado o
revisado DEBE verificarse contra los nueve principios anteriores antes de
darse por aprobado. Cualquier excepción a un principio (p. ej. introducir
infraestructura no local, o un texto de error que no siga el Principio VI)
DEBE justificarse explícitamente y por escrito en el documento correspondiente,
no asumirse implícitamente.

**Version**: 2.1.0 | **Ratified**: 2026-08-31 | **Last Amended**: 2026-08-31
