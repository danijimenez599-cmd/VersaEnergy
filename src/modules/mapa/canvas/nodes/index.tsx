import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { DiagramNodeData } from '@/services/topology-engine/graphTypes'
import {
  Zap, Flame, Droplets, Wind, Thermometer, Gauge, Wrench, Building2,
  Power, Cable, CircleDot, Wifi, Container, Snowflake, Cog, Plug,
  TrendingDown, Columns, GitFork, PowerOff, ArrowRightLeft, GripHorizontal,
  Workflow, StickyNote,
} from 'lucide-react'

type NProps = NodeProps & { data: DiagramNodeData }

const iconMap: Record<string, typeof Zap> = {
  boiler: Flame, pump: Droplets, compressor: Wind, chiller: Snowflake,
  cooling_tower: Wind, tank: Container, transformer: Zap, panel: GripHorizontal,
  generator: Power, heat_exchanger: ArrowRightLeft, motor: Cog, consumer: Plug,
  connector_pipe: ArrowRightLeft, connector_duct: Wind, connector_cable: Cable,
  connector_busbar: GripHorizontal, header: Columns, manifold: GitFork,
  valve: CircleDot, damper: CircleDot, breaker: PowerOff, regulator: CircleDot,
  control_valve: CircleDot, check_valve: ArrowRightLeft,
  flow_meter: Gauge, energy_meter: Gauge, power_meter: Gauge,
  pressure_sensor: Gauge, temperature_sensor: Thermometer, level_sensor: Gauge,
  gas_meter: Gauge, water_meter: Droplets, steam_meter: Flame,
  iot_device: Wifi, gateway: Wifi, plc: Cog, edge_device: Wifi,
  area_node: Building2, process_node: Workflow, production_line: Plug,
  utility_source: Power, loss_node: TrendingDown, annotation: StickyNote, group: Building2,
  area: Building2, process: Workflow, site: Building2, cost_center: Building2,
  branch: GitFork, junction: GitFork, disconnect: PowerOff, current_transformer: Zap,
  custom_meter: Gauge, rtu: Cog, virtual_point: Wifi, api_source: Wifi,
  manual_reading_source: Wifi, custom_equipment: Wrench,
}

const familyBorderColors: Record<string, string> = {
  equipment: 'border-blue-400 bg-blue-50',
  connector: 'border-teal-400 bg-teal-50',
  control: 'border-orange-400 bg-orange-50',
  measurement: 'border-purple-400 bg-purple-50',
  iot: 'border-cyan-400 bg-cyan-50',
  organizational: 'border-gray-400 bg-gray-50',
  special: 'border-red-300 bg-red-50',
}

const familyHeaderColors: Record<string, string> = {
  equipment: 'bg-blue-500',
  connector: 'bg-teal-500',
  control: 'bg-orange-500',
  measurement: 'bg-purple-500',
  iot: 'bg-cyan-500',
  organizational: 'bg-gray-500',
  special: 'bg-red-400',
}

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

function nodeFamily(nt: string): string {
  const r: Record<string, string> = {
    boiler:'equipment', pump:'equipment', compressor:'equipment', chiller:'equipment',
    cooling_tower:'equipment', tank:'equipment', transformer:'equipment',
    panel:'equipment', generator:'equipment', heat_exchanger:'equipment',
    motor:'equipment', consumer:'equipment', custom_equipment:'equipment',
    connector_pipe:'connector', connector_duct:'connector', connector_cable:'connector',
    connector_busbar:'connector', header:'connector', manifold:'connector',
    branch:'connector', junction:'connector',
    valve:'control', damper:'control', breaker:'control', disconnect:'control',
    control_valve:'control', regulator:'control', check_valve:'control',
    flow_meter:'measurement', energy_meter:'measurement', power_meter:'measurement',
    pressure_sensor:'measurement', temperature_sensor:'measurement',
    level_sensor:'measurement', current_transformer:'measurement',
    gas_meter:'measurement', water_meter:'measurement', steam_meter:'measurement',
    custom_meter:'measurement',
    iot_device:'iot', gateway:'iot', plc:'iot', rtu:'iot',
    edge_device:'iot', virtual_point:'iot', api_source:'iot', manual_reading_source:'iot',
    area_node:'organizational', process_node:'organizational',
    production_line:'organizational', area:'organizational', process:'organizational',
    site:'organizational', cost_center:'organizational',
    utility_source:'special', loss_node:'special', group:'special', annotation:'special',
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
    return { label: `${entityType} vinculado`, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  }
  if (assetBinding?.status === 'optional_unbound') {
    return { label: 'opcional', className: 'bg-gray-50 text-gray-500 border-gray-200' }
  }
  return null
}

function EquipmentNode({ data }: NProps) {
  const fam = nodeFamily(data.nodeType as string)
  const Icon = iconMap[data.nodeType as string] || Wrench
  const badge = bindingBadge(data)
  return (
    <div className={`rounded-xl border-2 shadow-sm min-w-[140px] ${familyBorderColors[fam]}`}>
      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 ${familyHeaderColors[fam]} rounded-t-[10px] text-white text-[10px] font-medium`}>
        <Icon size={12} />
        <span className="truncate">{nodeLabels[data.nodeType as string] || data.nodeType}</span>
      </div>
      <div className="px-2.5 py-2">
        <p className="text-[11px] font-semibold text-gray-800 truncate">{data.label}</p>
        {data.tag && <p className="text-[10px] text-gray-500 font-mono truncate">{data.tag}</p>}
        {data.utility && (
          <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded-full bg-white/60 text-gray-600 border border-gray-200">
            {data.utility as string}
          </span>
        )}
        {badge && (
          <span className={`ml-1 inline-block mt-1 rounded-full border px-1.5 py-0.5 text-[9px] ${badge.className}`}>
            {badge.label}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-gray-400 !border-2 !border-white" />
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-gray-400 !border-2 !border-white" />
    </div>
  )
}

const connColors: Record<string, string> = { connector_pipe: '#0891b2', connector_duct: '#0d9488', connector_cable: '#1e40af', connector_busbar: '#ea580c', header: '#7c3aed', manifold: '#7c3aed', branch: '#6b7280', junction: '#6b7280' }

function ConnectorNode({ data }: NProps) {
  const color = connColors[data.nodeType as string] || '#6b7280'
  return (
    <div className="min-w-[40px] min-h-[40px] flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center bg-white shadow-sm" style={{ borderColor: color }}>
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      </div>
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-gray-400 !border-2 !border-white" />
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-gray-400 !border-2 !border-white" />
    </div>
  )
}

function MeasurementNode({ data }: NProps) {
  const Icon = iconMap[data.nodeType as string] || Gauge
  const badge = bindingBadge(data)
  return (
    <div className="rounded-full border-2 border-purple-300 bg-purple-50 shadow-sm min-w-[60px] min-h-[60px] flex flex-col items-center justify-center p-2">
      <Icon size={16} className="text-purple-600" />
      <span className="text-[9px] font-mono text-purple-700 mt-0.5 truncate max-w-[56px]">{data.tag}</span>
      {badge && <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />}
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-purple-400 !border-2 !border-white" />
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-purple-400 !border-2 !border-white" />
    </div>
  )
}

function OrganizationalNode({ data }: NProps) {
  const Icon = iconMap[data.nodeType as string] || Building2
  const badge = bindingBadge(data)
  return (
    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/60 min-w-[160px]">
      <div className="flex items-center gap-2 px-3 py-2">
        <Icon size={16} className="text-gray-500" />
        <div>
          <p className="text-xs font-semibold text-gray-700">{data.label}</p>
          {data.tag && <p className="text-[10px] text-gray-400 font-mono">{data.tag}</p>}
          {badge && <p className="text-[9px] text-emerald-700">{badge.label}</p>}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-gray-400 !border-2 !border-white" />
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-gray-400 !border-2 !border-white" />
    </div>
  )
}

function SpecialNode({ data }: NProps) {
  const isSource = data.nodeType === 'utility_source'
  const Icon = iconMap[data.nodeType as string] || Power
  return (
    <div className={`rounded-lg border-2 shadow-sm min-w-[120px] ${isSource ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50'}`}>
      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-md text-white text-[10px] font-medium ${isSource ? 'bg-green-500' : 'bg-red-400'}`}>
        <Icon size={12} />
        <span>{nodeLabels[data.nodeType as string] || data.nodeType}</span>
      </div>
      <div className="px-2.5 py-1.5">
        <p className="text-[11px] font-medium text-gray-700 truncate">{data.label}</p>
      </div>
      {isSource ? (
        <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-green-400 !border-2 !border-white" />
      ) : (
        <>
          <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-gray-400 !border-2 !border-white" />
          <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-gray-400 !border-2 !border-white" />
        </>
      )}
    </div>
  )
}

function ControlNode() {
  return (
    <div className="min-w-[50px] min-h-[50px] flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-2 border-orange-400 bg-orange-50 flex items-center justify-center shadow-sm">
        <CircleDot size={16} className="text-orange-600" />
      </div>
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-orange-400 !border-2 !border-white" />
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-orange-400 !border-2 !border-white" />
    </div>
  )
}

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
  equipment: memo(EquipmentNode),
  connector: memo(ConnectorNode),
  control: memo(ControlNode),
  measurement: memo(MeasurementNode),
  organizational: memo(OrganizationalNode),
  special: memo(SpecialNode),
}
