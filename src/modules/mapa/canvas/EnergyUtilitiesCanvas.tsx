import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { ReactFlow, Background, Controls, MiniMap, MarkerType, ConnectionMode, type Connection, type Node, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useDiagramStore } from './hooks/useDiagramStore'
import { nodeTypes } from './nodes'
import { edgeTypes } from './edges/UtilityEdge'
import type { DiagramNodeData, DiagramEdgeData } from '@/services/topology-engine/graphTypes'
import { supabase } from '@/services/supabase'
import { useUIStore } from '@/store/uiStore'
import { Button } from '@/shared/Button'
import { Badge } from '@/shared/Badge'
import { getUtilityLabel } from '@/shared/OperationalContext'
import { Gauge, Link, Search, X } from 'lucide-react'

type PaletteFamily = 'equipment' | 'connector' | 'control' | 'measurement' | 'iot' | 'organizational' | 'special'

interface PendingNode {
  nodeType: string
  family: PaletteFamily
  position: { x: number; y: number }
}

interface AssetOption {
  id: string
  tag: string
  name: string
  equipment_type: string
  utility_type: string
  properties: Record<string, unknown> | null
}

interface AreaOption {
  id: string
  code: string | null
  name: string
}

interface MeasurementOption {
  id: string
  tag: string
  name: string
  meter_equipment_id: string | null
  utility: string
  measurement_type: string
  quantity: string
  unit: string
}

const requiredFamilies = new Set<PaletteFamily>(['equipment', 'measurement', 'organizational'])

const nodeTypeToEquipmentType: Record<string, string> = {
  boiler: 'boiler',
  pump: 'pump',
  compressor: 'compressor',
  chiller: 'chiller',
  cooling_tower: 'cooling_tower',
  tank: 'tank',
  transformer: 'transformer',
  panel: 'panel',
  generator: 'generator',
  heat_exchanger: 'heat_exchanger',
  motor: 'motor',
  consumer: 'consumer',
  custom_equipment: 'custom_equipment',
}

function getReactFlowNodeType(family: PaletteFamily): string {
  if (family === 'iot') return 'equipment'
  if (family === 'special') return 'special'
  if (family === 'organizational') return 'organizational'
  if (family === 'measurement') return 'measurement'
  if (family === 'control') return 'control'
  if (family === 'connector') return 'connector'
  return 'equipment'
}

export function EnergyUtilitiesCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const diagramUtility = useDiagramStore((s) => s.diagramUtility)
  const selectElement = useDiagramStore((s) => s.selectElement)
  const addNodeStore = useDiagramStore((s) => s.addNode)
  const addEdgeStore = useDiagramStore((s) => s.addEdge)
  const { selectedSiteId } = useUIStore()
  const [pendingNode, setPendingNode] = useState<PendingNode | null>(null)

  const onConnect = useCallback(
    (connection: Connection) => {
      const edge: Edge<DiagramEdgeData> = {
        id: crypto.randomUUID(),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined,
        type: 'utility',
        data: {
          edgeType: 'pipe',
          utility: diagramUtility || 'electricity',
          flowDirection: 'source_to_target',
          properties: {},
        },
      }
      addEdgeStore(edge)
    },
    [addEdgeStore, diagramUtility],
  )

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const nodeType = e.dataTransfer.getData('application/reactflow-type')
      const family = (e.dataTransfer.getData('application/reactflow-family') || 'equipment') as PaletteFamily
      if (!nodeType || !reactFlowWrapper.current) return

      const rect = reactFlowWrapper.current.getBoundingClientRect()
      const position = {
        x: e.clientX - rect.left - 60,
        y: e.clientY - rect.top - 25,
      }

      if (requiredFamilies.has(family) && selectedSiteId) {
        setPendingNode({ nodeType, family, position })
        return
      }

      const newNode: Node<DiagramNodeData> = {
        id: crypto.randomUUID(),
        type: getReactFlowNodeType(family),
        position,
        data: {
          tag: `${nodeType}-${Date.now().toString(36).slice(-4)}`,
          label: nodeType,
          nodeType: nodeType as DiagramNodeData['nodeType'],
          utility: diagramUtility || 'electricity',
          properties: {
            asset_binding: {
              required: false,
              status: 'optional_unbound',
              reason: 'connector_control_or_special_node',
            },
          },
        },
      }
      addNodeStore(newNode)
    },
    [addNodeStore, diagramUtility, selectedSiteId],
  )

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => { selectElement({ type: 'node', id: node.id }) },
    [selectElement],
  )

  const onEdgeClick = useCallback(
    (_e: React.MouseEvent, edge: Edge) => { selectElement({ type: 'edge', id: edge.id }) },
    [selectElement],
  )

  const onPaneClick = useCallback(() => { selectElement(null) }, [selectElement])

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes as Node[]}
        edges={edges as Edge[]}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{
          type: 'utility',
          style: { stroke: '#6b7280', strokeWidth: 2.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280', width: 16, height: 16 },
        }}
      >
        <Background gap={16} color="#e5e7eb" />
        <Controls className="!rounded-lg !border !border-border !shadow-sm" />
        <MiniMap
          className="!rounded-lg !border !border-border !shadow-sm"
          nodeColor={(node) => {
            const nt = (node.data as Record<string, unknown>)?.nodeType as string || ''
            const colors: Record<string, string> = {
              boiler: '#3b82f6', pump: '#3b82f6', compressor: '#3b82f6', chiller: '#3b82f6',
              transformer: '#3b82f6', panel: '#3b82f6', generator: '#3b82f6',
              connector_pipe: '#14b8a6', header: '#14b8a6',
              valve: '#f97316', breaker: '#f97316',
              flow_meter: '#a855f7', power_meter: '#a855f7',
              iot_device: '#06b6d4', area_node: '#9ca3af', utility_source: '#22c55e', loss_node: '#ef4444',
            }
            return colors[nt] || '#6b7280'
          }}
        />
      </ReactFlow>
      {pendingNode && selectedSiteId && (
        <MapAssetBindingModal
          pendingNode={pendingNode}
          siteId={selectedSiteId}
          diagramUtility={diagramUtility}
          onClose={() => setPendingNode(null)}
          onCreate={(node) => {
            addNodeStore(node)
            setPendingNode(null)
            selectElement({ type: 'node', id: node.id })
          }}
        />
      )}
    </div>
  )
}

function MapAssetBindingModal({
  pendingNode,
  siteId,
  diagramUtility,
  onClose,
  onCreate,
}: {
  pendingNode: PendingNode
  siteId: string
  diagramUtility: string | null
  onClose: () => void
  onCreate: (node: Node<DiagramNodeData>) => void
}) {
  const [assets, setAssets] = useState<AssetOption[]>([])
  const [areas, setAreas] = useState<AreaOption[]>([])
  const [points, setPoints] = useState<MeasurementOption[]>([])
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [selectedAreaId, setSelectedAreaId] = useState('')
  const [selectedPointId, setSelectedPointId] = useState('')
  const [query, setQuery] = useState('')
  const isMeasurement = pendingNode.family === 'measurement'
  const isOrganizational = pendingNode.family === 'organizational'

  useEffect(() => {
    async function loadOptions() {
      const [{ data: equipment }, { data: areaRows }, { data: pointRows }] = await Promise.all([
        supabase
          .from('energy_equipment')
          .select('id, tag, name, equipment_type, utility_type, properties')
          .eq('site_id', siteId)
          .order('tag'),
        supabase
          .from('energy_areas')
          .select('id, code, name')
          .eq('site_id', siteId)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('measurement_points')
          .select('id, tag, name, meter_equipment_id, utility, measurement_type, quantity, unit')
          .eq('site_id', siteId)
          .eq('is_active', true)
          .order('tag'),
      ])
      setAssets((equipment || []) as AssetOption[])
      setAreas((areaRows || []) as AreaOption[])
      setPoints((pointRows || []) as MeasurementOption[])
    }
    loadOptions()
  }, [siteId])

  const filteredAssets = useMemo(() => {
    const targetType = nodeTypeToEquipmentType[pendingNode.nodeType]
    const normalized = query.trim().toLowerCase()
    return assets
      .filter((asset) => {
        if (isMeasurement) {
          return asset.equipment_type === 'meter' || asset.properties?.asset_role === 'measurement_device'
        }
        if (targetType && asset.equipment_type !== targetType) return false
        return asset.equipment_type !== 'meter'
      })
      .filter((asset) => !diagramUtility || asset.utility_type === diagramUtility || isMeasurement)
      .filter((asset) => (
        !normalized ||
        asset.tag.toLowerCase().includes(normalized) ||
        asset.name.toLowerCase().includes(normalized)
      ))
  }, [assets, diagramUtility, isMeasurement, pendingNode.nodeType, query])

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) || null
  const selectedArea = areas.find((area) => area.id === selectedAreaId) || null
  const meterPoints = points.filter((point) => point.meter_equipment_id === selectedAssetId)
  const selectedPoint = points.find((point) => point.id === selectedPointId) || meterPoints[0] || null
  const canCreate = isOrganizational ? Boolean(selectedArea) : Boolean(selectedAsset && (!isMeasurement || selectedPoint))

  function createNode() {
    if (!canCreate) return
    const id = crypto.randomUUID()
    const baseUtility = selectedPoint?.utility || selectedAsset?.utility_type || diagramUtility || 'electricity'
    const tag = isOrganizational ? selectedArea!.code || selectedArea!.name : isMeasurement ? selectedPoint!.tag : selectedAsset!.tag
    const label = isOrganizational ? selectedArea!.name : isMeasurement ? selectedPoint!.name : selectedAsset!.name
    const properties: Record<string, unknown> = isOrganizational
      ? {
          asset_binding: {
            required: true,
            entity_type: 'area',
            entity_id: selectedArea!.id,
            source: 'asset_tree',
            status: 'linked',
          },
        }
      : {
          asset_binding: {
            required: true,
            entity_type: 'equipment',
            entity_id: selectedAsset!.id,
            source: 'asset_tree',
            status: 'linked',
          },
          ...(isMeasurement && selectedPoint ? {
            measurement_binding: {
              required: true,
              measurement_point_id: selectedPoint.id,
              meter_equipment_id: selectedAsset!.id,
              status: 'linked',
            },
          } : {}),
        }

    onCreate({
      id,
      type: getReactFlowNodeType(pendingNode.family),
      position: pendingNode.position,
      data: {
        tag,
        label,
        nodeType: pendingNode.nodeType as DiagramNodeData['nodeType'],
        utility: baseUtility,
        properties,
        measurementPointIds: selectedPoint ? [selectedPoint.id] : [],
      },
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-(--radius-modal) border border-border bg-surface shadow-modal">
        <div className="flex items-start justify-between border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isMeasurement ? 'Vincular medidor fisico' : isOrganizational ? 'Vincular area del arbol' : 'Vincular equipo del arbol'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              El mapa representa activos existentes; no crea equipos sueltos.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {isOrganizational ? (
            <div className="space-y-2">
              {areas.map((area) => (
                <button
                  key={area.id}
                  onClick={() => setSelectedAreaId(area.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                    selectedAreaId === area.id ? 'border-brand-blue bg-brand-blue/5' : 'border-border hover:bg-gray-50'
                  }`}
                >
                  <span>{area.code ? `${area.code} · ${area.name}` : area.name}</span>
                  {selectedAreaId === area.id && <Badge size="sm">Seleccionada</Badge>}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                  placeholder="Buscar por TAG o nombre"
                />
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {filteredAssets.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => {
                      setSelectedAssetId(asset.id)
                      const firstPoint = points.find((point) => point.meter_equipment_id === asset.id)
                      setSelectedPointId(firstPoint?.id || '')
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left ${
                      selectedAssetId === asset.id ? 'border-brand-blue bg-brand-blue/5' : 'border-border hover:bg-gray-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-semibold text-brand-blue">{asset.tag}</p>
                      <p className="truncate text-sm text-gray-700">{asset.name}</p>
                      <p className="text-xs text-gray-400">{asset.equipment_type} · {getUtilityLabel(asset.utility_type)}</p>
                    </div>
                    {selectedAssetId === asset.id && <Link size={16} className="shrink-0 text-brand-blue" />}
                  </button>
                ))}
              </div>
            </>
          )}

          {isMeasurement && selectedAsset && (
            <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-purple-900">
                <Gauge size={14} />
                MeasurementPoint
              </div>
              {meterPoints.length === 0 ? (
                <p className="text-sm text-purple-700">Este medidor fisico aun no tiene MeasurementPoint.</p>
              ) : (
                <select
                  value={selectedPoint?.id || ''}
                  onChange={(event) => setSelectedPointId(event.target.value)}
                  className="w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm"
                >
                  {meterPoints.map((point) => (
                    <option key={point.id} value={point.id}>
                      {point.tag} · {point.quantity} · {point.unit}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border p-5">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={createNode} disabled={!canCreate}>Crear nodo vinculado</Button>
        </div>
      </div>
    </div>
  )
}
