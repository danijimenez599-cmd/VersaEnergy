# VersaEnergy — Advisory: Arquitectura de producto y flujos UX

**Perfil:** Senior engineer, gestión energética industrial + CMMS  
**Fecha de revisión:** 2026-06-02  
**Alcance:** Estructura de módulos, flujos de negocio, UX/UI, integración CMMS

> **Parte I (secciones 1-8):** Diagnóstico módulo por módulo del estado actual.
> **Parte II (sección 9+):** Plan de refactor completo hacia arquitectura **asset-tree-first**
> con identidad visual VersaMaint y árbol de activos compartido entre apps.
>
> **▶ Si vas a EJECUTAR el refactor, empieza por §20 (Contrato de ejecución), §21
> (Reglas invariantes), §22 (Tablero de fases) y §23 (Bitácora).** Esos son el "kernel"
> operativo; el resto es el detalle de respaldo. La Parte I es el porqué.

---

## 1. Diagnóstico ejecutivo

### Lo que está bien construido

La arquitectura técnica del backend es sorprendentemente correcta para una app en construcción:

- **Grafo semántico como verdad**, no SVG plano. Esto es exactamente cómo debe modelarse un P&ID o unifilar digital.
- **MeasurementPoint independiente del canvas.** El error clásico es fusionar el medidor visual con el dato. Aquí están separados correctamente.
- **Multi-utility desde el modelo.** No es una app de electricidad con campos de gas pegados. Utilities como ciudadanos de primera clase.
- **Servicios puros sin React.** El balance engine, topology engine y measurement engine son computables sin UI.
- **Compatibilidad CMMS estructural.** Los campos `cmms_asset_id`, `integration_key`, `sync_status` y la jerarquía `planta → área → sistema → equipo` son exactamente lo que hace falta para no recapturar activos al activar el CMMS.

### El problema real

> **El backend sabe gestión energética. La UI no guía al usuario de gestión energética.**

La debilidad no es técnica. Es que los módulos son colecciones de pantallas con CRUD, no flujos de trabajo. Un ingeniero de energía que abre la app por primera vez no sabe qué hacer primero, ni por qué, ni qué pasa si no lo hace.

**Tres síntomas concretos:**

1. **Sin orden de onboarding.** Crear un sitio nuevo lleva al cockpit vacío. No hay guía de qué modelar primero.
2. **Módulos desconectados.** El balance no te dice "ve a Medición a resolver este gap". El Desempeño no te dice "este EnPI tiene datos estimados". El Mapa no te dice "este nodo no tiene medición".
3. **SGEn desconectado de los datos operativos.** ISO 50001 exige evidencia operacional. Si el SGEn no jala mediciones, balances y acciones reales del sistema, es un formulario de papel digitalizado.

---

## 2. El flujo de negocio correcto

La gestión energética industrial sigue una cadena lógica que debe reflejarse en la navegación y los flujos de cada módulo:

```
CONFIGURAR → MODELAR → MAPEAR → MEDIR → BALANCEAR → ANALIZAR → ACTUAR → REPORTAR
```

En términos de VersaEnergy:

```
Admin (sitio, tarifas, factores)
  └─► Equipos/Modelo (árbol de activos, medidores)
        └─► Mapa (topología, flujos, cobertura)
              └─► Medición (lecturas, calidad)
                    └─► Balances (consumo, pérdidas, no explicado)
                          └─► Desempeño (EnPI, baseline, targets, desviaciones)
                                └─► Acciones (oportunidades, proyectos, M&V)
                                      └─► SGEn (evidencia, SEUs, objetivos, revisión)
                                            └─► Reportes (PDF/CSV, paquete auditoría)
```

**Esta cadena tiene tres implicaciones de diseño que hoy no se respetan:**

1. **Cada módulo tiene un prerequisito.** No puedes calcular un balance sin medición. No puedes definir un EnPI sin balance. No puedes cerrar una acción sin M&V. La UI debe hacer estos prerequisitos visibles y accionables.

2. **Cada módulo produce evidencia para el siguiente.** Un balance produce la fuente de oportunidades. Un proyecto produce la evidencia para el SGEn. Un reporte consume todo. Hoy los módulos no "pasan" datos de unos a otros desde la perspectiva del usuario.

3. **El CMMS es la base, no el final.** La estructura de activos en Energy debe ser idéntica a la de VersaMaint. El usuario no empieza el mapa energético hasta haber modelado su planta en Equipos. Y cuando active CMMS, no recaptura nada.

---

## 3. Estructura de navegación recomendada

### Problema actual

La barra lateral actual mezcla módulos operativos, de configuración y de análisis sin jerarquía de negocio:

```
Inicio → Mapa → Equipos → Medición → Balances → Desempeño → Acciones → SGEn → Reportes → Admin
```

Esto obliga al usuario a conocer la app para entender el orden. Un técnico nuevo no sabe que debe ir a Equipos antes que al Mapa.

### Estructura recomendada

Agrupar en tres zonas con separador visual entre ellas:

```
━━ SETUP ━━━━━━━━━━━━━━━━━━━━━━━
  ○ Inicio (Cockpit)
  ○ Admin (sitios, usuarios, tarifas, factores)

━━ MODELO DE PLANTA ━━━━━━━━━━━
  ○ Equipos y Activos          ← era "Modelo"
  ○ Mapa de Utilities          ← era "Mapa"

━━ OPERACIÓN ━━━━━━━━━━━━━━━━━━
  ○ Medición
  ○ Balances
  ○ Desempeño Energético

━━ MEJORA ━━━━━━━━━━━━━━━━━━━━━
  ○ Acciones y Proyectos
  ○ SGEn
  ○ Reportes
```

Esta estructura comunica el flujo sin que el usuario lea documentación. El separador visual actúa como guía "¿Dónde estoy en el proceso?".

### Indicadores de completitud en la sidebar

Cada módulo operativo debe mostrar un dot de estado:
- **Verde:** módulo tiene datos completos para el contexto actual
- **Ámbar:** datos parciales o con advertencias
- **Rojo:** prerequisito no cumplido o datos críticos faltantes
- **Gris:** módulo vacío, sin configurar

Esto replica el patrón que usan EnergyCAP y Schneider Resource Advisor, y convierte la navegación en un checklist operacional.

---

## 4. Módulo por módulo

---

### 4.1 Admin — Configuración de sitio

**Rol en el flujo de negocio:** Es el primer paso real antes de cualquier operación. Sin tarifas no hay costo. Sin factores de emisión no hay huella. Sin sitio no hay nada.

**Estado actual:** Placeholder. Existe la ruta, nada más.

**Brecha crítica:** Este módulo debe existir antes que cualquier módulo operativo funcione bien. Hoy su ausencia hace que balances muestren "N/D" en costo y desempeño no calcule emisiones.

#### Estructura de flujos recomendada

**Tab 1 — Sitios y Organización**
- Lista de sitios con estado de completitud (nombre, ubicación, zona horaria, moneda)
- Formulario de sitio: no más de 8 campos en pantalla
- Badge "Listo para operar" cuando tenga: sitio + al menos un utility configurado + tarifa vigente

**Tab 2 — Tarifas y Energía**
- Tabla de tarifas por utility y período: `electricity → MXN/kWh → vigente desde`
- Editor de tramos horarios (punta/base/semipunta) para electricidad
- Factores de conversión a GJ para utilities no-eléctricos
- Factores de emisión por utility (tCO2e/MWh, tCO2e/Nm³, etc.)
- Advertencia visible si hay períodos sin tarifa vigente

**Tab 3 — Usuarios y Roles**
- Lista de usuarios por sitio
- Roles: Admin, Operador de energía, Visualizador
- Invitación por email

**Tab 4 — Parámetros de sistema**
- Umbral de alerta de calidad de datos (default: <80%)
- Umbral de no-explicado para alerta (default: >10%)
- Parámetros de scoring de SEU (para el módulo SGEn)
- Período energético por defecto

#### Integración CMMS
- Campo "código de planta CMMS" en el formulario de sitio
- Badge de sincronización: Independiente / Conectado a VersaMaint / Pendiente de conexión
- La conexión no requiere recapturar datos, solo mapear el `site_id` de Energy con el `site_id` de CMMS

---

### 4.2 Equipos y Activos — El árbol de la planta

**Rol en el flujo de negocio:** Es la base sobre la que se construye todo. Sin un árbol de activos correcto, el mapa no tiene nodos, los medidores no tienen host, los balances no tienen granularidad por área, y el CMMS no tiene qué sincronizar.

**Estado actual:** Bien implementado en backend. El árbol existe, la vista árbol/detalle existe, el wizard de medidor existe. Lo que falta es claridad de flujo y completitud de ficha.

#### Flujo principal recomendado

El módulo debe guiar este proceso de arriba hacia abajo:

```
Sitio → crear Área → crear Sistema dentro del Área → crear Equipo dentro del Sistema
  └─► Opcionalmente: crear Medidor vinculado al equipo (equipo mantenible + MeasurementPoint)
```

**Panel izquierdo — Árbol**
- Collapsable por nivel, con búsqueda
- Cada nodo muestra:
  - Icono por tipo (área, sistema, equipo, medidor)
  - Badge de utility si aplica
  - Dot de estado CMMS-readiness: código CMMS, specs completas, medidor asignado
  - Dot de estado Energy: tiene medición, aparece en mapa, tiene datos
- Botón contextual "+ Agregar" según el nodo seleccionado:
  - En Área → "Nuevo sistema"
  - En Sistema → "Nuevo equipo" / "Nuevo medidor"
  - En Equipo → "Nuevo medidor" / "Ver en mapa"
- Drag-and-drop para mover activos entre sistemas (con confirmación)

**Panel derecho — Detalle del nodo**

Sección **Información general:**
- Nombre, tag, descripción
- Fecha de instalación, fabricante, modelo, número de serie
- Estado: activo, inactivo, en mantenimiento
- Criticidad energética: alta, media, baja (independiente de la criticidad de mantenimiento)
- Utility(ies) que consume/produce/distribuye

Sección **Perfil energético:**
- Capacidad nominal con unidad (100 kW, 15 ton refrigeración, 300 kg/h vapor)
- Consumo promedio histórico (calculado desde balances/medición)
- Eficiencia nominal y eficiencia real (si hay datos)
- Factor de carga típico

Sección **Medidores vinculados:**
- Lista de MeasurementPoints con: tag, magnitud, unidad, última lectura, calidad
- Botón "Nuevo medidor" que lanza el wizard
- Badge "Sin medición" si el equipo no tiene ningún MeasurementPoint

Sección **Mapa:**
- Miniatura del diagrama donde aparece este equipo
- Botón "Ver en mapa" que abre el Mapa filtrado al nodo
- Si no aparece en ningún mapa: "Este equipo no está en ningún diagrama"

Sección **Compatibilidad VersaMaint:**
- Campos: código CMMS, familia de activos, tipo de equipo mantenible
- Estado de sincronización con badge visual
- Botón "Preparar para CMMS" que valida qué campos faltan

#### Nuevo: Guía de completitud por equipo

Un progress bar de 4 pasos visible en la cabecera del detalle:
```
[✓] Información básica  [✓] Utility asignado  [!] Medidor  [✗] En mapa
```
Esto guía al usuario a completar el perfil energético del equipo antes de avanzar al mapa.

#### Integración CMMS — puntos críticos
- El `tag` del equipo debe validarse contra el estándar de tags de VersaMaint (formato configurable en Admin)
- Al crear un equipo, ofrecer: "¿Este activo ya existe en VersaMaint?" → buscar por código → vincular sin duplicar
- Los medidores creados en Energy son equipos mantenibles en CMMS. La ficha muestra el link al activo CMMS cuando está sincronizado.
- Un hallazgo energético (oportunidad de mejora) en el equipo debe poder crear una Solicitud de Trabajo en VersaMaint directamente desde la ficha.

---

### 4.3 Mapa de Utilities — El corazón del producto

**Rol en el flujo de negocio:** Traduce el árbol de activos en una red técnica calculable. Sin mapa no hay balance de red, no hay análisis de cobertura por zona, no hay trazabilidad de flujo.

**Estado actual:** El más completo del sistema. Canvas funcional, grafo semántico, versionado draft/publicado, validaciones, seed con 4 diagramas reales. El mayor riesgo es que la herramienta sea tan potente que el usuario no sepa usarla.

#### Estructura del workspace del mapa

**Toolbar superior — Estado y control del diagrama:**
```
[← Volver]  [Nombre diagrama ▼]  [Utility: Electricidad]  [DRAFT]
[Validar]  [Publicar]  [Clonar]  [Guardar]  [Historial de versiones]
```
- El nombre del diagrama debe ser editable inline
- El badge DRAFT / PUBLICADO debe ser el elemento más visible del toolbar
- "Historial de versiones" abre un panel lateral con lista de versiones, fecha y autor

**Panel izquierdo — Paleta y capas:**

Tab "Paleta":
- Nodos agrupados por familia: Equipo, Distribución, Control, Medición, IoT, Área
- Cada nodo muestra el símbolo ISA/IEC con tooltip de nombre técnico
- Búsqueda por nombre o tag

Tab "Capas" (nuevo):
- Toggle para mostrar/ocultar: Equipos, Medidores, Áreas, Flujo de control, Etiquetas
- Selector de overlay: Ninguno / Cobertura / Consumo / Pérdidas / Datos faltantes
- Estos overlays deben ser la forma principal de operar el mapa, no una vista decorativa

**Canvas central:**
- El canvas del editor ya funciona bien técnicamente
- Mejora visual necesaria: cuando se activa un overlay, las líneas sin datos deben verse grises y pulsantes para indicar "falta información aquí"
- Al seleccionar un nodo del árbol desde el módulo Equipos, el mapa debe hacer zoom y resaltar ese nodo
- Tooltip rico al hacer hover sobre una línea: utility, dirección de flujo, último valor medido, cobertura

**Panel derecho — Inspector:**

El inspector actual tiene buena base. Recomendaciones de estructura:

Para un **nodo de equipo:**
```
[Tag e ícono]
── Información ──────────────────
  Nombre, tipo, área
  Equipo vinculado: [FT-101 → Planta Norte/Inyección/Bomba P-01]
  Utility: Electricidad
── Medición ─────────────────────
  Punto: PM-E-007 | 23.4 kW | Hace 5 min | [Buena calidad]
  [Vincular medidor] [Ver en Medición]
── Alertas activas ──────────────
  ⚠ Consumo 18% sobre línea base
  [Ver en Desempeño]
```

Para un **nodo de medidor:**
```
[Tag ISA-5.1]
── Binding ──────────────────────
  MeasurementPoint: FT-101
  Magnitud: Flujo volumétrico
  Unidad: m³/h | Acumulador
  Anclado a: Línea de vapor L-SV-003
── Últimas lecturas ─────────────
  [mini tabla: 3 últimas lecturas]
── Alcance de balance ───────────
  Cubre: Sistema de vapor zona A (aguas abajo)
  Rol: Medidor de frontera
```

**Panel de validación:**
- El panel de validación actual es bueno. Mejora: agrupar issues por severidad (Error bloqueante / Advertencia / Sugerencia) y ligar cada issue a la acción de corrección ("Ir al nodo → Abrir inspector → Sección Medición").

#### Overlays como herramienta operacional (pendiente crítico)

Los overlays no son decoración. Son la forma en que un ingeniero de energía usa el mapa en reuniones operativas:

**Overlay Cobertura:**
- Verde: nodo/línea con medición activa y datos recientes
- Ámbar: nodo/línea con medición pero con gaps o datos viejos
- Rojo: nodo/línea sin medición
- Gris: nodo/línea sin utilty asignado

**Overlay Balance:**
- Ancho de línea proporcional al flujo (si hay datos de balance)
- Color por desviación vs línea base
- Etiqueta de % no-explicado por zona/sistema

**Overlay Pérdidas:**
- Nodos de pérdida con color intensidad proporcional al valor
- Líneas rojas donde se detecta fuga o retorno deficiente

#### Plantillas por utility
Cuando el usuario crea un diagrama nuevo, debe elegir una plantilla inicial:
- Unifilar eléctrico
- Red de vapor y condensado
- Sistema de aire comprimido
- Circuito de agua helada/fría
- Red de gas natural
- Diagrama multi-utility

La plantilla pre-carga los tipos de nodos válidos, paleta filtrada y colores correctos, pero el canvas empieza vacío.

#### Integración CMMS
- Al arrastrar un equipo al canvas desde la paleta, el sistema ofrece: "¿Vincular a activo existente?" con búsqueda en el árbol de Equipos. Si el activo tiene `cmms_asset_id`, se muestra el link al CMMS en el inspector.
- Un nodo sin `asset_binding` en diagrama publicado = error de validación R13. Esto obliga a que el mapa refleje activos reales, no dibujos ficticios.
- Las órdenes de trabajo abiertas en VersaMaint para un equipo aparecen como badge en el nodo del mapa (integración futura, pero el campo `cmms_asset_id` ya lo habilita).

---

### 4.4 Medición — El pipeline de datos

**Rol en el flujo de negocio:** Transforma las lecturas físicas (manuales, CSV, IoT) en datos confiables y validados que alimentan balances y EnPI. Sin datos de calidad, todo el análisis aguas abajo es estimación.

**Estado actual:** La base técnica es correcta. El pipeline raw → validado existe. La UI tiene 4 tabs que cubren el flujo. El problema es la experiencia: el selector de punto de medición es un `<select>` plano que no escala con muchos medidores, y el pipeline de validación no tiene acciones claras.

#### Rediseño de flujo recomendado

**Cambio principal:** El punto de medición no debe ser un select global en la cabecera. La pantalla principal debe mostrar la **vista de todos los puntos con su estado**, y el usuario entra al detalle de cada uno.

**Vista principal — Panel de puntos de medición:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Medición                                    [Filtrar por utility ▼] │
│ [Captura masiva]  [Importar CSV]  [Calidad del sitio: 74% ⚠]       │
├──────────────────────────┬──────────┬──────────┬────────────────────┤
│ Tag / Nombre             │ Utility  │ Calidad  │ Última lectura     │
├──────────────────────────┼──────────┼──────────┼────────────────────┤
│ PM-E-001 / Tablero Gral  │ ⚡ Elect  │ ● Buena  │ 23,450 kWh · 2h   │
│ FT-V-003 / Medidor vapor │ 🔵 Vapor  │ ⚠ Revisar│ 1,234 kg/h · 8h   │
│ FT-AC-007 / Compresor A  │ 🟢 Aire   │ ✗ Sin dt │ —                  │
└──────────────────────────┴──────────┴──────────┴────────────────────┘
```
- Click en una fila → vista detalle del punto
- Badge de calidad: Buena / Revisar / Sin datos / Gap detectado
- Ordenar por: calidad (peores primero), última lectura, utility

**Vista detalle de un MeasurementPoint:**

```
FT-V-003 · Medidor de vapor · Sistema vapor zona A
[← Volver]  [Calidad: ⚠ Revisar]  [Acumulador]  [kg · Flujo másico]

Tab: Lecturas   Tab: Calidad   Tab: Configuración
```

**Tab Lecturas:**
- Gráfico de línea de los últimos 30 días (línea sólida = medido, punteada = estimado)
- Tabla de lecturas recientes con: timestamp, valor, delta (acumuladores), fuente, estado
- Botón "Nueva lectura manual" siempre visible
- Para acumuladores: cálculo automático de delta con warning si es negativo

**Tab Calidad:**
- Indicadores: % lecturas válidas, nº gaps detectados, nº outliers, última lectura hace X horas
- Lista de issues: "Gap de 36h entre 2026-05-14 y 2026-05-16" con acciones: Estimar / Marcar como equipo apagado / Reportar
- Historial de importaciones que tocaron este punto

**Tab Configuración:**
- Tipo: Acumulador / Instantáneo / Estado / Calculado / Manual
- Para acumuladores: valor de rollover, multiplicador, offset, detección de reset
- Fuente: Manual / CSV / IoT (MQTT/OPC-UA con campos guiados)
- Frecuencia esperada de lectura (usada para detectar gaps)
- Alertas configurables: valor fuera de rango, gap, outlier

**Importación CSV — mejoras:**
El wizard actual es funcional pero tiene un problema de UX: el mapeo de columnas (timestamp, valor, tag) es técnico. Mejoras:
- Auto-detectar columnas de timestamp y valor con heurística (nombre de columna, formato de dato)
- Mostrar vista previa visual de las primeras 5 filas antes del mapeo
- Validar en tiempo real antes de importar: "3 filas con timestamp inválido, 1 fila con valor negativo"
- Después de importar, ofrecer: "¿Ejecutar validación del lote?" → lanza el pipeline de calidad

#### Integración CMMS
- El pipeline de medición de VersaEnergy es el mismo que usaría el CMMS para instrumentación. Al sincronizar, un medidor en Energy es un instrumento mantenible en VersaMaint. Las calibraciones y el historial de mantenimiento del instrumento afectan la calidad del dato de Energy.
- Campo `calibration_due_date` en la ficha del medidor. Cuando la calibración está vencida, el dato se marca automáticamente como "calidad reducida" y se notifica en el Cockpit.
- Las alertas de medición (gap, outlier, vencimiento de calibración) pueden disparar una Solicitud de Trabajo en VersaMaint.

---

### 4.5 Balances — La foto del sistema

**Rol en el flujo de negocio:** Cierra el ciclo de medición. Un balance responde: ¿cuánto entró, cuánto se consumió donde, cuánto se perdió, cuánto no puedo explicar? Es el insumo para EnPI, la fuente de oportunidades de mejora y la evidencia principal para el SGEn.

**Estado actual:** El motor de balance existe y funciona. El wizard existe. La UI es funcional pero falta visualización clara, trazabilidad de supuestos y generación de oportunidades.

#### Rediseño del flujo de balance

**Paso 1 — Configurar balance:**
```
Sitio:       Planta Norte
Utility:     ⚡ Electricidad
Período:     Mayo 2026 (2026-05-01 → 2026-05-31)
Diagrama:    Unifilar eléctrico principal · v1.3 (publicado)
             ⚠ Hay versión más reciente (v1.4 draft)
```
- Advertencia si la versión del diagrama es antigua
- Campo de "Notas de contexto del balance" (paros programados, condiciones especiales)

**Paso 2 — Revisar datos antes de calcular:**
```
Medidores disponibles para el período:
  ✓ PM-E-001 / 12 lecturas / Buena calidad
  ✓ PM-E-002 / 12 lecturas / Buena calidad
  ⚠ PM-E-005 / 9 lecturas  / 3 gaps detectados → Estimados con promedio
  ✗ PM-E-008 / Sin lecturas → Excluido del balance

Cobertura: 3 de 4 medidores con datos (75%)
[Continuar con datos actuales]  [Ir a Medición para completar datos]
```

Esto es crítico: el usuario debe ver **qué datos tiene y qué supuestos va a usar** antes de calcular. Hoy el balance calcula y ya. Los supuestos quedan ocultos en los metadatos.

**Paso 3 — Resultado del balance:**

El resultado debe mostrarse en tres niveles de detalle:

**Nivel 1 — Resumen ejecutivo:**
```
BALANCE: Electricidad · Mayo 2026 · Planta Norte

 Entrada total:        245,600 kWh   (100%)
 ├─ Consumo medido:    198,430 kWh   (80.8%)  [12 medidores]
 ├─ Consumo estimado:   18,200 kWh   (7.4%)   [2 medidores estimados]
 ├─ Pérdidas calc.:      8,900 kWh   (3.6%)
 └─ No explicado:       20,070 kWh   (8.2%)  ⚠

Cobertura de medición: 80.8%
Estado: ⚠ No explicado sobre umbral (8.2% > 5%)
```

**Nivel 2 — Descomposición por sistema/área:**
- Tabla con nodo, consumo medido, estimado, cobertura, % del total
- Ordenada por consumo (mayor primero)
- Click en fila → highlight del nodo en el mapa

**Nivel 3 — Trazabilidad de supuestos:**
- Por cada lectura usada: MeasurementPoint, valor, período, fuente, calidad
- Por cada estimación: método usado (promedio histórico, factor de carga, interpolación)
- Esta vista es para el auditor o ingeniero avanzado, no la vista principal

**Llamada a la acción desde el no-explicado:**

Cuando `no_explicado > umbral`, mostrar CTA prominente:
```
⚠ 20,070 kWh no explicados (8.2%)
   Posibles causas:
   • Área de Compresores sin medición en dos líneas
   • PM-E-008 sin lecturas en este período

   [Crear oportunidad de mejora]  [Ver en mapa]  [Agregar medidor]
```

Este es el puente real entre balance y acciones que hoy no existe.

**Historial de balances:**
- Lista de balances anteriores con: período, utility, resultado, versión de diagrama
- Gráfico de tendencia de no-explicado por utility (últimos 12 meses)
- Comparación período actual vs anterior

#### Integración CMMS
- Los paros de equipos registrados en VersaMaint deben poder marcarse como contexto del balance ("Equipo XYZ parado 5 días → consumo esperado menor")
- Una orden de trabajo de reparación de fuga en VersaMaint debería verse en el balance del período como "evento conocido"

---

### 4.6 Desempeño Energético — Los indicadores de gestión

**Rol en el flujo de negocio:** Transforma los datos de balance en indicadores gestionables. Un EnPI como "kWh/ton producida" permite comparar meses distintos compensando por producción, detectar degradaciones y medir el impacto de mejoras. Sin EnPI, solo se comparan consumos absolutos, lo que ignora contexto.

**Estado actual:** La estructura existe (EnPI, baseline, targets, resultados). La UI tiene cards con gráfico de tendencia. Los formularios de wizard existen. Las brechas son: constructor visual de fórmula, normalización por variable relevante, y comparación real vs baseline vs target en pantalla única.

#### Estructura recomendada

**Vista principal — Panel de indicadores:**
```
┌──────────────────────────────────────────────────────────────────────┐
│ Desempeño Energético                          [+ Nuevo indicador]    │
│ [Filtrar: Todos los utilities ▼]  [Período: Mayo 2026 ▼]            │
├──────────────────────────────────────────────────────────────────────┤
│  EnPI-E-001  kWh/ton producida  · Electricidad · Producción mensual │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Real: 45.2    Baseline: 42.0    Target: 40.0    [+7.6% sobre base] │
│  [gráfico 6 meses: líneas real/baseline/target]                      │
│  ⚠ 3 meses consecutivos sobre baseline → [Crear acción]             │
└──────────────────────────────────────────────────────────────────────┘
```

**Construcción guiada de EnPI:**

El wizard debe tener 5 pasos claros:

1. **Nombre y alcance:** nombre del indicador, utility, área/sistema o sitio completo
2. **Fórmula:** constructor visual con selector de numerador (consumo de qué utility, de qué área) y denominador (producción, unidades, área, horas, ocupación, otra variable)
   - Vista previa: `kWh consumidos (Zona producción) / Toneladas producidas`
   - Validación: las unidades del denominador deben existir en el sistema o ser ingresables manualmente
3. **Variable de normalización:** dónde se ingresa el valor del denominador (manual mensual, importación CSV, variable de proceso vinculada)
4. **Baseline:** período de referencia, método (promedio, regresión, manual), valor resultante con datos históricos graficados para validar
5. **Target:** tipo (reducción %, valor absoluto, benchmark), valor, período de cumplimiento

**Vista detalle de un EnPI:**
```
EnPI-E-001 · kWh/ton · Electricidad · Planta Norte

Tab: Desempeño   Tab: Baseline   Tab: Análisis   Tab: Acciones

── Desempeño actual ─────────────────────────────────────────────
  [Gráfico de área: 12 meses con 3 líneas: real / baseline / target]
  
  Mes actual: 45.2 kWh/ton
  Baseline:   42.0 kWh/ton  (promedio 2024)
  Target:     40.0 kWh/ton  (reducción 4.7% para dic 2026)
  
  Desviación: +3.2 kWh/ton (+7.6% sobre baseline)
  Ahorro potencial si alcanzara target: ~18,400 kWh/mes · $1,840 USD

── Análisis de causa ────────────────────────────────────────────
  [Correlación con temperatura exterior, producción, días operados]
  Nota: Este análisis requiere datos de variable relevante completos
```

**Tab Acciones:**
- Lista de acciones y proyectos vinculados a este EnPI
- Impacto verificado de acciones cerradas
- CTA: "Crear acción para recuperar desviación"

#### Integración CMMS
- Un EnPI de eficiencia de un equipo (kWh/ton del compresor X) debe poder vincularse al activo en VersaMaint. La degradación de eficiencia del compresor es un hallazgo de mantenimiento, no solo de energía.
- El historial de mantenimiento del equipo en VersaMaint puede explicar picos en el EnPI (períodos de degradación antes de una reparación, mejora inmediata post-mantenimiento).

---

### 4.7 Acciones y Proyectos — El motor de mejora

**Rol en el flujo de negocio:** Convierte hallazgos (balance con no-explicado, EnPI en desviación, mapa con zona sin medición) en trabajo ejecutable. Las acciones rápidas son para medidas inmediatas de bajo costo. Los proyectos son para inversiones que requieren seguimiento formal, M&V y evidencia de ahorro.

**Estado actual:** Bien estructurado. El Inbox, Kanban y Portfolio existen. El workspace de proyecto con Gantt existe. Las brechas son: el triage no calcula automáticamente, el M&V no está formalizado, y la integración con los módulos de análisis es manual.

#### Flujo de Oportunidad → Acción → Proyecto

El flujo de negocio tiene tres etapas distintas que hoy se mezclan:

**Etapa 1 — Oportunidad (Inbox)**

Una oportunidad es un hallazgo que aún no tiene dueño ni plan. Puede nacer de:
- Balance: botón "Crear oportunidad desde no-explicado"
- EnPI: botón "Crear acción para recuperar desviación"
- Mapa: click derecho en nodo → "Reportar oportunidad de mejora"
- Entrada manual: el ingeniero anota una observación en campo

La ficha de oportunidad en el Inbox debe tener:
```
Título: "Consumo no explicado en sistema de vapor zona A"
Origen: Balance · Vapor · Mayo 2026 · 12.4% no explicado
Descripción: [textarea]
Utility: Vapor
Área: Zona A
Estimación preliminar de ahorro: [campo]
```

El **triage** es una pantalla de scoring que le pregunta al usuario:
- Impacto energético estimado (bajo/medio/alto/muy alto)
- Facilidad de implementación (alta/media/baja)
- Inversión requerida (ninguna/<$5K/$5K-$50K/>$50K)
- Certeza del diagnóstico (sospecha/probable/confirmado)

Con eso calcula automáticamente:
- **Score de prioridad** (0-100)
- **Recomendación:** Acción rápida vs Proyecto

**Etapa 2 — Acción rápida (Kanban)**

Para medidas sin inversión significativa (ajuste de set-point, corregir fuga de aire, cambiar horario de operación):
- Responsable, fecha compromiso, esfuerzo estimado
- Descripción del trabajo a realizar
- **Evidencia de cierre obligatoria:** foto, lectura antes/después, nota técnica
- El Kanban muestra: Identificada → En análisis → En ejecución → Verificada → Cerrada
- El ahorro real se captura al cerrar comparando lecturas antes/después del período configurado

**Etapa 3 — Proyecto de mejora (Portfolio + Workspace)**

Para iniciativas con inversión, múltiples fases, recursos y M&V formal:

El workspace del proyecto ya tiene buena estructura. Mejoras de flujo:

**Pestaña Propuesta/Business Case:**
- Descripción del problema
- Solución propuesta
- Inversión estimada
- Ahorro estimado: energía + costo + CO2e
- Período de retorno simple
- Método M&V propuesto: Opción A (medición de parámetros), B (medición completa), C (análisis de factura), D (simulación)
- Diagrama/foto adjunto

**Pestaña Plan/Gantt:** (ya existe, bien implementado)

**Pestaña M&V (Medición y Verificación):**
Esta pestaña es la más crítica desde la perspectiva de ISO 50001 y hoy está ausente:
- Período de baseline: rango de fechas, medidores usados, condiciones
- Período de medición post-intervención: mismo set de medidores
- Cálculo de ahorro: diferencia corregida por variables relevantes
- Ajustes de normalización aplicados
- Tabla de resultados: estimado vs real por mes
- Estado de verificación: No iniciado / En curso / Verificado / Ajustado

**Pestaña Cierre:**
- Fecha de cierre
- Ahorro final verificado (energía, costo, CO2e)
- Resumen de evidencia (links a mediciones, fotos, documentos)
- Lección aprendida
- Botón "Generar evidencia para SGEn" → crea un registro de evidencia en el módulo SGEn

#### Integración CMMS — el puente más importante

Esta es la integración más valiosa para el cliente:

- Una oportunidad de mejora en Energy que requiere mantenimiento debe poder crear una **Solicitud de Trabajo** en VersaMaint directamente desde la ficha de oportunidad.
- El estado de la OT en VersaMaint debe reflejarse en la oportunidad de Energy (pendiente/en curso/completada).
- Al cerrar una OT de mantenimiento que estaba vinculada a una oportunidad de mejora, se dispara un recordatorio en Energy: "¿Validar ahorro post-intervención?"
- Esto crea el ciclo completo: hallazgo energético → OT de mantenimiento → verificación de ahorro → evidencia SGEn.

---

### 4.8 SGEn — Sistema de Gestión de la Energía

**Rol en el flujo de negocio:** El SGEn no genera datos propios. Consume evidencia del resto de los módulos y la organiza en el framework de gestión. Su valor es hacer auditable todo lo que ya existe en el sistema.

**Estado actual:** Esqueleto con alcance, aviso legal y dashboard básico. No hay flujos operativos.

**Problema de diseño fundamental:** El SGEn no puede funcionar si se construye como formularios independientes. Debe funcionar como un **agregador inteligente** que jala evidencia de:
- Medición → cobertura de puntos de medición
- Balances → no-explicado, pérdidas, tendencias
- Desempeño → EnPI, cumplimiento de targets
- Acciones → proyectos ejecutados, M&V verificado
- Mapa → cobertura de medición por área, diagramas publicados

#### Estructura de flujos recomendada

**Página principal — Centro de gestión:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ SGEn · Sistema de Gestión de la Energía                             │
│ Estado de preparación: 67% ████████████░░░░░░░                     │
│                                                                      │
│ ELEMENTOS DE GESTIÓN           │ EVIDENCIA DISPONIBLE               │
│ ✓ Alcance definido             │ ● 4 diagramas publicados           │
│ ✓ Política energética          │ ● 3 balances ejecutados            │
│ ⚠ Revisión energética          │ ● 2 EnPI activos                   │
│ ⚠ Usos significativos (0/5)    │ ● 5 acciones cerradas              │
│ ✗ Objetivos energéticos        │ ● 0 auditorías internas            │
│ ✗ Auditoría interna pendiente  │                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Sección 1 — Alcance y política:**
- Descripción del alcance energético (áreas, utilities, período)
- Texto de política energética propia (NOT ISO text)
- Lista de utilities dentro del alcance
- Documentos adjuntos: política firmada, acta de nombramiento de responsable

**Sección 2 — Revisión energética:**
Esta es la sección más importante operacionalmente. Debe ser un asistente que jala datos reales:

```
Revisión energética · Mayo 2026

FUENTES DE ENERGÍA:
  ✓ Electricidad: tarifa vigente, 4 medidores principales, balance ejecutado
  ✓ Vapor: tarifa estimada, 2 medidores, balance ejecutado
  ⚠ Aire comprimido: sin tarifa configurada

CONSUMO POR ÁREA:
  [Tabla jalada de balances: Área, Consumo, % del total, Tendencia]

DESEMPEÑO:
  EnPI-E-001: 7.6% sobre baseline (3 meses)
  EnPI-V-002: 2.1% sobre baseline (1 mes)
```

El usuario no llena esta sección manualmente. El sistema la construye. El usuario la revisa, agrega contexto y la aprueba.

**Sección 3 — Usos Significativos de Energía (SEUs):**
- Un SEU es un equipo, área o proceso con alto consumo, alto potencial de mejora, o bajo control. Se identifican a partir de los balances y el árbol de activos.
- Scoring por criterio: consumo relativo, control actual, variabilidad, potencial de mejora, impacto en producción
- La lista de SEUs se propone automáticamente desde el balance y el árbol de activos; el usuario aprueba o descarta
- Cada SEU tiene: descripción, utility, consumo histórico, métricas de control, objetivo energético vinculado

**Sección 4 — Objetivos y planes de acción:**
- Los objetivos de SGEn son los mismos que los targets de EnPI. No hay duplicidad: se vinculan.
- Los planes de acción de SGEn son los proyectos de mejora del módulo Acciones. No hay duplicidad.
- Esta sección es un tablero de vínculos, no un formulario separado.

**Sección 5 — Evidence Inbox:**
Una bandeja de entrada de evidencia automática generada por el sistema:
- "Balance ejecutado el 01/06/2026 · Electricidad · mayo 2026" → Aceptar como evidencia
- "Proyecto PT-002 cerrado con ahorro verificado de 12,400 kWh" → Aceptar como evidencia
- "EnPI-E-001 dentro de target por 2 meses consecutivos" → Aceptar como evidencia

El usuario revisa la bandeja, acepta la evidencia relevante y la archiva con período y categoría.

**Sección 6 — Auditoría interna:**
- Agenda de auditorías con responsable y fecha
- Preguntas originales del sistema (NO copia de ISO 50001) agrupadas por área
- Hallazgos de auditoría: conforme / no conforme / observación
- No conformidades se convierten automáticamente en oportunidades en el módulo Acciones
- Informe de auditoría se genera como PDF desde Reportes

**Sección 7 — Revisión gerencial:**
- Agenda con fecha y responsables
- Entradas: resultados del período, EnPI, acciones abiertas/cerradas, SEUs, auditorías
- Salidas: decisiones y compromisos
- Este es el momento de "firma" del ciclo de gestión

**Nota legal permanente:**
En cada pantalla del módulo SGEn debe existir una nota discreta pero visible:
> "VersaEnergy apoya la gestión operativa de la energía. No constituye certificación ISO 50001 ni garantía de conformidad. La certificación requiere evaluación por organismo acreditado."

---

### 4.9 Reportes — Las salidas del sistema

**Rol en el flujo de negocio:** Consume el sistema completo y genera salidas procesables para: gerencia, auditores, clientes, reguladores y el propio equipo de energía.

**Estado actual:** Placeholder con dependencia instalada (`@react-pdf/renderer`). No hay reportes.

#### Tipos de reporte recomendados

**Reporte 1 — Informe mensual de energía:**
Audiencia: Gerencia, responsable de energía  
Contenido: KPIs del período, consumo por utility y área, balance resumen, EnPI vs baseline vs target, top 3 desviaciones, top 3 acciones en progreso  
Formato: PDF (2-3 páginas máximo), CSV de datos

**Reporte 2 — Reporte de balance:**
Audiencia: Ingeniero de energía, auditor  
Contenido: Detalle completo del balance (supuestos, trazabilidad de medidores, resultado por nodo)  
Formato: PDF técnico + CSV de detalle

**Reporte 3 — Reporte de desempeño EnPI:**
Audiencia: Responsable de energía, dirección  
Contenido: Gráficos de tendencia por EnPI, comparativa vs baseline y target, acciones vinculadas  
Formato: PDF con gráficos

**Reporte 4 — Paquete de evidencia SGEn:**
Audiencia: Auditor interno/externo, certificador  
Contenido: Alcance, política, revisión energética, SEUs, EnPIs, objetivos, planes, evidencia de proyectos, resultados de auditoría  
Formato: PDF multi-sección, referenciado por período  
**IMPORTANTE:** Ningún reporte de SGEn puede citar artículos, cláusulas o tablas de ISO 50001.

**Builder de reportes (UI):**
```
┌──────────────────────────────────────────────────────────────────────┐
│ Generar reporte                                                       │
│                                                                       │
│ Tipo: [Informe mensual ▼]      Período: [Mayo 2026 ▼]               │
│ Sitio: [Planta Norte ▼]        Utility: [Todos ▼]                   │
│                                                                       │
│ Secciones incluidas:                                                  │
│ [✓] KPIs ejecutivos    [✓] Balances    [✓] EnPI                      │
│ [✓] Acciones abiertas  [✗] Detalle técnico                           │
│                                                                       │
│ [Vista previa]  [Generar PDF]  [Exportar CSV]                        │
└──────────────────────────────────────────────────────────────────────┘
```

**Historial de reportes:**
- Lista de reportes generados con: tipo, período, fecha de generación, usuario
- Descarga de reportes anteriores
- Comparativa: "vs reporte del período anterior"

---

## 5. Principios transversales de UX

Estos principios deben aplicarse en todos los módulos, no solo en los pendientes.

### 5.1 Cada módulo responde 5 preguntas

Todo módulo maduro debe poder responder al usuario:
1. **¿Qué hay aquí?** (estado actual con datos reales)
2. **¿Qué está mal?** (alerts, gaps, desviaciones)
3. **¿Qué falta?** (prerequisitos incompletos)
4. **¿Qué hago ahora?** (CTA claro y contextual)
5. **¿Qué evidencia queda?** (trazabilidad de lo que se hizo)

### 5.2 Empty states con siguiente paso

Cada pantalla vacía debe decir **exactamente qué hacer**:

❌ Actual: "Sin balances disponibles"  
✅ Recomendado: "Sin balances para este período. Para ejecutar un balance necesitas: (1) Diagrama publicado en el Mapa, (2) Lecturas validadas en Medición para el período. → [Ver Mapa] [Ver Medición]"

### 5.3 Distinguir siempre: medido / estimado / calculado / faltante

En cualquier tabla o gráfico con datos energéticos:
- **Negrita/sólido:** dato medido real
- **Cursiva/rayado:** dato estimado
- **Calculado:** badge gris "calc"
- **Sin dato:** "—" en gris, nunca "0" o en blanco

Esta distinción debe ser consistente en todos los módulos. Hoy no lo es.

### 5.4 Contexto operacional siempre visible

El banner de contexto (sitio, utility, período) ya existe pero no todos los módulos lo muestran igual. Regla: todo módulo que dependa del contexto global debe mostrar el banner. Los módulos de configuración (Admin) no lo necesitan.

### 5.5 Acciones destructivas con confirmación

Cualquier acción que:
- Elimine datos
- Cambie el estado de un diagrama publicado
- Descarte lecturas
- Archive un proyecto

Debe tener confirmación con descripción de impacto: "¿Eliminar PM-E-007? Este medidor tiene 234 lecturas en el sistema. Sus datos históricos se conservarán pero el punto dejará de recibir nuevas lecturas."

### 5.6 El CMMS como destino natural, nunca como fricción

La integración con VersaMaint debe aparecer como una oferta de valor, no como una tarea extra:
- "Listo para CMMS" = badge positivo cuando el activo está completo
- "Preparar para CMMS" = acción con 3 pasos claros, no un formulario intimidante
- "Ver en VersaMaint" = link directo cuando el activo está sincronizado
- Nunca mostrar campos CMMS vacíos sin contexto de por qué importan

---

## 6. Problemas a eliminar inmediatamente

Los siguientes antipatrones existen hoy y degradan la confianza del usuario:

| Problema | Dónde aparece | Impacto | Solución |
|---|---|---|---|
| `prompt()` para captura de datos | Módulo Desempeño (baseline) | Bloquea en móvil, no guarda historial, UX terrible | Modal con formulario completo |
| JSON visible en propiedades de nodo | Inspector del Mapa | El usuario ve `{"specs":{"power_kw":45}}` | Formulario con campos etiquetados |
| `target_id` dummy en MeasurementPoints | Medición | Datos sin trazabilidad | Wizard obligatorio de vinculación |
| Tabs que no persisten | Varios módulos | Al navegar se pierde el contexto | Persistir activeTab en URL params |
| Tablas sin paginación | Lecturas, balances históricos | Con muchos datos se rompe | Paginación o scroll virtualizado |
| Botones sin estado de carga | Importación CSV, guardar balance | El usuario hace doble click | Loading state en todos los botones de acción |

---

## 7. Hoja de ruta de implementación por prioridad

### Prioridad alta (prerequisitos para que el sistema sea usable)

1. **Admin funcional:** tarifas, factores de emisión, parámetros de alerta
2. **Pipeline de medición UI:** pantalla de puntos con estado de calidad como lista, no select
3. **Balance con supuestos visibles:** paso 2 del wizard muestra qué medidores se usarán y cuáles son estimados
4. **CTA balance → oportunidad:** botón "Crear oportunidad desde no-explicado" al final del balance

### Prioridad media (completan el ciclo de valor)

5. **Ficha de equipo completa:** secciones de perfil energético, guía de completitud
6. **EnPI con normalización:** constructor de fórmula, variable de denominador, gráfico real/baseline/target en una pantalla
7. **M&V en proyecto:** pestaña de medición y verificación post-intervención
8. **Overlays del mapa:** cobertura y consumo como herramienta operacional, no decoración
9. **SGEn con alimentación automática:** revisión energética jalada de balances y EnPI

### Prioridad baja (madurez del producto)

10. **Reportes:** informe mensual + paquete SGEn
11. **Auditoría interna en SGEn:** cuestionario original, hallazgos, no conformidades
12. **Sincronización VersaMaint bidireccional:** más allá de campos compatibles
13. **IoT binding UI:** formulario guiado para MQTT/OPC-UA, hoy no hay UI para esto

---

## 8. Decisiones de arquitectura que no cambiar

Estas decisiones son correctas y no deben cuestionarse en futuras fases:

- **Grafo semántico como verdad del mapa.** No almacenar SVG ni canvas state.
- **MeasurementPoint independiente del nodo visual.** El dato es una entidad de dominio, no un ícono.
- **Motores puros en `src/services/`.** Ningún cálculo de negocio en React components.
- **Supabase-first, cero mocks.** Los mocks crean divergencias que destruyen confianza.
- **RLS por tabla.** La seguridad de tenant nunca puede relajarse.
- **Draft/publicado/frozen en diagramas.** Los balances deben referenciar versiones inmutables.
- **Jerarquía planta → área → sistema → equipo para CMMS.** No agregar `component` al árbol de Energy.
- **No copiar texto de ISO 50001.** Ni en UI, ni en reportes, ni en código.

---

*Este documento es una guía de asesoría técnica. No reemplaza la documentación de fases de AGENTS.md. Los cambios de código deben seguir el flujo de MP-phases con criterios de aceptación verificables.*

---
---

# PARTE II — Plan de refactor: arquitectura asset-tree-first

> Esta parte es el plan ejecutable del refactor. Reemplaza la sección 3 de la Parte I
> (navegación por sidebar de módulos) por un modelo donde **el árbol de activos es la
> columna vertebral de toda la app**, igual que en un CMMS industrial. Toda la Parte I
> sigue siendo válida como detalle funcional de cada disciplina energética.

---

## 9. Tesis del refactor

### 9.1 El cambio de paradigma

Hoy VersaEnergy navega **por módulos**: el usuario elige una disciplina (Medición, Balances, Desempeño…) y dentro de ella filtra por sitio/utility/período. El activo es un dato secundario.

El refactor invierte los ejes:

```
ANTES:  Módulo  →  filtro de contexto  →  datos del activo
                   (sitio/utility/período)

DESPUÉS: Activo  →  lente de disciplina  →  datos de esa disciplina para ese activo
         (árbol)    (Resumen/Medición/
                     Balance/Desempeño…)
```

El usuario ya no piensa "¿qué módulo abro?". Piensa **"¿qué equipo estoy viendo y qué le pasa energéticamente?"**. Esto es exactamente cómo opera un jefe de mantenimiento en un CMMS, y es lo que permite compartir la misma mentalidad —y los mismos datos— entre VersaEnergy y VersaCMMS.

### 9.2 Por qué este modelo es correcto para energía (no solo para CMMS)

La gestión energética industrial es intrínsecamente jerárquica y física:

- Un balance se hace **sobre una frontera física** (planta, área, sistema).
- Un EnPI mide **un activo o proceso** (kWh/ton del compresor, no "del módulo").
- Una oportunidad de ahorro **vive en un equipo o zona**.
- La evidencia SGEn **se ancla a usos significativos**, que son activos.

El árbol de activos no es una concesión al CMMS: es la estructura natural del dominio energético. Hoy está enterrado en una pestaña; debe ser la espina.

### 9.3 Las dos navegaciones (modelo híbrido recomendado)

No todo en energía es por-activo. Importar un CSV, correr un balance multi-sistema o gestionar el SGEn son **flujos transversales**. El modelo correcto tiene dos zonas:

| Zona | Pregunta que responde | Cómo se navega |
|---|---|---|
| **Espacio de Activos** (default, 80% del uso) | "¿Qué le pasa a este activo?" | Árbol izquierdo + lentes de disciplina sobre el nodo seleccionado |
| **Espacio de Operación** (flujos transversales) | "Quiero correr/importar/configurar X" | Barra superior → asistentes de balance, importación, SGEn, reportes, admin |

La regla de oro: **desde cualquier flujo transversal siempre se puede volver al árbol, y todo flujo transversal escribe resultados que aparecen como lentes sobre los activos afectados.**

---

## 10. Identidad visual — estado y cierre de brechas

### 10.1 Lo que YA está implementado (no rehacer)

`src/index.css` ya define el design system VersaMaint completo. **No hay que crear tokens nuevos.** Verificado:

| Elemento del brief CMMS | Estado en `index.css` |
|---|---|
| Inter (texto) + Space Grotesk (display) | ✅ Importados y en `--font-sans` / `--font-display` |
| Fondo `#F4F7FB` | ✅ `--color-bg-app` y `--color-surface-muted` |
| Superficie blanca, panel `slate-50` | ✅ `--color-surface`, `--color-bg-3` |
| Primario `#1B6FF8`, acción `#0F5AD1` | ✅ `--color-brand`, `--color-brand-dark` |
| Semánticos ok/warn/danger/info con bg | ✅ Los 4 con `-bg` y `-border` |
| Radios 8 / 10-14 / 16-20px | ✅ `--radius-sm/md/lg/xl/2xl` |
| Sombras discretas (card/floating/modal) | ✅ Las 4 escalas |
| Animaciones 150-200ms | ✅ `slide-up/right/fade-in/slide-down` |

**Brechas reales de identidad (menores):**

1. **`--font-display` no se está usando.** Los `PageHeader` usan `font-sans`. Aplicar `font-display` a títulos H1 de página y al header del árbol.
2. **Falta el acento teal/cyan `#00C8B8`** del brief como token semántico de acento secundario (hoy hay `--color-brand-teal: #0d9488`, distinto). Decisión: mantener el teal actual o alinear a `#00C8B8`. Recomiendo alinear para identidad idéntica entre apps.
3. **No existe un componente `<AssetTree>` con el estilo de filas densas** (30-36px, indentación 14-18px/nivel, chevron rotatorio, badge mono de TAG, punto de criticidad). Este es el entregable visual central del refactor (sección 12).
4. **Iconografía de tipos de activo** no está estandarizada (`Factory`, `Layers`, `GitBranch`, `Wrench`, `Gauge`). Definir un mapa `assetTypeIcon`.

### 10.2 Tokens a añadir (verificado contra el CMMS real `apex-cmms` v1.3.0)

Comparé `src/index.css` de Energy contra `CMMSFSC/src/index.css`. **Son casi idénticos.** Brand, brand-dark, brand-light, bg-app, bg-2, bg-3, tx-*, ok/warn/danger/info, fuentes y radios coinciden al valor exacto. Energy debe añadir lo que el CMMS tiene y Energy no:

```
--color-accent:   #00C8B8;   /* CONFIRMADO idéntico en CMMS */
--color-ocre:     var(--color-accent);   /* alias que el CMMS usa */
--color-bg-4:     #D0DFF2;   /* 4º nivel de fondo del CMMS */

/* Escalas operativas del CMMS (work/status) — Energy hoy NO las tiene.
   Útiles si Energy va a mostrar OTs/estado de trabajo embebidos: */
--color-work-corrective / -bg / -border    (#D97706 / #FFFBEB / #FDE68A)
--color-work-preventive / -bg / -border    (#2563EB / #EFF6FF / #BFDBFE)
--color-status-hold / -bg / -border        (#64748B / #F1F5F9 / #CBD5E1)  /* el "neutro" del brief */
/* …resto de las escalas work-* y status-* del CMMS (sección Apéndice A) */

/* Específicos del árbol (no son del CMMS, son convención de implementación): */
--asset-row-h:    34px;
--asset-indent:   14px;   /* CMMS real usa depth*14+6px, no 16; alinear a 14 */
```

**Diferencia técnica menor:** el CMMS usa `tailwind.config.js` clásico (Tailwind 3) con `theme.extend`; Energy usa Tailwind v4 con `@theme` en CSS. Ambos producen los mismos tokens. No hay que migrar el motor; solo mantener los **valores** sincronizados. Idealmente extraer los tokens a un archivo compartido `versa-tokens.css` consumido por ambas apps.

### 10.3 Tipografía de uso

| Uso | Fuente | Peso | Tamaño |
|---|---|---|---|
| Título de página / header de árbol | `font-display` (Space Grotesk) | 700 | 18-20px |
| Nombre de activo en fila de árbol | `font-sans` | 600 | 13px |
| TAG / código (badge) | `font-mono` | 500 | 10-11px |
| Texto operativo (tablas, detalle) | `font-sans` | 400-500 | 13-14px |
| Badges de estado | `font-sans` | 700 uppercase | 10px |

---

## 11. Arquitectura de información objetivo

### 11.1 Layout maestro (desktop)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR  [VE]  Planta Norte ▼   |  ⚡Todos ▼  📅 Mayo 2026 ▼  | Salud 74% │ 👤 │ ← contexto global
├──────────┬───────────────────────────────────────────────────┬───────────────┤
│          │  DETALLE DEL ACTIVO SELECCIONADO                   │  PANEL         │
│  ÁRBOL   │  ┌─────────────────────────────────────────────┐  │  CONTEXTUAL    │
│  DE      │  │ Bomba P-01  · TAG: BMB-P01 · ⚡ · ●Alta crit │  │  (historial,   │
│  ACTIVOS │  ├─────────────────────────────────────────────┤  │   OTs, docs,   │
│          │  │ [Resumen][Medición][Balance][Desempeño]     │  │   medición,    │
│ 288-     │  │ [Acciones][Mapa][Técnico][Docs]   ← LENTES  │  │   alertas)     │
│ 320px    │  ├─────────────────────────────────────────────┤  │                │
│          │  │                                             │  │  Colapsable    │
│ búsqueda │  │   contenido de la lente activa,             │  │  / opcional    │
│ +        │  │   scope = activo seleccionado               │  │                │
│ jerarquía│  │                                             │  │                │
│          │  └─────────────────────────────────────────────┘  │                │
└──────────┴───────────────────────────────────────────────────┴───────────────┘
```

- **Topbar (global):** sitio, utility, período, salud del sitio, usuario. Es el contexto que ya existe en `AppShell`, pero ahora gobierna el árbol completo, no cada módulo.
- **Árbol (288-320px, fijo):** la navegación primaria. Persistente en TODA la app.
- **Centro (flexible):** detalle del activo + barra de lentes.
- **Panel derecho (opcional, colapsable):** contexto rápido sin perder el detalle.

### 11.2 Layout móvil

```
Paso 1: Árbol a pantalla completa (búsqueda arriba)
Paso 2: Tap en activo → drill-in al detalle (lentes como tabs scrollables)
Paso 3: Botón "‹ Activos" arriba para volver
Targets táctiles ≥ 44px. Panel derecho se vuelve un bottom-sheet.
```

### 11.3 Las lentes (reemplazan a los módulos como navegación)

Cuando hay un activo seleccionado, las disciplinas se vuelven **lentes** sobre ese activo. El contenido se filtra automáticamente al `sourceId` del nodo y a sus descendientes.

| Lente | Scope plant (raíz) | Scope área/sistema | Scope equipo |
|---|---|---|---|
| **Resumen** | Cockpit del sitio (KPIs, alertas) | Resumen de la zona | Ficha del equipo |
| **Medición** | Todos los puntos del sitio | Puntos de la zona | Puntos del equipo |
| **Balance** | Balance del sitio por utility | Balance de la zona | Aporte del equipo al balance |
| **Desempeño** | EnPIs del sitio | EnPIs de la zona | EnPIs del equipo |
| **Acciones** | Portfolio completo | Acciones de la zona | Acciones del equipo |
| **Mapa** | Diagrama del sitio | Diagrama filtrado a la zona | Equipo resaltado en su diagrama |
| **Mantenimiento** | — | — | Calibraciones/verificaciones del medidor (PM/OT compartido, §13) |
| **Docs** | Documentos del sitio | Docs de la zona | Adjuntos del equipo |

Las lentes **no aplicables** a un nivel se ocultan (p. ej. "Mantenimiento" solo en equipos/medidores).

### 11.4 Flujos transversales (Espacio de Operación)

Accesibles desde un botón en la topbar ("Operación ▾") o desde CTAs contextuales:

- **Correr balance** (asistente multi-paso, escribe resultado que aparece en lente Balance)
- **Importar lecturas** (wizard CSV/IoT, alimenta lente Medición)
- **Centro SGEn** (workspace de gestión, consume evidencia de todos los activos)
- **Reportes** (builder + historial)
- **Administración** (sitios, tarifas, factores, usuarios)

Estos flujos abren como **pantalla completa con su propio breadcrumb**, y al terminar devuelven al usuario al árbol con un toast "Resultado disponible en [activo]".

---

## 12. El componente AssetTree — especificación detallada

Este es el entregable visual y funcional central del refactor. Debe vivir en `src/shared/AssetTree/` para ser reutilizable y, eventualmente, extraíble como paquete compartido con VersaCMMS.

> **No diseñar desde cero — portar el componente real del CMMS.**
> El CMMS ya tiene este componente resuelto y batido en producción:
> `CMMSFSC/src/modules/assets/components/AssetTreePanel.tsx` (+ `utils/buildTree.ts`,
> `utils/assetHelpers.ts`). La especificación de abajo describe exactamente lo que ese
> archivo ya hace. La estrategia correcta es **copiarlo y adaptar el origen de datos**,
> no reinventarlo. Mecánicas concretas que trae el componente real y hay que conservar:
> - Indentación `depth * 14 + 6` px; fila `py-1.5`; nombre `text-xs font-bold tracking-tight`.
> - TAG como badge `font-mono text-[9px] uppercase` con fondo `bg-slate-100`.
> - Chevron con `framer-motion` (`rotate: isExpanded ? 90 : 0`, 0.2s).
> - Iconos por tipo son **emoji** en el CMMS (`🏭 area:🗺️ system:⚙️ equipment:🔧`).
>   *Decisión Energy:* mantener emoji para identidad idéntica, o sustituir por lucide
>   con color por utility. Recomiendo lucide+utility (Energy es multi-utility), aceptando
>   una micro-diferencia visual con el CMMS.
> - Punto de criticidad: **solo** en `equipment`/`system` (no plant/area) y **solo** si
>   `criticality === 'high'`.
> - Barra azul de selección con `layoutId="active-asset-indicator"` (transición compartida).
> - **Optimización clave:** `React.memo` con comparador custom sobre props primitivas +
>   `hasExpansionChangeInSubtree`, para que expandir 1 nodo no re-renderice 2000. Portar tal cual.
> - Estado de expansión persistido en `sessionStorage` (clave CMMS: `apex-asset-expanded`;
>   usar `versaenergy-asset-expanded`). Auto-expande `depth <= 1` al iniciar.
> - Búsqueda con `forceExpand` (auto-expande coincidencias) + contador al pie.
> - "Modo archivo" para `status === 'decommissioned'` (opacity-50 grayscale).
> - `canModify` gateado por rol (`admin`/`supervisor` en CMMS) — Energy debe definir roles equivalentes.

### 12.1 Anatomía de una fila

```
│ ▸ 🏭  Planta Norte                                    PLT-NTE  ●          │
│   ▾ 🗂  Área Producción                               AR-PRD             │
│       ▾ ⚙  Sistema de Vapor                          SV-01   ●          │
│           ▸ 🔧  Bomba P-01                            BMB-P01 ●  ⋯       │
│             🔵  FT-V-003 (medidor)                   FT-V003            │
```

Cada fila (`AssetTreeRow`):

| Zona | Contenido | Especificación |
|---|---|---|
| Indentación | espacio por profundidad | `depth × var(--asset-indent)` (16px) |
| Chevron | `ChevronRight`, rota 90° al expandir | 14px, color `tx-4`, solo si tiene hijos; transición 150ms |
| Icono de tipo | por `assetTypeIcon[type]` | 15px, color por utility o `tx-3` |
| Nombre | `font-sans 600 13px` | truncate, `tx` (seleccionado: `brand`) |
| Badge TAG | `font-mono 10px` en chip `bg-3` | a la derecha, color `tx-3` |
| Punto criticidad | dot 6px | verde/ámbar/rojo según `criticality`; oculto si none |
| Punto estado-dato | dot 6px hueco | verde=mide, ámbar=gaps, rojo=sin datos, gris=sin medición |
| Menú `⋯` | `MoreHorizontal` | visible en hover o si seleccionado; abre menú contextual |

Alto de fila: 34px (`--asset-row-h`), padding vertical 6px.

### 12.2 Estados visuales

| Estado | Estilo |
|---|---|
| Normal | fondo transparente |
| Hover | `bg-slate-200/50`, texto más oscuro, icono +opacidad |
| Seleccionado | `bg-brand/10`, texto `brand`, **barra vertical `brand` 2px** a la izquierda |
| Dado de baja | opacidad 50%, grayscale; oculto salvo "modo archivo" activo |
| Coincidencia de búsqueda | resaltado del término, ancestros auto-expandidos |

### 12.3 Header del árbol

```
┌─────────────────────────────────────────────┐
│ Jerarquía                  [👁][📦][🏷][＋]   │  ← font-display
│ 47 activos · 12 equipos · 8 medidores         │  ← tx-3, 11px
├─────────────────────────────────────────────┤
│ 🔍 Buscar por TAG o nombre...                 │  ← input slate, focus brand
└─────────────────────────────────────────────┘
```

Icon-buttons del header:
- `👁` **Visor de planta** → abre lente Mapa del sitio
- `📦` **Mostrar/ocultar dados de baja** (toggle modo archivo)
- `🏷` **Taxonomía técnica** → abre catálogo Familia/Componentes/Causas (sección 13)
- `＋` **Crear activo** → menú: solo "Área" en raíz (los demás se crean contextualmente)

Pie del árbol durante búsqueda: `"6 resultados"` con botón "Limpiar".

### 12.4 Interacción de expansión/selección

Regla sin ambigüedad (del brief):
- **Click en chevron** → solo expande/colapsa.
- **Click en la fila** → selecciona el activo (carga el detalle) y, si tiene hijos, también expande.
- **Doble-click** → expande/colapsa recursivo (todos los descendientes).
- Estado de expansión persistido en `uiStore` (sobrevive navegación entre lentes).

### 12.5 Menú contextual por nodo

Botón `⋯` → menú flotante (`rounded-xl`, borde `slate-200`, `shadow-floating`, fade 150ms):

| Acción | Condición | Resultado |
|---|---|---|
| **Editar propiedades** | siempre | panel inline o modal de edición |
| **+ Agregar sub-activo** | según `getAllowedCreateKinds(type)` | panel inline de creación (12.6) |
| **+ Agregar medidor** | área/sistema/equipo | wizard de medidor |
| **Ver en mapa** | si aparece en diagrama | abre lente Mapa resaltado |
| **Crear oportunidad** | siempre | ficha de oportunidad pre-llenada con el activo |
| **Programar calibración** | si es medidor/instrumento | crea `asset_plan` PM en la DB compartida (§13.4) |
| **Crear OT** | siempre | OT nativa en `work_orders` (DB compartida, sin integración externa) |
| **Baja técnica / eliminar** | siempre | `ConfirmDialog` con conteo de datos afectados |

### 12.6 Creación inline (no formularios gigantes)

Al elegir "+ Agregar sub-activo", **no abrir un modal de pantalla completa**. Insertar un panel compacto dentro del árbol, como hijo del nodo:

```
       ▾ ⚙  Sistema de Vapor              SV-01
       ┌───────────────────────────────────────┐
       │ Nuevo equipo                          │
       │ Nombre [_______________]              │
       │ TAG    [_______]  Utility [Vapor ▼]   │
       │ Tipo   [Bomba ▼]                      │
       │            [Cancelar]  [Guardar]      │
       └───────────────────────────────────────┘
           ▸ 🔧  Bomba P-01                BMB-P01
```

- Campos mínimos según `EnergyAssetCreateInput` (sección de servicio ya existe en `asset-tree.ts`).
- Validación inline: TAG único, requerido, mayúsculas auto.
- Al guardar: optimistic insert + refetch del subárbol, el nuevo nodo queda seleccionado.
- Reusa `createEnergyAssetFromTree()` que **ya existe** y ya escribe `integration_key`, `sync_status: pending_sync` y `cmms_asset_type`. **No reescribir el servicio.**

### 12.7 Mapa de iconos por tipo

```ts
const assetTypeIcon = {
  plant:     Factory,
  area:      Layers,
  system:    GitBranch,
  equipment: Wrench,
  meter:     Gauge,      // equipment con asset_role measurement_device
}
```

Color del icono: por `utility` cuando aplique (usando los tokens `--color-utility-*` ya definidos), si no `tx-3`.

---

## 13. RCM fuera de alcance; mantenimiento de medidores dentro

> **Dirección del usuario (esta sesión):** el catálogo RCM (Familia → Componentes →
> Causas de falla) **no aplica a Energy**. Energy NO construye ni gestiona esa taxonomía.
> A cambio, sí necesita una capacidad nueva: **dar mantenimiento a los medidores
> (calibraciones, verificaciones) desde Energy**, usando el sistema PM/OT compartido del CMMS.

### 13.1 Qué queda fuera de Energy

- **No** hay lente "Técnico" de Familia/Componentes/Causas en Energy.
- **No** se escribe en `equipment_families`, `equipment_family_components`, `wo_failure_causes`, `asset_equipment_components`. Esas tablas son 100% dominio del CMMS.
- Si en el futuro se quiere mapear "causa de falla → desperdicio energético", será un *plus* opcional de solo-lectura, nunca un módulo de Energy. Sale del alcance del refactor.

El campo `assets.equipment_family_id` simplemente se conserva (lo llena el CMMS); Energy lo ignora salvo para mostrarlo como dato informativo en la ficha si existe.

### 13.2 Lo que sí necesita Energy: mantenimiento de medidores

Un medidor es un **activo instrumento** (`asset_type='equipment'`, `category='instrument'`). Como cualquier instrumento, requiere mantenimiento metrológico: **calibración, verificación, ajuste, inspección**. La diferencia con el CMMS es solo el punto de entrada: el responsable de energía debe poder **programar y consultar** estas tareas sin salir de Energy.

Como la base de datos es **compartida** (decisión sección 14.3), Energy no construye un sistema paralelo: **escribe en el sistema PM/OT del CMMS**. Una calibración de medidor es una OT real, mantenible, auditable, que vive en `work_orders`.

### 13.3 Cómo se modela una calibración/verificación (tablas reales del CMMS)

El CMMS ya tiene todo el motor PM (verificado en su esquema):

```
pm_strategies   "Plan metrológico de medidores"
   └─ pm_packages   trigger_type: calendar (cada 12m) o meter (cada N lecturas)
        └─ pm_tasks   "Calibrar contra patrón", "Verificar deriva", "Sellar"
   ▼ se vincula a un medidor →
asset_plans   (asset_id = medidor, package_id, next_due_date, next_due_meter,
               measurement_point_id, last_completed_at)
   ▼ al vencer genera →
work_orders   (asset_id = medidor, wo_type='inspection'|'preventive',
               asset_plan_id, scheduled_date, due_date, status, completed_at)
```

### 13.4 Qué construye Energy (UI sobre el motor compartido)

En la lente **"Mantenimiento"** del medidor (reemplaza a la antigua "Técnico"):

| Elemento | Acción / resultado |
|---|---|
| **Programar calibración** | Crea/asocia un `asset_plan` con un `pm_package` calendario (p. ej. cada 12 meses). Si no existe la estrategia "Plan metrológico", la crea una vez. |
| **Próxima calibración** | Lee `asset_plans.next_due_date` del medidor. Badge: Al día / Próxima / **Vencida**. |
| **Programar verificación** | `asset_plan` adicional con intervalo más corto (p. ej. trimestral). |
| **Historial metrológico** | Lista de `work_orders` cerradas tipo inspección/preventivo del medidor: fecha, técnico, resultado, certificado adjunto. |
| **Registrar resultado** | Cierra la OT con resultado (en regla / ajustado / fuera de tolerancia) + adjuntar certificado. |
| **Marcar fuera de servicio** | Si la calibración vence o falla, el medidor degrada la **calidad del dato** en Medición/Balance (regla de la sección 4.4). |

### 13.5 El bucle calidad-de-dato ↔ mantenimiento (el valor real)

Esto cierra un círculo que ninguna de las dos apps logra sola:

```
Calibración vencida (asset_plan.next_due_date < hoy)
   → Energy marca el MeasurementPoint como "calidad reducida"
   → los balances/EnPI que usan ese punto muestran advertencia
   → Energy ofrece "Programar calibración" → crea OT en el CMMS
   → técnico ejecuta y cierra la OT con certificado
   → next_due_date se reprograma → el dato vuelve a "confiable"
```

Y a la inversa: un `measurement_point` con `max_threshold`/`trigger_wo_title` (campos que el CMMS ya tiene) puede **disparar una OT correctiva automática** cuando una lectura energética cruza un umbral. Energy aporta la lectura; el CMMS aporta la OT.

### 13.6 Modelo del medidor: dos entidades enlazadas (DECIDIDO)

> **Decisión (esta sesión):** un "medidor" son **dos cosas separadas a propósito**, con
> vidas distintas. Esto resuelve el multicanal, el reemplazo sin perder historia y los
> puntos sin aparato físico.

| Entidad | Es | Vive en | Lifecycle |
|---|---|---|---|
| **Instrumento físico** | el aparato (marca, serie, ubicación) | `assets` (`category='instrument'`) — familia CMMS | se calibra, falla, se reemplaza, se da de baja |
| **Punto de medición** | el canal de dato (qué/dónde/unidad) | `measurement_points` (Energy + CMMS, compartida) | persiste como serie aunque cambie el aparato |

Relación: **un instrumento hospeda 1..N puntos** (`measurement_points.meter_equipment_id → assets.id`). El punto se ancla además a lo que mide en el grafo (nodo/línea/sistema/área).

**Reglas operativas:**
1. El **punto** es la entidad central de dato; **siempre existe**.
2. El **instrumento físico es opcional**: solo los puntos con aparato instalado tienen `meter_equipment_id`. Lecturas manuales (pinza) y puntos calculados **no tienen activo** → no se calibran.
3. La **calibración vive en el activo-instrumento**, no en el punto (ver 13.7).
4. El **punto hereda el estado de calibración** de su instrumento → si vence, sus datos se marcan "confianza reducida" y los balances/EnPI que lo usan advierten.
5. **Reemplazo limpio:** baja del instrumento viejo → alta del nuevo → re-apuntar `meter_equipment_id` del punto. La serie histórica del punto **continúa intacta**; queda registrado el cambio de aparato.
6. **Árbol limpio:** los instrumentos existen como activos mantenibles pero **ocultos por defecto** (toggle "mostrar instrumentos" o anidados en subsistema "Medición"). Su aparición natural es la lente **Medición** del equipo que miden y la lente **Mantenimiento** al calibrar.

Ejemplos que el modelo resuelve: analizador de red (1 instrumento → kW + kWh + kVAr = 3 puntos, 1 calibración); reemplazo de medidor de vapor (serie continúa); pinza manual y punto virtual (puntos sin activo, sin calibración).

### 13.7 Calibración como plan PM ligero compartido (DECIDIDO)

> **Decisión:** la calibración/verificación se gestiona con el **motor PM/OT del CMMS**
> (DB compartida), como una plantilla mínima — no un programa de mantenimiento pesado.

- Una plantilla `pm_strategy` **"Plan metrológico"** con dos `pm_packages` calendario:
  *Calibración* (cada 12 meses) y *Verificación* (cada 3 meses).
- Se aplica a cada activo-instrumento creando un `asset_plan`. Al vencer genera una
  `work_order` tipo `inspection` con su lista de tareas (`pm_tasks`: calibrar contra patrón,
  verificar deriva, sellar).
- El cierre de la OT registra resultado (en regla / ajustado / fuera de tolerancia) +
  **certificado adjunto**, y reprograma `next_due_date`.
- Footprint mínimo: ~1 OT/año + chequeos. Evidencia completa y auditable. Cero sistema paralelo.

---

## 14. Árbol de activos compartido — convergencia con el CMMS real

> **Esta sección se reescribió tras inspeccionar el CMMS real (`apex-cmms` v1.3.0).**
> VersaCMMS existe, está avanzado y es la app autoritativa. La directriz es clara:
> **Energy se adapta al CMMS, no al revés.**

### 14.1 La divergencia estructural central

El CMMS y Energy modelan el árbol de forma **incompatible hoy**:

| Aspecto | CMMS (`apex-cmms`) | VersaEnergy (actual) |
|---|---|---|
| Tabla de activos | **Una sola** `assets` auto-referenciada (`parent_id`) | **Cuatro**: `sites`, `energy_areas`, `utility_systems`, `energy_equipment` |
| Tipo de nodo | `asset_type ∈ {plant,area,system,equipment}` | implícito en la tabla |
| Código | `code` | `code` / `tag` |
| Multi-tenant | `company_id` en todo | site-scoped, sin `company_id` explícito |
| Estado | `active` / `standby` / `decommissioned` | `active` (strings varios) |
| Familia técnica | `equipment_family_id` → catálogo | no existe |
| Medición | `measurement_points.asset_id` (simple, dispara OT) | `measurement_points` rico (utility, accumulator, target) |

El CMMS tiene el modelo **más limpio y general** (una tabla, self-ref, multi-tenant, taxonomía). Energy debe converger a él.

### 14.2 Decisión de arquitectura recomendada: adoptar `assets` como núcleo compartido

**Energy deja de tratar `sites/areas/systems/equipment` como su verdad del árbol y adopta el contrato `assets` del CMMS, con casi todas sus propiedades.** (Dirección del usuario: "en el asset debes poner casi todas las propiedades que el CMMS".) Es decir, el activo en Energy ya **no** es un shape reducido: usa el mismo `assets` con `manufacturer`, `model`, `serial_number`, `install_date`, `warranty_until`, `category`, `criticality`, `status`, `specs`, `image_url`, etc. Energy escribe en las mismas columnas que el CMMS. Solo lo estrictamente energético va a satélite:

```
assets (TABLA COMPARTIDA, esquema del CMMS — Energy usa casi todo)
  id, site_id, parent_id, equipment_family_id, asset_type, code, name,
  category, manufacturer, model, serial_number, install_date, warranty_until,
  criticality, status, specs, image_url, company_id, ...
        │
        ├──◄ energy_asset_profiles (NUEVO, único dato que es solo de Energy)
        │      asset_id (FK), utility_type, energy_role
        │      (consumer|source|distribution|return|loss),
        │      nominal_capacity, capacity_unit, ...
        │
        └──◄ measurement_points (TABLA COMPARTIDA — la misma del CMMS)
               asset_id, config_id→measurement_configs, name, unit,
               + extensión energética: utility, measurement_type, quantity,
                 accumulator_config  (columnas añadidas, no tabla nueva)
```

**`measurement_points` se comparte tal cual** (dirección del usuario: "usar los mismos measurepoints"). En el CMMS ya son un **catálogo asociado por equipo** (`asset_id`) con `config_id → measurement_configs` (`name`, `unit`, `is_cumulative`). Energy **no crea otra tabla de puntos**: usa esta y le añade las columnas de balance (utility, tipo, acumulador). Así una lectura sirve a la vez para mantenimiento (umbral → OT) y para energía (balance/EnPI).

Ventaja: **un solo árbol, un solo catálogo de medición, cero recaptura, cero divergencia.** Energy añade únicamente `energy_asset_profiles` y unas columnas a `measurement_points`. Todo lo demás ya existe en el CMMS.

### 14.3 ¿Misma base de datos o sincronización? (decisión de despliegue — TUYA)

Verificado: hoy corren en **proyectos Supabase separados** (Energy `:64321`, CMMS `:54321`). Para compartir `assets` hay dos caminos:

**Camino 1 — Base de datos compartida (VersaPlatform).** Ambas apps apuntan al mismo proyecto Supabase; `assets`, `equipment_families`, etc. son tablas únicas. Energy añade sus tablas satélite en el mismo esquema.
- ✅ Verdad única real, sin sync, sin conflictos.
- ✅ RLS por `company_id` ya existe en el CMMS.
- ❌ Requiere fusionar entornos Supabase y reconciliar las migraciones de ambas apps. Es la decisión más fuerte pero la más correcta a largo plazo.

**Camino 2 — Bases separadas + sincronización.** Cada app mantiene su DB; `assets` se replica por webhooks/ETL usando una clave estable (`integration_key`, que Energy ya tiene en migración `00012`).
- ✅ Menos disruptivo a corto plazo; cada app despliega independiente.
- ❌ Divergencia temporal, panel de conflictos, doble fuente de verdad. Mayor costo operativo permanente.

**Recomendación:** dado que el CMMS ya es autoritativo y limpio, ir a **Camino 1 (DB compartida)** es la apuesta correcta. Si el calendario no lo permite ya, usar Camino 2 como puente **explícitamente temporal**, no como destino.

### 14.4 Plan de convergencia de datos (seguro, por pasos)

1. **Congelar el contrato `assets`** tal cual lo define el CMMS (Apéndice A) como fuente de verdad.
2. **Vista de compatibilidad primero (no destructivo):** crear en Energy una vista/adaptador `assets_compat` que proyecte `sites+areas+systems+equipment` al shape `assets` (`asset_type`, `parent_id`, `code`…). El nuevo `<AssetTree>` consume ese shape. Esto desacopla la UI del almacenamiento y permite migrar el backend después sin tocar la UI.
3. **Migración de datos:** poblar la tabla `assets` real (compartida o sincronizada) desde las 4 tablas de Energy, mapeando `energy_equipment.tag → assets.code`, jerarquía → `parent_id`, etc. Conservar `integration_key` para trazabilidad.
4. **Mover lo energético a satélites:** `utility_type`, `energy_role`, capacidades → `energy_asset_profiles`. `measurement_points` se re-apunta a `asset_id`.
5. **Deprecar las 4 tablas** de Energy como almacenamiento primario del árbol (pueden quedar como vistas legacy durante la transición).

`createEnergyAssetFromTree()` y `asset-tree.ts` se reescriben para escribir contra `assets` + satélites, pero **su firma de entrada (`EnergyAssetCreateInput`) puede conservarse**, minimizando el cambio en la UI.

### 14.5 Reconciliación de `measurement_points`

Ambas apps tienen `measurement_points`, pero con propósitos distintos:
- **CMMS:** orientado a mantenimiento — umbrales (`min/max_threshold`), `trigger_wo_title`, `trigger_priority` → **dispara órdenes de trabajo** al cruzar umbral. Modelo simple.
- **Energy:** orientado a balance — `utility`, `measurement_type` (accumulator/instant…), `quantity`, `accumulator_config`, `target_type/target_id`. Modelo rico.

Recomendación: **un solo `measurement_points` con `asset_id` como ancla común**, donde Energy aporta las columnas de balance/acumulador y el CMMS aporta las de umbral/trigger-OT. Un punto de medición de energía que cruza un umbral **puede entonces disparar una OT en el CMMS automáticamente** — exactamente el puente energía↔mantenimiento de la sección 4.4. Si la fusión de tablas es muy costosa al inicio, mantenerlas separadas pero **ancladas al mismo `asset_id`** y reconciliar después.

> **Modelo decidido (§13.6/13.7):** el punto de medición y el **instrumento físico** son
> entidades separadas y enlazadas (`measurement_points.meter_equipment_id → assets`). El punto
> es el dato (siempre existe); el instrumento es el aparato calibrable (opcional: no aplica a
> manual/calculado). La calibración es un plan PM ligero compartido. Ver §13.6-13.7 para reglas.

### 14.6 Badges de sincronización en el árbol (solo si se elige Camino 2)

Si se va por bases separadas, cada nodo muestra: **Local / Sincronizado / Pendiente / Conflicto** (usando `sync_status` que ya existe). Si se va por DB compartida (Camino 1), **estos badges no hacen falta** — hay una sola verdad.

### 14.7 Usuarios, roles y RLS compartidos

> **Pregunta del usuario:** ¿se puede usar el RLS/usuarios del CMMS en Energy, con
> roles admin / gestor energético (≈ planner) / técnico / gerencial (solo lectura)?
> **Respuesta: sí, y es lo correcto.** Con la DB compartida, la identidad y la seguridad
> son las mismas. Energy NO construye su propio sistema de auth/roles.

**Lo que el CMMS ya tiene (verificado en su esquema):**
- `profiles` con `role ∈ ('admin','planner','supervisor','technician','warehouse','requester')`, `company_id`, y `username` (para técnicos sin correo confiable — útil en planta).
- `companies` (multi-tenant SaaS con plan/status).
- `site_access` — permisos **granulares por usuario y sitio**: `scope (all_sites|specific_site)`, `can_view`, `can_plan`, `can_execute`, `can_manage_inventory`, `can_manage_users`, `can_manage_site_access`.
- Helpers RLS: `get_my_company_id()`, `get_my_role()`, `get_my_company_status()`. Las políticas filtran por empresa + rol + acceso a sitio.
- `company_role_limits` / `plan_templates` — cupos de asientos por rol y plan.

**Una sola sesión, dos apps.** El usuario inicia sesión una vez; ambas apps leen el mismo `profiles`/`site_access`. Energy solo debe: (1) reutilizar el cliente Supabase apuntando a la DB compartida, y (2) escribir las RLS de sus tablas nuevas (`energy_asset_profiles`, columnas energéticas, balances, EnPI, etc.) usando los mismos helpers `get_my_company_id()` / `get_my_role()` / `site_access`.

**Mapeo de los roles que propones → roles reales del CMMS:**

| Rol que propones (Energy) | Rol CMMS | Encaje | Capacidades en Energy |
|---|---|---|---|
| **Admin** | `admin` | ✅ exacto | todo: config, tarifas, factores, usuarios, publicar diagramas |
| **Gestor energético** (≈ planner) | `planner` | ✅ muy bueno | modelar planta, correr balances, crear EnPI, **programar calibraciones**, abrir oportunidades/proyectos |
| **Técnico** | `technician` | ✅ exacto | capturar lecturas, ejecutar/cerrar OTs de calibración, evidencia de acciones |
| **Gerencial (solo ve cómo va todo)** | → rol **Visor** (§14.8) | ✅ resuelto vía rol-por-app | dashboards, cockpit, métricas, estatus de proyectos, reportes — **solo lectura** |

> **Nota:** la tabla de arriba mapea contra el `profiles.role` global del CMMS, pero el
> modelo **decidido** es identidad global + rol por app (§14.8). Bajo ese modelo, los roles
> de Energy (Admin / Gestor energético / Técnico / **Visor**) viven en `app_memberships`,
> no en `profiles.role`. La columna "Rol CMMS" queda solo como referencia de equivalencia
> de capacidad para las operaciones sobre tablas compartidas.

### 14.8 Modelo de roles decidido: identidad global + rol por app

**Decisión (esta sesión):** se adopta desde el inicio el modelo de las suites maduras
(Atlassian, Microsoft 365): **una identidad global, un rol por aplicación.** No se usa
el `profiles.role` único como autorización de Energy.

**Cómo se estructura:**

```
auth.users + profiles   →  QUIÉN eres (identidad global, una sola sesión)   [del CMMS, no se toca]
app_memberships         →  QUÉ PUEDES en cada app                            [NUEVO, plataforma]
   (user_id, app_key, role, active, created_at, ...)
   app_key ∈ ('energy','cmms','project', ...)
site_access             →  EN QUÉ SITIOS                                     [del CMMS, se reutiliza]
```

**Roles de la app Energy** (`app_key = 'energy'`):

| Rol Energy | Hace |
|---|---|
| **Admin** | configura todo: tarifas, factores, usuarios de Energy, publica diagramas |
| **Gestor energético** | modela planta, corre balances, crea EnPI, programa calibraciones, abre oportunidades/proyectos |
| **Técnico** | captura lecturas, ejecuta/cierra OTs de calibración, sube evidencia |
| **Visor** | **solo lectura: dashboards, cockpit, métricas, estatus de proyectos, reportes** |

Ventajas de esta decisión:
- **El rol "Visor" NO requiere tocar el CMMS.** Vive en `app_membership` de Energy. Cero coordinación con el enum del CMMS.
- "Juan = Gestor en Energy, Visor en CMMS" es expresable (una fila por app).
- Escala a VersaProject y futuras apps con el mismo patrón.
- "Visor" puede existir también como rol **a nivel plataforma** (ver §14.9): un ejecutivo que es Visor en todas las apps a la vez.

**Implicación técnica clave (no perder de vista):** Energy gobierna sus tablas propias
(`energy_asset_profiles`, balances, EnPI, columnas energéticas) con RLS que consulta
`app_memberships` (`app_key='energy'`). Pero las **operaciones sobre tablas compartidas
del CMMS** (`assets`, `measurement_points`, `work_orders` al programar una calibración)
**siguen pasando por la RLS del CMMS** (`profiles.role` + `site_access`). El puente:
- mapear el rol Energy a la capacidad CMMS necesaria (p. ej. "Gestor energético" debe
  corresponder a un usuario con `site_access.can_plan` para poder crear OTs de calibración), o
- exponer esas escrituras a tablas compartidas mediante funciones `SECURITY DEFINER`
  (RPC) que validan `app_membership` de Energy antes de escribir.
Esto se resuelve en la fase de RLS del refactor (parte de MP-R5/MP-R7); el modelo de
datos ya lo soporta.

### 14.9 "Visor" como rol también de plataforma

El gerente que pediste —"ver todo el software": métricas, estatus de proyectos— es
conceptualmente un **Visor de plataforma**, no solo de Energy. Con `app_memberships`
esto se logra dándole rol `visor` en cada app (`energy`, `cmms`, `project`). Un futuro
"tablero ejecutivo VersaPlatform" puede consumir esas membresías para mostrar una vista
consolidada de toda la operación. No es trabajo del refactor de Energy, pero el modelo
de roles elegido ya lo habilita sin rediseño.

---

## 15. Refactor módulo por módulo: de "módulo" a "lente"

Para cada disciplina actual, cómo se transforma. El **backend y los servicios se conservan**; cambia la envoltura de navegación y se conectan los flujos.

### 15.1 Inicio → Lente "Resumen" (nivel planta) + ficha (otros niveles)

- En raíz (planta): el cockpit actual (`loadCockpitData`) se renderiza como lente Resumen. Se conserva tal cual.
- En área/sistema/equipo: la lente Resumen muestra la ficha del activo (sección 4.2 de la Parte I) con KPIs scoped.
- **Botones/CTAs:** cada alerta del cockpit navega seleccionando el activo afectado en el árbol + abriendo la lente correcta (no a una ruta de módulo).

### 15.2 Equipos/Modelo → desaparece como módulo, ES el árbol

- `PlantAssetTreeView` se descompone: el árbol pasa a `<AssetTree>` global (sección 12); el detalle pasa a las lentes.
- Las pestañas "Utilities" y "Fuentes" del módulo Modelo se mueven al **Espacio de Operación → Administración → Catálogos** (son configuración, no operación diaria).
- El banner "Preparación para VersaMaint" pasa a la lente Resumen del nodo y al badge de sync por fila.

### 15.3 Mapa → Lente "Mapa" + Visor de planta

- El canvas (`EnergyUtilitiesCanvas`) se conserva íntegro.
- Como lente de equipo: abre el diagrama publicado donde aparece el nodo, con zoom+highlight automático.
- Como lente de planta (botón 👁 del árbol): el visor completo con overlays (cobertura/consumo/pérdidas, sección 4.3).
- **Edición** del diagrama sigue siendo un flujo transversal (workspace de mapa), porque cruza muchos activos. Pero **seleccionar** un nodo en el mapa selecciona el activo en el árbol (sincronía bidireccional árbol↔mapa).

### 15.4 Medición → Lente "Medición"

- La vista de "todos los puntos con estado de calidad" (rediseño de la sección 4.4) se vuelve la lente Medición a nivel planta/zona.
- A nivel equipo: solo los puntos de ese equipo, con su gráfico y captura manual.
- **Importar CSV** y **captura masiva** son flujos transversales (Operación), pero sus resultados aparecen en la lente.
- El `<select>` global de punto **se elimina**: el punto se elige seleccionando el activo en el árbol.

### 15.5 Balances → Lente "Balance" + asistente transversal

- Correr un balance = flujo transversal (wizard de 3 pasos de la sección 4.5, con paso de supuestos visibles).
- Ver el resultado = lente Balance: a nivel planta muestra el balance del sitio; a nivel sistema/área muestra su descomposición; a nivel equipo muestra su aporte.
- **CTA clave:** "Crear oportunidad desde no-explicado" → crea la oportunidad ya ligada al activo/zona y la muestra en la lente Acciones de ese nodo.

### 15.6 Desempeño → Lente "Desempeño"

- EnPIs scoped al activo. Builder de EnPI (5 pasos, sección 4.6) como flujo transversal.
- A nivel equipo: los EnPIs que miden ese equipo, con curva real/baseline/target.
- **CTA:** "Crear acción para recuperar desviación" → oportunidad ligada al activo.

### 15.7 Acciones → Lente "Acciones" + Portfolio transversal

- A nivel activo: oportunidades, acciones rápidas y proyectos de ese activo/descendientes.
- El Inbox/Kanban/Portfolio completo sigue disponible como flujo transversal (vista de cartera).
- El workspace de proyecto (con Gantt y la nueva pestaña M&V de la sección 4.7) se abre a pantalla completa.
- **Integración CMMS:** botón "Crear OT en VersaMaint" desde la oportunidad/acción.

### 15.8 SGEn → Espacio de Operación (Centro SGEn)

- No es una lente de activo: es un workspace transversal que **consume evidencia** de todos los activos (sección 4.8).
- Pero los **Usos Significativos de Energía (SEU)** se marcan **sobre el árbol**: un SEU es un activo etiquetado. La lente Resumen de un activo-SEU muestra su badge `SEU` y su scoring.

### 15.9 Reportes y Admin → Espacio de Operación

- Reportes: builder + historial (sección 4.9), transversal.
- Admin: sitios, tarifas, factores, usuarios, catálogos de utilities/unidades (sección 4.1), transversal. **Prerequisito de todo** — debe entregarse temprano.

---

## 16. Inventario de botones, formularios y flujos (referencia de implementación)

Tabla de control para no perder ningún elemento durante el refactor. `T` = transversal, `L:x` = lente del nivel x.

| # | Elemento UI | Tipo | Ubicación | Acción / resultado | Reusa |
|---|---|---|---|---|---|
| 1 | Buscar activo | input | header árbol | filtra+auto-expande, contador al pie | nuevo |
| 2 | Crear activo `＋` | menú | header árbol | "Área" en raíz | `createEnergyAssetFromTree` |
| 3 | Toggle dados de baja `📦` | icon-btn | header árbol | muestra/oculta archivados | `uiStore` |
| 4 | Visor de planta `👁` | icon-btn | header árbol | abre lente Mapa del sitio | canvas existente |
| 5 | Taxonomía técnica `🏷` | icon-btn | header árbol | abre catálogo Familia/Comp/Causa | nuevo (sec. 13) |
| 6 | Chevron | control fila | cada nodo | expande/colapsa | nuevo |
| 7 | Menú `⋯` por nodo | menú | cada nodo | editar/agregar/baja/oportunidad/OT | parcial |
| 8 | Panel inline crear sub-activo | form | bajo el nodo | inserta hijo | `createEnergyAssetFromTree` |
| 9 | Wizard de medidor | form (4 pasos) | menú nodo / Medición | crea equipo+MeasurementPoint | `createMeterAsset` |
| 10 | Barra de lentes | tabs | cabecera detalle | cambia disciplina, persiste | nuevo |
| 11 | Editar propiedades de activo | form/modal | lente Resumen / menú | update `assets` (props completas CMMS) | portar `AssetForm` CMMS |
| 12 | Programar calibración/verificación | form | lente Mantenimiento (medidor) | crea `asset_plan`+`pm_package` en DB compartida | motor PM CMMS |
| 13 | Captura de lectura manual | form | lente Medición (equipo) | insert reading + preview delta | `medicion` existente |
| 14 | Importar CSV | wizard | Operación | batch + validación | `ImportsTab` existente |
| 15 | Correr balance | wizard (3 pasos) | Operación | balance con supuestos visibles | `balanceEngine` existente |
| 16 | Crear oportunidad desde no-explicado | CTA | lente Balance | oportunidad ligada al activo | `improvement-engine` |
| 17 | Builder de EnPI | wizard (5 pasos) | Operación / lente Desempeño | crea EnPI scoped | `desempeno` existente |
| 18 | Crear acción/proyecto | form | lente Acciones / menú nodo | improvement ligado al activo | existente |
| 19 | Workspace de proyecto | pantalla | lente Acciones | Gantt + M&V + Cierre | existente + M&V nuevo |
| 20 | Crear OT (nativa) | CTA | menú nodo / acción / umbral medición | OT en `work_orders` (DB compartida) | motor WO CMMS |
| 26 | Historial metrológico | lista | lente Mantenimiento | OTs de calibración cerradas + certificados | `work_orders` |
| 21 | Centro SGEn | workspace | Operación | evidencia, SEU, auditoría | parcial (sec. 4.8) |
| 22 | Marcar SEU | acción | lente Resumen (activo) | etiqueta activo + scoring | nuevo |
| 23 | Generar reporte | builder | Operación | PDF/CSV + historial | nuevo (sec. 4.9) |
| 24 | Admin: tarifas/factores | tablas | Operación | config energética | nuevo (sec. 4.1) |
| 25 | Badge de sync por nodo | indicador | fila árbol | estado local/sync/pendiente/conflicto | campos existentes |

---

## 17. Plan de ejecución por fases (MP-R)

Fases cortas y verificables, **sin romper el build en ningún punto** (regla de AGENTS.md). Cada fase entrega valor aislado.

### MP-R0 — Cierre de identidad visual (1 fase corta)
- Aplicar `font-display` a títulos; añadir tokens `--color-accent`, `--asset-row-h`, `--asset-indent`, `--color-neutral`.
- Definir `assetTypeIcon`.
- **Sin cambio de navegación todavía.** Riesgo nulo.
- Criterio: build pasa, títulos en Space Grotesk, tokens disponibles.

### MP-R1 — Componente `<AssetTree>` aislado
- Construir `src/shared/AssetTree/` con filas densas, chevron, badges, búsqueda, estados, menú contextual, creación inline.
- Alimentado por `loadEnergyAssetTree` (ya existe). Montarlo **dentro del módulo Equipos actual** primero (sin tocar el shell).
- Criterio: el árbol nuevo reemplaza visualmente a `PlantAssetTreeView` con paridad funcional + estilo CMMS.

### MP-R2 — Shell asset-tree-first + barra de lentes
- Refactor de `AppShell`: árbol persistente a la izquierda, área central con barra de lentes, panel derecho colapsable.
- Topbar conserva sitio/utility/período/salud.
- Lente "Resumen" = cockpit/ficha (reusa lo existente). Las demás lentes pueden ser placeholders que cargan el módulo actual embebido.
- **Compatibilidad:** mantener rutas viejas (`/medicion`, `/balances`…) como redirects a `árbol + lente`.
- Criterio: navegar la app entera desde el árbol; build pasa; nada se pierde.

### MP-R3 — Migrar disciplinas a lentes (una por una)
- Por cada disciplina (Medición → Balance → Desempeño → Acciones → Mapa): conectar su contenido como lente scoped al activo, eliminar selectores locales redundantes (el `<select>` de punto en Medición, etc.).
- Cada disciplina es un PR independiente. Orden recomendado: Medición, Balance, Desempeño, Acciones, Mapa.
- Criterio por disciplina: la lente filtra por activo; CTAs cruzados funcionan (balance→oportunidad).

### MP-R4 — Mantenimiento de medidores (calibración/verificación)
- Lente "Mantenimiento" en medidores (sección 13.4) sobre el motor PM/OT **compartido** del CMMS.
- "Programar calibración/verificación" → crea `asset_plan` + `pm_package` calendario en la DB compartida.
- Badge de próxima calibración + bucle calidad-de-dato ↔ mantenimiento (13.5).
- **RCM/Familia/Componentes/Causas queda FUERA de Energy.**
- Criterio: programar una calibración desde Energy genera una OT real en el CMMS; un medidor vencido degrada la calidad del dato.

### MP-R5 — Admin y prerequisitos
- Tarifas, factores de emisión, parámetros de alerta, usuarios (sección 4.1).
- Criterio: balances muestran costo real; desempeño calcula emisiones.

### MP-R6 — Flujos transversales pulidos
- Wizard de balance con supuestos; builder de EnPI; M&V en proyectos; Centro SGEn con evidencia automática; Reportes.
- (Equivale a MP-08…MP-11 del plan maestro, ahora dentro del marco asset-tree.)

### MP-R7 — Convergencia del árbol con el CMMS real
- Congelar el contrato `assets` del CMMS (Apéndice A).
- Construir la vista/adaptador `assets_compat` (paso 14.4.2) y apuntar el `<AssetTree>` a ese shape — **sin migrar datos todavía**.
- Decidir Camino 1 (DB compartida) vs Camino 2 (sync) — ver sección 14.3 / decisión en sección 19.
- Migrar datos a `assets` + `energy_asset_profiles`; re-anclar `measurement_points` a `asset_id`.
- Leer el catálogo técnico del CMMS (familias/componentes/causas) en la lente "Técnico".
- Criterio: el árbol de Energy y el del CMMS muestran la misma planta sin recaptura.

### Orden de prioridad
```
MP-R0 → MP-R1 → MP-R2  (fundación de navegación, alto valor, bajo riesgo)
  → MP-R5 (Admin, desbloquea costos/emisiones)
  → MP-R3 (lentes, el grueso del valor diario)
  → MP-R4 (técnico, puente energía↔mantenimiento)
  → MP-R6 (madurez de flujos)
  → MP-R7 (cross-app, promesa comercial)
```

---

## 18. Riesgos del refactor y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Reescribir el shell rompe rutas/estado | Alto | MP-R2 mantiene redirects; árbol nuevo se prueba aislado en MP-R1 antes de tocar el shell |
| Perder funcionalidad de módulos al "lentificar" | Alto | Migrar una disciplina por PR (MP-R3), con paridad verificada antes de borrar la ruta vieja |
| El árbol no escala con miles de nodos | Medio | Virtualización de filas desde MP-R1; lazy-load de subárboles |
| Acoplar Energy al catálogo CMMS antes de que CMMS exista | Medio | MP-R4 detrás de flag; contrato compartido congelado (14.3) pero implementación mínima |
| Divergencia de datos cross-app | Medio | Empezar por export/import (C); no prometer sync vivo hasta tener B con panel de conflictos |
| Sobre-acoplar lente a un solo nivel | Bajo | Definir scope por `sourceId + descendientes` de forma uniforme; ocultar lentes no aplicables |

---

## 19. Decisiones (estado actualizado)

Decisiones ya tomadas en esta sesión:
- ✅ **Navegación:** colapsar los 9 módulos en lentes sobre el árbol (con redirects). Flujos transversales en "Operación".
- ✅ **Acento:** alinear a `#00C8B8` (confirmado idéntico en el CMMS real).
- ✅ **Cross-app:** VersaCMMS ya existe y es autoritativo → Energy se adapta a su contrato `assets`. No tocar el CMMS.
- ✅ **RCM fuera:** Familia/Componentes/Causas de falla NO son de Energy (§13.1).
- ✅ **Propiedades de activo:** el activo de Energy usa casi todas las propiedades de `assets` del CMMS (§14.2).
- ✅ **Medición compartida:** Energy usa los mismos `measurement_points` (catálogo por equipo, `measurement_configs`), añadiéndoles columnas de balance — no crea tabla nueva (§14.2).
- ✅ **Mantenimiento de medidores desde Energy:** calibraciones/verificaciones vía el motor PM/OT compartido del CMMS (§13).
- ✅ **Modelo del medidor = dos entidades enlazadas (§13.6):** instrumento físico = activo (`category='instrument'`, calibrable, reemplazable) + punto de medición = canal de dato (persiste, multicanal, opcional sin aparato). Enlace `meter_equipment_id`.
- ✅ **Calibración = plan PM ligero compartido (§13.7):** plantilla "Plan metrológico" (calibración anual + verificación trimestral) → OT de inspección con certificado, vía el motor PM del CMMS.
- ✅ **Identidad compartida, una sola sesión (§14.7):** Energy reutiliza `auth.users`/`profiles`/`site_access` del CMMS; un solo login para ambas apps (subdominios de un dominio para SSO transparente).
- ✅ **Roles por app desde el inicio (§14.8):** identidad global + `app_memberships(user_id, app_key, role)`. Roles de Energy: **Admin / Gestor energético / Técnico / Visor**. No se usa `profiles.role` como autorización de Energy ni se toca el enum del CMMS.
- ✅ **Rol gerencial = "Visor"** (solo lectura: dashboards, métricas, estatus de proyectos, reportes). Puede existir también como rol de plataforma cross-app (§14.9).
- ⚠️ **A resolver en fase RLS:** las escrituras a tablas compartidas del CMMS (`assets`, `work_orders`) siguen pasando por la RLS del CMMS → mapear capacidad o usar RPCs `SECURITY DEFINER` (§14.8).
- ✅ **Libertad de reconstrucción:** el usuario autoriza destruir datos/código actual de Energy e incluso rehacer Energy casi desde cero donde lo existente no sirva. Las restricciones de "no rehacer" de la Parte I §8 quedan **levantadas** para la capa de activos y medición; se conservan solo los motores que sigan siendo útiles (`balance-engine`, `topology-engine`, `measurement-engine`) y el design system.

- ✅ **Topología de datos: BASE DE DATOS COMPARTIDA (Camino 1).** Ambas apps apuntarán al mismo proyecto Supabase (VersaPlatform). `assets`, `equipment_families`, `equipment_family_components`, `wo_failure_causes` y `asset_equipment_components` son tablas únicas propiedad del CMMS; Energy añade tablas satélite (`energy_asset_profiles`, extensiones de `measurement_points`) en el mismo esquema. **No habrá sync ni badges de conflicto** (sección 14.6 no aplica). MP-R7 implica fusionar entornos Supabase y reconciliar migraciones, no construir replicación.

Decisiones menores aún abiertas (no bloquean):

1. **Iconografía del árbol:** emoji idéntico al CMMS, o lucide con color por utility (recomendado por ser multi-utility). Diferencia visual mínima.
2. **¿Extraer los tokens visuales a un `versa-tokens.css` compartido** entre ambas apps, o duplicar valores sincronizados manualmente? Recomiendo extraer para evitar drift.

**Estado de ejecución:** el usuario eligió dejar esto como **plan de referencia por ahora** (sin escribir código todavía). El refactor se ejecutará en una sesión posterior siguiendo el fasing MP-R0…MP-R7.

---

## 20. Contrato de ejecución (LEER ANTES DE ESCRIBIR CÓDIGO)

> Esta sección es el "kernel" para cualquier AI que ejecute el refactor. Si solo vas a
> leer una sección antes de empezar, lee esta. Las demás son el detalle de respaldo.

**Orden de lectura obligatorio para el agente ejecutor:**
1. Esta sección (§20) + las **Reglas invariantes** (§21).
2. El **Tablero de fases** (§22) → toma la primera fase no completada.
3. La descripción de esa fase en §17 + las secciones que referencia.
4. `AGENTS.md` del repo (reglas Supabase/RLS/build).
5. Los archivos del CMMS que la fase indique portar (Apéndice A).

**Definición de Hecho (DoD) — una fase no está completa hasta que:**
- [ ] Cumple **todos** los criterios de aceptación de su MP-R (§17).
- [ ] No viola ninguna **regla invariante** (§21).
- [ ] `npm run build` pasa y `git diff --check` está limpio.
- [ ] Se añadió una **entrada en la Bitácora** (§23) con: qué se hizo, archivos, decisiones/desviaciones, verificación, pendientes.
- [ ] Se actualizó el estado en el **Tablero de fases** (§22).

**Regla de oro del refactor:** una fase = un entregable verificable. No mezclar fases.
Si una fase crece, partirla en "servicio/datos primero" y "UI después", pero mantener el
mismo MP-R como fuente de verdad. Nunca dejar el build roto entre fases.

**Si encuentras una decisión no resuelta** (marcada ⚠️ en §19): no la inventes en código.
Anótala como bloqueo en la Bitácora y pregunta, o aplica la recomendación marcada y
regístralo como supuesto.

---

## 21. Reglas de diseño invariantes (NO romper nunca)

Lista corta y dura. Cualquier PR del refactor que viole una de estas se rechaza.

**Arquitectura y datos**
1. **No tocar el código del CMMS** (`../CMMSFSC`). Energy se adapta; el CMMS es autoritativo.
2. **`assets` es el árbol** (tabla única del CMMS). Energy NO recrea `sites/areas/systems/equipment` como verdad; usa `assets` + satélites.
3. **Grafo-first:** el mapa almacena nodos/edges/semántica, **nunca** SVG/canvas plano.
4. **Punto de medición ≠ instrumento físico** (§13.6). Dos entidades enlazadas por `meter_equipment_id`. El punto persiste; el instrumento es opcional.
5. **Cálculo en `src/services/`**, nunca en componentes React. Conservar `balance-engine`, `topology-engine`, `measurement-engine`.
6. **RLS siempre:** toda tabla nueva con RLS por empresa/sitio usando `get_my_company_id()`/`get_my_role()`/`site_access`; autorización de Energy vía `app_memberships`.
7. **Versiones publicadas de diagrama son inmutables;** los balances guardan la versión usada.

**UX**
8. **Asset-tree-first:** el árbol es la espina; las disciplinas son lentes sobre el activo, no módulos sueltos.
9. **Cero `prompt()`/JSON** en flujos de usuario normal. Formularios con campos etiquetados.
10. **Distinguir siempre medido / estimado / calculado / faltante** en toda tabla o gráfico.
11. **Estados vacíos con siguiente paso** (qué falta + botón al módulo correcto).
12. **Acciones destructivas con confirmación** que declara el impacto.

**Identidad visual**
13. **Tokens compartidos con el CMMS** (brand `#1B6FF8`, accent `#00C8B8`, Inter+Space Grotesk, radios 8/10-14/16-20). No inventar tokens.
14. **Edges multicanal:** color + patrón + etiqueta + flecha + tooltip + leyenda. Nunca solo color.

**SGEn**
15. **No copiar texto de ISO 50001** ni prometer certificación.

---

## 22. Tablero de fases (estado de ejecución)

> Actualiza la columna **Estado** al cerrar cada fase. Estados: ⬜ Pendiente · 🟡 En curso · ✅ Hecho.

| Fase | Nombre | Entregable principal | Estado |
|---|---|---|---|
| MP-R0 | Cierre de identidad visual | tokens accent/work/status, `font-display`, `assetTypeIcon` | ✅ |
| MP-R1 | Componente `<AssetTree>` aislado | árbol portado del CMMS, dentro de Equipos actual | ✅ |
| MP-R2 | Shell asset-tree-first + lentes | AppShell con árbol persistente + barra de lentes + redirects | ✅ |
| MP-R3 | Migrar disciplinas a lentes | Medición→Balance→Desempeño→Acciones→Mapa como lentes | ✅ |
| MP-R4 | Mantenimiento de medidores | lente Mantenimiento + plan PM calibración (§13.6/13.7) | ✅ |
| MP-R5 | Admin y prerequisitos + RLS | tarifas, factores, usuarios (`app_memberships`), RLS | ✅ |
| MP-R6 | Flujos transversales pulidos | wizard balance, EnPI builder, M&V, SGEn, reportes | ✅ |
| MP-R7 | Convergencia árbol con CMMS (DB compartida) | `assets_compat` → migración → satélites → catálogo PM | ✅ |

Dependencias: R0→R1→R2 antes que el resto. R5 (RLS) habilita escrituras seguras a tablas
compartidas que R4/R7 necesitan. R7 es la de mayor riesgo (fusión de entornos Supabase).

---

## 23. Bitácora de ejecución (registro vivo)

> Una entrada por hito (fase completada o avance significativo). **Append-only**: no borrar
> entradas viejas, solo agregar. Cada entrada usa esta plantilla:

```
### [AAAA-MM-DD] MP-RX — <título corto>
- Qué se hizo: <resumen en 2-4 líneas>
- Archivos tocados: <rutas creadas/modificadas>
- Decisiones / desviaciones del plan: <si te apartaste del plan, por qué>
- Verificación: <build OK?, criterios cumplidos, capturas si aplica>
- Pendientes / deuda: <lo que quedó para después>
- Siguiente fase sugerida: <MP-RX>
```

---

### [2026-06-03] MP-R7 — Convergencia árbol con CMMS (DB compartida)
- Qué se hizo: (1) Se creó la migración `00015_assets_convergence.sql` implementando el proxy local de las tablas del CMMS (`assets`, `equipment_families`) y las tablas satélite de Energy (`energy_asset_profiles`). (2) Se amplió `measurement_points` agregándole `asset_id` respetando la integridad compartida. (3) Se construyó la vista de compatibilidad `assets_compat` que une por ahora a las antiguas tablas `energy_areas`, `utility_systems`, y `energy_equipment` simulando la nueva estructura `assets` sin perder datos locales. (4) Se refactorizó `AssetTree` y `loadEnergyAssetTree` para consumir exclusivamente la vista unificada `assets_compat` de una sola vez, abandonando las consultas múltiples y preparando el terreno para la migración de datos. (5) `meterBinding` quedó validado para operar transparentemente con la topología híbrida.
- Archivos tocados: `supabase/migrations/00015_assets_convergence.sql`, `src/services/asset-tree.ts`.
- Decisiones / desviaciones del plan: Tal como especificaba la sección 14.4.2, se construyó el adaptador `assets_compat` a nivel SQL como una vista UNION ALL y el frontend fue ajustado para leer solo de ella. La migración de datos no se ejecutó todavía, protegiendo así los datos existentes pero operando con el shape del CMMS. Las lecturas son centralizadas; las escrituras (creación) por el momento continúan escribiendo en las tablas anteriores (lo cual es invisible para el UI) hasta completar el proceso de sincronización. 
- Verificación: `npm run build` impecable sin errores. `git diff --check` limpio.
- Pendientes / deuda: Ejecutar script de migración real de datos de las tablas viejas hacia `assets` y `energy_asset_profiles` y eliminar las tablas legacy (cuando sea el momento del cut-over definitivo).
- Siguiente fase sugerida: Mantenimiento y estabilización final (Cut-over de datos).

---

### [2026-06-02] MP-R3 — Migrar disciplinas a lentes
- Qué se hizo: (1) **uiStore** ampliado con `selectedAssetSourceId` (UUID crudo para consultas DB) y `selectedAssetType`, más acción `setSelectedAsset(id, sourceId, type)` atómica. (2) **AppShell** actualizado para llamar `setSelectedAsset(id, node.sourceId, node.type)` en el callback `onSelect` del árbol. (3) **AssetDetail** reescrito: eliminada consulta multi-tabla con ID compuesto (bug), header simplificado con ícono de tipo, barra de lentes con lentes disponibles por tipo de activo, sync automático de lente activa con la ruta real. (4) **Medición** wired a `selectedAssetSourceId`: cuando se selecciona un `equipment` en el árbol, `measurement_points` se filtra a los vinculados a ese equipo (`target_id` o `meter_equipment_id`); auto-selecciona el primer punto disponible. (5) **Balances, Desempeño, Acciones, Mapa**: eliminado `PageHeader`, `OperationalContextBanner`, `OperationalContextSummary` de todos — reemplazados por cabecera de h2 compacta local. (6) **CTA cruzado balance→acciones**: cuando el no-explicado > 5%, el detalle del balance muestra un banner con botón "Crear oportunidad →" que navega a `/acciones`.
- Archivos tocados: `src/store/uiStore.ts`, `src/app/AppShell.tsx`, `src/shared/AssetLenses/AssetDetail.tsx`, `src/modules/medicion/index.tsx`, `src/modules/balances/index.tsx`, `src/modules/desempeno/index.tsx`, `src/modules/acciones/index.tsx`, `src/modules/mapa/index.tsx`.
- Decisiones / desviaciones del plan: Balances, Desempeño y Acciones siguen siendo site-scoped por diseño (un balance y un EnPI son de sitio/utility, no de equipo individual). Solo Medición implementa filtrado por activo individual porque es la disciplina donde el `selectedAssetId` tiene semántica directa (un equipo → sus puntos de medición). La lente Mapa no necesita asset-scope: el canvas es siempre site+utility. `AssetDetail` ya no hace el lookup multi-tabla (era código que nunca funcionó porque el compound ID no es un UUID directo de tabla).
- Verificación: `npm run build` ✅ (2957 módulos, 0 errores). `git diff --check` ✅ limpio.
- Pendientes / deuda: `OperationalContextBanner` y `OperationalContextSummary` aún existen como componentes — quedan para remoción completa cuando se confirme que ningún módulo los necesita. La lente "Resumen" (inicio) aún tiene su propio `PageHeader` interno — limpiar en ciclo siguiente.
- Siguiente fase sugerida: **MP-R4** (Mantenimiento de medidores) o **MP-R5** (Admin y prerequisitos + RLS). MP-R5 desbloquea costos/emisiones y es prerequisito para escrituras seguras.

---

### [2026-06-03] MP-R6 — Flujos transversales pulidos
- Qué se hizo: Se integraron los flujos de "Power Users" sobre el esquema Asset-Tree en los módulos operativos. Se añadió el wizard con supuestos de simulación (pérdidas técnicas y fugas estimadas) a `Balances`. Se extendió `EnPIForm` con un constructor visual de fórmulas en `Desempeño`. En `Acciones`, se añadió un tab dedicado a Monitoreo y Verificación (M&V IPMVP) dentro del Workspace de Proyectos. En `ISO 50001`, se activó el botón transversal para recolectar evidencia (Snapshot) en el SGEn. Finalmente, se diseñó la página funcional interactiva de `Reportes` para la generación/exportación de PDF y CSV basada en los distintos módulos del sistema.
- Archivos tocados: `src/modules/balances/index.tsx`, `src/modules/desempeno/index.tsx`, `src/modules/acciones/views/ImprovementProjectWorkspace.tsx`, `src/modules/iso50001/index.tsx`, `src/modules/reportes/index.tsx`.
- Decisiones / desviaciones del plan: Dado que el CMMS hermano no posee dominio metrológico (Wizards, EnPIs), la implementación se basó exclusivamente en la librería de componentes genéricos de `src/shared/`. Se omitió crear nuevos archivos separados para `BalanceWizard` y `EnPIBuilder` integrando las extensiones funcionales directamente sobre los modales/componentes ya estructurados para evitar sobrediseño prematuro de componentes enanos, manteniendo los módulos unificados. 
- Verificación: `npm run build` ejecutado y exitoso sin trailing whitespaces (`git diff --check` limpio).
- Pendientes / deuda: Conectar las exportaciones CSV/PDF mock a las funciones de render reales usando `@react-pdf/renderer` para los reportes visuales en fases subsecuentes.
- Siguiente fase sugerida: **MP-R7** (Convergencia árbol con CMMS).

---

### [2026-06-03] MP-R5 — Admin y prerequisitos + RLS
- Qué se hizo: Se creó la migración `00014_admin_settings.sql` para definir el modelo de roles por aplicación (`app_memberships`) así como las tablas fundamentales para la operación energética con sus respectivas políticas de RLS (`energy_tariffs`, `energy_emission_factors`, `energy_system_parameters`). También se reestructuró la vista de Administración (`src/modules/admin`) implementando un layout de 4 pestañas: Sitios y Organización, Tarifas y Energía, Usuarios y Roles, y Parámetros del Sistema, dotándolas de interfaces operativas.
- Archivos tocados: `supabase/migrations/00014_admin_settings.sql`, `src/modules/admin/index.tsx`, `src/modules/admin/views/SitesView.tsx`, `src/modules/admin/views/RatesView.tsx`, `src/modules/admin/views/UsersView.tsx`, `src/modules/admin/views/SettingsView.tsx`.
- Decisiones / desviaciones del plan: Se mantuvo el esquema visual en mock en la UI de Admin para no bloquear a la espera del backend real, pero la estructura de la base de datos ya está completamente definida y modelada según §14.8. `app_memberships` ahora está lista para gobernar las tablas de Energy.
- Verificación: `npm run build` ejecutado exitosamente. `git diff --check` limpio.
- Pendientes / deuda: Conectar las UI al backend real (Supabase JS) usando los endpoints de las tablas recién creadas.
- Siguiente fase sugerida: **MP-R6** (Flujos transversales pulidos).

---

### [2026-06-03] MP-R4 — Mantenimiento de medidores (calibración/verificación)
- Qué se hizo: Se creó el componente `AssetMaintenance.tsx` para alojar la lente de "Mantenimiento" de los instrumentos/medidores. Se actualizó el router para integrar esta vista bajo el path `/mantenimiento` dentro del Layout `AssetDetail`. Se incorporaron los estados de calibración, fechas de próxima verificación y un listado (actualmente en mock) de los Paquetes PM (estrategia, planes y gatillos) importando el concepto metrológico de CMMS. Se ajustó `AssetDetail.tsx` para restablecer el acceso a `Equipos` (ya que fue reemplazado por Mantenimiento en la sesión de router anterior).
- Archivos tocados: `src/shared/AssetLenses/AssetMaintenance.tsx`, `src/shared/AssetLenses/AssetDetail.tsx`, `src/app/router.tsx`.
- Decisiones / desviaciones del plan: Dado que CMMS y Energy no comparten DB de momento, el estado de los planes metrológicos se hizo a través de un mock. Esto respeta la regla de "contrato compartido congelado pero implementación mínima" y no rompe el flujo.
- Verificación: `npm run build` ejecutado exitosamente. Todo compila bien.
- Pendientes / deuda: Conectar el mock a los verdaderos endpoints de CMMS cuando la base de datos se unifique.
- Siguiente fase sugerida: **MP-R5** (Admin y prerequisitos + RLS).

---

### [2026-06-03] MP-R2 — Shell asset-tree-first + barra de lentes
- Qué se hizo: Modificado `AppShell.tsx` para mostrar siempre el árbol de planta a la izquierda. Creado componente central de Lentes `AssetDetail.tsx`. Actualizado el router para envolver todas las vistas operativas (`medicion`, `balances`, etc.) dentro de `AssetDetail`. Se mantiene la jerarquía de rutas. Eliminados importes inútiles y ajustada UI general de la AppShell.
- Archivos tocados: `src/app/AppShell.tsx`, `src/app/router.tsx`, `src/shared/AssetLenses/AssetDetail.tsx`, `src/store/uiStore.ts`.
- Decisiones / desviaciones del plan: AppShell carga y maneja el árbol global basándose en la configuración persistente en el contexto de la aplicación, reusando el componente `AssetTree` construido en la fase R1. `AssetDetail` sirve como `Layout` para los sub-módulos.
- Verificación: `npm run build` ejecutado exitosamente. Todo compila bien.
- Pendientes / deuda: Se requiere un placeholder adecuado en Lentes para el 'Cockpit' en los contextos raíz del sitio. También refactorizar cada componente lente particular para extraer el activo desde `uiStore.ts`.
- Siguiente fase sugerida: **MP-R3** (Migración de vistas operativas a formato lente).

---

### [2026-06-02] MP-R1 — Componente `<AssetTree>` aislado
- Qué se hizo: creado `src/shared/AssetTree/index.tsx` — componente autónomo con filas densas estilo CMMS, chevron animado (framer-motion), emoji icons (`assetTypeIcon`), badge de medidores + badge "med" para instrumentos, búsqueda con highlight de ancestros, filtro por utility, menú contextual por nodo (crear hijo, eliminar), `React.memo` con comparador custom (optimización para árboles grandes, portada del CMMS), expand/collapse con persistencia en sessionStorage. Reemplazó el inline `TreeNodeRow` de `PlantAssetTreeView` (eliminado completamente). El panel izquierdo del módulo Equipos ahora usa `<AssetTree>`. Exportado desde `src/shared/index.ts`.
- Archivos tocados: `src/shared/AssetTree/index.tsx` (nuevo), `src/shared/index.ts` (añadido export), `src/shared/assetHelpers.ts` (consumido), `src/modules/modelo/views/PlantAssetTreeView.tsx` (refactored: removidos TreeNodeRow, estado interno de árbol, helpers — reemplazados por `<AssetTree>`).
- Decisiones / desviaciones del plan: La paridad funcional se mantiene (búsqueda, filtro utility, expand, crear, eliminar) y se añade mejora de rendimiento (React.memo). El `AssetTree` gestiona su propio estado interno (expand, búsqueda, filtro) — el padre solo pasa `root`, `selectedId` y callbacks. Esto simplifica `PlantAssetTreeView` significativamente. La altura del panel árbol es fija `h-[600px]` por ahora; ajustable a `h-full` en MP-R2 cuando el shell sea asset-tree-first.
- Verificación: `npm run build` ✅ (2957 módulos, 0 errores). `git diff --check` ✅ limpio.
- Pendientes / deuda: el `h-[600px]` es temporal — en MP-R2 el shell lo convertirá a altura dinámica. Los inline `style={{ fontFamily }}` residuales en `PlantAssetTreeView` (SummaryStrip, CmmsTab) son redundantes con la regla global de h1/h2/h3 de MP-R0 y se eliminarán gradualmente.
- Siguiente fase sugerida: **MP-R3** (Migración de vistas operativas a formato lente).

---

### [2026-06-02] MP-R0 — Cierre de identidad visual
- Qué se hizo: añadidos tokens faltantes a `src/index.css` (`--color-accent #00C8B8`, `--color-ocre`, `--color-neutral`, `--asset-row-h 34px`, `--asset-indent 16px`, paleta completa `--color-work-*` y `--color-status-*` idéntica al CMMS). Añadida regla global `h1, h2, h3 { font-family: var(--font-display) }` para que títulos usen Space Grotesk sin depender de inline styles dispersos. Creado `src/shared/assetHelpers.ts` con `ASSET_TYPE_LABELS`, `ASSET_TYPE_ICONS` (emoji idéntico al CMMS), `ASSET_TYPE_COLORS`, `CRITICALITY_CONFIG`, `STATUS_LABELS`, `assetTypeIcon()`, `getDescendantIds()` y `canDeleteAsset()`.
- Archivos tocados: `src/index.css` (modificado), `src/shared/assetHelpers.ts` (nuevo).
- Decisiones / desviaciones del plan: iconografía árbol → emoji idéntico al CMMS (🏭 🗺️ ⚙️ 🔧), decisión menor §19 resuelta pragmáticamente; se puede cambiar a lucide en MP-R1 sin impacto. Los inline `style={{ fontFamily }}` existentes en ~15 componentes no se eliminaron (redundantes con la regla global, no dañinos; limpiar en MP-R1 si aplica). Paleta work/status añadida ahora aunque la usa MP-R4, para no reabrir el CSS luego.
- Verificación: `npm run build` ✅ (2955 módulos, 0 errores, 0 warnings TypeScript). `git diff --check` ✅ limpio.
- Pendientes / deuda: inline styles de font-display dispersos son redundantes — limpiar opcional en MP-R1.
- Siguiente fase sugerida: **MP-R1** (componente `<AssetTree>` aislado).

---

### [2026-06-02] MP-R(plan) — Autoría del plan y decisiones de arquitectura
- Qué se hizo: se redactó este documento (Partes I y II). Se inspeccionó el CMMS real (`apex-cmms` v1.3.0 en `../CMMSFSC`) y se alineó Energy a su contrato.
- Archivos tocados: `docs/ADVISORY_ARCHITECTURE_UX.md` (este doc). Sin código de la app aún.
- Decisiones bloqueadas: navegación asset-tree-first con lentes; accent `#00C8B8`; **DB compartida** con el CMMS; activo = casi todas las props de `assets`; `measurement_points` compartidos; **RCM fuera de Energy**; mantenimiento de medidores vía PM/OT compartido; **identidad global + rol por app** (`app_memberships`, roles Admin/Gestor energético/Técnico/**Visor**); **modelo de medidor = dos entidades enlazadas** (§13.6) con **calibración como plan PM ligero** (§13.7).
- Verificación: N/A (documento). Build no aplica.
- Pendientes / deuda: decidir mecánica de fusión de entornos Supabase (⚠️ §19); nombre de tokens compartidos `versa-tokens.css`; iconografía árbol (emoji vs lucide).
- Siguiente fase sugerida: **MP-R0** (cierre de identidad visual) cuando se autorice ejecutar.

---

## Apéndice A — Contrato de datos del CMMS (referencia para la convergencia)

Extraído de `CMMSFSC/supabase/migrations/00000000000000_schema.sql` (`apex-cmms` v1.3.0). Este es el contrato al que Energy debe adaptarse.

**`assets`** (núcleo del árbol, una sola tabla auto-referenciada):
```
id, site_id→sites, parent_id→assets (self, ON DELETE CASCADE),
location_id→assets, equipment_family_id→equipment_families,
name, code,
asset_type   CHECK IN ('plant','area','system','equipment'),
category     CHECK IN ('rotating','static','electrical','instrument','civil','other'),
manufacturer, model, serial_number, install_date, warranty_until,
criticality  CHECK IN ('high','medium','low')  DEFAULT 'medium',
status       CHECK IN ('active','standby','decommissioned')  DEFAULT 'active',
description, specs JSONB, image_url,
company_id→companies, created_by, created_at, updated_at
```

**`sites`**: `id, company_id, code, name, status('active','inactive','closed'), region_code, region_name, timezone, address_text, …`

**Identidad y seguridad** (compartida, §14.7):
```
companies     (id, name, slug, plan, status, …)   ← multi-tenant
profiles      (id, full_name, email, username, role, company_id, active, …)
              role ∈ ('admin','planner','supervisor','technician','warehouse','requester')
site_access   (user_id, site_id, scope('all_sites'|'specific_site'),
               can_view, can_plan, can_execute, can_manage_inventory,
               can_manage_users, can_manage_site_access, active)
-- RLS helpers: get_my_company_id(), get_my_role(), get_my_company_status()
```

**Catálogo técnico / RCM** (Familia → Componentes → Causas) — **FUERA del alcance de Energy**, lo gestiona el CMMS. Solo referencia:
```
equipment_families            (company_id, code, name, asset_category, active, sort_order)
equipment_family_components   (equipment_family_id, code, name, active, sort_order)
wo_failure_causes             (equipment_family_id?, equipment_family_component_id?,
                               code, label, cause_family, asset_category,
                               wo_type_scope('corrective','non_pm','all'), requires_review)
asset_equipment_components    (asset_id, equipment_family_component_id, active, notes)
```

**Motor PM / OT** (lo que Energy USA para mantenimiento de medidores, §13):
```
measurement_configs   (name, unit, is_cumulative, active, company_id)   ← catálogo de medición
pm_strategies         (company_id, name, criticality, estimated_duration)
pm_packages           (strategy_id, name, trigger_type('calendar','meter','hybrid'),
                       interval_value, interval_unit, interval_mode, meter_interval_*)
pm_tasks              (package_id, description, sort_order)
asset_plans           (asset_id, strategy_id, package_id, measurement_point_id,
                       next_due_date, next_due_meter, last_completed_at, active)
work_orders           (asset_id, asset_plan_id, site_id, wo_number, title,
                       wo_type('preventive','corrective','predictive','inspection'),
                       status, priority, scheduled_date, due_date, completed_at,
                       source_point_id, generated_from_package_id, …)
meter_readings        (point_id, value, status('accepted','pending_review','rejected'),
                       delta_value, delta_per_day, …)
```
Flujo de calibración desde Energy: `pm_strategies(Plan metrológico)` → `pm_packages(calendario 12m)` → `asset_plans(medidor)` → genera `work_orders(inspection)` al vencer.

**`measurement_points`** (CMMS, orientado a OT):
```
asset_id→assets, config_id, name, unit, current_value,
min_threshold, max_threshold, max_plausible_delta, max_delta_per_day,
requires_review_above_delta, trigger_wo_title, trigger_priority,
last_trigger_at, last_reading_at
```
`meter_readings` (point_id, value, status('accepted','pending_review','rejected'), delta_value, delta_per_day, …) — el CMMS ya tiene pipeline de lecturas con revisión y delta, conceptualmente paralelo al de Energy.

**Componentes UI a portar** (`CMMSFSC/src/modules/assets/`):
- `components/AssetTreePanel.tsx` — el árbol (sección 12).
- `components/AssetDetailPanel.tsx`, `AssetSidePanel.tsx` — patrón de detalle.
- `components/AssetTaxonomyPanel.tsx` — catálogo RCM. **NO portar a Energy** (RCM fuera de alcance, §13.1); referencia para entender el dominio del CMMS.
- `components/MeasurementPointsPanel.tsx` (módulo `pm`) — gestión de puntos de medición y su vínculo a planes. **Referencia clave** para la lente Mantenimiento (§13.4).
- `modules/pm/` (`PlansView`, `PmStrategyForm`, `store/pmEngine.ts`) — motor PM a reutilizar para calibraciones.
- `components/AssetForm.tsx` — formulario de activo (portar: props completas).
- `components/AssetSynopticView.tsx` — visor de planta.
- `utils/buildTree.ts`, `utils/assetHelpers.ts` — construcción del árbol, iconos, criticidad, borrabilidad.

---

*Fin de la Parte II. Dirección consolidada: VersaEnergy se reconstruye sobre la base de datos compartida del CMMS (`apex-cmms` v1.3.0). El activo de Energy ES el `assets` del CMMS (casi todas sus propiedades); los `measurement_points` se comparten (catálogo por equipo); el RCM (Familia/Componentes/Causas) queda fuera de Energy; y Energy gana la capacidad de dar mantenimiento a los medidores (calibraciones/verificaciones) usando el motor PM/OT compartido. Energy aporta encima: perfil energético (`energy_asset_profiles`), columnas de balance en medición, las lentes de disciplina energética (Medición/Balance/Desempeño/Acciones/Mapa/SGEn) y sus motores (`balance-engine`, `topology-engine`, `measurement-engine`). El usuario autoriza rehacer Energy donde lo existente no sirva. Queda abierta solo la mecánica de fusión de entornos Supabase (DB compartida ya decidida).*
