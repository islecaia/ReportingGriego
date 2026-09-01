# Feature Specification: Informe mensual SEO como aplicación web (Railway)

**Feature Branch**: `002-informe-web-railway`

**Created**: 2026-08-31

**Status**: Draft

**Input**: User description: "Misma feature de automatización del informe mensual SEO, pero ahora como aplicación web alojada en Railway en lugar de app de escritorio Electron. Stack: Node.js + Express (backend), PostgreSQL (Railway plugin), HTML/CSS/JS en public/ con fetch() en lugar de IPC (frontend), express-session + bcrypt (acceso protegido con login único). Sin capturas de pantalla: la pantalla Evidencias queda fuera del MVP. Sin SQLite: la base de datos es PostgreSQL gestionado por Railway. Deploy automático desde GitHub. El resto de requisitos funcionales (FR-001 a FR-014 excepto FR-008) y el diseño visual (DESIGN.md) se mantienen igual."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acceso protegido por login (Priority: P1)

Como gestor de la agencia, quiero que la aplicación exija iniciar sesión antes de mostrar cualquier dato o pantalla, para que el informe y las credenciales de los sitios no queden expuestos públicamente al estar la app alojada en internet.

**Why this priority**: la versión anterior era una app de escritorio de uso local; al pasar a una URL pública en Railway, sin login cualquiera con el enlace vería datos de clientes y podría disparar generaciones de informe. Es la base de seguridad de la que depende todo lo demás.

**Independent Test**: se puede probar visitando la URL de la aplicación sin sesión iniciada y comprobando que ninguna pantalla ni dato es accesible hasta introducir las credenciales correctas; con sesión iniciada, se accede con normalidad.

**Acceptance Scenarios**:

1. **Given** que un usuario visita la aplicación sin haber iniciado sesión, **When** intenta acceder a cualquier pantalla (Sitios, Generar informe, Histórico, Oportunidades SEO), **Then** el sistema le redirige a la pantalla de login y no muestra ningún dato.
2. **Given** que un usuario introduce las credenciales correctas, **When** envía el formulario de login, **Then** el sistema concede acceso a la aplicación y mantiene la sesión iniciada mientras navega.
3. **Given** que un usuario introduce credenciales incorrectas, **When** envía el formulario, **Then** el sistema rechaza el acceso y muestra un mensaje de error, sin revelar si el fallo fue el usuario o la contraseña.
4. **Given** que un usuario tiene una sesión iniciada, **When** cierra sesión explícitamente, **Then** el sistema revoca el acceso y vuelve a exigir login para cualquier pantalla.

---

### User Story 2 - Registro automático de las métricas mensuales en la base de datos (Priority: P1)

Como gestor de sitios web, quiero que las métricas clave de cada sitio (impresiones, clics, visitas, desglose de canales de tráfico) se registren automáticamente en un registro mensual con la fecha correspondiente, para no tener que copiarlas a mano desde cada herramienta cada mes.

**Why this priority**: es el dolor principal del producto — el registro automático e inmutable es el valor central, independientemente de si la app es de escritorio o web.

**Independent Test**: se puede probar generando el registro de un mes para un sitio (con sesión iniciada) y comprobando que los valores aparecen correctamente con la fecha correspondiente, sin intervención manual en las herramientas de origen.

**Acceptance Scenarios**:

1. **Given** que ha llegado la fecha de corte mensual para un sitio dado de alta, **When** se genera el informe del mes, **Then** se añade un registro nuevo con esa fecha y las columnas de métricas correspondientes (impresiones, clics, visitas, % de tráfico directo, orgánico, redes sociales, referidos).
2. **Given** que una métrica numérica concreta no tiene actividad en el periodo, **When** se registra el mes, **Then** el sistema escribe explícitamente el valor `0` en esa métrica en lugar de dejarla vacía. Esta regla aplica a todas las métricas numéricas del registro mensual.
3. **Given** que se gestionan varios sitios web, **When** se genera el informe mensual, **Then** cada sitio registra su fila de forma independiente, sin mezclar datos entre sitios.
4. **Given** un sitio web que genera su primer registro mensual, **When** se genera el informe, **Then** el registro se guarda con normalidad y la comparativa con el mes anterior queda sin aplicar.
5. **Given** que se genera el informe de un mes para un sitio que ya tenía un registro de ese mismo mes, **When** se ejecuta de nuevo la generación, **Then** el sistema añade un registro adicional, conservando el anterior como histórico (nunca sobrescribe).

---

### User Story 3 - Recogida de datos vía API en lugar de visita manual a cada sitio (Priority: P1)

Como gestor de varios sitios web, quiero que el sistema obtenga las métricas directamente de las herramientas de origen (Google Site Kit, Search Console, Squirrly SEO/Ubersuggest, Google PageSpeed Insights y Security Ninja) sin tener que entrar manualmente en el panel de cada sitio, para poder escalar el proceso a muchos sitios sin perder tiempo.

**Why this priority**: sin recogida automática de datos de origen, la Historia 2 seguiría dependiendo de copiar valores a mano — no sería realmente automática.

**Independent Test**: se puede probar conectando una fuente de datos concreta y comprobando que el sistema recupera el valor de una métrica sin que el usuario visite manualmente el panel de esa herramienta.

**Acceptance Scenarios**:

1. **Given** que un sitio tiene configuradas sus cinco fuentes de datos, **When** llega la fecha de generación del informe, **Then** el sistema recupera de cada fuente las métricas correspondientes sin intervención manual del usuario.
2. **Given** que una fuente de datos falla o no responde durante la recogida, **When** el sistema lo detecta, **Then** reintenta automáticamente hasta 3 veces y, si tras esos 3 reintentos sigue fallando, avisa al usuario por email y marca el registro afectado, indicando qué fuente y qué sitio están afectados, sin bloquear la generación del resto del informe.

---

### User Story 4 - Identificación de oportunidades SEO a partir del ranking de palabras clave (Priority: P2)

Como gestor de SEO de un sitio web, quiero que el sistema señale qué palabras clave con volumen de búsqueda relevante están posicionadas por debajo del top 3, para saber en qué artículos conviene trabajar sin revisar manualmente cada palabra clave.

**Why this priority**: aporta el valor de negocio final (decidir qué contenido priorizar), pero depende de que existan datos de ranking ya recogidos (Historia 3).

**Independent Test**: se puede probar cargando un conjunto de palabras clave con su posición y volumen de búsqueda, y comprobando que el sistema devuelve la lista de oportunidades esperada.

**Acceptance Scenarios**:

1. **Given** un listado de palabras clave posicionadas de un sitio con su volumen de búsqueda y posición actual, **When** se ejecuta el análisis de oportunidades, **Then** el sistema devuelve las palabras clave con volumen de búsqueda igual o superior a 50 búsquedas/mes que no están en el top 3, junto a su posición actual.
2. **Given** que aparece una palabra clave nueva en el ranking que antes no se rastreaba, **When** se ejecuta el análisis, **Then** el sistema la incluye en la lista de oportunidades junto con su posición e impresiones.
3. **Given** que una palabra clave ya está en el top 3, **When** se ejecuta el análisis, **Then** esa palabra clave no aparece en la lista de oportunidades.

---

### Edge Cases

- Si una fuente de datos sigue fallando tras 3 reintentos automáticos, el sistema avisa por email y marca el registro afectado, sin bloquear el resto del informe.
- Si se regenera el informe de un mes ya registrado, se añade un registro adicional y se conserva el histórico; no hay sobrescritura ni bloqueo.
- Si un sitio es nuevo y no tiene mes anterior, la comparativa queda sin aplicar en ese primer registro.
- Si una métrica registra 0 por primera vez en un sitio (el mes anterior tenía actividad y este mes cae a 0), el sistema avisa al usuario ese primer mes; en los meses siguientes en que la métrica se mantenga en 0 no se repite el aviso.
- Alta y baja de sitios: el sistema solo genera informes para los sitios activos en el momento de la generación; dar de baja un sitio conserva su histórico de registros anteriores.
- Si la sesión de un usuario expira mientras tiene la aplicación abierta, la siguiente acción (navegar o generar un informe) le devuelve a la pantalla de login sin perder los datos ya guardados.
- Si el servicio de base de datos gestionado no responde momentáneamente, la generación de un informe en curso debe fallar de forma visible (mensaje de error), nunca en silencio ni con datos parciales sin marcar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE exigir el inicio de sesión antes de conceder acceso a cualquier pantalla o dato de la aplicación.
- **FR-002**: El sistema DEBE mantener la sesión del usuario mientras navega y DEBE revocarla al cerrar sesión o al expirar por inactividad.
- **FR-003**: El sistema DEBE registrar, para cada sitio web dado de alta, un registro mensual con la fecha de corte y el conjunto de métricas definidas (impresiones, clics, visitas y desglose porcentual de canales de tráfico).
- **FR-004**: El sistema DEBE escribir el valor `0` de forma explícita en cualquier métrica numérica cuando no haya actividad en el periodo, en lugar de dejar el campo vacío.
- **FR-005**: El sistema DEBE mantener el histórico de registros mensuales por sitio, mostrando tanto el valor absoluto como el porcentaje de variación respecto al periodo anterior; cuando no exista periodo anterior, la variación queda sin aplicar.
- **FR-006**: El sistema DEBE permitir gestionar varios sitios web de forma independiente, sin mezclar los datos de uno con los de otro, a partir de una lista de sitios activos mantenida por el usuario.
- **FR-007**: El sistema DEBE obtener las métricas directamente de las cinco fuentes de datos configuradas para cada sitio (Google Site Kit, Search Console, Squirrly SEO/Ubersuggest, Google PageSpeed Insights, Security Ninja), sin requerir que el usuario entre manualmente en el panel de cada herramienta.
- **FR-008**: El sistema DEBE reintentar automáticamente hasta 3 veces la recogida de datos de una fuente que falla y, si sigue fallando tras los 3 reintentos, DEBE avisar al usuario por email y además marcar el registro afectado, indicando el sitio y la fuente afectados, sin bloquear el resto del informe.
- **FR-009**: El sistema DEBE conservar como histórico cada registro generado, incluso si se regenera el informe de un mes ya registrado (nunca sobrescribe ni elimina registros anteriores).
- **FR-010**: El sistema DEBE avisar al usuario cuando una métrica pasa a valer 0 por primera vez respecto al mes anterior, pero DEBE evitar repetir el aviso en los meses siguientes mientras la métrica se mantenga en 0.
- **FR-011**: El sistema DEBE conservar el histórico de registros mensuales de un sitio dado de baja; dar de baja un sitio solo detiene la generación de nuevos registros, no elimina los existentes.
- **FR-012**: El sistema DEBE registrar la puntuación de rendimiento de la página obtenida de Google PageSpeed Insights, en versión de escritorio y en versión móvil de forma independiente.
- **FR-013**: El sistema DEBE registrar todas las incidencias de seguridad detectadas en el periodo (vulnerabilidades y malware) reportadas por la herramienta de seguridad, sin filtrar por gravedad.
- **FR-014**: El sistema DEBE identificar como "oportunidad" toda palabra clave con volumen de búsqueda igual o superior a 50 búsquedas/mes que no esté en el top 3 del ranking.
- **FR-015**: El sistema DEBE distinguir en el ranking de palabras clave al menos tres tramos de posición (top 100, top 10, top 3) y contar cuántas palabras clave hay en cada tramo.

### Key Entities *(include if feature involves data)*

- **Cuenta de acceso**: credencial única compartida (usuario + contraseña) que protege el acceso a toda la aplicación; no hay perfiles ni roles diferenciados en esta versión.
- **Sitio web**: un sitio gestionado por el usuario del que se recogen métricas; tiene un identificador, un estado (activo/dado de baja) y sus cinco fuentes de datos configuradas.
- **Fuente de datos**: origen externo de una o varias métricas. Lista cerrada: Google Site Kit, Google Search Console, Squirrly SEO/Ubersuggest, Google PageSpeed Insights y Security Ninja.
- **Registro mensual**: un conjunto de métricas de un sitio web para un periodo (mes) concreto, con su fecha de corte y los valores de todas las métricas de ese periodo.
- **Métrica**: un dato individual dentro de un registro mensual (impresiones, clics, visitas, % de canal de tráfico, puntuación de rendimiento, etc.), con su valor y el periodo al que pertenece.
- **Palabra clave**: término por el que posiciona un sitio web; tiene volumen de búsqueda, posición actual e impresiones asociadas.
- **Oportunidad SEO**: palabra clave señalada como candidata a mejora de contenido por su volumen de búsqueda y su posición actual.
- **Incidencia de seguridad**: alerta de vulnerabilidad o malware detectada en un sitio durante el periodo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El tiempo que el usuario dedica a preparar el informe mensual de un sitio web, hoy superior a 1 hora por sitio, se reduce en al menos un 80%.
- **SC-002**: El usuario deja de tener que copiar manualmente datos de cada herramienta de origen para completar el informe mensual de cada sitio.
- **SC-003**: El proceso de generación del informe puede escalar a varios sitios web sin que el tiempo dedicado por el usuario crezca de forma proporcional al número de sitios.
- **SC-004**: Todas las oportunidades SEO relevantes de un periodo quedan identificadas en el informe sin revisión manual palabra por palabra.
- **SC-005**: Ningún dato de la aplicación (sitios, métricas, credenciales de fuentes) es accesible desde la URL pública sin haber iniciado sesión primero.

## Assumptions

- Esta especificación reemplaza la plataforma de la feature `001-informe-mensual-seo` (app de escritorio Electron) por una aplicación web alojada en Railway; el alcance funcional se basa en la especificación original del proyecto (FR-001 a FR-014, excluyendo la captura de pantalla) y no incorpora los refinamientos posteriores de disparo manual en cualquier fecha (FR-014/015/016 de `001-informe-mensual-seo`) salvo que se confirme lo contrario.
- **Fuera de alcance en esta versión**: la pantalla de Evidencias y la captura de pantalla asociada a cada registro mensual — se excluye explícitamente del MVP web.
- El acceso es de "login único": una sola credencial compartida por el equipo/agencia, sin gestión de usuarios múltiples, roles ni permisos diferenciados.
- El proceso sigue siendo una herramienta de uso interno de la agencia (o sus clientes), no una funcionalidad orientada a usuarios finales de los sitios web gestionados.
- El usuario ya tiene acceso (cuentas/suscripciones) a las cinco herramientas de origen; esta especificación no cubre su contratación, solo la automatización de la recogida de sus datos.
- El sistema de diseño visual (paleta, tipografía, tono de los textos) definido para la versión de escritorio se mantiene igual en la versión web.
- La disponibilidad de la aplicación depende de un proveedor de alojamiento gestionado externo; esta especificación no cubre garantías de tiempo de actividad del proveedor.
- Queda FUERA de alcance: la simulación de comportamiento humano en la página (mapas de calor/grabación de sesión) y la elección de qué proveedores concretos sustituyen o complementan a las cinco fuentes mencionadas.
