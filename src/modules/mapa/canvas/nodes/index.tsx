import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { DiagramNodeData } from '@/services/topology-engine/graphTypes'
import {
  Zap, Flame, Droplets, Wind, Thermometer, Gauge, Wrench, Building2,
  Power, Cable, CircleDot, Wifi, Container, Snowflake, Cog, Plug,
  TrendingDown, Columns, GitFork, PowerOff, ArrowRightLeft, GripHorizontal,
  Workflow, StickyNote, Factory, Cpu, Network, Activity, BarChart2,
  Layers, ToggleLeft, Droplet, FlameKindling, Sun, Radio,
} from 'lucide-react'
import { useDiagramReadings } from '../hooks/useDiagramReadings'
import { QUALITY_COLORS, relativeTime } from '@/services/measurement-engine/lastReadings'
import { getControlSymbol } from './controlSymbols'

type NProps = NodeProps & { data: DiagramNodeData }

// ── Icon map ─────────────────────────────────────────────────────────────────

const iconMap: Record<string, typeof Zap> = {
  boiler: FlameKindling, pump: Droplets, compressor: Wind, chiller: Snowflake,
  cooling_tower: Wind, tank: Container, transformer: Zap, panel: Layers,
  generator: Power, heat_exchanger: ArrowRightLeft, motor: Cog, consumer: Plug,
  custom_equipment: Wrench,
  connector_pipe: Droplet, connector_duct: Wind, connector_cable: Cable,
  connector_busbar: GripHorizontal, header: Columns, manifold: GitFork,
  branch: GitFork, junction: CircleDot,
  valve: ToggleLeft, damper: CircleDot, breaker: PowerOff, regulator: CircleDot,
  control_valve: ToggleLeft, check_valve: ArrowRightLeft, disconnect: PowerOff,
  flow_meter: Gauge, energy_meter: Zap, power_meter: Activity,
  pressure_sensor: BarChart2, temperature_sensor: Thermometer, level_sensor: Gauge,
  current_transformer: Zap, gas_meter: Flame, water_meter: Droplets,
  steam_meter: FlameKindling, custom_meter: Gauge,
  iot_device: Wifi, gateway: Network, plc: Cpu, rtu: Radio,
  edge_device: Wifi, virtual_point: Wifi, api_source: Network,
  manual_reading_source: Thermometer,
  area_node: Building2, process_node: Workflow, production_line: Factory,
  area: Building2, process: Workflow, site: Building2, cost_center: Building2,
  utility_source: Power, loss_node: TrendingDown, annotation: StickyNote,
  group: Layers, solar_generation: Sun,
}

// ── Node labels ───────────────────────────────────────────────────────────────

const nodeLabels: Record<string, string> = {
  boiler: 'Caldera', pump: 'Bomba', compressor: 'Compresor', chiller: 'Chiller',
  cooling_tower: 'T. Enfriamiento', tank: 'Tanque', transformer: 'Transformador',
  panel: 'Tablero', generator: 'Generador', heat_exchanger: 'Intercambiador',
  motor: 'Motor', consumer: 'Consumidor', custom_equipment: 'Equipo',
  connector_pipe: 'Tubería', connector_duct: 'Ducto', connector_cable: 'Cable',
  connector_busbar: 'Barra', header: 'Header', manifold: 'Manifold',
  branch: 'Derivación', junction: 'Unión',
  valve: 'Válvula', damper: 'Damper', breaker: 'Breaker', disconnect: 'Seccionador',
  regulator: 'Regulador', control_valve: 'Válv. Control', check_valve: 'Válv. Check',
  flow_meter: 'Caudalímetro', energy_meter: 'Med. Energía', power_meter: 'Power Meter',
  pressure_sensor: 'Presión', temperature_sensor: 'Temperatura', level_sensor: 'Nivel',
  current_transformer: 'TC', gas_meter: 'Med. Gas', water_meter: 'Med. Agua',
  steam_meter: 'Med. Vapor', custom_meter: 'Medidor',
  iot_device: 'IoT Device', gateway: 'Gateway', plc: 'PLC', rtu: 'RTU',
  edge_device: 'Edge', virtual_point: 'Punto Virtual',
  api_source: 'API', manual_reading_source: 'Manual',
  area_node: 'Área', process_node: 'Proceso', production_line: 'Línea Prod.',
  area: 'Área', process: 'Proceso', site: 'Sitio', cost_center: 'Ctro. Costo',
  utility_source: 'Fuente', loss_node: 'Pérdida', annotation: 'Nota', group: 'Grupo',
}

// ── Family helpers ────────────────────────────────────────────────────────────

const familyBorderColors: Record<string, string> = {
  equipment:     'border-blue-300 bg-white',
  connector:     'border-teal-300 bg-white',
  control:       'border-orange-300 bg-white',
  measurement:   'border-purple-300 bg-white',
  iot:           'border-cyan-300 bg-white',
  organizational:'border-gray-300 bg-white',
  special:       'border-red-300 bg-white',
}

const familyHeaderColors: Record<string, string> = {
  equipment:     'bg-blue-500 text-white',
  connector:     'bg-teal-500 text-white',
  control:       'bg-orange-500 text-white',
  measurement:   'bg-purple-500 text-white',
  iot:           'bg-cyan-500 text-white',
  organizational:'bg-gray-500 text-white',
  special:       'bg-red-400 text-white',
}

function nodeFamily(nt: string): string {
  const r: Record<string, string> = {
    boiler: 'equipment', pump: 'equipment', compressor: 'equipment', chiller: 'equipment',
    cooling_tower: 'equipment', tank: 'equipment', transformer: 'equipment',
    panel: 'equipment', generator: 'equipment', heat_exchanger: 'equipment',
    motor: 'equipment', consumer: 'equipment', custom_equipment: 'equipment',
    connector_pipe: 'connector', connector_duct: 'connector', connector_cable: 'connector',
    connector_busbar: 'connector', header: 'connector', manifold: 'connector',
    branch: 'connector', junction: 'connector',
    valve: 'control', damper: 'control', breaker: 'control', disconnect: 'control',
    control_valve: 'control', regulator: 'control', check_valve: 'control',
    flow_meter: 'measurement', energy_meter: 'measurement', power_meter: 'measurement',
    pressure_sensor: 'measurement', temperature_sensor: 'measurement',
    level_sensor: 'measurement', current_transformer: 'measurement',
    gas_meter: 'measurement', water_meter: 'measurement', steam_meter: 'measurement',
    custom_meter: 'measurement',
    iot_device: 'iot', gateway: 'iot', plc: 'iot', rtu: 'iot',
    edge_device: 'iot', virtual_point: 'iot', api_source: 'iot',
    manual_reading_source: 'iot',
    area_node: 'organizational', process_node: 'organizational',
    production_line: 'organizational', area: 'organizational', process: 'organizational',
    site: 'organizational', cost_center: 'organizational',
    utility_source: 'special', loss_node: 'special', group: 'special',
    annotation: 'special',
  }
  return r[nt] || 'equipment'
}

function bindingBadge(data: DiagramNodeData): { label: string; className: string } | null {
  const properties = data.properties || {}
  const assetBinding = properties.asset_binding as Record<string, unknown> | undefined
  const measurementBinding = properties.measurement_binding as Record<string, unknown> | undefined
  if (measurementBinding?.status === 'linked') {
    return { label: 'MP vinculado', className: 'bg-purple-100 text-purple-700 border-purple-200' }
  }
  if (assetBinding?.status === 'linked') {
    const entityType = String(assetBinding.entity_type || 'activo')
    return { label: `${entityType} ✓`, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  }
  if (assetBinding?.status === 'optional_unbound') {
    return { label: 'sin vincular', className: 'bg-gray-50 text-gray-400 border-gray-200' }
  }
  return null
}

// ── Utility label ─────────────────────────────────────────────────────────────

const UTILITY_LABELS: Record<string, string> = {
  electricity: 'Electricidad', natural_gas: 'Gas natural', steam: 'Vapor',
  compressed_air: 'Aire comp.', chilled_water: 'A. helada', hot_water: 'A. caliente',
  industrial_water: 'A. industrial', diesel: 'Diésel', lpg: 'GLP',
  solar_generation: 'Solar', battery_storage: 'Batería',
}

// ── Handles helper ────────────────────────────────────────────────────────────

function Handles({ color = '#9ca3af' }: { color?: string }) {
  const style = { background: color, width: 10, height: 10, border: '2px solid white', zIndex: 10 }
  return (
    <>
      <Handle type="target" position={Position.Left}   style={style} />
      <Handle type="source" position={Position.Right}  style={style} />
      <Handle type="target" position={Position.Top}    style={style} />
      <Handle type="source" position={Position.Bottom} style={style} />
    </>
  )
}

// ── Primary spec helper (C-01) ───────────────────────────────────────────────
// Reads the most relevant spec from properties.specs based on node type

const SPEC_KEYS: Record<string, string[]> = {
  transformer:   ['kva', 'kVA', 'rated_kva', 'power_kva'],
  generator:     ['kw', 'kW', 'rated_kw', 'power_kw'],
  motor:         ['hp', 'kw', 'rated_hp', 'rated_kw'],
  compressor:    ['cfm', 'kw', 'flow_cfm', 'power_kw'],
  boiler:        ['kg_h', 'mmbtu', 'steam_kg_h', 'capacity_kg_h'],
  chiller:       ['rt', 'kw', 'tons_ref', 'rated_kw'],
  cooling_tower: ['rt', 'gpm', 'tons_ref'],
  pump:          ['gpm', 'lpm', 'flow_gpm', 'flow_lpm'],
  tank:          ['m3', 'liters', 'capacity_m3', 'volume_m3'],
  panel:         ['a', 'kva', 'rated_amps', 'rated_kva'],
}

const SPEC_UNITS: Record<string, string> = {
  kva: 'kVA', kw: 'kW', kVA: 'kVA', hp: 'HP', rt: 'RT', kg_h: 'kg/h',
  mmbtu: 'MMBTU/h', cfm: 'CFM', gpm: 'GPM', lpm: 'LPM', m3: 'm³', a: 'A',
  rated_kva: 'kVA', rated_kw: 'kW', rated_hp: 'HP', tons_ref: 'RT',
  capacity_kg_h: 'kg/h', flow_gpm: 'GPM', flow_lpm: 'LPM', capacity_m3: 'm³',
  power_kw: 'kW', steam_kg_h: 'kg/h', flow_cfm: 'CFM', rated_amps: 'A',
}

function getPrimarySpec(data: DiagramNodeData): string | null {
  const specs = (data.properties?.specs ?? data.properties) as Record<string, unknown> | undefined
  if (!specs) return null
  const keys = SPEC_KEYS[data.nodeType as string] || []
  for (const key of keys) {
    const val = specs[key]
    if (val != null && val !== '') {
      const unit = SPEC_UNITS[key] || ''
      return `${val} ${unit}`.trim()
    }
  }
  return null
}

// ── EquipmentNode ─────────────────────────────────────────────────────────────

function EquipmentNode({ data, id }: NProps) {
  const fam = nodeFamily(data.nodeType as string)
  const Icon = iconMap[data.nodeType as string] || Wrench
  const badge = bindingBadge(data)
  const borderClass = familyBorderColors[fam]
  const headerClass = familyHeaderColors[fam]
  const primarySpec = getPrimarySpec(data)

  // C-02: status dot from readings
  const getReading = useDiagramReadings((s) => s.getReading)
  const reading = getReading(id)
  const statusDotColor = !reading
    ? '#d1d5db'
    : QUALITY_COLORS[reading.quality]

  return (
    <div className={`rounded-xl border-2 shadow-[0_1px_4px_rgba(0,0,0,0.08)] min-w-[148px] ${borderClass}`}>
      {/* Header */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 ${headerClass} rounded-t-[10px] text-[10px] font-semibold`}>
        <Icon size={12} />
        <span className="truncate flex-1">{nodeLabels[data.nodeType as string] || data.nodeType}</span>
        {/* C-02: status dot */}
        <span
          className="w-2 h-2 rounded-full shrink-0 border border-white/30"
          style={{ backgroundColor: statusDotColor }}
          title={reading ? `Medición: ${reading.quality}` : 'Sin medidor vinculado'}
        />
      </div>
      {/* Body */}
      <div className="px-2.5 py-2">
        <p className="text-[12px] font-semibold text-gray-800 truncate leading-tight">{data.label}</p>
        {data.tag && (
          <p className="text-[10px] text-gray-400 font-mono truncate mt-0.5">{data.tag}</p>
        )}
        {/* C-01: primary spec */}
        {primarySpec && (
          <p className="text-[11px] font-semibold text-blue-600 mt-1 leading-none">{primarySpec}</p>
        )}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {data.utility && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
              {UTILITY_LABELS[data.utility as string] || (data.utility as string)}
            </span>
          )}
          {badge && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${badge.className}`}>
              {badge.label}
            </span>
          )}
        </div>
      </div>
      <Handles />
    </div>
  )
}

// ── ConnectorNode ─────────────────────────────────────────────────────────────

const connColors: Record<string, string> = {
  connector_pipe: '#0891b2', connector_duct: '#0d9488', connector_cable: '#1e40af',
  connector_busbar: '#ea580c', header: '#7c3aed', manifold: '#7c3aed',
  branch: '#6b7280', junction: '#6b7280',
}

function ConnectorNode({ data }: NProps) {
  const color = connColors[data.nodeType as string] || '#6b7280'
  return (
    <div className="min-w-[40px] min-h-[40px] flex items-center justify-center">
      <div
        className="w-10 h-10 rounded-full border-2 flex items-center justify-center bg-white shadow-sm"
        style={{ borderColor: color }}
      >
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      </div>
      <Handle type="source" position={Position.Right} style={{ background: color, width: 10, height: 10, border: '2px solid white' }} />
      <Handle type="target" position={Position.Left}  style={{ background: color, width: 10, height: 10, border: '2px solid white' }} />
    </div>
  )
}

// ── MeasurementNode (enhanced with live readings) ─────────────────────────────

function MeasurementNode({ data, id }: NProps) {
  const getReading = useDiagramReadings((s) => s.getReading)
  const reading = getReading(id)
  const quality = reading?.quality ?? 'none'
  const dotColor = QUALITY_COLORS[quality]
  const badge = bindingBadge(data)

  // Format value
  const displayValue = reading?.value != null
    ? `${Number(reading.value).toLocaleString('es-MX', { maximumFractionDigits: 2 })} ${reading.unit}`
    : null

  const timeLabel = reading?.timestamp ? relativeTime(reading.timestamp) : null

  return (
    <div className="rounded-xl border-2 border-purple-300 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] min-w-[120px]">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-500 text-white rounded-t-[10px] text-[10px] font-semibold">
        <Gauge size={11} />
        <span className="truncate">{nodeLabels[data.nodeType as string] || 'Medidor'}</span>
      </div>

      {/* Body */}
      <div className="px-2.5 py-2">
        {/* Tag */}
        <p className="text-[11px] font-mono font-semibold text-purple-700 truncate leading-tight">
          {data.tag || data.label}
        </p>

        {/* Live value */}
        {displayValue ? (
          <p className="text-[13px] font-bold text-gray-800 mt-1 leading-tight truncate">
            {displayValue}
          </p>
        ) : (
          <p className="text-[11px] text-gray-400 mt-1 italic">Sin lectura</p>
        )}

        {/* Quality dot + timestamp */}
        <div className="flex items-center gap-1 mt-1.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: dotColor }}
          />
          <span className="text-[9px] text-gray-400 truncate">
            {timeLabel || 'Sin datos'}
          </span>
        </div>

        {/* Measurement type */}
        {reading?.measurementType && (
          <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
            {reading.measurementType}
          </span>
        )}

        {/* Asset binding badge */}
        {badge && !reading && (
          <span className={`inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded-full border ${badge.className}`}>
            {badge.label}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Right} style={{ background: '#a855f7', width: 10, height: 10, border: '2px solid white' }} />
      <Handle type="target" position={Position.Left}  style={{ background: '#a855f7', width: 10, height: 10, border: '2px solid white' }} />
    </div>
  )
}

// ── OrganizationalNode ────────────────────────────────────────────────────────

function OrganizationalNode({ data }: NProps) {
  const Icon = iconMap[data.nodeType as string] || Building2
  const badge = bindingBadge(data)
  return (
    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/80 min-w-[160px]">
      <div className="flex items-center gap-2 px-3 py-2">
        <Icon size={16} className="text-gray-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-700 truncate">{data.label}</p>
          {data.tag && <p className="text-[10px] text-gray-400 font-mono truncate">{data.tag}</p>}
          {badge && <p className="text-[9px] text-emerald-700 mt-0.5">{badge.label}</p>}
        </div>
      </div>
      <Handles color="#9ca3af" />
    </div>
  )
}

// ── SpecialNode ───────────────────────────────────────────────────────────────
// C-03: utility_source gets a prominent design with supply specs

const UTILITY_SOURCE_COLORS: Record<string, { bg: string; border: string; header: string; text: string }> = {
  electricity:     { bg: '#eff6ff', border: '#93c5fd', header: '#1d4ed8', text: '#1d4ed8' },
  natural_gas:     { bg: '#fff7ed', border: '#fdba74', header: '#c2410c', text: '#c2410c' },
  steam:           { bg: '#f5f3ff', border: '#c4b5fd', header: '#6d28d9', text: '#6d28d9' },
  compressed_air:  { bg: '#f0fdfa', border: '#5eead4', header: '#0f766e', text: '#0f766e' },
  chilled_water:   { bg: '#ecfeff', border: '#67e8f9', header: '#0e7490', text: '#0e7490' },
  hot_water:       { bg: '#fff1f2', border: '#fda4af', header: '#be123c', text: '#be123c' },
  industrial_water:{ bg: '#f0f9ff', border: '#7dd3fc', header: '#0369a1', text: '#0369a1' },
  diesel:          { bg: '#fefce8', border: '#fde047', header: '#a16207', text: '#a16207' },
  lpg:             { bg: '#fffbeb', border: '#fcd34d', header: '#b45309', text: '#b45309' },
  solar_generation:{ bg: '#f7fee7', border: '#bef264', header: '#4d7c0f', text: '#4d7c0f' },
  battery_storage: { bg: '#eef2ff', border: '#a5b4fc', header: '#4338ca', text: '#4338ca' },
}

function SpecialNode({ data }: NProps) {
  const isSource = data.nodeType === 'utility_source'
  const isLoss = data.nodeType === 'loss_node'
  const Icon = iconMap[data.nodeType as string] || Power
  const utility = (data.utility as string) || ''
  const srcColors = UTILITY_SOURCE_COLORS[utility]

  // Prominent utility_source design (C-03)
  if (isSource && srcColors) {
    const spec = getPrimarySpec(data)
    return (
      <div
        className="rounded-2xl border-2 shadow-[0_2px_12px_rgba(0,0,0,0.10)] min-w-[160px]"
        style={{ borderColor: srcColors.border, background: srcColors.bg }}
      >
        {/* Header with utility color */}
        <div
          className="flex items-center gap-1.5 px-3 py-2 rounded-t-[14px] text-[10px] font-bold text-white"
          style={{ backgroundColor: srcColors.header }}
        >
          <Power size={12} />
          <span className="uppercase tracking-wider">Fuente</span>
        </div>
        <div className="px-3 py-2.5">
          <p className="text-[13px] font-bold leading-tight" style={{ color: srcColors.text }}>
            {data.label || 'Fuente de suministro'}
          </p>
          {data.tag && (
            <p className="text-[10px] font-mono opacity-60 mt-0.5" style={{ color: srcColors.text }}>{data.tag}</p>
          )}
          {spec && (
            <div
              className="mt-2 px-2 py-1 rounded-lg text-[11px] font-bold"
              style={{ backgroundColor: srcColors.header + '20', color: srcColors.header }}
            >
              {spec}
            </div>
          )}
          {utility && (
            <p className="text-[10px] mt-1.5 opacity-50" style={{ color: srcColors.text }}>
              {UTILITY_LABELS[utility] || utility}
            </p>
          )}
        </div>
        <Handle type="source" position={Position.Right} style={{ background: srcColors.header, width: 12, height: 12, border: '2px solid white' }} />
        <Handle type="source" position={Position.Bottom} style={{ background: srcColors.header, width: 10, height: 10, border: '2px solid white' }} />
      </div>
    )
  }

  // Standard special nodes
  return (
    <div className={`rounded-xl border-2 shadow-[0_1px_4px_rgba(0,0,0,0.08)] min-w-[130px] ${
      isSource ? 'border-emerald-400 bg-white' :
      isLoss   ? 'border-red-300 bg-white' :
                 'border-gray-200 bg-white'
    }`}>
      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-[10px] text-[10px] font-semibold text-white ${
        isSource ? 'bg-emerald-500' : isLoss ? 'bg-red-400' : 'bg-gray-400'
      }`}>
        <Icon size={12} />
        <span>{nodeLabels[data.nodeType as string] || data.nodeType}</span>
      </div>
      <div className="px-2.5 py-2">
        <p className="text-[12px] font-semibold text-gray-800 truncate leading-tight">{data.label}</p>
        {data.tag && <p className="text-[10px] text-gray-400 font-mono truncate mt-0.5">{data.tag}</p>}
      </div>
      {isSource ? (
        <Handle type="source" position={Position.Right} style={{ background: '#10b981', width: 10, height: 10, border: '2px solid white' }} />
      ) : (
        <Handles />
      )}
    </div>
  )
}

// ── ControlNode — ISA-5.1 SVG symbols (C-04) ─────────────────────────────────

const CONTROL_SYMBOL_COLORS: Record<string, string> = {
  valve:         '#f97316',
  control_valve: '#ea580c',
  check_valve:   '#fb923c',
  breaker:       '#1d4ed8',
  disconnect:    '#3b82f6',
  regulator:     '#7c3aed',
  damper:        '#0d9488',
}

function ControlNode({ data }: NProps) {
  const ControlSymbol = getControlSymbol(data.nodeType as string)
  const color = CONTROL_SYMBOL_COLORS[data.nodeType as string] || '#f97316'
  const nt = data.nodeType as string
  const isElectrical = nt === 'breaker' || nt === 'disconnect'

  return (
    <div className="flex flex-col items-center gap-0.5" title={data.tag || (data.label as string)}>
      {/* ISA symbol */}
      <div
        className="rounded-xl border-2 bg-white shadow-sm p-1.5"
        style={{ borderColor: color, color }}
      >
        <ControlSymbol size={28} />
      </div>
      {/* Label below */}
      {data.tag && (
        <span className="text-[9px] font-mono font-semibold" style={{ color }}>
          {data.tag}
        </span>
      )}
      <Handle type="source" position={Position.Right} style={{ background: color, width: 10, height: 10, border: '2px solid white', top: '40%' }} />
      <Handle type="target" position={Position.Left}  style={{ background: color, width: 10, height: 10, border: '2px solid white', top: '40%' }} />
      {isElectrical && (
        <>
          <Handle type="source" position={Position.Bottom} style={{ background: color, width: 10, height: 10, border: '2px solid white' }} />
          <Handle type="target" position={Position.Top}    style={{ background: color, width: 10, height: 10, border: '2px solid white' }} />
        </>
      )}
    </div>
  )
}

// ── Selector + exports ────────────────────────────────────────────────────────

type SelectorMap = Record<string, typeof EquipmentNode>

const selector: SelectorMap = {
  boiler: EquipmentNode, pump: EquipmentNode, compressor: EquipmentNode,
  chiller: EquipmentNode, cooling_tower: EquipmentNode, tank: EquipmentNode,
  transformer: EquipmentNode, panel: EquipmentNode, generator: EquipmentNode,
  heat_exchanger: EquipmentNode, motor: EquipmentNode, consumer: EquipmentNode,
  custom_equipment: EquipmentNode,
  connector_pipe: ConnectorNode, connector_duct: ConnectorNode,
  connector_cable: ConnectorNode, connector_busbar: ConnectorNode,
  header: ConnectorNode, manifold: ConnectorNode, branch: ConnectorNode,
  junction: ConnectorNode,
  valve: ControlNode, damper: ControlNode, breaker: ControlNode,
  disconnect: ControlNode, control_valve: ControlNode, regulator: ControlNode,
  check_valve: ControlNode,
  flow_meter: MeasurementNode, energy_meter: MeasurementNode,
  power_meter: MeasurementNode, pressure_sensor: MeasurementNode,
  temperature_sensor: MeasurementNode, level_sensor: MeasurementNode,
  current_transformer: MeasurementNode, gas_meter: MeasurementNode,
  water_meter: MeasurementNode, steam_meter: MeasurementNode,
  custom_meter: MeasurementNode,
  iot_device: EquipmentNode, gateway: EquipmentNode, plc: EquipmentNode,
  rtu: EquipmentNode, edge_device: EquipmentNode, virtual_point: EquipmentNode,
  api_source: EquipmentNode, manual_reading_source: EquipmentNode,
  area_node: OrganizationalNode, process_node: OrganizationalNode,
  production_line: OrganizationalNode, area: OrganizationalNode,
  process: OrganizationalNode, site: OrganizationalNode,
  cost_center: OrganizationalNode,
  utility_source: SpecialNode, loss_node: SpecialNode, annotation: SpecialNode,
  group: SpecialNode,
}

export const BaseNode = memo((props: NodeProps & { data: Record<string, unknown> }) => {
  const nt = (props.data.nodeType as string) || 'consumer'
  const Comp = selector[nt as keyof typeof selector] || EquipmentNode
  return <Comp {...(props as NProps)} />
})
BaseNode.displayName = 'BaseNode'

export const nodeTypes = {
  equipment:     memo(EquipmentNode),
  connector:     memo(ConnectorNode),
  control:       memo(ControlNode),
  measurement:   memo(MeasurementNode),
  organizational:memo(OrganizationalNode),
  special:       memo(SpecialNode),
}
