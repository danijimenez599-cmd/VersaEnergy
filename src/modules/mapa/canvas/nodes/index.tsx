import { memo, useMemo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { DiagramNodeData } from '@/services/topology-engine/graphTypes'
import { useDiagramStore } from '../hooks/useDiagramStore'
import {
  Zap, Flame, Droplets, Wind, Thermometer, Gauge, Wrench, Building2,
  Power, Cable, CircleDot, Wifi, Container, Snowflake, Cog, Plug,
  TrendingDown, Columns, GitFork, PowerOff, ArrowRightLeft, GripHorizontal,
  Workflow, StickyNote, Factory, Cpu, Network, Activity, BarChart2,
  Layers, ToggleLeft, Droplet, FlameKindling, Sun, Radio,
} from 'lucide-react'
import { useDiagramReadings } from '../hooks/useDiagramReadings'
import { useEquipmentMPs } from '../hooks/useEquipmentMPs'
import { QUALITY_COLORS, relativeTime } from '@/services/measurement-engine/lastReadings'
import { SOURCE_TYPE_ICONS } from '@/services/measurement-engine/unitCatalog'
import { getControlSymbol } from './controlSymbols'
import { getEquipmentSymbol } from './equipmentSymbols'
import { getMeterAnchorFromNodeData, getSelectedMeterScope } from '../meterScopePreview'

// ── Utility color tint (símbolo + acento del nodo) ────────────────────────────

const UTILITY_TINT: Record<string, { accent: string; soft: string; border: string }> = {
  electricity:      { accent: '#1d4ed8', soft: '#eff6ff', border: '#bfdbfe' },
  natural_gas:      { accent: '#c2410c', soft: '#fff7ed', border: '#fed7aa' },
  steam:            { accent: '#6d28d9', soft: '#f5f3ff', border: '#ddd6fe' },
  compressed_air:   { accent: '#0f766e', soft: '#f0fdfa', border: '#99f6e4' },
  chilled_water:    { accent: '#0e7490', soft: '#ecfeff', border: '#a5f3fc' },
  hot_water:        { accent: '#be123c', soft: '#fff1f2', border: '#fecdd3' },
  industrial_water: { accent: '#0369a1', soft: '#f0f9ff', border: '#bae6fd' },
  diesel:           { accent: '#a16207', soft: '#fefce8', border: '#fef08a' },
  lpg:              { accent: '#b45309', soft: '#fffbeb', border: '#fde68a' },
  solar_generation: { accent: '#4d7c0f', soft: '#f7fee7', border: '#d9f99d' },
  battery_storage:  { accent: '#4338ca', soft: '#eef2ff', border: '#c7d2fe' },
}

function utilityTint(utility?: string) {
  return (utility && UTILITY_TINT[utility]) || { accent: '#475569', soft: '#f8fafc', border: '#e2e8f0' }
}

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

// IDs estándar de handles — usados por orientEdges() para rutear vertical u
// horizontal: source 's-right'/'s-bottom', target 't-left'/'t-top'.
function Handles({ color = '#9ca3af' }: { color?: string }) {
  const style = { background: color, width: 10, height: 10, border: '2px solid white', zIndex: 10 }
  return (
    <>
      <Handle id="t-left"   type="target" position={Position.Left}   style={style} />
      <Handle id="s-right"  type="source" position={Position.Right}  style={style} />
      <Handle id="t-top"    type="target" position={Position.Top}    style={style} />
      <Handle id="s-bottom" type="source" position={Position.Bottom} style={style} />
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
  const nt = data.nodeType as string
  const Symbol = getEquipmentSymbol(nt)
  const FallbackIcon = iconMap[nt] || Wrench
  const tint = utilityTint(data.utility as string)
  const primarySpec = getPrimarySpec(data)
  const typeLabel = nodeLabels[nt] || nt

  const properties = data.properties || {}
  const assetBinding = properties.asset_binding as Record<string, unknown> | undefined
  const isLinked = assetBinding?.status === 'linked'
  const entityId = isLinked && assetBinding?.entity_type === 'equipment'
    ? (assetBinding.entity_id as string)
    : null

  // Readings del nodo propio (si hay un medidor flotante sobre él)
  const getReading = useDiagramReadings((s) => s.getReading)
  const reading = getReading(id)
  const statusDotColor = !reading ? '#d1d5db' : QUALITY_COLORS[reading.quality]

  // MPs del equipo desde el Modelo (indicadores inline)
  const getMPs = useEquipmentMPs((s) => s.getMPs)
  const equipmentMPs = entityId ? getMPs(entityId) : []

  const metaParts = [data.tag, primarySpec].filter(Boolean) as string[]
  const allNodes = useDiagramStore((s) => s.nodes)
  const allEdges = useDiagramStore((s) => s.edges)
  const selectedElement = useDiagramStore((s) => s.selectedElement)
  const selectedMeterScope = useMemo(
    () => getSelectedMeterScope(allNodes, allEdges, selectedElement),
    [allNodes, allEdges, selectedElement],
  )
  const isInSelectedMeterScope = Boolean(selectedMeterScope?.downstreamNodeIds.includes(id))

  return (
    <div
      className="rounded-xl border bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] w-[176px] overflow-hidden"
      style={{
        borderColor: isInSelectedMeterScope ? tint.accent : tint.border,
        boxShadow: isInSelectedMeterScope
          ? `0 0 0 3px ${tint.accent}26, 0 8px 22px rgba(15, 23, 42, 0.12)`
          : '0 1px 4px rgba(0,0,0,0.08)',
      }}
      title={`${typeLabel} · ${data.label}`}
    >
      {/* Cabecera: símbolo + nombre */}
      <div className="flex items-stretch">
        <div
          className="flex items-center justify-center w-12 shrink-0"
          style={{ background: tint.soft, color: tint.accent }}
        >
          {Symbol ? <Symbol size={26} /> : <FallbackIcon size={22} />}
        </div>
        <div className="flex-1 min-w-0 px-2.5 py-2">
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wide truncate" style={{ color: tint.accent }}>
              {typeLabel}
            </span>
            {isLinked && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Vinculado al árbol de activos" />
            )}
            {equipmentMPs.length === 0 && (
              <span
                className="ml-auto w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: statusDotColor }}
                title={reading ? `Medición: ${reading.quality}` : 'Sin medidor vinculado'}
              />
            )}
          </div>
          <p className="text-[12px] font-bold text-gray-800 truncate leading-tight mt-0.5">{data.label}</p>
          {metaParts.length > 0 && (
            <p className="text-[10px] text-gray-400 font-mono truncate mt-0.5">
              {metaParts.join('  ·  ')}
            </p>
          )}
        </div>
      </div>

      {/* Indicadores inline de MPs (estilo SCADA) */}
      {equipmentMPs.length > 0 && (
        <div className="border-t px-2 py-1.5 space-y-1" style={{ borderColor: tint.border }}>
          {equipmentMPs.slice(0, 4).map((mp) => (
            <div key={mp.id} className="flex items-center gap-1" title={`${mp.tag} · ${mp.name}`}>
              <span className="text-[9px] leading-none shrink-0">
                {SOURCE_TYPE_ICONS[mp.source_type] || '·'}
              </span>
              <span className="text-[10px] font-mono font-semibold text-gray-600 shrink-0 w-[46px] truncate">
                {mp.tag}
              </span>
              <span className="flex-1 text-[10px] text-gray-500 text-right truncate">
                {mp.value != null
                  ? `${Number(mp.value).toLocaleString('es-MX', { maximumFractionDigits: 1 })} ${mp.unit}`
                  : <span className="text-gray-300 italic">—</span>
                }
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0 ml-1"
                style={{ backgroundColor: QUALITY_COLORS[mp.quality] }}
                title={mp.quality}
              />
            </div>
          ))}
          {equipmentMPs.length > 4 && (
            <p className="text-[9px] text-gray-300 text-right pr-0.5">+{equipmentMPs.length - 4} más</p>
          )}
        </div>
      )}

      <Handles color={tint.accent} />
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
      <Handle id="t-left"   type="target" position={Position.Left}   style={{ background: color, width: 10, height: 10, border: '2px solid white' }} />
      <Handle id="s-right"  type="source" position={Position.Right}  style={{ background: color, width: 10, height: 10, border: '2px solid white' }} />
      <Handle id="t-top"    type="target" position={Position.Top}    style={{ background: color, width: 10, height: 10, border: '2px solid white' }} />
      <Handle id="s-bottom" type="source" position={Position.Bottom} style={{ background: color, width: 10, height: 10, border: '2px solid white' }} />
    </div>
  )
}

// ── MeasurementNode (enhanced with live readings) ─────────────────────────────

// MeasurementNode → globo ISA-5.1 (círculo con línea central + tag), valor debajo.
// Es el estándar de instrumentación; ocupa poco espacio y no compite con los equipos.

function MeasurementNode({ data, id }: NProps) {
  const getReading = useDiagramReadings((s) => s.getReading)
  const reading = getReading(id)
  const quality = reading?.quality ?? 'none'
  const tint = utilityTint(data.utility as string)
  const ringColor = reading ? QUALITY_COLORS[quality] : tint.accent
  const meterAnchor = getMeterAnchorFromNodeData(data)
  const measurementBinding = data.properties?.measurement_binding as Record<string, unknown> | undefined
  const meterRole = measurementBinding?.role === 'boundary' ? 'boundary' : 'submeter'

  // source_type: viene del reading (MP) o del measurement_binding guardado al crear el nodo
  const sourceType = reading?.sourceType
    || (measurementBinding?.source_type as string)
    || null
  const sourceIcon = sourceType ? SOURCE_TYPE_ICONS[sourceType] : null
  const hasMp = Boolean(measurementBinding?.measurement_point_id)

  // Phase 4 — stale badge: para fuentes manuales sin lectura reciente (>24h)
  const isManual = sourceType === 'manual'
  const readingAgeH = reading?.timestamp
    ? (Date.now() - new Date(reading.timestamp).getTime()) / 3_600_000
    : null
  const isStaleManual = isManual && hasMp && (readingAgeH === null || readingAgeH > 24)

  // Alcance: qué nodo mide (deriva del edge de señal que lo conecta).
  const allNodes = useDiagramStore((s) => s.nodes)
  const allEdges = useDiagramStore((s) => s.edges)
  const selectedElement = useDiagramStore((s) => s.selectedElement)
  const meterScope = useMemo(
    () => getSelectedMeterScope(allNodes, allEdges, { type: 'node', id }),
    [allNodes, allEdges, id],
  )
  const isSelectedMeter = selectedElement?.type === 'node' && selectedElement.id === id
  const measuredTag = useMemo(() => {
    const measuredNodeId = meterScope?.measuredNodeId
    const n = measuredNodeId ? allNodes.find((nd) => nd.id === measuredNodeId) : null
    return n ? ((n.data.tag as string) || (n.data.label as string)) : null
  }, [allNodes, meterScope])
  const measuredEquipmentCount = Math.max(0, (meterScope?.downstreamNodeIds.length || 0))

  const tag = (data.tag as string) || (data.label as string) || 'MP'
  // Divide el tag en función-letras y número para el globo ISA (ej. FQI / 101)
  const m = tag.match(/^([A-Za-z]+)[- ]?(.*)$/)
  const tagTop = m ? m[1] : tag
  const tagBottom = m ? m[2] : ''

  const displayValue = reading?.value != null
    ? `${Number(reading.value).toLocaleString('es-MX', { maximumFractionDigits: 2 })} ${reading.unit}`
    : null
  const timeLabel = reading?.timestamp ? relativeTime(reading.timestamp) : null

  return (
    <div className="relative flex flex-col items-center" title={`${tag}${displayValue ? ` · ${displayValue}` : ''}`}>
      {meterAnchor?.type === 'edge' && (
        <span
          className="absolute left-1/2 top-[48px] h-7 border-l-2 border-dashed -translate-x-1/2"
          style={{ borderColor: ringColor }}
          title="Tap de medición hacia la línea anclada"
        />
      )}

      {/* Globo ISA-5.1 */}
      <div className="relative" style={{ width: 52, height: 52 }}>
        <div
          className="w-[52px] h-[52px] rounded-full bg-white flex flex-col items-center justify-center shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
          style={{
            border: `${meterRole === 'boundary' ? 3.5 : 2.5}px solid ${ringColor}`,
            boxShadow: isSelectedMeter
              ? `0 0 0 5px ${ringColor}24`
              : meterRole === 'boundary'
                ? `0 0 0 3px ${ringColor}1f`
                : undefined,
          }}
        >
          <span className="text-[10px] font-mono font-bold leading-none text-gray-700">{tagTop}</span>
          {/* Línea central ISA */}
          <span className="w-8 h-px my-0.5" style={{ background: ringColor }} />
          {tagBottom && (
            <span className="text-[10px] font-mono font-bold leading-none text-gray-700">{tagBottom}</span>
          )}
        </div>

        {/* Ícono de fuente de datos — esquina superior derecha del globo */}
        {sourceIcon && (
          <span
            className="absolute -top-1 -right-1 text-[10px] leading-none bg-white rounded-full shadow-sm border border-gray-100 w-4 h-4 flex items-center justify-center"
            title={sourceType ?? ''}
          >
            {sourceIcon}
          </span>
        )}

        {/* Indicador "sin MP" — esquina superior derecha cuando no hay binding */}
        {!hasMp && !sourceIcon && (
          <span
            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-gray-300 border-2 border-white"
            title="Sin punto de medición vinculado"
          />
        )}

        {/* Phase 4 — "Pendiente lectura" dot: amber pulse for stale manual MPs */}
        {isStaleManual && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-white animate-pulse"
            title="Lectura pendiente — ingresa el valor desde el inspector"
          />
        )}
      </div>

      {/* Valor en vivo debajo del globo */}
      {displayValue ? (
        <div className="mt-1 px-1.5 py-0.5 rounded-md bg-white border border-gray-200 shadow-sm">
          <span className="text-[11px] font-bold text-gray-800 whitespace-nowrap">{displayValue}</span>
        </div>
      ) : hasMp ? (
        <span className="mt-1 text-[9px] text-gray-400 italic">Sin lectura</span>
      ) : (
        <span className="mt-1 text-[9px] text-gray-300 italic">Sin MP</span>
      )}
      {timeLabel && (
        <span className="text-[8px] text-gray-400 mt-0.5">{timeLabel}</span>
      )}

      <div className="mt-1 flex items-center gap-1">
        {meterAnchor && (
          <span
            className="rounded-full border bg-white px-1.5 py-0.5 text-[8px] font-semibold"
            style={{ borderColor: ringColor + '40', color: ringColor }}
            title={meterAnchor.type === 'edge' ? 'Anclado a una línea física' : 'Anclado a un equipo/nodo'}
          >
            {meterAnchor.type === 'edge' ? 'sobre linea' : 'en equipo'}
          </span>
        )}
        {meterRole === 'boundary' && (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">
            frontera
          </span>
        )}
      </div>

      {/* Alcance de medición: qué mide y que cubre lo de aguas abajo */}
      {measuredTag && (
        <div
          className="mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-semibold whitespace-nowrap"
          style={{ background: ringColor + '18', color: ringColor }}
          title={`Mide ${measuredTag} y todo lo que está aguas abajo`}
        >
          mide {measuredTag} ↓ · {measuredEquipmentCount} equipos
        </div>
      )}

      <Handle id="t-top"    type="target" position={Position.Top}    style={{ background: ringColor, width: 9, height: 9, border: '2px solid white' }} />
      <Handle id="s-bottom" type="source" position={Position.Bottom} style={{ background: ringColor, width: 9, height: 9, border: '2px solid white' }} />
      <Handle id="t-left"   type="target" position={Position.Left}   style={{ background: ringColor, width: 9, height: 9, border: '2px solid white' }} />
      <Handle id="s-right"  type="source" position={Position.Right}  style={{ background: ringColor, width: 9, height: 9, border: '2px solid white' }} />
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

  // MPs del utility_source (se comporta como EquipmentNode para medidores de frontera)
  const getMPs = useEquipmentMPs((s) => s.getMPs)
  const properties = data.properties || {}
  const assetBinding = properties.asset_binding as Record<string, unknown> | undefined
  const sourceEntityId = isSource && assetBinding?.status === 'linked' && assetBinding?.entity_type === 'equipment'
    ? (assetBinding.entity_id as string)
    : null
  // También soportar binding directo de nodo a MPs via node_id (cuando no hay entity_id)
  const sourceMPs = sourceEntityId ? getMPs(sourceEntityId) : []
  const supplierName = (properties.supplier_name as string) || null

  // Prominent utility_source design (SCADA-6: con MPs inline)
  if (isSource && srcColors) {
    return (
      <div
        className="rounded-2xl border-2 shadow-[0_2px_12px_rgba(0,0,0,0.10)] min-w-[176px]"
        style={{ borderColor: srcColors.border, background: srcColors.bg }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-1.5 px-3 py-2 rounded-t-[14px] text-[10px] font-bold text-white"
          style={{ backgroundColor: srcColors.header }}
        >
          <Power size={12} />
          <span className="uppercase tracking-wider flex-1">Fuente · {UTILITY_LABELS[utility] || utility}</span>
          {/* Badge: boundary meter count */}
          {sourceMPs.length > 0 && (
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.25)' }}
              title={`${sourceMPs.length} medidor(es) de frontera`}
            >
              {sourceMPs.length}m
            </span>
          )}
        </div>
        <div className="px-3 py-2">
          <p className="text-[13px] font-bold leading-tight" style={{ color: srcColors.text }}>
            {data.label || 'Fuente de suministro'}
          </p>
          {/* Supplier name (CFE, Empresa Gas, etc.) */}
          {supplierName && (
            <p className="text-[10px] mt-0.5 opacity-70 italic" style={{ color: srcColors.text }}>
              {supplierName}
            </p>
          )}
          {data.tag && (
            <p className="text-[10px] font-mono opacity-50 mt-0.5" style={{ color: srcColors.text }}>{data.tag}</p>
          )}
        </div>

        {/* MPs inline — boundary meters */}
        {sourceMPs.length > 0 && (
          <div
            className="border-t px-2 py-1.5 space-y-1"
            style={{ borderColor: srcColors.border + '80' }}
          >
            {sourceMPs.slice(0, 4).map((mp) => (
              <div key={mp.id} className="flex items-center gap-1" title={`${mp.tag} · ${mp.name}`}>
                <span className="text-[9px] leading-none shrink-0">
                  {SOURCE_TYPE_ICONS[mp.source_type] || '·'}
                </span>
                <span className="text-[10px] font-mono font-semibold shrink-0 w-[46px] truncate" style={{ color: srcColors.text }}>
                  {mp.tag}
                </span>
                <span className="flex-1 text-[10px] text-right truncate opacity-70" style={{ color: srcColors.text }}>
                  {mp.value != null
                    ? `${Number(mp.value).toLocaleString('es-MX', { maximumFractionDigits: 1 })} ${mp.unit}`
                    : <span className="opacity-30 italic">—</span>
                  }
                </span>
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 ml-1"
                  style={{ backgroundColor: QUALITY_COLORS[mp.quality] }}
                  title={mp.quality}
                />
              </div>
            ))}
            {sourceMPs.length > 4 && (
              <p className="text-[9px] opacity-40 text-right pr-0.5" style={{ color: srcColors.text }}>
                +{sourceMPs.length - 4} más
              </p>
            )}
          </div>
        )}

        {/* Hint when no MPs configured */}
        {sourceMPs.length === 0 && (
          <div
            className="border-t px-3 py-1.5"
            style={{ borderColor: srcColors.border + '80' }}
          >
            <p className="text-[9px] opacity-40 italic" style={{ color: srcColors.text }}>
              Sin medidores — configura en Inspector
            </p>
          </div>
        )}

        <Handle id="s-right"  type="source" position={Position.Right}  style={{ background: srcColors.header, width: 12, height: 12, border: '2px solid white' }} />
        <Handle id="s-bottom" type="source" position={Position.Bottom} style={{ background: srcColors.header, width: 10, height: 10, border: '2px solid white' }} />
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
        <>
          <Handle id="s-right"  type="source" position={Position.Right}  style={{ background: '#10b981', width: 10, height: 10, border: '2px solid white' }} />
          <Handle id="s-bottom" type="source" position={Position.Bottom} style={{ background: '#10b981', width: 10, height: 10, border: '2px solid white' }} />
        </>
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
      <Handle id="s-right"  type="source" position={Position.Right} style={{ background: color, width: 10, height: 10, border: '2px solid white', top: '40%' }} />
      <Handle id="t-left"   type="target" position={Position.Left}  style={{ background: color, width: 10, height: 10, border: '2px solid white', top: '40%' }} />
      <Handle id="s-bottom" type="source" position={Position.Bottom} style={{ background: color, width: 10, height: 10, border: '2px solid white' }} />
      <Handle id="t-top"    type="target" position={Position.Top}    style={{ background: color, width: 10, height: 10, border: '2px solid white' }} />
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
