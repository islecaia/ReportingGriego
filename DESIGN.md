# DESIGN.md — ReportingGriego

> Guía de diseño para la aplicación de escritorio de automatización de informes mensuales SEO y mantenimiento web. Adaptada al lenguaje visual de la marca **elGriegoNET®** (elgriego.net).

---

## 1. Filosofía de diseño

ReportingGriego es una herramienta de uso interno, pero no tiene por qué parecerlo. La interfaz debe transmitir la misma energía y confianza que proyecta la marca elGriegoNET hacia sus clientes: **profesional, directa y visualmente poderosa**. Los datos ocupan el centro, pero la estética refuerza que quien usa esta herramienta trabaja a otro nivel.

**Tres principios que gobiernan cada decisión de diseño:**

- **Claridad ante todo.** Métricas, estados y alertas deben leerse de un vistazo, sin buscarlos. Si hay que pensar dónde está un dato, el diseño ha fallado.
- **Energía de marca.** El mismo rosa eléctrico y la misma audacia tipográfica de elgriego.net conviven con una estructura funcional pensada para datos. No son opuestos; se refuerzan.
- **Cero ambigüedad visual.** Un éxito, un fallo y una advertencia tienen colores distintos que nunca se confunden. Las celdas vacías no existen: si hay un cero, se ve el cero.

---

## 2. Paleta de colores

### 2.1 Colores base (fondos y superficies)

| Token                | Hex       | Uso                                                  |
|----------------------|-----------|------------------------------------------------------|
| `--bg-app`           | `#0F000A` | Fondo de la ventana principal (oscuro profundo, tono vinoso) |
| `--bg-panel`         | `#1A000F` | Paneles laterales, barras de navegación              |
| `--bg-card`          | `#240018` | Tarjetas de métricas, contenedores de sección        |
| `--bg-card-hover`    | `#2E001F` | Estado hover de tarjetas                             |
| `--bg-input`         | `#1A000F` | Fondos de campos de formulario                       |
| `--border-subtle`    | `#4A0035` | Bordes de separación, líneas divisoras               |
| `--border-strong`    | `#7A0058` | Bordes de elementos activos o enfocados              |

> **Referencia visual:** la misma oscuridad profunda con matiz carmesí/vinoso del footer de elgriego.net, que da presencia sin distraer de los datos.

### 2.2 Colores de marca (primarios)

| Token                | Hex       | Uso                                                  |
|----------------------|-----------|------------------------------------------------------|
| `--brand-primary`    | `#E91E8C` | Color de marca principal. Botones primarios, encabezados de sección, iconos activos |
| `--brand-primary-hover` | `#FF4DB8` | Hover/focus de elementos primarios                |
| `--brand-primary-dim` | `#7A1050` | Versión apagada para fondos de badges, estados de carga |
| `--brand-accent`     | `#FF9E00` | Acento secundario (ámbar/dorado). Llamadas a la acción secundarias, métricas destacadas, oportunidades SEO |
| `--brand-accent-hover` | `#FFB833` | Hover del acento secundario                        |

> **Referencia visual:** el rosa eléctrico es el color dominante de la marca en elgriego.net (botón "CONTACTO", logo, encabezados de sección). El ámbar/dorado corresponde al color que usa la web para destacar palabras clave como *"vender"*.

### 2.3 Colores semánticos (estados del sistema)

| Token              | Hex       | Uso                                                         |
|--------------------|-----------|-------------------------------------------------------------|
| `--status-success` | `#00C896` | Métricas correctas, fuentes conectadas, valores en target   |
| `--status-warning` | `#FF9E00` | Alertas menores, métricas que cayeron a cero por primera vez |
| `--status-error`   | `#FF3355` | Fuentes que fallaron tras 3 reintentos, incidencias críticas |
| `--status-info`    | `#3DB8FF` | Información contextual, tooltips, ayuda                     |
| `--status-neutral` | `#7A6A78` | Datos sin variación, estados neutros                        |

### 2.4 Colores de texto

| Token              | Hex       | Uso                                              |
|--------------------|-----------|--------------------------------------------------|
| `--text-primary`   | `#FFFFFF` | Texto principal, títulos, valores de métricas    |
| `--text-secondary` | `#C8A8BF` | Texto de apoyo, etiquetas de columna, subtítulos |
| `--text-muted`     | `#7A5A73` | Marcas de tiempo, metadata, texto deshabilitado  |
| `--text-on-brand`  | `#FFFFFF` | Texto sobre fondos de color de marca             |
| `--text-zero`      | `#4A3548` | El valor `0` explícito (visible pero no prominente) |

### 2.5 Degradados

```css
/* Degradado de marca — encabezado de la app, splash screen */
--gradient-brand: linear-gradient(135deg, #E91E8C 0%, #7B2FF7 100%);

/* Barra decorativa arcoíris — referencia directa al header de elgriego.net */
--gradient-rainbow: linear-gradient(
  90deg,
  #FF0054, #FF4500, #FFB800, #00C896, #3DB8FF, #7B2FF7, #E91E8C
);

/* Degradado de fondo de tarjeta — profundidad sutil */
--gradient-card: linear-gradient(160deg, #240018 0%, #1A000F 100%);
```

---

## 3. Tipografía

### 3.1 Familias tipográficas

**Titulares y branding — Bebas Neue**
Misma energía de la tipografía compacta y en mayúsculas del logo de elgriego.net. Reservada para títulos de pantalla, nombre de la app y métricas numéricas grandes.

```
font-family: 'Bebas Neue', 'Impact', sans-serif;
```

**Interfaz de usuario — Inter**
Limpia, neutral y altamente legible en pantallas a cualquier tamaño. Usada en todo el texto funcional: etiquetas, botones, párrafos, tablas.

```
font-family: 'Inter', 'Segoe UI', 'Helvetica Neue', sans-serif;
```

**Valores numéricos y datos — JetBrains Mono**
Monoespaciada para alinear cifras en columnas de datos. También para hashes, IDs y mensajes de log técnicos.

```
font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
```

### 3.2 Escala tipográfica

| Rol                        | Familia       | Tamaño   | Peso     | Uso                                           |
|----------------------------|---------------|----------|----------|-----------------------------------------------|
| App title                  | Bebas Neue    | 28 px    | 400      | Nombre de la app en la cabecera               |
| Screen heading             | Bebas Neue    | 22 px    | 400      | Título principal de cada pantalla/sección     |
| Section label              | Inter         | 11 px    | 700      | Etiquetas de grupo en mayúsculas y tracking amplio |
| Card title                 | Inter         | 15 px    | 600      | Títulos de tarjetas de métricas               |
| Body / label               | Inter         | 13 px    | 400      | Texto de interfaz general                     |
| Caption / timestamp        | Inter         | 11 px    | 400      | Fechas, metadata, ayuda contextual            |
| Metric value (large)       | Bebas Neue    | 36 px    | 400      | KPI principal visible en tarjetas grandes     |
| Metric value (table)       | JetBrains Mono | 13 px  | 500      | Valores numéricos en filas de tabla           |
| Button                     | Inter         | 13 px    | 700      | Etiquetas de botón, siempre en mayúsculas     |
| Badge / tag                | Inter         | 10 px    | 700      | Etiquetas de estado, badges de error/warning  |

### 3.3 Reglas tipográficas

- Los **section labels** van siempre en `MAYÚSCULAS` con `letter-spacing: 0.12em`. Ejemplos: `SITIOS ACTIVOS`, `OPORTUNIDADES SEO`, `FUENTES`.
- Los **títulos de pantalla** (Bebas Neue) no llevan punto final.
- Las cifras de métricas usan siempre `font-variant-numeric: tabular-nums` para que las columnas alineen perfectamente.
- El valor `0` explícito en métricas sin actividad se muestra con `--text-zero`: visible pero más apagado que un valor real, para que no compita visualmente con datos significativos pero tampoco desaparezca.

---

## 4. Iconografía

Usar **Phosphor Icons** (conjunto con variante "Duotone" para dar profundidad sobre fondos oscuros). Tamaño base: `20 px` en interfaz, `16 px` en tablas y listas compactas.

| Concepto                  | Icono sugerido              |
|---------------------------|-----------------------------|
| Sitio web                 | `globe`                     |
| Google Search Console     | `magnifying-glass-plus`     |
| PageSpeed / rendimiento   | `gauge`                     |
| Seguridad / Security Ninja| `shield-check`              |
| Palabras clave / SEO      | `trend-up`                  |
| Oportunidad SEO           | `lightning`                 |
| Error / fallo de fuente   | `warning-circle`            |
| Reintentar                | `arrows-clockwise`          |
| Captura de pantalla       | `camera`                    |
| Informe generado          | `check-circle`              |
| Notificación por email    | `envelope`                  |
| Histórico                 | `clock-clockwise`           |

Los iconos de estado se renderizan siempre con el color semántico correspondiente (`--status-success`, `--status-error`, etc.), nunca en gris neutro.

---

## 5. Componentes de interfaz

### 5.1 Botones

**Primario** — acción principal de la pantalla (generar informe, guardar configuración)
```
background:    var(--brand-primary)          /* #E91E8C */
color:         var(--text-on-brand)          /* #FFFFFF */
border:        none
border-radius: 8px
padding:       10px 24px
font:          Inter 700 13px, MAYÚSCULAS
letter-spacing: 0.08em
transition:    background 150ms ease
:hover         background: var(--brand-primary-hover)   /* #FF4DB8 */
:active        transform: scale(0.98)
:disabled      opacity: 0.4, cursor: not-allowed
```

**Secundario** — acciones de apoyo (previsualizar, exportar)
```
background:    transparent
color:         var(--brand-primary)
border:        1.5px solid var(--brand-primary)
border-radius: 8px
padding:       10px 24px
:hover         background: rgba(233, 30, 140, 0.1)
```

**Acento** — acciones de oportunidad/alerta (revisar oportunidades SEO, ver log)
```
background:    var(--brand-accent)           /* #FF9E00 */
color:         #0F000A
border-radius: 8px
padding:       10px 24px
font:          Inter 700 13px, MAYÚSCULAS
:hover         background: var(--brand-accent-hover)
```

**Destructivo / peligroso**
```
background:    transparent
color:         var(--status-error)
border:        1.5px solid var(--status-error)
border-radius: 8px
:hover         background: rgba(255, 51, 85, 0.1)
```

**Ghost / icono solo**
```
background:    transparent
color:         var(--text-secondary)
border:        none
padding:       8px
border-radius: 6px
:hover         background: rgba(255,255,255,0.06), color: var(--text-primary)
```

### 5.2 Tarjetas de métricas (KPI cards)

```
background:    var(--gradient-card)
border:        1px solid var(--border-subtle)
border-radius: 12px
padding:       20px 24px
```

Estructura interna de una KPI card:
```
┌─────────────────────────────────────┐
│  [icono 20px]  IMPRESIONES TOTALES  │  ← section label (muted)
│                                     │
│         128.450                     │  ← metric value (Bebas Neue 36px)
│                                     │
│  ▲ +12% vs mes anterior             │  ← variación (verde/rojo según signo)
│                                     │
│  ago 2026 · Google Search Console   │  ← caption (muted, 11px)
└─────────────────────────────────────┘
```

La variación porcentual lleva un triángulo (▲ verde / ▼ rojo) antes del número. Cuando no existe mes anterior, ese bloque no aparece (no se muestra "—" ni "N/A").

### 5.3 Tabla de registros históricos

```
background:    var(--bg-card)
border-radius: 10px
overflow:      hidden

  th  background: var(--bg-panel)
      color:      var(--text-secondary)
      font:       Inter 700 11px, MAYÚSCULAS, letter-spacing 0.1em
      padding:    10px 16px
      border-bottom: 1px solid var(--border-subtle)

  td  color:      var(--text-primary)
      font:       JetBrains Mono 13px
      padding:    10px 16px
      border-bottom: 1px solid var(--border-subtle)

  tr:hover  background: rgba(255,255,255,0.03)

  td[data-value="0"]  color: var(--text-zero)  /* 0 visible pero apagado */
```

Las filas con error de fuente llevan un indicador visual en el borde izquierdo de la fila (`border-left: 3px solid var(--status-error)`), nunca se ocultan.

### 5.4 Badges de estado

```
Tamaño: padding 2px 8px, border-radius 4px, font Inter 700 10px MAYÚSCULAS

CONECTADO   background: rgba(0,200,150,0.15)   color: #00C896
FALLIDO     background: rgba(255,51,85,0.15)    color: #FF3355
REINTENTANDO background: rgba(255,158,0,0.15)  color: #FF9E00
PENDIENTE   background: rgba(122,106,120,0.15)  color: #7A6A78
OPORTUNIDAD background: rgba(255,158,0,0.15)    color: #FF9E00
```

### 5.5 Alertas y banners inline

Usados para notificar fallos de fuente o métricas que caen a cero por primera vez. Aparecen en la parte superior de la sección afectada, no como modales.

```
border-radius: 8px
padding:       12px 16px
border-left:   4px solid [color semántico]
display:       flex, gap: 12px, align-items: flex-start

Error:    background rgba(255,51,85,0.10),    border #FF3355
Warning:  background rgba(255,158,0,0.10),    border #FF9E00
Info:     background rgba(61,184,255,0.10),   border #3DB8FF
```

### 5.6 Barra de progreso de generación de informe

Muestra el avance de recogida de datos fuente por fuente. Se usa el degradado de marca.

```
track:   background var(--border-subtle), border-radius 4px, height 6px
fill:    background var(--gradient-brand), border-radius 4px
         transition: width 300ms ease
```

### 5.7 Campos de entrada

```
background:    var(--bg-input)
border:        1.5px solid var(--border-subtle)
border-radius: 8px
padding:       10px 14px
color:         var(--text-primary)
font:          Inter 400 13px

:focus    border-color: var(--brand-primary)
          outline: none
          box-shadow: 0 0 0 3px rgba(233,30,140,0.18)

::placeholder  color: var(--text-muted)
```

---

## 6. Espaciado y layout

### 6.1 Escala de espaciado (base 4 px)

```
--space-1:   4px    separación mínima (entre icono y label)
--space-2:   8px    padding interno compacto
--space-3:   12px   padding de badges, espaciado entre elementos pequeños
--space-4:   16px   padding de filas de tabla, gap entre cards
--space-5:   20px   padding interno de tarjetas
--space-6:   24px   padding de secciones, gap principal
--space-8:   32px   separación entre bloques mayores
--space-10:  40px   separación entre secciones de pantalla
--space-12:  48px   margen de pantalla completa
```

### 6.2 Estructura de pantalla principal

```
┌──────────────────────────────────────────────────────────┐
│  CABECERA  │ [Logo/nombre]      [Sitio activo ▼] [Ajustes]│
├────────────┼─────────────────────────────────────────────┤
│            │                                             │
│  SIDEBAR   │   ÁREA DE CONTENIDO PRINCIPAL               │
│  (200px)   │   (flex, columnas adaptables)               │
│            │                                             │
│  Inicio    │   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│  Sitios    │   │ KPI  │ │ KPI  │ │ KPI  │ │ KPI  │     │
│  Informe   │   └──────┘ └──────┘ └──────┘ └──────┘     │
│  SEO       │                                             │
│  Seguridad │   ┌────────────────────────────────────┐   │
│  Config    │   │ Tabla histórico de registros        │   │
│            │   └────────────────────────────────────┘   │
│            │                                             │
│            │   ┌──────────────┐  ┌─────────────────┐   │
│            │   │ Oportunidades│  │ Rendimiento      │   │
│            │   │ SEO          │  │ PageSpeed        │   │
│            │   └──────────────┘  └─────────────────┘   │
└────────────┴─────────────────────────────────────────────┘
```

- **Sidebar**: fondo `--bg-panel`, ancho fijo 200 px, con la barra arcoíris (`--gradient-rainbow`) en el borde superior izquierdo de 3 px como detalle de marca.
- **Cabecera**: fondo `--bg-panel`, altura 52 px, borde inferior `--border-subtle`.
- **Contenido**: padding `--space-6` en todos los lados, gap entre secciones `--space-8`.
- **Cards KPI**: grid de 4 columnas en pantalla ancha, 2 en pantalla compacta.

### 6.3 Radio de esquinas

```
--radius-sm:  4px   badges, indicadores de fila
--radius-md:  8px   botones, inputs, alertas inline
--radius-lg:  12px  tarjetas KPI, paneles de sección
--radius-xl:  16px  modales, drawers
```

No se usan esquinas totalmente rectas (`0px`) ni totalmente píldora en elementos de datos, solo en badges de estado.

---

## 7. Tono de los textos

### 7.1 Personalidad verbal

ReportingGriego habla como lo haría un miembro experimentado del equipo de elGriegoNET: **directo, resuelto y sin rodeos**, pero nunca frío ni técnico por defecto. Los mensajes del sistema son concisos y accionables. Nunca hay jerga interna que el usuario tenga que descifrar.

### 7.2 Reglas de redacción

**Mensajes de acción (botones y CTAs)**
Verbo en infinitivo, mayúsculas, máximo tres palabras.
```
✓  GENERAR INFORME
✓  VER OPORTUNIDADES
✓  REINTENTAR
✗  "Haga clic aquí para generar su informe mensual"
```

**Mensajes de éxito**
Breves, afirmativos, sin exclamaciones.
```
✓  "Informe de agosto generado correctamente. 4 fuentes conectadas."
✗  "¡Enhorabuena! Su informe se ha generado con éxito."
```

**Mensajes de error**
Explican qué falló y qué pasa a continuación. Nunca culpan al usuario.
```
✓  "Google Search Console no respondió después de 3 intentos.
    Se ha notificado por email. El resto del informe continúa."
✗  "Error: API timeout"
```

**Mensajes de advertencia (métrica cae a cero)**
```
✓  "Los referidos de septiembre son 0. El mes anterior fueron 142.
    Revisa si hay algún cambio reciente en las fuentes de referido."
```

**Etiquetas de columna y sección**
Siempre en mayúsculas y breves. Sin abreviaciones crípticas.
```
✓  IMPRESIONES / CLICS / POSICIÓN MEDIA / RENDIMIENTO MÓVIL
✗  IMP / CLK / POS_AVG / MOB_PERF
```

**Estados vacíos (pantallas sin datos)**
Proactivos: explican por qué no hay datos y qué hacer.
```
✓  "Aún no hay registros para este sitio.
    Genera el primer informe mensual para empezar el histórico."
✗  "Sin datos"
```

**Tooltips y ayuda contextual**
Una oración. Empiezan por verbo en tercera persona o sustantivo.
```
✓  "Palabras clave con ≥50 búsquedas/mes fuera del top 3."
✓  "Puntuación de 0 a 100. Por debajo de 50, rendimiento crítico."
```

### 7.3 Tono en función del contexto

| Contexto             | Tono                           | Ejemplo                                      |
|----------------------|--------------------------------|----------------------------------------------|
| Onboarding / setup   | Cercano, guiado paso a paso    | "Añade tu primer sitio para empezar."        |
| Informe en progreso  | Neutro, informativo            | "Recogiendo datos de PageSpeed… (2/5)"       |
| Éxito completo       | Resuelto, sin aspavientos      | "Informe listo. Todas las fuentes OK."       |
| Error parcial        | Claro, sin alarmar en exceso   | "1 fuente falló. El resto del informe está completo." |
| Error crítico        | Directo, con siguiente paso    | "No se pudo generar el informe. Revisa las credenciales de API." |
| Oportunidad SEO      | Proactivo, orientado a acción  | "12 palabras clave listas para trabajar."    |

---

## 8. Animaciones y micro-interacciones

Las animaciones refuerzan el feedback sin distraer del trabajo.

```
Duración estándar:   150ms  (hover, focus)
Duración media:      250ms  (aparición de cards, cambio de sección)
Duración lenta:      400ms  (apertura de modal, carga de informe)

Easing estándar:     ease   (la mayoría de transiciones)
Easing de entrada:   ease-out (elementos que aparecen en pantalla)
Easing de salida:    ease-in  (elementos que desaparecen)
```

Comportamientos concretos:
- Las **barras de progreso** de la generación de informe avanzan de forma continua, no en saltos.
- Los **badges de estado** cambian de color con `transition: background 250ms ease`.
- Las **filas de tabla** nuevas que se añaden al histórico hacen un breve `fade-in` + `slide-down` de 300ms.
- Los **iconos de reintento** giran con `animation: spin 1s linear infinite` mientras la fuente está reintentando.
- La **barra arcoíris** decorativa no anima: es estática.

---

## 9. Accesibilidad

- Contraste mínimo de texto: **4.5:1** para texto de interfaz, **3:1** para texto grande (Bebas Neue > 18px).
- El color nunca es el único canal de información: los estados de error/éxito llevan siempre icono + texto además del color.
- El valor `0` explícito no puede confundirse con una celda vacía: se renderiza con `--text-zero` en lugar de dejarse en blanco.
- Todos los elementos interactivos tienen un estado `:focus-visible` con el anillo de marca (`box-shadow: 0 0 0 3px rgba(233,30,140,0.35)`).
- Las fuentes mínimas nunca bajan de **11px** en el sistema.

---

## 10. Referencia rápida de tokens (CSS custom properties)

```css
:root {
  /* Fondos */
  --bg-app:           #0F000A;
  --bg-panel:         #1A000F;
  --bg-card:          #240018;
  --bg-card-hover:    #2E001F;
  --bg-input:         #1A000F;

  /* Bordes */
  --border-subtle:    #4A0035;
  --border-strong:    #7A0058;

  /* Marca */
  --brand-primary:    #E91E8C;
  --brand-primary-hover: #FF4DB8;
  --brand-primary-dim:   #7A1050;
  --brand-accent:     #FF9E00;
  --brand-accent-hover:  #FFB833;

  /* Estados */
  --status-success:   #00C896;
  --status-warning:   #FF9E00;
  --status-error:     #FF3355;
  --status-info:      #3DB8FF;
  --status-neutral:   #7A6A78;

  /* Texto */
  --text-primary:     #FFFFFF;
  --text-secondary:   #C8A8BF;
  --text-muted:       #7A5A73;
  --text-on-brand:    #FFFFFF;
  --text-zero:        #4A3548;

  /* Degradados */
  --gradient-brand:   linear-gradient(135deg, #E91E8C 0%, #7B2FF7 100%);
  --gradient-rainbow: linear-gradient(90deg, #FF0054, #FF4500, #FFB800, #00C896, #3DB8FF, #7B2FF7, #E91E8C);
  --gradient-card:    linear-gradient(160deg, #240018 0%, #1A000F 100%);

  /* Radios */
  --radius-sm:  4px;
  --radius-md:  8px;
  --radius-lg:  12px;
  --radius-xl:  16px;

  /* Espaciado */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Tipografía */
  --font-display:  'Bebas Neue', 'Impact', sans-serif;
  --font-ui:       'Inter', 'Segoe UI', 'Helvetica Neue', sans-serif;
  --font-mono:     'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
}
```

---

*Versión 1.0 — agosto 2026 — ReportingGriego / elGriegoNET®*
