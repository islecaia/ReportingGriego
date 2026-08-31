# Especificación de Feature: Reporting Automatizado de Mantenimiento Web

**Rama**: `001-reporting-automatizado`
**Creada**: 2026-08-31
**Estado**: Borrador
**Input**: Descripción del usuario: "Generar una automatización para que sustraiga los datos de las diferentes aplicaciones y centralice todos los datos en una excel de google sheets. Cada mes, se envía un resumen mensual del mantenimiento de la página web."

**Fuentes de datos del MVP**: GA4, Google Search Console, PageSpeed Insights, Rybbit, Ubersuggest

---

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de Usuario 1 — Recolección automática de métricas mensuales (Prioridad: P1)

Como gestor de una agencia web con contratos de mantenimiento mensual, quiero que el sistema recoja automáticamente las métricas de analítica de cada cliente el primer día de cada mes, para no tener que acceder a cada herramienta por separado ni copiar datos a mano.

**Por qué esta prioridad**: es el núcleo de la automatización; sin extracción de datos el resto de la feature no tiene sentido. Es el paso que elimina la mayor parte del trabajo manual.

**Test independiente**: se puede probar ejecutando la recolección para un único cliente y verificando que los datos aparecen en su hoja correspondiente, sin necesidad de que el email ni nada más esté funcionando.

**Escenarios de aceptación**:

1. **Dado** que un cliente está dado de alta en el sistema con sus fuentes configuradas, **Cuando** llega el primer día del mes, **Entonces** el sistema obtiene automáticamente las métricas del mes anterior de todas las fuentes configuradas para ese cliente.
2. **Dado** que una fuente de datos de un cliente no está disponible temporalmente, **Cuando** el sistema intenta obtener sus métricas, **Entonces** registra el error, continúa con el resto de fuentes del mismo cliente y sigue procesando los demás clientes.
3. **Dado** que el sistema ya recogió las métricas de un cliente en el mes en curso, **Cuando** se intenta volver a ejecutar la recolección, **Entonces** el sistema no duplica la fila de datos de ese mes.

---

### Historia de Usuario 2 — Historial acumulado por cliente en Google Sheets (Prioridad: P1)

Como gestor de la agencia, quiero que los datos de cada mes queden registrados acumulativamente en la hoja Google Sheets de cada cliente, para poder comparar la evolución a lo largo del tiempo sin trabajo adicional.

**Por qué esta prioridad**: el historial acumulado es el entregable de datos central del producto; sin él los datos solo existen en las herramientas de origen y el problema no está resuelto.

**Test independiente**: se puede verificar que tras ejecutar el proceso en dos meses distintos existen dos filas en la hoja del cliente, cada una con la fecha correcta y sin solapamiento.

**Escenarios de aceptación**:

1. **Dado** que la hoja de un cliente no existe todavía, **Cuando** se registran sus métricas por primera vez, **Entonces** el sistema crea la hoja con las cabeceras correctas y añade la primera fila de datos.
2. **Dado** que ya existen filas de meses anteriores en la hoja de un cliente, **Cuando** se registran las métricas del mes actual, **Entonces** se añade una nueva fila al final sin modificar las anteriores.
3. **Dado** que las métricas de un cliente tienen campos vacíos porque una fuente falló, **Cuando** se escribe la fila en la hoja, **Entonces** las celdas correspondientes quedan vacías o con un indicador de "no disponible", y las métricas que sí llegaron se guardan correctamente.

---

### Historia de Usuario 3 — Envío automático del email de informe mensual (Prioridad: P2)

Como gestor de la agencia, quiero que el email mensual de informe de cada cliente se genere automáticamente a partir de los datos recolectados y se envíe al contacto del cliente, para no tener que redactarlo ni revisarlo manualmente cada mes.

**Por qué esta prioridad**: aporta mucho valor en tiempo ahorrado, pero depende de que la extracción y el Sheet (P1) funcionen primero. Puede operarse de forma manual mientras tanto.

**Test independiente**: se puede probar generando y enviando el email para un solo cliente a una dirección de prueba, con datos de test, sin necesidad de trigger mensual.

**Escenarios de aceptación**:

1. **Dado** que las métricas de un cliente han sido recolectadas correctamente, **Cuando** el proceso mensual concluye, **Entonces** el sistema envía un email al contacto configurado para ese cliente con las métricas del mes en el formato de plantilla acordado.
2. **Dado** que un cliente no tiene email de contacto configurado, **Cuando** el proceso mensual termina para ese cliente, **Entonces** el sistema omite el envío de email y lo registra como "sin email configurado", sin interrumpir el proceso de los demás clientes.
3. **Dado** que las métricas de un cliente tienen campos vacíos por fallo parcial de una fuente, **Cuando** se genera el email, **Entonces** el email indica claramente qué métricas no están disponibles ese mes y envía el resto.

---

### Historia de Usuario 4 — Gestión de la lista de clientes (Prioridad: P2)

Como gestor de la agencia, quiero poder añadir, modificar o desactivar clientes en el sistema editando una hoja de configuración central, para adaptar la lista de clientes sin necesidad de intervenir en el sistema más allá de esa hoja.

**Por qué esta prioridad**: es imprescindible para que el sistema sea mantenible en el día a día; sin ella cualquier cambio de cartera requeriría conocimiento técnico interno del sistema.

**Test independiente**: se puede probar añadiendo un cliente nuevo a la hoja de configuración y ejecutando el proceso, verificando que ese cliente es procesado; y desactivando uno ya existente y verificando que es ignorado.

**Escenarios de aceptación**:

1. **Dado** que añado una fila con los datos de un nuevo cliente en la hoja de configuración, **Cuando** se ejecuta el proceso mensual, **Entonces** el sistema procesa al nuevo cliente igual que a los demás.
2. **Dado** que marco a un cliente como inactivo en la hoja de configuración, **Cuando** se ejecuta el proceso mensual, **Entonces** el sistema omite ese cliente por completo sin errores.
3. **Dado** que un cliente tiene configuradas solo algunas fuentes de datos (no todas), **Cuando** se ejecuta el proceso mensual, **Entonces** el sistema recolecta únicamente las fuentes configuradas y deja en blanco las que no aplican.

---

### Historia de Usuario 5 — Notificación de errores al gestor (Prioridad: P3)

Como gestor de la agencia, quiero recibir un resumen de lo que ha fallado cuando el proceso mensual termina con errores, para poder revisar manualmente esos clientes sin que afecte al resto.

**Por qué esta prioridad**: el sistema puede operar sin esto, pero sin visibilidad de errores el gestor no sabe cuándo intervenir. Es un safety net importante una vez el sistema está en producción.

**Test independiente**: se puede probar forzando un fallo en una fuente de datos para un cliente y verificando que el gestor recibe un aviso con el detalle del error.

**Escenarios de aceptación**:

1. **Dado** que el proceso mensual ha terminado y uno o más clientes tuvieron errores, **Cuando** concluye la ejecución, **Entonces** el gestor recibe un resumen indicando qué clientes fallaron, qué fuente falló y cuál fue el motivo.
2. **Dado** que el proceso mensual ha terminado sin ningún error, **Cuando** concluye la ejecución, **Entonces** el gestor no recibe ninguna notificación de error (no spam innecesario).

---

### Casos límite

- ¿Qué ocurre si una fuente de datos devuelve datos vacíos porque el cliente no tuvo actividad ese mes?
- ¿Qué pasa si la hoja de Google Sheets de un cliente fue eliminada manualmente entre dos ejecuciones?
- ¿Cómo se comporta el sistema si el cliente tiene configuradas fuentes que requieren autenticación y las credenciales han caducado?
- ¿Qué ocurre si el proceso se ejecuta a medias (fallo del sistema) y solo se han procesado algunos clientes?
- ¿Cómo se evita que clientes con muchas fuentes consuman tiempo excesivo y bloqueen a los demás?
- ¿Qué período de tiempo cubren exactamente las métricas: el mes natural anterior o los últimos N días? [NECESITA ACLARACIÓN: ¿mes natural o ventana de 30 días?]

---

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **FR-001**: El sistema DEBE extraer automáticamente las métricas del mes anterior de cada fuente configurada para cada cliente activo.
- **FR-002**: El sistema DEBE ejecutarse de forma desatendida una vez al mes, sin requerir intervención manual para arrancar.
- **FR-003**: El sistema DEBE escribir una fila de datos por cliente y por mes en su hoja de Google Sheets, sin sobrescribir datos de meses anteriores.
- **FR-004**: El sistema DEBE crear la hoja de un cliente automáticamente si no existe, con las cabeceras correctas.
- **FR-005**: El sistema DEBE generar y enviar un email de informe mensual al contacto de cada cliente activo que tenga email configurado.
- **FR-006**: El sistema DEBE continuar procesando el resto de clientes aunque uno de ellos falle, sin abortar la ejecución completa.
- **FR-007**: El sistema DEBE registrar qué clientes y fuentes fallaron en cada ejecución.
- **FR-008**: El sistema DEBE leer la lista de clientes y su configuración desde una hoja Google Sheets central, sin necesidad de modificar el sistema para añadir o quitar clientes.
- **FR-009**: El sistema DEBE omitir clientes marcados como inactivos en la hoja de configuración.
- **FR-010**: El sistema DEBE soportar que un cliente tenga configuradas solo un subconjunto de las fuentes disponibles (no todas son obligatorias).
- **FR-011**: El sistema DEBE notificar al gestor mediante email si algún cliente o fuente ha fallado durante la ejecución mensual.
- **FR-012**: El sistema DEBE evitar escribir filas duplicadas para el mismo cliente y el mismo mes. [NECESITA ACLARACIÓN: ¿cómo identificamos el período: por mes natural, por fecha de ejecución?]

### Entidades clave

- **Cliente**: unidad de reporte; tiene un nombre, una URL de sitio web, un conjunto de fuentes de datos configuradas (algunas opcionales), un email de contacto, un estado activo/inactivo y una referencia a su hoja de datos.
- **Fuente de datos**: cada herramienta de analítica vinculada a un cliente (tráfico web, posicionamiento orgánico, rendimiento técnico, analítica propia, SEO externo); las cinco fuentes del MVP son GA4, Google Search Console, PageSpeed Insights, Rybbit y Ubersuggest; tiene un identificador de propiedad o sitio dentro de esa herramienta y puede estar presente o ausente por cliente.
- **Registro mensual**: fila de métricas correspondiente a un cliente y un mes concreto; incluye los valores recogidos de cada fuente y la fecha del período cubierto.
- **Hoja maestra de clientes**: configuración central que lista todos los clientes con sus datos y estado; es la fuente de verdad para saber qué clientes procesar cada mes.
- **Plantilla de email**: estructura del informe mensual que se envía al cliente; contiene los campos de métricas a mostrar y el formato del mensaje. [NECESITA ACLARACIÓN: ¿la plantilla es fija o personalizable por cliente?]

---

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El tiempo dedicado a preparar los informes mensuales de todos los clientes activos pasa de 1-2h por cliente a menos de 5 minutos en total para toda la cartera.
- **SC-002**: El 100% de los clientes activos con email configurado recibe su informe el día 1 de cada mes sin intervención manual del gestor.
- **SC-003**: Los errores de transcripción en los informes se eliminan completamente; los datos del email coinciden exactamente con los registrados en Google Sheets.
- **SC-004**: El gestor puede incorporar un cliente nuevo al sistema en menos de 5 minutos (tiempo de alta en la hoja de configuración), sin conocimientos técnicos adicionales.
- **SC-005**: Con una cartera de 10 clientes, el proceso mensual completo termina en menos de 10 minutos. [NECESITA ACLARACIÓN: ¿hay un SLA de tiempo de ejecución esperado?]

---

## Suposiciones

- El gestor tiene acceso de propietario o editor a las propiedades de analítica de sus clientes en cada una de las fuentes (GA4, Search Console, etc.); el sistema no gestiona la solicitud de acceso.
- Las credenciales de acceso a las fuentes de datos se configuran una única vez durante el setup inicial; el sistema asume que son válidas y persistentes.
- Cada cliente tiene exactamente una hoja de Google Sheets donde se acumulan sus datos; el sistema no gestiona múltiples Sheets por cliente.
- La plantilla de email es la misma para todos los clientes en esta primera versión; la personalización por cliente queda fuera de alcance.
- El envío de emails se realiza desde la cuenta del gestor, no desde cuentas separadas por cliente.
- El sistema opera en español como idioma por defecto para los informes y notificaciones.
- Queda FUERA de alcance en esta feature: interfaz web de administración, gestión de accesos a herramientas de terceros, personalización de plantillas por cliente, soporte para fuentes de datos adicionales a las cinco definidas (GA4, Search Console, PageSpeed Insights, Rybbit, Ubersuggest), y exportación a formatos distintos de Google Sheets.
- El stack técnico acordado (Python 3.11+, uv como gestor de paquetes, Git, Claude Code con specify-cli) es el entorno de implementación definido para la fase de desarrollo; estos detalles corresponden al plan, no a la spec.

---

## Huecos pendientes de aclaración

Antes de cerrar la spec como lista para implementación, se necesita respuesta a:

1. **Período de métricas**: ¿el informe cubre el mes natural anterior (ej. agosto completo) o los últimos 30 días desde la fecha de ejecución?
2. **Plantilla de email**: ¿la estructura del email es fija o el gestor puede personalizarla por cliente en algún momento?
3. **Duplicados**: ¿cómo identificamos que ya existe un registro de ese mes para un cliente — por la fecha de la fila, por el nombre del mes, o por otra clave?
4. **SLA de ejecución**: ¿hay un tiempo máximo aceptable para que el proceso mensual termine con 10, 20 o 30 clientes?
5. **Rybbit**: ¿todos los clientes tienen Rybbit, o solo algunos? ¿Es siempre opcional?
6. **Ubersuggest**: ¿qué métricas concretas se incluyen en el informe mensual — Domain Score, tráfico orgánico estimado, número de keywords posicionadas, backlinks? ¿El acceso es a través de la cuenta de la agencia o de cuentas individuales por cliente?
