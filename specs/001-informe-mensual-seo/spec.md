# Feature Specification: Automatización del informe mensual de métricas SEO y rendimiento web

**Feature Branch**: `001-informe-mensual-seo`

**Created**: 2026-08-31

**Status**: Draft

**Input**: User description: "Automatización del informe mensual de métricas SEO y rendimiento web por sitio gestionado.

El usuario es un gestor de agencia digital que hoy prepara el informe mensual de cada sitio de forma completamente manual: entra en Google Search Console, copia impresiones y clics; entra en GA4, copia sesiones y desglose de canales de tráfico (directo, orgánico, redes sociales, referidos); entra en Squirrly SEO o Ubersuggest, copia el ranking de palabras clave; entra en PageSpeed Insights, copia la puntuación de rendimiento en escritorio y móvil; entra en Security Ninja, copia el número de vulnerabilidades y malware detectados. Todo eso lo pega a mano en una fila de una hoja de cálculo. El proceso completo supera la hora por sitio y no escala a varios clientes.

La feature automatiza ese proceso completo: el sistema obtiene las métricas directamente de las 5 fuentes vía API, registra una fila mensual en la base de datos local con la fecha de corte y todos los valores, y muestra el histórico con la variación porcentual respecto al mes anterior. Si una fuente no responde tras 3 reintentos, el sistema avisa al usuario por email y marca la fila afectada, sin bloquear el resto del informe. Los valores numéricos sin actividad se escriben como 0 explícito, nunca como celda vacía. Los registros son inmutables: regenerar un mes añade una fila nueva, no sobreescribe la anterior.

El usuario debe poder lanzar la generación del informe en cualquier momento, sin esperar a la fecha de corte mensual automática. El disparo manual produce exactamente el mismo resultado que el automático: registra una fila nueva con la fecha real de generación como periodo, sin sobreescribir filas anteriores. Esto permite regenerar un mes ya cerrado si se detecta un error en los datos, o adelantar el informe antes del fin de mes si el cliente lo necesita.

Además del registro de métricas, la feature incluye:
- Detección automática de oportunidades SEO: palabras clave con volumen ≥ 50 búsquedas/mes que no están en el top 3, agrupadas en tramos top 10 y top 100.
- Captura de pantalla de cada fuente de datos asociada al registro mensual, como evidencia visual del dato.
- Alerta específica cuando una métrica pasa de tener actividad a valer 0 por primera vez, sin repetir el aviso en meses siguientes si se mantiene en cero.

La cadencia es mensual con fecha de corte a fin de mes. El sistema gestiona varios sitios de forma independiente a partir de una lista de sitios activos mantenida por el usuario. Dar de baja un sitio detiene la generación de nuevas filas pero conserva todo el histórico anterior."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registro automático de las métricas mensuales por sitio (Priority: P1)

Como gestor de sitios web, quiero que las métricas clave de cada sitio (impresiones, clics, sesiones, desglose de canales de tráfico) se registren automáticamente en una fila de la fecha de corte correspondiente, para no tener que copiarlas a mano cada mes.

**Why this priority**: es el dolor principal descrito — hoy el proceso es 100% manual y supera la hora por sitio. Es la base sobre la que se apoya el resto de la automatización.

**Independent Test**: se puede probar generando el registro de un mes para un sitio y comprobando que los valores aparecen correctamente en la fila de esa fecha, sin intervención manual.

**Acceptance Scenarios**:

1. **Given** que ha llegado la fecha de corte mensual (fin de mes) para un sitio dado de alta, **When** se genera el informe del mes, **Then** se añade una fila nueva con esa fecha y se rellenan las columnas de métricas (impresiones, clics, sesiones, % de tráfico directo/orgánico/social/referido).
2. **Given** que una métrica numérica no tiene actividad en el periodo, **When** se registra la fila del mes, **Then** el sistema escribe explícitamente `0` en esa columna en lugar de dejarla en blanco.
3. **Given** que se gestionan varios sitios, **When** se genera el informe mensual, **Then** cada sitio registra su fila de forma independiente, sin mezclar datos entre sitios.
4. **Given** un sitio que genera su primer registro mensual, **When** se genera el informe, **Then** la fila se registra con normalidad y la comparativa con el mes anterior queda sin aplicar (no existe periodo previo).
5. **Given** que se regenera el informe de un mes ya registrado, **When** se ejecuta de nuevo la generación, **Then** el sistema añade una fila adicional, conservando la anterior como histórico (nunca sobrescribe ni bloquea).
6. **Given** un sitio con al menos dos meses registrados, **When** el usuario consulta el histórico, **Then** cada fila muestra la variación porcentual respecto al mes anterior.
7. **Given** que el usuario dispara la generación manualmente en cualquier momento, sin esperar a la fecha de corte mensual, **When** se completa la generación, **Then** el sistema registra una fila nueva con la fecha real de generación como periodo, produciendo el mismo resultado que una generación en la fecha de corte automática.
8. **Given** un mes ya cerrado en el que se detecta un error en los datos, **When** el usuario dispara manualmente una regeneración de ese mes, **Then** se añade una fila nueva con los datos corregidos, sin eliminar ni sobrescribir la fila anterior con el error.

---

### User Story 2 - Recogida de datos vía API en lugar de visita manual a cada sitio (Priority: P1)

Como gestor de varios sitios web, quiero que el sistema obtenga las métricas directamente de las cinco herramientas de origen (Google Search Console, GA4, Squirrly SEO/Ubersuggest, PageSpeed Insights, Security Ninja) sin entrar manualmente en el panel de cada una, para poder escalar el proceso a muchos sitios sin perder tiempo.

**Why this priority**: sin recogida automática, la Historia 1 seguiría dependiendo de que alguien copie los valores a mano — no sería realmente automática.

**Independent Test**: se puede probar conectando una fuente de datos concreta y comprobando que el sistema recupera el valor de una métrica sin que el usuario visite manualmente el panel de esa herramienta.

**Acceptance Scenarios**:

1. **Given** que un sitio tiene configuradas sus cinco fuentes de datos, **When** llega la fecha de generación del informe, **Then** el sistema recupera de cada fuente las métricas correspondientes sin intervención manual del usuario.
2. **Given** que una fuente de datos falla o no responde durante la recogida, **When** el sistema lo detecta, **Then** reintenta automáticamente hasta 3 veces y, si sigue fallando, avisa al usuario por email y marca la celda/fila afectada indicando sitio y fuente, sin bloquear la generación del resto del informe.
3. **Given** que 4 de las 5 fuentes de un sitio responden correctamente y 1 falla tras sus 3 reintentos, **When** finaliza la generación, **Then** la fila mensual se registra igualmente con los valores de las 4 fuentes disponibles y la fuente fallida queda marcada.

---

### User Story 3 - Identificación de oportunidades SEO a partir del ranking de palabras clave (Priority: P2)

Como gestor de SEO, quiero que el sistema señale qué palabras clave con volumen de búsqueda relevante están posicionadas por debajo del top 3, para saber en qué contenido conviene trabajar sin revisar manualmente cada palabra clave.

**Why this priority**: aporta el valor de negocio final (decidir qué contenido priorizar), pero depende de que existan datos de ranking ya recogidos (Historia 2).

**Independent Test**: se puede probar cargando un conjunto de palabras clave con su posición y volumen de búsqueda, y comprobando que el sistema devuelve la lista de oportunidades esperada, agrupada por tramos.

**Acceptance Scenarios**:

1. **Given** un listado de palabras clave posicionadas de un sitio con su volumen y posición actual, **When** se ejecuta el análisis de oportunidades, **Then** el sistema devuelve las palabras clave con volumen ≥ 50 búsquedas/mes que no están en el top 3, agrupadas en tramo top 10 (posiciones 4–10) y tramo top 100 (posiciones 11–100).
2. **Given** que una palabra clave ya está en el top 3, **When** se ejecuta el análisis, **Then** esa palabra clave no aparece en la lista de oportunidades.
3. **Given** una palabra clave con volumen de búsqueda por debajo de 50/mes, **When** se ejecuta el análisis, **Then** esa palabra clave no aparece en la lista de oportunidades, aunque esté fuera del top 3.

---

### User Story 4 - Captura de evidencia visual del informe (Priority: P3)

Como gestor de sitios web, quiero que, al generarse el informe mensual, el sistema guarde una captura de pantalla de cada fuente de datos, para tener evidencia visual del dato sin tener que hacerlo manualmente.

**Why this priority**: es una mejora sobre el informe base (Historias 1 y 2); aporta valor pero el informe funciona sin ella.

**Independent Test**: se puede probar generando el informe de un mes y comprobando que queda asociada al menos una captura de pantalla a esa fila/registro por cada fuente que respondió correctamente.

**Acceptance Scenarios**:

1. **Given** que se está generando el informe mensual de un sitio, **When** se completa el registro de métricas, **Then** el sistema guarda una captura de pantalla de cada fuente de datos que respondió correctamente y la asocia a ese registro mensual.
2. **Given** una fuente que falló tras sus 3 reintentos, **When** se completa el registro, **Then** no se exige captura de pantalla para esa fuente en ese registro.

---

### Edge Cases

- Si una fuente de datos sigue fallando tras 3 reintentos automáticos, el sistema avisa por email y marca la fila afectada, sin bloquear el resto del informe (Historia 2, escenario 2).
- Si se regenera el informe de un mes ya registrado, se añade una fila adicional y se conserva el histórico; no hay sobrescritura ni bloqueo (Historia 1, escenario 5).
- Si un sitio es nuevo y no tiene mes anterior, la comparativa de variación queda sin aplicar en ese primer registro (Historia 1, escenario 4).
- Si una métrica pasa de tener actividad a valer 0 por primera vez respecto al mes anterior, el sistema avisa al usuario ese primer mes en que ocurre; en los meses siguientes en que la métrica se mantenga en 0 no se repite el aviso.
- Alta y baja de sitios: el sistema solo genera informes para los sitios activos en el momento de la generación. Si un sitio se da de baja a mitad de mes, no se le exige generar una fila parcial de ese mes. Al dar de baja un sitio, su histórico de registros anteriores se conserva.
- ¿Qué ocurre si las cinco fuentes de un sitio fallan simultáneamente en la misma generación? El sistema aún debe registrar una fila con todas las métricas en `0`/marcadas como fallidas, avisar por email, y no dejar el proceso en un estado indefinido.
- Si el usuario dispara la generación manualmente antes de fin de mes o para un mes ya cerrado, el sistema la trata igual que cualquier otra generación: registra una fila nueva con la fecha real de generación como periodo, sin sobrescribir el histórico existente (Historia 1, escenarios 7-8).
- Si el usuario dispara la generación manual dos veces el mismo día para el mismo sitio, el sistema no deduplica: se añaden dos filas nuevas, cada una con sus propios valores recogidos en ese momento.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE registrar, para cada sitio dado de alta, una fila mensual con la fecha de corte y el conjunto de métricas definidas (impresiones, clics, sesiones y desglose porcentual de canales de tráfico).
- **FR-002**: El sistema DEBE escribir el valor `0` de forma explícita en cualquier métrica numérica cuando no haya actividad en el periodo, en lugar de dejar la celda vacía.
- **FR-003**: El sistema DEBE mostrar, en el histórico de un sitio, tanto el valor absoluto como el porcentaje de variación de cada métrica respecto al periodo anterior; cuando no exista periodo anterior, la variación queda sin aplicar.
- **FR-004**: El sistema DEBE obtener las métricas directamente de las cinco fuentes de datos configuradas por sitio (Google Search Console, GA4/Site Kit, Squirrly SEO/Ubersuggest, PageSpeed Insights, Security Ninja), sin requerir que el usuario entre manualmente en el panel de cada herramienta.
- **FR-005**: El sistema DEBE reintentar automáticamente hasta 3 veces la recogida de datos de una fuente que falla y, si sigue fallando tras los 3 reintentos, DEBE avisar al usuario por email y marcar la celda/fila afectada, indicando el sitio y la fuente afectados, sin bloquear la generación del resto del informe.
- **FR-006**: El sistema DEBE registrar la puntuación de rendimiento de página de PageSpeed Insights en versión de escritorio y en versión móvil de forma independiente.
- **FR-007**: El sistema DEBE registrar todas las incidencias de seguridad (vulnerabilidades y malware) reportadas por la herramienta de seguridad en el periodo, sin filtrar por gravedad.
- **FR-008**: El sistema DEBE identificar como "oportunidad SEO" toda palabra clave con volumen de búsqueda ≥ 50 búsquedas/mes que no esté en el top 3 del ranking, y DEBE agruparlas en tramo top 10 (posiciones 4–10) y tramo top 100 (posiciones 11–100).
- **FR-009**: El sistema DEBE guardar una captura de pantalla de cada fuente de datos que respondió correctamente y asociarla al registro mensual correspondiente.
- **FR-010**: El sistema DEBE gestionar varios sitios web de forma independiente, sin mezclar los datos de uno con los de otro, a partir de una lista de sitios activos mantenida por el usuario.
- **FR-011**: El sistema DEBE conservar como histórico cada fila generada, incluso al regenerar el informe de un mes ya registrado (nunca sobrescribe ni elimina filas anteriores).
- **FR-012**: El sistema DEBE avisar al usuario cuando una métrica pasa a valer 0 por primera vez respecto al mes anterior (tenía actividad y ha caído a cero), y DEBE evitar repetir ese aviso en los meses siguientes mientras la métrica se mantenga en 0.
- **FR-013**: El sistema DEBE conservar el histórico de registros mensuales de un sitio dado de baja; dar de baja un sitio solo detiene la generación de nuevas filas, no elimina las existentes.
- **FR-014**: El sistema DEBE permitir al usuario disparar manualmente la generación del informe de un sitio en cualquier momento, sin esperar a una fecha de corte automática.
- **FR-015**: Cuando la generación se dispara manualmente, el sistema DEBE registrar la fila resultante usando la fecha real de generación como periodo, con el mismo comportamiento de inmutabilidad (nunca sobrescribe, ver FR-011) que cualquier otra generación — incluyendo la regeneración de un mes ya cerrado o el adelanto del informe antes de fin de mes.
- **FR-016**: El sistema DEBE ofrecer un control explícito en la interfaz (botón GENERAR INFORME en la pantalla correspondiente) que permita lanzar la recogida de datos de todas las fuentes de un sitio seleccionado en cualquier momento, independientemente de la fecha del calendario.

### Key Entities *(include if feature involves data)*

- **Sitio web**: un sitio gestionado por el usuario del que se recogen métricas; tiene identificador, estado (activo/dado de baja) y sus cinco fuentes de datos configuradas.
- **Fuente de datos**: origen externo de una o varias métricas. Lista cerrada: Google Search Console, GA4/Site Kit, Squirrly SEO/Ubersuggest, PageSpeed Insights, Security Ninja.
- **Registro mensual**: fila de métricas de un sitio para un periodo (mes) concreto, con su fecha de corte, los valores de todas las métricas, y qué fuentes respondieron u fallaron.
- **Métrica**: dato individual dentro de un registro mensual (impresiones, clics, % de canal, puntuación de rendimiento, etc.), con su valor y el periodo al que pertenece.
- **Palabra clave**: término por el que posiciona un sitio; tiene volumen de búsqueda, posición actual e impresiones asociadas.
- **Oportunidad SEO**: palabra clave señalada como candidata a mejora de contenido por su volumen y posición.
- **Incidencia de seguridad**: vulnerabilidad o malware detectado en un sitio durante el periodo.
- **Captura de pantalla**: evidencia visual asociada a un registro mensual y a la fuente que la generó.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El tiempo que el usuario dedica a preparar el informe mensual de un sitio, hoy superior a 1 hora, se reduce en al menos un 80% (a revisar y validar el informe ya generado, no a recopilar datos a mano).
- **SC-002**: El usuario deja de copiar manualmente datos desde cualquiera de las cinco herramientas de origen para completar el informe mensual.
- **SC-003**: Añadir un sitio nuevo a la cartera no aumenta de forma proporcional el tiempo mensual dedicado por el usuario.
- **SC-004**: Todas las oportunidades SEO relevantes de un periodo (volumen ≥ 50, fuera del top 3) quedan identificadas sin revisión manual palabra por palabra.
- **SC-005**: Cada registro mensual generado tiene evidencia visual recuperable de al menos una fuente, sin necesidad de volver a visitar el panel original de esa herramienta.

## Assumptions

- El proceso es una herramienta de uso interno del usuario (o su agencia) para preparar informes de sus sitios o los de sus clientes; no es una funcionalidad orientada a usuarios finales de esos sitios web.
- El usuario ya tiene acceso (cuentas/suscripciones) a las cinco herramientas de origen; esta especificación no cubre la contratación de esas herramientas, solo la automatización de la recogida de sus datos.
- La generación del informe se dispara manualmente por el usuario; no existe un disparador automático programado por el sistema. La cadencia "mensual, con corte a fin de mes" es el patrón de uso esperado, no una restricción impuesta: el usuario puede generar, regenerar o adelantar el informe de un sitio en cualquier momento (FR-014, FR-015).
- Queda fuera de alcance: simulación de comportamiento humano en la página (mapas de calor/grabación de sesión).
- Queda fuera de alcance: la elección de qué proveedores concretos sustituyen o complementan a las cinco fuentes listadas; esta especificación describe capacidades sobre una lista cerrada de fuentes, no un catálogo de proveedores alternativos.
- Un sitio nuevo sin mes anterior no tiene comparativa de variación; esto no se considera un error, sino el comportamiento esperado del primer registro.
