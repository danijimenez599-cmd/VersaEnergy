import {
  Zap, Flame, Droplets, Wind, Thermometer, Gauge, Wrench, Building2,
  Power, Cable, CircleDot, Wifi, Container, Snowflake, Cog, Plug,
  TrendingDown, Columns, GitFork, PowerOff, ArrowRightLeft, GripHorizontal,
  Workflow, StickyNote, Factory, Cpu, Radio, Network, Activity, BarChart2,
  Layers, ToggleLeft, Thermometer as ThermoIcon, Droplet, FlameKindling,
  Bolt, Sun,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DiagramNodeType } from '@/services/topology-engine/graphTypes'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PaletteItemDef {
  type: DiagramNodeType
  label: string
  family: PaletteFamily
  icon: LucideIcon
  description?: string
}

export interface PaletteGroup {
  family: PaletteFamily
  label: string
  color: string               // left-border tailwind class
  headerColor: string         // header bg class
  items: PaletteItemDef[]
}

export type PaletteFamily =
  | 'equipment'
  | 'connector'
  | 'control'
  | 'measurement'
  | 'iot'
  | 'organizational'
  | 'special'

// ── Icon map by node type ────────────────────────────────────────────────────

export const NODE_ICONS: Partial<Record<string, LucideIcon>> = {
  // Equipment
  boiler:          FlameKindling,
  pump:            Droplets,
  compressor:      Wind,
  chiller:         Snowflake,
  cooling_tower:   Wind,
  tank:            Container,
  transformer:     Zap,
  panel:           Layers,
  generator:       Power,
  heat_exchanger:  ArrowRightLeft,
  motor:           Cog,
  consumer:        Plug,
  custom_equipment: Wrench,
  // Connectors
  connector_pipe:   Droplet,
  connector_duct:   Wind,
  connector_cable:  Cable,
  connector_busbar: GripHorizontal,
  header:           Columns,
  manifold:         GitFork,
  branch:           GitFork,
  junction:         CircleDot,
  // Control
  valve:        ToggleLeft,
  damper:       CircleDot,
  breaker:      PowerOff,
  disconnect:   PowerOff,
  regulator:    CircleDot,
  control_valve: ToggleLeft,
  check_valve:  ArrowRightLeft,
  // Measurement
  flow_meter:          Gauge,
  energy_meter:        Zap,
  power_meter:         Activity,
  pressure_sensor:     BarChart2,
  temperature_sensor:  ThermoIcon,
  level_sensor:        Gauge,
  current_transformer: Bolt,
  gas_meter:           Flame,
  water_meter:         Droplets,
  steam_meter:         FlameKindling,
  custom_meter:        Gauge,
  // IoT
  iot_device:            Wifi,
  gateway:               Network,
  plc:                   Cpu,
  rtu:                   Radio,
  edge_device:           Wifi,
  virtual_point:         Wifi,
  api_source:            Network,
  manual_reading_source: Thermometer,
  // Organizational
  area_node:       Building2,
  process_node:    Workflow,
  production_line: Factory,
  area:            Building2,
  process:         Workflow,
  site:            Building2,
  cost_center:     Building2,
  // Special
  utility_source: Power,
  loss_node:      TrendingDown,
  annotation:     StickyNote,
  group:          Layers,
  // Solar / misc
  solar_generation: Sun,
}

// ── Full palette groups ──────────────────────────────────────────────────────

export const ALL_PALETTE_GROUPS: PaletteGroup[] = [
  {
    family: 'equipment',
    label: 'Equipos',
    color: 'border-l-blue-500',
    headerColor: 'bg-blue-500',
    items: [
      { type: 'boiler',          label: 'Caldera',         family: 'equipment', icon: FlameKindling,  description: 'Caldera de vapor o agua caliente' },
      { type: 'pump',            label: 'Bomba',           family: 'equipment', icon: Droplets,       description: 'Bomba centrífuga o axial' },
      { type: 'compressor',      label: 'Compresor',       family: 'equipment', icon: Wind,           description: 'Compresor de aire o gas' },
      { type: 'chiller',         label: 'Chiller',         family: 'equipment', icon: Snowflake,      description: 'Enfriador de agua' },
      { type: 'cooling_tower',   label: 'T. Enfriamiento', family: 'equipment', icon: Wind,           description: 'Torre de enfriamiento' },
      { type: 'tank',            label: 'Tanque',          family: 'equipment', icon: Container,      description: 'Tanque de almacenamiento' },
      { type: 'transformer',     label: 'Transformador',   family: 'equipment', icon: Zap,            description: 'Transformador de potencia' },
      { type: 'panel',           label: 'Tablero',         family: 'equipment', icon: Layers,         description: 'Tablero/Panel eléctrico' },
      { type: 'generator',       label: 'Generador',       family: 'equipment', icon: Power,          description: 'Generador eléctrico' },
      { type: 'heat_exchanger',  label: 'Intercambiador',  family: 'equipment', icon: ArrowRightLeft, description: 'Intercambiador de calor' },
      { type: 'motor',           label: 'Motor',           family: 'equipment', icon: Cog,            description: 'Motor eléctrico' },
      { type: 'consumer',        label: 'Consumidor',      family: 'equipment', icon: Plug,           description: 'Consumidor genérico' },
    ],
  },
  {
    family: 'connector',
    label: 'Conectores',
    color: 'border-l-teal-500',
    headerColor: 'bg-teal-500',
    items: [
      { type: 'connector_pipe',   label: 'Tubería',   family: 'connector', icon: Droplet,       description: 'Tubería para fluidos' },
      { type: 'connector_duct',   label: 'Ducto',     family: 'connector', icon: Wind,           description: 'Ducto para aire/gas' },
      { type: 'connector_cable',  label: 'Cable',     family: 'connector', icon: Cable,          description: 'Cable eléctrico' },
      { type: 'connector_busbar', label: 'Barra',     family: 'connector', icon: GripHorizontal, description: 'Barra colectora' },
      { type: 'header',           label: 'Header',    family: 'connector', icon: Columns,        description: 'Colector principal' },
      { type: 'manifold',         label: 'Manifold',  family: 'connector', icon: GitFork,        description: 'Múltiple distribución' },
    ],
  },
  {
    family: 'control',
    label: 'Control',
    color: 'border-l-orange-500',
    headerColor: 'bg-orange-500',
    items: [
      { type: 'valve',         label: 'Válvula',      family: 'control', icon: ToggleLeft,   description: 'Válvula de aislamiento' },
      { type: 'breaker',       label: 'Breaker',      family: 'control', icon: PowerOff,     description: 'Interruptor de circuito' },
      { type: 'regulator',     label: 'Regulador',    family: 'control', icon: CircleDot,    description: 'Regulador de presión' },
      { type: 'control_valve', label: 'Válv. Control',family: 'control', icon: ToggleLeft,   description: 'Válvula de control' },
      { type: 'check_valve',   label: 'Válv. Check',  family: 'control', icon: ArrowRightLeft,description: 'Válvula check/antirretorno' },
    ],
  },
  {
    family: 'measurement',
    label: 'Medición',
    color: 'border-l-purple-500',
    headerColor: 'bg-purple-500',
    items: [
      { type: 'flow_meter',         label: 'Caudalímetro',    family: 'measurement', icon: Gauge,       description: 'Medidor de caudal' },
      { type: 'energy_meter',       label: 'Med. Energía',    family: 'measurement', icon: Zap,         description: 'Medidor de energía eléctrica (kWh)' },
      { type: 'power_meter',        label: 'Power Meter',     family: 'measurement', icon: Activity,    description: 'Medidor de potencia (kW)' },
      { type: 'pressure_sensor',    label: 'Sensor Presión',  family: 'measurement', icon: BarChart2,   description: 'Sensor de presión' },
      { type: 'temperature_sensor', label: 'Sensor Temp.',    family: 'measurement', icon: ThermoIcon,  description: 'Sensor de temperatura' },
      { type: 'level_sensor',       label: 'Sensor Nivel',    family: 'measurement', icon: Gauge,       description: 'Sensor de nivel' },
      { type: 'current_transformer',label: 'TC',              family: 'measurement', icon: Bolt,        description: 'Transformador de corriente' },
      { type: 'gas_meter',          label: 'Med. Gas',        family: 'measurement', icon: Flame,       description: 'Medidor de gas' },
      { type: 'water_meter',        label: 'Med. Agua',       family: 'measurement', icon: Droplets,    description: 'Medidor de agua' },
      { type: 'steam_meter',        label: 'Med. Vapor',      family: 'measurement', icon: FlameKindling,description: 'Medidor de vapor' },
    ],
  },
  {
    family: 'iot',
    label: 'IoT / Datos',
    color: 'border-l-cyan-500',
    headerColor: 'bg-cyan-500',
    items: [
      { type: 'iot_device',  label: 'Disp. IoT',  family: 'iot', icon: Wifi,    description: 'Dispositivo IoT genérico' },
      { type: 'gateway',     label: 'Gateway',     family: 'iot', icon: Network, description: 'Gateway de comunicaciones' },
      { type: 'plc',         label: 'PLC',         family: 'iot', icon: Cpu,     description: 'Controlador lógico programable' },
      { type: 'edge_device', label: 'Edge Device', family: 'iot', icon: Wifi,    description: 'Dispositivo de cómputo edge' },
    ],
  },
  {
    family: 'organizational',
    label: 'Organización',
    color: 'border-l-gray-400',
    headerColor: 'bg-gray-500',
    items: [
      { type: 'area_node',       label: 'Área',         family: 'organizational', icon: Building2, description: 'Área del árbol de planta' },
      { type: 'process_node',    label: 'Proceso',      family: 'organizational', icon: Workflow,  description: 'Proceso productivo' },
      { type: 'production_line', label: 'Línea Prod.',  family: 'organizational', icon: Factory,   description: 'Línea de producción' },
    ],
  },
  {
    family: 'special',
    label: 'Especial',
    color: 'border-l-red-400',
    headerColor: 'bg-red-400',
    items: [
      { type: 'utility_source', label: 'Fuente Utility', family: 'special', icon: Power,       description: 'Fuente de suministro principal' },
      { type: 'loss_node',      label: 'Pérdida',        family: 'special', icon: TrendingDown, description: 'Nodo de pérdida o fuga' },
      { type: 'annotation',     label: 'Anotación',      family: 'special', icon: StickyNote,  description: 'Nota o comentario en el diagrama' },
    ],
  },
]

// ── Utility filter map ───────────────────────────────────────────────────────
// nodeTypes allowed per utility (empty = show all groups)

export const PALETTE_UTILITY_FILTER: Record<string, string[]> = {
  electricity: [
    'utility_source', 'generator',
    'transformer', 'panel', 'connector_busbar', 'connector_cable',
    'breaker', 'disconnect', 'current_transformer',
    'energy_meter', 'power_meter',
    'motor', 'consumer',
    'iot_device', 'gateway', 'plc', 'edge_device',
    'area_node', 'process_node', 'production_line',
    'loss_node', 'annotation',
  ],
  steam: [
    'utility_source', 'boiler',
    'connector_pipe', 'header', 'manifold',
    'valve', 'check_valve', 'control_valve', 'regulator',
    'steam_meter', 'flow_meter', 'pressure_sensor', 'temperature_sensor',
    'heat_exchanger', 'tank',
    'area_node', 'process_node', 'production_line',
    'loss_node', 'annotation',
  ],
  compressed_air: [
    'utility_source', 'compressor',
    'tank', 'connector_pipe', 'header', 'manifold',
    'valve', 'regulator',
    'flow_meter', 'pressure_sensor',
    'consumer',
    'iot_device', 'gateway', 'plc', 'edge_device',
    'area_node', 'process_node', 'production_line',
    'loss_node', 'annotation',
  ],
  chilled_water: [
    'utility_source', 'chiller', 'cooling_tower', 'pump',
    'connector_pipe', 'header',
    'valve', 'control_valve',
    'flow_meter', 'temperature_sensor', 'energy_meter',
    'heat_exchanger', 'consumer',
    'area_node', 'process_node', 'production_line',
    'loss_node', 'annotation',
  ],
  natural_gas: [
    'utility_source',
    'connector_pipe', 'header', 'manifold',
    'valve', 'regulator', 'check_valve',
    'gas_meter', 'flow_meter', 'pressure_sensor',
    'boiler', 'consumer',
    'area_node', 'process_node', 'production_line',
    'loss_node', 'annotation',
  ],
  hot_water: [
    'utility_source', 'boiler', 'pump', 'heat_exchanger',
    'connector_pipe', 'header',
    'valve', 'control_valve',
    'flow_meter', 'temperature_sensor',
    'consumer',
    'area_node', 'process_node', 'production_line',
    'loss_node', 'annotation',
  ],
  industrial_water: [
    'utility_source', 'pump', 'tank',
    'connector_pipe', 'header', 'manifold',
    'valve', 'check_valve', 'regulator',
    'water_meter', 'flow_meter', 'pressure_sensor', 'level_sensor',
    'consumer',
    'area_node', 'process_node', 'production_line',
    'loss_node', 'annotation',
  ],
  diesel: [
    'utility_source', 'tank', 'pump',
    'connector_pipe',
    'valve', 'check_valve',
    'flow_meter',
    'boiler', 'generator', 'consumer',
    'area_node', 'process_node',
    'loss_node', 'annotation',
  ],
  lpg: [
    'utility_source', 'tank',
    'connector_pipe', 'manifold',
    'valve', 'regulator', 'check_valve',
    'gas_meter', 'flow_meter', 'pressure_sensor',
    'boiler', 'consumer',
    'area_node', 'process_node',
    'loss_node', 'annotation',
  ],
  solar_generation: [
    'utility_source', 'generator', 'panel', 'transformer',
    'connector_cable', 'connector_busbar',
    'energy_meter', 'power_meter',
    'area_node',
    'annotation',
  ],
  battery_storage: [
    'utility_source', 'transformer', 'panel',
    'connector_cable', 'connector_busbar',
    'energy_meter', 'power_meter',
    'area_node',
    'annotation',
  ],
}

// Organizational and special families always visible regardless of utility
export const ALWAYS_VISIBLE_FAMILIES = new Set<PaletteFamily>(['organizational', 'special'])

// ── Filter helper ────────────────────────────────────────────────────────────

export function getFilteredGroups(
  utility: string | null,
  query: string,
): PaletteGroup[] {
  const normalizedQuery = query.trim().toLowerCase()
  const allowedTypes = utility ? new Set(PALETTE_UTILITY_FILTER[utility] || []) : null

  return ALL_PALETTE_GROUPS
    .map((group) => {
      // For always-visible families: show all items
      const items = group.items.filter((item) => {
        // Utility filter
        if (allowedTypes && !ALWAYS_VISIBLE_FAMILIES.has(group.family)) {
          if (!allowedTypes.has(item.type)) return false
        }
        // Text search filter
        if (normalizedQuery) {
          return (
            item.label.toLowerCase().includes(normalizedQuery) ||
            item.type.toLowerCase().includes(normalizedQuery) ||
            (item.description?.toLowerCase().includes(normalizedQuery) ?? false)
          )
        }
        return true
      })
      return { ...group, items }
    })
    .filter((group) => group.items.length > 0)
}
