import { useState, type DragEvent } from 'react'
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react'
import type { DiagramNodeType } from '@/services/topology-engine/graphTypes'

interface PaletteItemDef {
  type: DiagramNodeType
  label: string
  family: string
}

interface PaletteGroup {
  family: string
  label: string
  color: string
  items: PaletteItemDef[]
}

const groups: PaletteGroup[] = [
  {
    family: 'equipment', label: 'Equipos', color: 'border-l-blue-500',
    items: [
      { type: 'boiler', label: 'Caldera', family: 'equipment' },
      { type: 'pump', label: 'Bomba', family: 'equipment' },
      { type: 'compressor', label: 'Compresor', family: 'equipment' },
      { type: 'chiller', label: 'Chiller', family: 'equipment' },
      { type: 'cooling_tower', label: 'T. Enfriamiento', family: 'equipment' },
      { type: 'tank', label: 'Tanque', family: 'equipment' },
      { type: 'transformer', label: 'Transformador', family: 'equipment' },
      { type: 'panel', label: 'Tablero', family: 'equipment' },
      { type: 'generator', label: 'Generador', family: 'equipment' },
      { type: 'heat_exchanger', label: 'Intercambiador', family: 'equipment' },
      { type: 'motor', label: 'Motor', family: 'equipment' },
      { type: 'consumer', label: 'Consumidor', family: 'equipment' },
    ],
  },
  {
    family: 'connector', label: 'Conectores', color: 'border-l-teal-500',
    items: [
      { type: 'connector_pipe', label: 'Tubería', family: 'connector' },
      { type: 'connector_duct', label: 'Ducto', family: 'connector' },
      { type: 'connector_cable', label: 'Cable', family: 'connector' },
      { type: 'connector_busbar', label: 'Barra', family: 'connector' },
      { type: 'header', label: 'Header', family: 'connector' },
      { type: 'manifold', label: 'Manifold', family: 'connector' },
    ],
  },
  {
    family: 'control', label: 'Control', color: 'border-l-orange-500',
    items: [
      { type: 'valve', label: 'Válvula', family: 'control' },
      { type: 'breaker', label: 'Breaker', family: 'control' },
      { type: 'regulator', label: 'Regulador', family: 'control' },
      { type: 'control_valve', label: 'Válv. Control', family: 'control' },
      { type: 'check_valve', label: 'Válv. Check', family: 'control' },
    ],
  },
  {
    family: 'measurement', label: 'Medición', color: 'border-l-purple-500',
    items: [
      { type: 'flow_meter', label: 'Caudalímetro', family: 'measurement' },
      { type: 'energy_meter', label: 'Medidor Energía', family: 'measurement' },
      { type: 'power_meter', label: 'Power Meter', family: 'measurement' },
      { type: 'pressure_sensor', label: 'Sensor Presión', family: 'measurement' },
      { type: 'temperature_sensor', label: 'Sensor Temp.', family: 'measurement' },
      { type: 'level_sensor', label: 'Sensor Nivel', family: 'measurement' },
      { type: 'gas_meter', label: 'Medidor Gas', family: 'measurement' },
      { type: 'water_meter', label: 'Medidor Agua', family: 'measurement' },
      { type: 'steam_meter', label: 'Medidor Vapor', family: 'measurement' },
    ],
  },
  {
    family: 'iot', label: 'IoT / Datos', color: 'border-l-cyan-500',
    items: [
      { type: 'iot_device', label: 'Dispositivo IoT', family: 'iot' },
      { type: 'gateway', label: 'Gateway', family: 'iot' },
      { type: 'plc', label: 'PLC', family: 'iot' },
      { type: 'edge_device', label: 'Edge Device', family: 'iot' },
    ],
  },
  {
    family: 'organizational', label: 'Organización', color: 'border-l-gray-500',
    items: [
      { type: 'area_node', label: 'Área', family: 'organizational' },
      { type: 'process_node', label: 'Proceso', family: 'organizational' },
      { type: 'production_line', label: 'Línea Prod.', family: 'organizational' },
    ],
  },
  {
    family: 'special', label: 'Especial', color: 'border-l-red-400',
    items: [
      { type: 'utility_source', label: 'Fuente Utility', family: 'special' },
      { type: 'loss_node', label: 'Pérdida', family: 'special' },
      { type: 'annotation', label: 'Anotación', family: 'special' },
    ],
  },
]

const familyColors: Record<string, string> = {
  equipment: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  connector: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',
  control: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
  measurement: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
  iot: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100',
  organizational: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100',
  special: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100',
}

export function NodePalette() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    equipment: true,
    connector: false,
    control: false,
    measurement: false,
    iot: false,
    organizational: false,
    special: false,
  })

  function toggle(family: string) {
    setExpanded((prev) => ({ ...prev, [family]: !prev[family] }))
  }

  function handleDragStart(e: DragEvent<HTMLDivElement>, item: PaletteItemDef) {
    e.dataTransfer.setData('application/reactflow-type', item.type)
    e.dataTransfer.setData('application/reactflow-family', item.family)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="w-52 bg-surface border-r border-border h-full overflow-y-auto shrink-0">
      <div className="px-3 py-2.5 border-b border-border">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Paleta</p>
      </div>
      <div className="p-2 space-y-1">
        {groups.map((group) => (
          <div key={group.family}>
            <button
              onClick={() => toggle(group.family)}
              className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer ${group.color} border-l-2`}
            >
              {expanded[group.family] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {group.label}
            </button>
            {expanded[group.family] && (
              <div className="ml-2 mt-1 space-y-0.5">
                {group.items.map((item) => (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border cursor-grab active:cursor-grabbing transition-colors ${familyColors[item.family] || 'bg-gray-50'}`}
                  >
                    <GripVertical size={10} className="opacity-40" />
                    {item.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
