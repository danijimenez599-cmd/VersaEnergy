# VersaEnergy — Plan de Rediseño UI + Compatibilidad VersaMaint
> Documento temporal de trabajo — Junio 2026
> Estado: BORRADOR APROBADO — pendiente de ejecución por sprints

---

## Premisa estratégica

VersaEnergy es el **anzuelo comercial** hacia VersaMaint. Si el usuario de energía
no logra usar el mapa con fluidez, la conversión al CMMS no ocurre.

Decisión de diseño central:
> **La UI de VersaEnergy debe ser visualmente idéntica a VersaMaint** en
> tipografía, colores, bordes, sombras, layout, componentes y patrones de
> interacción. El usuario que aprende Energy debe llegar a Maint sin curva.

---

## Parte 1 — Alineación de Design System con VersaMaint

### 1.1 Delta actual entre ambos sistemas

| Token | VersaMaint (CMMS) | VersaEnergy (actual) | Acción |
|---|---|---|---|
| Brand color | `#1B6FF8` | `#1e40af` | Migrar Energy a `#1B6FF8` |
| Background app | `#F4F7FB` | `#f9fafb` | Migrar Energy a `#F4F7FB` |
| Font display | Inter + **Space Grotesk** | Inter solo | Agregar Space Grotesk |
| Border radius base | `--radius-lg: 14px` | `--radius-card: 0.5rem` | Escalar a 10-14-16-20px |
| Button hover | `active:scale-[0.97]` | Sin scale | Agregar micro-interacción |
| Shadows | card / card-hover / floating | card / modal | Igualar tokens |
| Scrollbar | 5px thumb brand-color | default | Igualar CSS |
| Status badge tokens | Sistema semántico completo | Parcial | Completar |
| Confirm dialogs | `<ConfirmDialog>` propio | `confirm()` browser | Reemplazar todos |
| Toast system | `showToast({type, title, message})` | Toast string simple | Enriquecer |

### 1.2 Cambios en `src/index.css` y Tailwind

#### Archivo `src/index.css` — versión alineada con CMMS

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@700&display=swap');
@import "tailwindcss";

@theme {
  /* ── Brand (igual que CMMS) ─────────────────── */
  --color-brand:          #1B6FF8;
  --color-brand-dark:     #0F5AD1;
  --color-brand-light:    #F0F6FF;

  /* ── Utilities palette (Energy-specific) ───── */
  --color-utility-electricity: #1B6FF8;
  --color-utility-gas:         #ea580c;
  --color-utility-steam:       #7c3aed;
  --color-utility-air:         #0d9488;
  --color-utility-water:       #0891b2;
  --color-utility-chilled:     #06b6d4;
  --color-utility-solar:       #f59e0b;
  --color-utility-diesel:      #92400e;

  /* ── Semantic status (igual que CMMS) ────────── */
  --color-ok:             #15803d;
  --color-ok-bg:          #f0fdf4;
  --color-warn:           #b45309;
  --color-warn-bg:        #fffbeb;
  --color-danger:         #b91c1c;
  --color-danger-bg:      #fef2f2;
  --color-info:           #1d4ed8;
  --color-info-bg:        #eff6ff;

  /* ── Backgrounds (igual que CMMS) ────────────── */
  --color-bg-app:         #F4F7FB;
  --color-bg-2:           #ffffff;
  --color-bg-3:           #E8F0FB;
  --color-surface:        #ffffff;
  --color-surface-muted:  #F4F7FB;

  /* ── Text ────────────────────────────────────── */
  --color-tx:             #111827;
  --color-tx-2:           #374151;
  --color-tx-3:           #6b7280;
  --color-tx-4:           #9ca3af;
  --color-border:         #f3f4f6;

  /* ── Typography (igual que CMMS) ─────────────── */
  --font-sans:            'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-display:         'Space Grotesk', ui-sans-serif, system-ui, sans-serif;
  --font-mono:            'JetBrains Mono', ui-monospace, monospace;

  /* ── Border radius (igual que CMMS) ─────────── */
  --radius-sm:   8px;
  --radius-md:   10px;
  --radius-lg:   14px;
  --radius-xl:   16px;
  --radius-2xl:  20px;

  /* ── Shadows (igual que CMMS) ────────────────── */
  --shadow-card:        0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05);
  --shadow-card-hover:  0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.10);
  --shadow-floating:    0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08);
  --shadow-modal:       0 20px 25px -5px rgba(0,0,0,0.10), 0 8px 10px -6px rgba(0,0,0,0.06);
}
```

### 1.3 Componentes compartidos a crear/migrar en `src/shared/`

Estos componentes deben ser pixel-idénticos a los del CMMS:

| Componente | Archivo Energy actual | Acción |
|---|---|---|
| `Button` | `src/shared/Button.tsx` | Añadir `active:scale-[0.97]`, variantes `danger/success/warning/ghost/outline` |
| `Badge` | `src/shared/Badge.tsx` | Añadir sistema semántico de tokens completo igual al CMMS |
| `ConfirmDialog` | No existe | Crear — reemplaza todos los `confirm()` del proyecto |
| `Toast` | Implementación simple | Enriquecer con `type: 'success'|'error'|'warning'|'info'` + ícono + título |
| `FormField` | Inline en formularios | Crear componente wrapper con label, error, hint |
| `Select` | `<select>` nativo | Crear con estilos CMMS |
| `Spinner/Loader` | `Loader2` inline | Estandarizar |
| `AlertBanner` | No existe | Crear — igual al CMMS |
| `EmptyState` | Existe | Actualizar estilos a tokens CMMS |
| `PageHeader` | Existe | Añadir slot para breadcrumb y acciones secundarias |

---

## Parte 2 — Rediseño del Módulo de Equipos (Árbol de Activos)

### Layout objetivo: idéntico a VersaMaint AssetRegistry

```
┌─────────────────────────────────────────────────────────────────────┐
│ Header: "Equipos & Activos"    [+ Nuevo]  [Buscar]  [Filtros]       │
├──────────────────────┬──────────────────────────────────────────────┤
│  Panel izquierdo     │  Panel derecho (detalle)                     │
│  280px               │  flex-1                                      │
│  ─────────────────   │  ───────────────────────────────────────     │
│  Árbol de planta     │  [Tabs: Info | Energía | Medidores |         │
│  ● Planta Principal  │         Adjuntos | CMMS]                     │
│    ▶ Área Producción │                                              │
│      ▶ Sistema Aire  │  Ficha del nodo seleccionado                 │
│        ● Compresor   │  con campos por tipo de equipo               │
│      ▶ Sistema Elec  │                                              │
│    ▶ Área Servicios  │                                              │
│  [Resumen: 4A/12S/   │                                              │
│   38E/15M]           │                                              │
└──────────────────────┴──────────────────────────────────────────────┘
```

### 2.1 Panel Izquierdo — Árbol de planta

**Mejoras vs actual:**

1. **Expand/collapse real con persistencia en sessionStorage**
   - Flecha `ChevronRight` → rota a `ChevronDown` al expandir
   - Estado guardado en `sessionStorage('energy-tree-expanded')`
   - Expandir al cargar el nodo seleccionado automáticamente

2. **Buscador en el árbol** (igual que CMMS `AssetTreePanel`)
   ```
   [🔍 Buscar activo...]   [×]
   ```
   - Filtra en tiempo real por nombre y código
   - Expande automáticamente los resultados
   - Resalta el texto coincidente

3. **Context menu en hover** (tres puntos `MoreHorizontal`) igual que CMMS
   - Opciones: [Agregar hijo] [Editar] [Ver en mapa] [Dar de baja]
   - Usando `ConfirmDialog` propio, no `confirm()`

4. **Indicadores visuales por nodo** (igual CMMS)
   - Bolita de criticidad de color (verde/amarillo/rojo) — basada en alertas de medición
   - Badge count de medidores activos
   - Badge `met` para activos que son equipment-medidor

5. **Resumen sticky al pie del árbol**
   ```
   Plantas 1 · Áreas 4 · Sistemas 12 · Equipos 38 · Medidores 15
   ```

### 2.2 Panel Derecho — Ficha del activo

**Tabs reorganizados (misma estructura que CMMS):**

```
[Información] [Especificaciones Energía] [Medidores] [Adjuntos] [CMMS]
```

#### Tab "Información" — Campos base (igual que CMMS info tab)

```
┌──────────────────────────────────────────────────────┐
│  [ícono tipo]  Transformador Principal               │
│  TAG: T-01   ·  Área: Sala Eléctrica  ·  Sistema: EL│
│  [Badge: Equipo] [Badge: Electricidad] [Badge: ✓ CMMS│
│                                                      │
│  Estado: Activo     Criticidad: Alta                 │
│  Fabricante: ABB    Modelo: —    N/S: —              │
│  Fecha instalación: —   Garantía: —                  │
└──────────────────────────────────────────────────────┘
```

#### Tab "Especificaciones Energía" — NUEVO (reemplaza el JSON dump actual)

Campos dinámicos por `equipment_type`. Cada tipo de equipo tiene su propio
schema de campos:

**`transformer` — Transformador:**
```
kVA nominal         | Voltaje primario (kV)
Voltaje secundario (V) | Impedancia (%)
Tipo de enfriamiento | Factor de potencia
Grupo de conexión   | Año de fabricación
```

**`motor` — Motor eléctrico:**
```
Potencia nominal (kW) | Voltaje nominal (V)
Corriente nominal (A) | Factor de potencia (FP)
Eficiencia η (%)      | Velocidad (RPM)
Clase de aislamiento  | IP / NEMA
```

**`compressor` — Compresor:**
```
Potencia (kW)         | Caudal (m³/min)
Presión descarga (bar)| Presión aspiración (bar)
Tipo (tornillo/pistón)| Refrigeración
Eficiencia isotérmica (%) | Horas de diseño (h/año)
```

**`chiller` — Chiller:**
```
Capacidad frigorífica (TR) | COP nominal
kW/TR                     | Refrigerante
Caudal agua helada (l/s)  | ΔT diseño (°C)
Presión condensación (bar)| Tipo compresor
```

**`boiler` — Caldera:**
```
Capacidad (kcal/h o kg/h) | Rendimiento (%)
Presión operación (bar)   | Temperatura vapor (°C)
Combustible               | Tipo de caldera
BHP                       | Año fab.
```

**`panel` / `tablero` — Tablero eléctrico:**
```
Tensión nominal (V)    | Corriente nominal (A)
Número de circuitos    | Capacidad disyuntor principal (A)
Tipo barras            | Protocolo comunicación
```

**`pump` — Bomba:**
```
Caudal nominal (m³/h)  | Altura manométrica (m)
Potencia (kW)          | Eficiencia (%)
Tipo (centrífuga/axial)| Fluido manejado
```

**`cooling_tower` — Torre de enfriamiento:**
```
Capacidad (TR)         | Caudal agua (m³/h)
Potencia ventilador (kW) | ΔT diseño (°C)
Tipo (abierta/cerrada) | Material relleno
```

Implementación: `src/services/asset-tree/equipmentSpecs.ts`
```ts
export const EQUIPMENT_SPEC_SCHEMA: Record<string, SpecField[]> = {
  transformer: [ ... ],
  motor:       [ ... ],
  compressor:  [ ... ],
  // etc.
}

interface SpecField {
  key: string
  label: string
  unit?: string
  type: 'number' | 'text' | 'select'
  options?: string[]
}
```

Guardar en la columna `properties` del equipo como objeto estructurado.
**No más JSON.stringify visible.**

#### Tab "Medidores" — Mejorado

- Lista de MeasurementPoints vinculados con:
  - Último valor + unidad + timestamp
  - Quality badge (verde/amarillo/rojo)
  - Tipo (acumulador/instantáneo)
  - Fecha próxima calibración con alerta si vencida
- Botón [+ Medidor] que abre el wizard de 4 pasos existente

#### Tab "Adjuntos"

- Upload real a Supabase Storage (igual que CMMS)
- Categorías: Manual técnico, Ficha del fabricante, Foto, Certificado de calibración, Curva de rendimiento, Planos
- Preview de imágenes en thumbnail
- Descarga directa

#### Tab "CMMS" — Mejorado

```
┌─────────────────────────────────────────────┐
│  Estado VersaMaint                          │
│  [● Local — sin sync]  [Importar a CMMS →]  │
│                                             │
│  Ruta de compatibilidad:                    │
│  Planta → Área → Sistema → Equipo           │
│                                             │
│  Checklist:                                 │
│  ✅ Nombre y código presentes               │
│  ✅ Tipo de equipo definido                 │
│  ✅ Utility asignado                        │
│  ⚠️  Sin especificaciones técnicas          │
│  ❌ Sin medidores vinculados                │
│                                             │
│  [Ver en VersaMaint ↗] (si está vinculado)  │
└─────────────────────────────────────────────┘
```

### 2.3 Formulario de creación (modal)

Igual al `AssetForm` del CMMS:
- Secciones colapsables con borde izquierdo de color
- Validación inline con mensaje de error debajo del campo (no toast)
- `FormField` wrapper con label + hint + error
- Guardar con Cmd+Enter
- Cancelar con Escape

---

## Parte 3 — Rediseño del Mapa Energy & Utilities

### 3.1 Layout general del canvas

```
┌──────────────────────────────────────────────────────────────────────┐
│ Toolbar superior (40px)                                              │
│ [← Diagramas]  [Nombre diagrama]  [● Borrador]     [Guardar] [...]  │
├────────────────────┬─────────────────────────────┬───────────────────┤
│ Paleta             │ Canvas                      │ Panel derecho     │
│ 240px              │ flex-1                      │ 320px (siempre    │
│                    │                             │  visible)         │
│  [🔍 Buscar...]   │  [canvas React Flow]        │                   │
│  ──────────────   │                             │  Sin selección:   │
│  Para electricidad │                             │  → Resumen diag.  │
│  ──────────────   │  [Overlay bar flotante]      │                   │
│  [⚡] Transf.      │  [Normal][Balance][Cob.]    │  Con nodo:        │
│  [☐] Tablero      │                             │  → Inspector tabs │
│  [◎] Disyuntor    │  [Minimap ↘]               │                   │
│  [⊙] Med.energía  │                             │                   │
│  ─────────────── │                             │                   │
│  Más elementos ↓  │                             │                   │
└────────────────────┴─────────────────────────────┴───────────────────┘
```

### 3.2 Paleta de nodos — Rediseño completo

**Archivo:** `src/modules/mapa/palette/NodePalette.tsx`

**Principios:**
1. Búsqueda en tiempo real (filtro sobre todo el catálogo)
2. Filtrado contextual: solo muestra elementos relevantes al utility del diagrama
3. Sección "Recientes" — últimos 5 elementos usados (localStorage)
4. Ícono técnico por tipo de nodo (no solo GripVertical)
5. Preview tooltip al hover con descripción del elemento

**Estructura visual:**
```
┌──────────────────────────┐
│ 🔍 Buscar elemento...    │
├──────────────────────────┤
│ ⏱ Recientes              │
│  [⚡] Tablero  [⊙] Med.  │
├──────────────────────────┤
│ ⚡ Para electricidad      │  ← header contextual
│                           │
│ Fuentes y generación      │  ← sub-grupos
│  [🔋] Fuente utility     │
│  [⚡] Generador           │
│                           │
│ Distribución              │
│  [☐] Transformador        │
│  [☐] Tablero/Panel        │
│  [—] Barra (busbar)       │
│                           │
│ Control y protección      │
│  [◎] Disyuntor            │
│  [◉] Seccionador          │
│  [≈] Transformador cte.   │
│                           │
│ Medición                  │
│  [⊙] Medidor de energía   │
│  [⊙] Power meter          │
│  [⊙] TC (transf. corriente│
│                           │
│ Consumidores              │
│  [⚙] Motor                │
│  [□] Consumidor genérico  │
│  [≡] UPS / Inverter       │
└──────────────────────────┘
```

**Mapa de filtros por utility:**

```ts
const PALETTE_UTILITY_FILTER: Record<string, string[]> = {
  electricity: [
    'utility_source', 'generator',
    'transformer', 'panel', 'connector_busbar', 'connector_cable',
    'breaker', 'disconnect', 'current_transformer',
    'energy_meter', 'power_meter',
    'motor', 'consumer',
  ],
  steam: [
    'utility_source', 'boiler',
    'connector_pipe', 'header', 'manifold',
    'valve', 'check_valve', 'control_valve', 'regulator',
    'steam_meter', 'flow_meter', 'pressure_sensor', 'temperature_sensor',
    'heat_exchanger', 'tank',
    'loss_node',
  ],
  compressed_air: [
    'utility_source', 'compressor',
    'tank', 'connector_pipe', 'header', 'manifold',
    'valve', 'regulator',
    'flow_meter', 'pressure_sensor',
    'consumer', 'loss_node',
  ],
  chilled_water: [
    'utility_source', 'chiller', 'cooling_tower', 'pump',
    'connector_pipe', 'header',
    'valve', 'control_valve',
    'flow_meter', 'temperature_sensor', 'energy_meter',
    'heat_exchanger', 'consumer',
  ],
  natural_gas: [
    'utility_source',
    'connector_pipe', 'header', 'manifold',
    'valve', 'regulator', 'check_valve',
    'gas_meter', 'flow_meter', 'pressure_sensor',
    'boiler', 'consumer',
  ],
  // El grupo "Organizacional" y "Especial" siempre visible
}
```

### 3.3 Nodos del canvas — Rediseño visual

#### Principio: identidad por tipo, no solo por color de header

**EquipmentNode — Nueva estructura:**

```
┌────────────────────────────┐
│ [ícono grande] Transformador│  ← header con ícono específico del tipo
│                  [● activo]│  ← status dot (verde/rojo/gris)
├────────────────────────────┤
│ Transformador Principal     │  ← nombre bold
│ T-01          Electricidad  │  ← tag + utility label (traducido)
│ ─────────────────────────  │
│ 450 kVA · 13.2/0.48 kV    │  ← spec principal del equipo (si existe)
│ [equipment vinculado ✓]    │  ← binding badge
└────────────────────────────┘
```

Íconos técnicos SVG por tipo (inline, no Lucide genérico):
- `transformer`: símbolo IEC (dos círculos tangentes)
- `panel`: rectángulo con líneas paralelas
- `motor`: círculo con M
- `compressor`: triángulo comprimido
- `pump`: semicírculo con flecha
- `boiler`: llama stylizada
- `valve`: rombo con línea
- `breaker`: segmento interrumpido

**MeasurementNode — Rediseño data-forward:**

```
┌──────────────┐
│   FQI-001    │   ← tag en font-mono
│   24.3 m³/h  │   ← último valor + unidad (grande)
│   ● 14:32    │   ← dot quality + timestamp
│   [→ acum.]  │   ← tipo de medición
└──────────────┘
```

Quality colors del dot:
- Verde `#15803d`: dato reciente (< 2x frecuencia nominal)
- Amarillo `#b45309`: dato con retraso (2-4x frecuencia)
- Rojo `#b91c1c`: dato faltante (> 4x frecuencia o null)
- Gris `#6b7280`: sin MeasurementPoint vinculado

**ControlNode — Símbolos ISA-5.1:**

Usando SVG inline en lugar del círculo genérico:

```ts
// src/modules/mapa/canvas/nodes/controlSymbols.tsx
export const ValveSymbol = () => (
  <svg width="32" height="32" viewBox="0 0 32 32">
    <path d="M2 16 L14 8 L14 24 Z" fill="currentColor"/>
    <path d="M30 16 L18 8 L18 24 Z" fill="currentColor"/>
    <line x1="14" y1="16" x2="18" y2="16" stroke="currentColor" strokeWidth="2"/>
  </svg>
)

export const BreakerSymbol = () => (
  <svg width="32" height="32" viewBox="0 0 32 32">
    <line x1="2" y1="16" x2="12" y2="16" stroke="currentColor" strokeWidth="2"/>
    <line x1="12" y1="16" x2="20" y2="8" stroke="currentColor" strokeWidth="2"/>
    <line x1="20" y1="16" x2="30" y2="16" stroke="currentColor" strokeWidth="2"/>
    <circle cx="20" cy="16" r="2" fill="currentColor"/>
  </svg>
)
```

**SpecialNode (utility_source) — Elemento ancla del diagrama:**

El nodo fuente debe ser el elemento más prominente visualmente:

```
┌────────────────────────────────┐
│  ⚡ FUENTE                      │  ← header verde grande
│  Acometida 13.2 kV             │  ← nombre
│                                │
│  13.2 kV · 3φ · 60 Hz         │  ← especificaciones del suministro
│  [Contrato: CFE tarifa HM]     │  ← tarifa si se captura
└────────────────────────────────┘
```

### 3.4 Panel derecho — Inspector permanente (320px)

**Archivo:** `src/modules/mapa/inspector/InspectorPanel.tsx`

#### Estado sin selección — Resumen del diagrama

```
┌─────────────────────────────────────────┐
│ Diagrama · Borrador                     │
│ Sistema Eléctrico Principal             │
│                                         │
│ Cobertura de medición                   │
│ ████████░░  78%                         │
│ 14 de 18 nodos con medidor              │
│                                         │
│ Nodos           Edges                   │
│  18 total        22 conexiones          │
│   3 sin tag      4 sin utility          │
│                                         │
│ Utilities presentes                     │
│  [⚡ Electricidad]                       │
│                                         │
│ Última validación                       │
│  ⚠ 2 advertencias · 0 errores          │
│  [Validar ahora →]                      │
│                                         │
│ Última publicación                      │
│  Nunca publicado                        │
└─────────────────────────────────────────┘
```

#### Estado con nodo seleccionado — Tabs

Tabs del inspector (igual estructura que CMMS AssetDetailPanel):
```
[Propiedades] [Medición] [Especificaciones] [Acciones]
```

**Tab Propiedades:**
```
Tipo de nodo    Transformador
TAG             T-01
Nombre          Transformador Principal
Utility         ⚡ Electricidad
Estado          Activo
Posición        x: 340, y: 120

Activo vinculado
  ✓ T-01 · Transformador Principal
  [Ver ficha →]  [Desvincular]
```

**Tab Medición:**
```
Puntos de medición (2)

  [⊙] PM-001
  kWh acumulado
  ● 45,231 kWh · hace 2h
  Próx. calib: 15 Jun 2026

  [⊙] PM-002
  kW instantáneo
  ● 387.4 kW · hace 5min
  Próx. calib: 15 Jun 2026

  [+ Vincular MeasurementPoint]
  [+ Crear nuevo medidor]
```

**Tab Especificaciones:**
Campos técnicos del tipo de equipo (igual que ficha en Equipos).
Si no hay specs: `[Completar especificaciones →]` que lleva a la ficha.

**Tab Acciones:**
```
[Ir a ficha en Equipos →]
[Ver historial en VersaMaint →]
[Generar QR de equipo]
[Marcar como pérdida]  ← solo si es loss_node
[Eliminar del diagrama]  ← ConfirmDialog, no confirm()
```

#### Estado con edge seleccionado

```
Tipo de línea    Cable eléctrico
Utility          ⚡ Electricidad
Dirección        → Fuente a destino
Longitud         —

Factor de pérdida    0.02 (2%)
Factor de fuga       0.00

Nodos conectados
  Origen: T-01 Transformador
  Destino: P-01 Tablero Principal

[Eliminar conexión]
```

### 3.5 Overlay bar flotante

**Archivo:** `src/modules/mapa/canvas/OverlayBar.tsx`

Barra flotante centrada en la parte inferior del canvas:

```
┌─────────────────────────────────────────────────────┐
│  [Vista normal] [Balance] [Cobertura] [Alertas]      │
│                 ▲ activo                             │
└─────────────────────────────────────────────────────┘
```

**Overlay: Vista normal** — Sin modificación, nodos con sus colores base.

**Overlay: Balance** — Colorea edges y nodos según % del total:
- Verde intenso: < 90% del baseline
- Amarillo: 90-110% del baseline
- Rojo: > 110% del baseline
- Gris: sin datos
- Muestra el valor numérico sobre cada edge principal

**Overlay: Cobertura** — Muestra qué tan medido está el diagrama:
- Verde: nodo con ≥1 MeasurementPoint activo con dato reciente
- Amarillo: MP vinculado pero dato retrasado
- Rojo: nodo importante sin MP
- Gris: nodo sin MP (opcional/organizacional)

**Overlay: Alertas** (futuro) — Para cuando existan reglas de alarma.

### 3.6 Toolbar del canvas — Rediseño

**Antes** (todo en una barra apretada):
```
← Diagramas | Sistema Eléctrico | • Sin guardar | [Borrador] | [Validar 2warn] [Publicar] [Guardar]
```

**Después** (jerárquico, igual al header de CMMS):

```
┌──────────────────────────────────────────────────────────────────────┐
│ ← Diagramas    /   Sistema Eléctrico Principal                       │
│                                                                      │
│ [● Borrador] [• Sin guardar]   |  [Validar] [···]  [Guardar]        │
└──────────────────────────────────────────────────────────────────────┘
```

Los `[···]` despliegan: [Publicar] [Clonar] [Exportar JSON] [Exportar SVG]

Reemplazar `confirm()` por `ConfirmDialog` en:
- Publicar: modal con consecuencias explicadas
- Clonar: modal de confirmación
- Eliminar diagrama: modal danger con nombre del diagrama para confirmar

### 3.7 Lista de diagramas — Rediseño

**Antes:** Grid de tarjetas simples sin información real.

**Después:** Grid con tarjetas ricas + thumbnail SVG:

```
┌─────────────────────────────┐
│  [thumbnail miniatura SVG]  │  ← snapshot del diagrama al guardar
│  ─────────────────────────  │
│  ⚡ Sistema Eléctrico        │
│  Principal                  │
│  [● Publicado] [22 nodos]   │
│  Hace 3 días · v2           │
└─────────────────────────────┘
```

Thumbnail: captura SVG snapshot del canvas al publicar usando
`reactflow.getViewport()` + `toSvgString()`.

Filtros sobre la lista:
```
[Todos] [Borradores] [Publicados]  |  [⚡][💧][🌀][❄️] filtro utility
```

### 3.8 Modal de nuevo diagrama — Con templates

**Paso 1 — Elegir utility:**
```
¿Qué red vas a diagramar?

[⚡ Eléctrica]    [💧 Vapor]      [🌀 Aire comprimido]
[❄️ Agua helada]  [⛽ Gas natural]  [🌊 Agua industrial]
[☀️ Solar]        [⛽ Diésel]      [+  Otra utility]
```

**Paso 2 — Elegir plantilla:**
```
¿Cómo quieres empezar?

[Diagrama unifilar básico]     [Red de distribución]     [En blanco]
 ┌─────────────┐                ┌─────────────┐           ┌─────────┐
 │ Fuente→Transf│               │ Fuente→Header│           │         │
 │ →Tablero→3  │               │ →3 ramas     │           │         │
 │  consumidores│               │              │           │         │
 └─────────────┘                └─────────────┘           └─────────┘
 Preview texto                  Preview texto              En blanco
```

Las plantillas pre-colocan nodos con posiciones calculadas y edges conectados.
El usuario llena solo nombre y propiedades.

---

## Parte 4 — Compatibilidad VersaMaint (Plan técnico)

### 4.1 Fase COMPAT-1: Import unidireccional desde CMMS

**Trigger:** Botón "Importar árbol desde VersaMaint" en la vista de Equipos,
visible cuando `cmms_asset_id IS NULL` para todos los equipos del sitio.

**Flujo:**
1. Usuario hace clic → modal con selección de empresa/sitio CMMS
2. Sistema llama Supabase CMMS (mismo servidor, otro schema o RLS por company_id)
3. Trae: assets con `asset_type IN ('plant','area','equipment')` → mapea a Energy
4. Crea registros en `energy_plants`, `energy_areas`, `energy_utility_systems`,
   `energy_equipment` con `cmms_asset_id` poblado y `sync_status = 'linked'`
5. Modal de confirmación muestra resumen: "Se importarán N equipos, M áreas..."
6. Opción: "importar solo estructura" vs "importar también especificaciones"

**Tabla de mapeo CMMS → Energy:**

```
CMMS asset_type    → Energy entity
plant              → energy_plants
area               → energy_areas
system (si existe) → energy_utility_systems
equipment          → energy_equipment
```

**Campos mapeados:**
```
CMMS.name          → Energy.name
CMMS.asset_code    → Energy.code
CMMS.asset_category → Energy.equipment_type (aproximado)
CMMS.id            → Energy.cmms_asset_id
```

### 4.2 Fase COMPAT-2: Link profundo bidireccional

- Botón "Ver en VersaMaint →" en tab CMMS de la ficha de activo
- Abre VersaMaint en el activo correspondiente via URL con `asset_id` param
- Botón "Ver en Energy →" en ficha de activo CMMS (requiere cambio en CMMS)
- Indicador de sync_status visible en ambas apps

### 4.3 Fase COMPAT-3: Notificación de eventos (webhook/signal)

**Evento: nuevo equipo creado en Energy**
→ Signal a CMMS: "equipo disponible para registrar en activos"
→ CMMS muestra badge de sugerencia en panel de activos

**Evento: equipo dado de baja en CMMS**
→ Energy recibe flag: `sync_status = 'decommissioned'`
→ Energy muestra badge gris en árbol y bloquea nuevas vinculaciones de mapa

---

## Parte 5 — Onboarding Wizard (prioridad alta)

### El problema del lienzo en blanco

Un usuario nuevo que abre VersaEnergy ve una pantalla vacía y no sabe por dónde
empezar. El wizard lo guía en su primera vez.

### Flujo del wizard (modal de 4 pasos)

Disparado automáticamente si `energy_plants.count = 0` para el sitio.

```
Paso 1 de 4 — Tu planta
┌─────────────────────────────────────────┐
│  Bienvenido a VersaEnergy               │
│  Vamos a configurar tu primera planta   │
│                                         │
│  Nombre de la planta: [____________]    │
│  País: [México ▼]  Timezone: [CST ▼]   │
│                            [Siguiente →]│
└─────────────────────────────────────────┘

Paso 2 de 4 — Tu primera área
┌─────────────────────────────────────────┐
│  ¿Cuál es tu principal área de consumo? │
│                                         │
│  [Producción] [Servicios] [Oficinas]    │
│  [Utilities]  [Personalizada]           │
│                                         │
│  Nombre del área: [____________]        │
│                   [← Atrás] [Siguiente]│
└─────────────────────────────────────────┘

Paso 3 de 4 — ¿Qué utility gestionas primero?
┌─────────────────────────────────────────┐
│  [⚡ Electricidad]  ← seleccionado       │
│  [💧 Vapor]                              │
│  [🌀 Aire comprimido]                    │
│  [Otro...]                               │
│                   [← Atrás] [Siguiente]│
└─────────────────────────────────────────┘

Paso 4 de 4 — Tu primer diagrama
┌─────────────────────────────────────────┐
│  ¡Casi listo! Vamos a crear tu primera  │
│  red eléctrica con una plantilla base   │
│                                         │
│  [Crear diagrama con plantilla ✓]        │
│  [Prefiero empezar en blanco]           │
│                                         │
│  [← Atrás]  [Crear mi planta ✓]        │
└─────────────────────────────────────────┘
```

Al completar: redirige al mapa con la plantilla ya cargada.

---

## Parte 6 — Sprints de ejecución

### Sprint A — Design System + Quick wins (estimado: 1.5 semanas)

Prerequisito de todo lo demás. Sin esto los demás sprints producen inconsistencia.

| ID | Tarea | Archivo(s) | Prioridad |
|---|---|---|---|
| A-01 | Migrar tokens CSS a CMMS: colores, radios, sombras, fonts | `src/index.css` | 🔴 Crítico |
| A-02 | Agregar Space Grotesk a index.css y headings clave | `src/index.css`, layouts | 🔴 Crítico |
| A-03 | `Button`: añadir `active:scale-[0.97]`, variantes `danger/ghost/outline/success/warning` | `src/shared/Button.tsx` | 🔴 Crítico |
| A-04 | `Badge`: sistema semántico completo (ok/warn/danger/info/neutral + tokens utility) | `src/shared/Badge.tsx` | 🔴 Crítico |
| A-05 | Crear `ConfirmDialog` component (portal, animación, variante danger) | `src/shared/ConfirmDialog.tsx` | 🔴 Crítico |
| A-06 | Reemplazar todos los `confirm()` por `ConfirmDialog` | `mapa/index.tsx`, otros | 🔴 Crítico |
| A-07 | Enriquecer Toast con `type/title/message` igual que CMMS | `src/shared/Toast.tsx` | 🟠 Alta |
| A-08 | Crear `FormField` wrapper component | `src/shared/FormField.tsx` | 🟠 Alta |
| A-09 | `PageHeader`: slot breadcrumb + acciones secundarias | `src/shared/PageHeader.tsx` | 🟡 Media |
| A-10 | Scrollbar CSS custom (5px, thumb brand-color) igual CMMS | `src/index.css` | 🟡 Media |
| A-11 | `AlertBanner` component | `src/shared/AlertBanner.tsx` | 🟡 Media |
| A-12 | `npm run build` + revisión visual en dev | — | 🔴 Crítico |

### Sprint B — Mapa: Paleta + Inspector + MeasurementNode (estimado: 2 semanas)

| ID | Tarea | Archivo(s) | Prioridad |
|---|---|---|---|
| B-01 | Paleta con `<input type="search">` filtro tiempo real | `palette/NodePalette.tsx` | 🔴 Crítico |
| B-02 | Mapa de filtros por utility `PALETTE_UTILITY_FILTER` | `palette/NodePalette.tsx` + nuevo `paletteConfig.ts` | 🔴 Crítico |
| B-03 | Íconos técnicos por tipo (SVG inline o Lucide específico) en items de paleta | `palette/NodePalette.tsx` | 🟠 Alta |
| B-04 | Sección "Recientes" en paleta (localStorage, últimos 5) | `palette/NodePalette.tsx` | 🟡 Media |
| B-05 | `MeasurementNode`: mostrar último valor + unidad + quality dot + timestamp | `canvas/nodes/index.tsx` | 🔴 Crítico |
| B-06 | Servicio de últimas lecturas: `getLastReadings(siteId, nodeIds[])` | `services/measurement-engine/lastReadings.ts` | 🔴 Crítico |
| B-07 | Panel derecho permanente (320px, siempre visible) | `inspector/InspectorPanel.tsx` | 🔴 Crítico |
| B-08 | Estado "sin selección": resumen del diagrama en panel derecho | `inspector/DiagramSummaryPanel.tsx` (nuevo) | 🟠 Alta |
| B-09 | Inspector: 4 tabs [Propiedades/Medición/Especificaciones/Acciones] | `inspector/InspectorPanel.tsx` | 🟠 Alta |
| B-10 | Inspector Tab Medición: lista de MPs con valor/quality + botones vincular/crear | `inspector/InspectorPanel.tsx` | 🟠 Alta |
| B-11 | Toolbar rediseñado: breadcrumb, separación de acciones, `[···]` dropdown | `mapa/index.tsx` | 🟠 Alta |
| B-12 | Habilitar minimap de React Flow (esquina inferior derecha) | `canvas/EnergyUtilitiesCanvas.tsx` | 🟡 Media |
| B-13 | `npm run build` + smoke test del mapa | — | 🔴 Crítico |

### Sprint C — Mapa: Nodos + Templates + Overlay bar (estimado: 2 semanas)

| ID | Tarea | Archivo(s) | Prioridad |
|---|---|---|---|
| C-01 | `EquipmentNode`: spec principal visible bajo nombre (kVA, kW, etc.) | `canvas/nodes/index.tsx` | 🟠 Alta |
| C-02 | `EquipmentNode`: status dot (verde/gris) basado en datos de medición | `canvas/nodes/index.tsx` | 🟠 Alta |
| C-03 | `SpecialNode` (utility_source): rediseño prominente con specs de suministro | `canvas/nodes/index.tsx` | 🟠 Alta |
| C-04 | `ControlNode`: símbolos ISA-5.1 SVG para valve, breaker, check_valve | `canvas/nodes/controlSymbols.tsx` (nuevo) | 🟡 Media |
| C-05 | Handles en 4 posiciones (top/right/bottom/left) para todos los nodos | `canvas/nodes/index.tsx` | 🟡 Media |
| C-06 | `OverlayBar` flotante (barra de overlays en canvas) | `canvas/OverlayBar.tsx` (nuevo) | 🟠 Alta |
| C-07 | Overlay "Cobertura": colorea nodos según presencia/quality de MP | `canvas/overlays/coverage.ts` (nuevo) | 🟠 Alta |
| C-08 | Overlay "Balance": colorea edges según % del total (requiere balance-engine) | `canvas/overlays/balance.ts` (nuevo) | 🟡 Media |
| C-09 | Modal nuevo diagrama: 2 pasos (utility selector + template chooser) | `mapa/index.tsx` + `mapa/DiagramTemplates.ts` (nuevo) | 🟠 Alta |
| C-10 | 3 plantillas base: eléctrica, vapor, aire comprimido | `mapa/DiagramTemplates.ts` | 🟠 Alta |
| C-11 | Snapshot SVG al publicar diagrama (para thumbnail en lista) | `canvas/hooks/useDiagramPersistence.ts` | 🟡 Media |
| C-12 | Lista de diagramas con thumbnail + filtros estado/utility | `mapa/index.tsx` | 🟡 Media |
| C-13 | `npm run build` | — | 🔴 Crítico |

### Sprint D — Equipos: Árbol + Ficha técnica energética (estimado: 2 semanas)

| ID | Tarea | Archivo(s) | Prioridad |
|---|---|---|---|
| D-01 | Árbol: expand/collapse con ChevronRight/Down + persistencia sessionStorage | `modelo/views/PlantAssetTreeView.tsx` | 🔴 Crítico |
| D-02 | Árbol: buscador con filtro tiempo real + auto-expand resultados | `modelo/views/PlantAssetTreeView.tsx` | 🔴 Crítico |
| D-03 | Árbol: context menu en hover (tres puntos) con ConfirmDialog | `modelo/views/PlantAssetTreeView.tsx` | 🟠 Alta |
| D-04 | `EQUIPMENT_SPEC_SCHEMA`: definir campos por tipo de equipo (7 tipos mínimo) | `services/asset-tree/equipmentSpecs.ts` (nuevo) | 🔴 Crítico |
| D-05 | Tab "Especificaciones Energía": form con campos por tipo (no JSON dump) | `modelo/views/PlantAssetTreeView.tsx` | 🔴 Crítico |
| D-06 | Persistir specs en `properties.specs` como objeto estructurado | `services/asset-tree/index.ts` | 🔴 Crítico |
| D-07 | Tab CMMS: checklist dinámico + botón "Ver en VersaMaint →" | `modelo/views/PlantAssetTreeView.tsx` | 🟠 Alta |
| D-08 | Tab Adjuntos: upload real a Supabase Storage con categorías | `modelo/views/PlantAssetTreeView.tsx` | 🟡 Media |
| D-09 | Botón "Ver en mapa" con link directo al diagrama que contiene ese activo | `modelo/views/PlantAssetTreeView.tsx` | 🟡 Media |
| D-10 | Filtro del árbol por utility (checkbox o selector en header del panel) | `modelo/views/PlantAssetTreeView.tsx` | 🟡 Media |
| D-11 | `npm run build` | — | 🔴 Crítico |

### Sprint E — Onboarding + Compatibilidad CMMS (estimado: 2.5 semanas)

| ID | Tarea | Archivo(s) | Prioridad |
|---|---|---|---|
| E-01 | `OnboardingWizard`: modal 4 pasos, disparado en primer uso | `shared/OnboardingWizard.tsx` (nuevo) | 🟠 Alta |
| E-02 | Lógica de trigger: si `energy_plants.count = 0` → mostrar wizard | `app/AppShell.tsx` o similar | 🟠 Alta |
| E-03 | Gamificación árbol: progress bar "Listo para CMMS" en header de Equipos | `modelo/index.tsx` | 🟡 Media |
| E-04 | COMPAT-1: botón "Importar desde VersaMaint" + modal de confirmación | `modelo/views/PlantAssetTreeView.tsx` | 🟡 Media |
| E-05 | COMPAT-1: servicio de import `importFromCmms(siteId, cmmsCompanyId)` | `services/cmms-bridge/importFromCmms.ts` (nuevo) | 🟡 Media |
| E-06 | COMPAT-2: link profundo en tab CMMS → URL VersaMaint con `?asset_id=` | `modelo/views/PlantAssetTreeView.tsx` | 🟡 Media |
| E-07 | `npm run build` final | — | 🔴 Crítico |

---

## Parte 7 — Reglas de implementación

### Para todos los sprints:

1. **Un commit por tarea** — no mezclar A-01 con A-02 en un solo commit.
2. **`npm run build` pasa antes de considerar una tarea completa.**
3. **Cero `confirm()` del browser** a partir de Sprint A — cualquier acción
   destructiva usa `ConfirmDialog`.
4. **Cero JSON visible** para el usuario — specs en formulario, binding en badges.
5. **Cero colores hardcoded** fuera de los tokens CSS — usar las variables del tema.
6. **Todos los textos de utility en español** — `getUtilityLabel()` en cada render.
7. **Panel derecho siempre 320px** desde Sprint B — no colapsar.
8. **`framer-motion`** para todas las animaciones nuevas — no CSS transitions manuales.
9. **No tocar el topology-engine, balance-engine ni validators** sin necesidad —
   el backend es sólido, el trabajo es UI.
10. **Los overlays leen del balance-engine y measurement-engine** — no calculan
    nada propio en el componente.

### Para Sprint A específicamente:

- Migrar colores primero, verificar que el build pasa, luego migrar radios.
- No hacer un mega-commit de "rediseño completo" — los tokens uno por uno.
- Tomar screenshots before/after para validar paridad visual con CMMS.

---

## Parte 8 — Checklist de paridad visual con VersaMaint

Al finalizar Sprint A, comparar pantalla a pantalla:

| Elemento | VersaMaint | VersaEnergy objetivo | ¿Listo? |
|---|---|---|---|
| Fondo de app | `#F4F7FB` | `#F4F7FB` | ⬜ |
| Color brand primary | `#1B6FF8` | `#1B6FF8` | ⬜ |
| Fuente heading | Space Grotesk Bold | Space Grotesk Bold | ⬜ |
| Fuente body | Inter | Inter | ⬜ |
| Border radius cards | 14px | 14px | ⬜ |
| Border radius modal | 16-20px | 16-20px | ⬜ |
| Sombra card | 3-layer subtil | igual | ⬜ |
| Button primary color | `#1B6FF8` | `#1B6FF8` | ⬜ |
| Button micro-interacción | `scale-[0.97]` | `scale-[0.97]` | ⬜ |
| Badge system | tokens semánticos | tokens semánticos | ⬜ |
| Scrollbar | 5px thumb brand | 5px thumb brand | ⬜ |
| Empty states | ícono + texto + acción | igual | ⬜ |
| Layout 3 paneles | árbol/detalle/side | árbol/detalle/side | ⬜ |
| Confirm dialogs | `<ConfirmDialog>` | `<ConfirmDialog>` | ⬜ |
| Toast enriched | type/title/message | type/title/message | ⬜ |

---

## Notas finales

- Este documento se elimina cuando los sprints estén ejecutados y los cambios
  documentados en `docs/04_CURRENT_STATE_REFERENCE.md` y
  `docs/05_MASTER_IMPROVEMENT_PLAN.md`.
- Los sprints A y B son prerequisito de todo lo demás. No iniciar C o D sin A+B completos.
- El Sprint E (onboarding + compat CMMS) puede ejecutarse en paralelo al Sprint D
  si hay dos desarrolladores disponibles.
- La decisión de hacer VersaEnergy visualmente idéntico a VersaMaint es
  **intencional y estratégica** — no es falta de identidad de producto, es la
  estrategia de conversión.
