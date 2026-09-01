<!--
Sync Impact Report
==================
Version change: 2.1.0 → 3.0.0
Rationale: MAJOR bump. Two Core Principles are redefined in a backward-incompatible
way, triggered by a real conflict caught during /speckit-plan for a second product
variant (002-informe-web-railway, Express+PostgreSQL+Railway) against a constitution
written only with the first variant (001-informe-mensual-seo, Electron+SQLite) in
mind. Both changes were explicitly approved by the user via AskUserQuestion before
being applied — this was not an autonomous resolution.

Redefined principles:
  IV. Simplicidad de Infraestructura
      → IV. Simplicidad de Infraestructura Proporcional al Modelo de Despliegue
      Previously mandated SQLite/no-server/local-executable unconditionally — this
      directly contradicted the web variant's Express+PostgreSQL+Railway stack.
      Now defines two valid deployment models (desktop local-first vs. web managed)
      and states the underlying criterion (avoid speculative/unnecessary
      infrastructure) that both must satisfy, instead of hard-coding one topology.

  IX. Evidencia Visual como Respaldo
      → IX. Evidencia Visual como Respaldo (Cuando Esté en Alcance)
      Previously unconditional ("cada registro mensual generado DEBE ir acompañado
      de una captura") — this directly contradicted 002-informe-web-railway's
      spec.md, which explicitly excludes the Evidencias screen from its MVP scope.
      Now conditional on the capability being in scope for a given product variant,
      with the requirement that any exclusion be documented explicitly in that
      variant's spec.md (never silently dropped).

Updated sections:
  - "Alcance y Restricciones Técnicas del MVP" — was written for a single stack
    (Electron only); now lists both valid deployment variants explicitly by name
    (001-informe-mensual-seo, 002-informe-web-railway) so it stays consistent with
    the redefined Principio IV instead of silently going stale next to it.

Principles NOT changed: I, II, III, V, VI, VII, VIII — still 9 Core Principles
total, same count, same order, only IV and IX reworded.

Added/removed sections: none by name.

Deferred items: none — both conflicts found during this session were resolved via
explicit user approval in the same amendment, not deferred.

Templates requiring follow-up review (not modified by this command):
  - specs/001-informe-mensual-seo/plan.md — already Electron-only; still compliant
    with the redefined Principio IV's "desktop local-first" branch, no change needed.
  - specs/002-informe-web-railway/plan.md — being authored in this same session
    against this new version; must cite the "web gestionada" branch of Principio IV
    explicitly in its Constitution Check.
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

### IV. Simplicidad de Infraestructura Proporcional al Modelo de Despliegue

Cada variante de despliegue del producto DEBE usar la infraestructura más
simple que cumpla sus requisitos — nunca infraestructura especulativa,
distribuida o de mayor escala de la necesaria. Son modelos de despliegue
válidos:

- **Escritorio local-first**: SQLite de archivo único como única base de
  datos, sin servidor propio ni sincronización en la nube; la aplicación se
  instala mediante un ejecutable autocontenido, sin requerir que el usuario
  tenga Node.js instalado; el backup se resuelve copiando el archivo.
- **Web gestionada**: un único servicio de aplicación (p. ej. Express) más
  una única base de datos gestionada por el proveedor de alojamiento (p. ej.
  PostgreSQL en Railway), sin infraestructura adicional (colas,
  microservicios, cachés distribuidas, orquestación) salvo justificación
  explícita y por escrito; el backup/recuperación se resuelve con la
  operación gestionada que ofrezca el proveedor de base de datos.

Ninguna variante DEBE introducir servidores propios más allá del servicio de
aplicación único, orquestación multi-servicio, ni sincronización multi-nube,
salvo justificación explícita.

**Razón**: el criterio no es "nunca un servidor", sino evitar coste operativo
y superficie de fallo innecesarios para una herramienta de uso interno de
agencia. Cuando el producto pasa de herramienta de escritorio a aplicación
web accesible por URL, una base de datos gestionada de un único proveedor
sigue siendo la opción más simple disponible en ese contexto — replicar el
modelo "solo SQLite" ahí sería más frágil, no más simple.

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

### IX. Evidencia Visual como Respaldo (Cuando Esté en Alcance)

Cuando la variante de producto incluya la evidencia visual en su alcance,
cada registro mensual generado DEBE ir acompañado de una captura de pantalla
de la fuente de datos, como evidencia verificable del dato registrado.
Excluir la evidencia visual del alcance de una variante concreta (p. ej. un
MVP) es una decisión válida, pero DEBE quedar documentada explícitamente en
el `spec.md` de esa variante — nunca omitida en silencio ni dejada implícita.

**Razón**: ante una discrepancia futura o una consulta de un cliente, la
captura permite verificar qué mostraba realmente la fuente en el momento de
la recogida. Pero exigirla sin excepción en toda variante del producto
—incluidas aquellas donde el propio spec ya ha decidido excluirla por alcance
de MVP— convertiría este principio en un bloqueo automático de cualquier
iteración incremental legítima. La condición recae sobre el alcance
declarado, no sobre la importancia de la evidencia cuando sí está en alcance.

## Alcance y Restricciones Técnicas del MVP

- **Fuentes de datos**: todas las variantes del producto integran exactamente
  cinco fuentes — Google Search Console, GA4/Site Kit, Squirrly
  SEO/Ubersuggest, PageSpeed Insights y Security Ninja. Los datos se obtienen
  vía API; no se introducen pasos de copiado/pegado manual desde el panel de
  una herramienta (ver Principio II).
- **Variantes de despliegue válidas** (ver Principio IV):
  - **Escritorio** (`001-informe-mensual-seo`): Electron + Node.js + SQLite +
    Playwright + Nodemailer. Sin framework de UI. IPC main↔renderer con
    `contextIsolation` activado.
  - **Web gestionada** (`002-informe-web-railway`): Node.js + Express +
    PostgreSQL + `express-session`/`bcrypt` para el acceso protegido +
    Nodemailer. Frontend servido como estático desde `public/`, comunicación
    por `fetch()` a rutas `/api/...`. Sin Electron, sin SQLite, sin
    Playwright.
- **Fuera de alcance en v1 (todas las variantes)**: autenticación
  multi-usuario con roles diferenciados, sincronización en la nube entre
  variantes, mapas de calor/grabación de sesión, y tests automatizados.

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

**Version**: 3.0.0 | **Ratified**: 2026-08-31 | **Last Amended**: 2026-08-31
