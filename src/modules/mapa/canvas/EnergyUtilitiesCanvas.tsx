import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { ReactFlow, Background, Controls, MiniMap, Panel, MarkerType, ConnectionMode, useReactFlow, type Connection, type Node, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useDiagramStore } from './hooks/useDiagramStore'
import { useDiagramReadings } from './hooks/useDiagramReadings'
import { useEquipmentMPs } from './hooks/useEquipmentMPs'
import { useSnapStore } from './hooks/useSnapStore'
import { nodeTypes } from './nodes'
import { edgeTypes } from './edges/UtilityEdge'
import { layoutNodes, orientEdges, hasOverlaps } from './autoLayout'
import type { DiagramNodeData, DiagramEdgeData } from '@/services/topology-engine/graphTypes'
import { supabase } from '@/services/supabase'
import { useUIStore } from '@/store/uiStore'
import { Button } from '@/shared/Button'
import { Badge } from '@/shared/Badge'
import { getUtilityLabel } from '@/shared/OperationalContext'
import { Gauge, Link, Search, X, LayoutGrid, ArrowDown, ArrowRight, Check, Zap, Flame } from 'lucide-react'

type PaletteFamily = 'equipment' | 'connector' | 'control' | 'measurement' | 'organizational' | 'special'

// Tipos de nodo de medición — para auto-detectar en onConnect
const METER_NODE_TYPES = new Set([
  'flow_meter','energy_meter','power_meter','pressure_sensor','temperature_sensor',
  'level_sensor','current_transformer','gas_meter','water_meter','steam_meter','custom_meter',
])

interface PendingNode {
  nodeType: string
  family: PaletteFamily
  position: { x: number; y: number }
  snapAnchor?: Record<string, unknown>  // auto-set al hacer snap a un edge
}

// ── Captura de coordenadas React Flow ─────────────────────────────────────────
// screenToFlowPosition requiere contexto ReactFlow; lo capturamos via componente
// interno y lo exponemos via variable de módulo para que onDrop pueda usarlo.

let _screenToFlowPos: ((pos: { x: number; y: number }) => { x: number; y: number }) | null = null

function snapScreenToFlow(screenPos: { x: number; y: number }) {
  return _screenToFlowPos?.(screenPos) ?? screenPos
}

function ReactFlowCoordsCapture() {
  const { screenToFlowPosition } = useReactFlow()
  useEffect(() => {
    _screenToFlowPos = screenToFlowPosition
    return () => { _screenToFlowPos = null }
  }, [screenToFlowPosition])
  return null
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
  source_type: string
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
  const diagramStatus = useDiagramStore((s) => s.diagramStatus)
  const selectElement = useDiagramStore((s) => s.selectElement)
  const addNodeStore = useDiagramStore((s) => s.addNode)
  const addEdgeStore = useDiagramStore((s) => s.addEdge)
  const onNodesChange = useDiagramStore((s) => s.onNodesChange)
  const onEdgesChange = useDiagramStore((s) => s.onEdgesChange)
  const { selectedSiteId } = useUIStore()
  const [pendingNode, setPendingNode] = useState<PendingNode | null>(null)
  const isDraggingMeasurement = useSnapStore((s) => s.isDraggingMeasurement)
  const setHoveredEdgeId = useSnapStore((s) => s.setHoveredEdgeId)

  const isDraft = diagramStatus === 'draft'

  // ── Live readings for MeasurementNodes ───────────────────────────────────
  const fetchReadings = useDiagramReadings((s) => s.fetchReadings)
  const clearReadings = useDiagramReadings((s) => s.clear)

  useEffect(() => {
    if (!selectedSiteId) { clearReadings(); return }
    // Only fetch for nodes that are measurement family
    const measurementFamilies = new Set(['flow_meter','energy_meter','power_meter',
      'pressure_sensor','temperature_sensor','level_sensor','current_transformer',
      'gas_meter','water_meter','steam_meter','custom_meter'])
    const measurementNodeIds = nodes
      .filter((n) => measurementFamilies.has(n.data.nodeType as string))
      .map((n) => n.id)
    if (measurementNodeIds.length === 0) { clearReadings(); return }
    void fetchReadings(selectedSiteId, measurementNodeIds)
    // Refresh every 60s
    const timer = setInterval(() => {
      void fetchReadings(selectedSiteId, measurementNodeIds)
    }, 60_000)
    return () => clearInterval(timer)
  }, [selectedSiteId, nodes, fetchReadings, clearReadings])

  const onConnect = useCallback(
    (connection: Connection) => {
      // Si el source es un nodo medidor → forzar edgeType 'signal' (3b)
      const sourceNode = nodes.find((n) => n.id === connection.source)
      const sourceIsMeter = METER_NODE_TYPES.has(sourceNode?.data?.nodeType as string)

      const edge: Edge<DiagramEdgeData> = {
        id: crypto.randomUUID(),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined,
        type: 'utility',
        data: {
          edgeType: sourceIsMeter ? 'signal' : 'pipe',
          utility: sourceIsMeter ? '' : (diagramUtility || 'electricity'),
          flowDirection: 'source_to_target',
          properties: {},
        },
      }
      addEdgeStore(edge)
    },
    [addEdgeStore, diagramUtility, nodes],
  )

  // ── Snap helper — devuelve el edge físico más cercano al punto dado ──────────
  const findClosestPhysicalEdge = useCallback(
    (flowPos: { x: number; y: number }, threshold = 130) => {
      const physEdges = edges.filter(
        (e) => e.data?.edgeType !== 'signal' && e.data?.edgeType !== 'logical',
      )
      let closest: (typeof edges)[0] | null = null
      let closestDist = threshold
      for (const edge of physEdges) {
        const src = nodes.find((n) => n.id === edge.source)
        const tgt = nodes.find((n) => n.id === edge.target)
        if (!src || !tgt) continue
        const mx = (src.position.x + tgt.position.x) / 2
        const my = (src.position.y + tgt.position.y) / 2
        const dist = Math.sqrt((flowPos.x - mx) ** 2 + (flowPos.y - my) ** 2)
        if (dist < closestDist) { closestDist = dist; closest = edge }
      }
      return closest
    },
    [edges, nodes],
  )

  const onDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (!isDraggingMeasurement) return
      const flowPos = snapScreenToFlow({ x: e.clientX, y: e.clientY })
      const closest = findClosestPhysicalEdge(flowPos)
      setHoveredEdgeId(closest?.id ?? null)
    },
    [isDraggingMeasurement, findClosestPhysicalEdge, setHoveredEdgeId],
  )

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setHoveredEdgeId(null)

      const nodeType = e.dataTransfer.getData('application/reactflow-type')
      const family = (e.dataTransfer.getData('application/reactflow-family') || 'equipment') as PaletteFamily
      if (!nodeType || !reactFlowWrapper.current) return

      const flowPos = snapScreenToFlow({ x: e.clientX, y: e.clientY })

      // ── Bloquear medidores standalone ────────────────────────────────────────
      // Los medidores ya no son nodos del canvas. Son MPs (MeasurementPoints)
      // que se configuran en el inspector del equipo o de la Fuente Utility.
      if (family === 'measurement' || METER_NODE_TYPES.has(nodeType)) {
        // Mostrar toast de orientación (reutilizamos window.alert como fallback
        // hasta que el ToastContext esté disponible en este scope)
        const msg =
          'Los medidores no se colocan en el canvas.\n\n' +
          '• Para medidores de equipo: selecciona el equipo → Inspector → Medidores.\n' +
          '• Para medidores de frontera: arrastra una "Fuente Utility" → Inspector → Medidores.'
        // Intentar usar toast si está disponible, sino alert
        if (typeof window !== 'undefined') {
          // Disparar evento custom que el ToastProvider puede escuchar
          window.dispatchEvent(new CustomEvent('versa:toast', {
            detail: { message: msg, type: 'info', duration: 6000 },
          }))
        }
        return
      }

      // Otros families que requieren binding ──────────────────────────────────
      if (requiredFamilies.has(family) && selectedSiteId) {
        setPendingNode({ nodeType, family, position: flowPos })
        return
      }

      // Nodos sin binding obligatorio (connectors, control, special) ──────────
      const newNode: Node<DiagramNodeData> = {
        id: crypto.randomUUID(),
        type: getReactFlowNodeType(family),
        position: flowPos,
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
    [addNodeStore, diagramUtility, selectedSiteId, nodes, findClosestPhysicalEdge, setHoveredEdgeId],
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
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={isDraft}
        nodesConnectable={isDraft}
        elementsSelectable
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
        <ReactFlowCoordsCapture />
        <DiagramAutoArrange />
        <EquipmentMPsFetcher />
        <Panel position="top-left">
          <LayoutControls persist={isDraft} />
        </Panel>
        <Controls className="!rounded-lg !border !border-border !shadow-sm" />
        <MiniMap
          position="bottom-right"
          className="!rounded-xl !border !border-gray-200 !shadow-md"
          style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)' }}
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

// ── Equipment MPs Fetcher ────────────────────────────────────────────────────
// Agrupa todos los entity_ids de nodos de equipo y hace UN solo fetch al Modelo.
// Se monta dentro de ReactFlow para tener acceso al store del diagrama.

function EquipmentMPsFetcher() {
  const nodes = useDiagramStore((s) => s.nodes)
  const { selectedSiteId } = useUIStore()
  const fetchForEntities = useEquipmentMPs((s) => s.fetchForEntities)
  const clearMPs = useEquipmentMPs((s) => s.clear)

  useEffect(() => {
    if (!selectedSiteId) { clearMPs(); return }

    const entityIds = nodes
      .map((n) => {
        const b = n.data.properties?.asset_binding as Record<string, unknown> | undefined
        if (b?.status === 'linked' && b?.entity_type === 'equipment') return b.entity_id as string
        return null
      })
      .filter((id): id is string => Boolean(id))

    if (entityIds.length === 0) { clearMPs(); return }

    void fetchForEntities(selectedSiteId, entityIds)
    const timer = setInterval(() => {
      void fetchForEntities(selectedSiteId, entityIds)
    }, 60_000)
    return () => clearInterval(timer)
  }, [selectedSiteId, nodes, fetchForEntities, clearMPs])

  return null
}

// ── Layout controls (Dagre) ──────────────────────────────────────────────────
// Botón "Ordenar" + toggle de orientación (vertical ↓ / horizontal →).
// La orientación se recuerda en localStorage.

const ORIENTATION_KEY = 'energy-map-orientation'

function getStoredOrientation(): 'TB' | 'LR' {
  return (localStorage.getItem(ORIENTATION_KEY) as 'TB' | 'LR') || 'TB'
}

function LayoutControls({ persist }: { persist: boolean }) {
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const setNodes = useDiagramStore((s) => s.setNodes)
  const setEdges = useDiagramStore((s) => s.setEdges)
  const setNodesView = useDiagramStore((s) => s.setNodesView)
  const setEdgesView = useDiagramStore((s) => s.setEdgesView)
  const { fitView } = useReactFlow()
  const [direction, setDirection] = useState<'TB' | 'LR'>(getStoredOrientation)

  function applyLayout(dir: 'TB' | 'LR') {
    if (nodes.length === 0) return
    const laidNodes = layoutNodes(nodes as Node[], edges as Edge[], dir)
    const orientedEdges = orientEdges(edges as Edge[], dir)
    if (persist) {
      setNodes(laidNodes as never)
      setEdges(orientedEdges as never)
    } else {
      // Diagrama congelado/publicado: reordena la vista sin marcar cambios.
      setNodesView(laidNodes as never)
      setEdgesView(orientedEdges as never)
    }
    setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 60)
  }

  function handleOrder() { applyLayout(direction) }

  function handleToggle() {
    const next = direction === 'TB' ? 'LR' : 'TB'
    setDirection(next)
    localStorage.setItem(ORIENTATION_KEY, next)
    applyLayout(next)
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleOrder}
        disabled={nodes.length === 0}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold text-gray-600 shadow-sm hover:bg-gray-50 cursor-pointer disabled:opacity-50 transition-colors"
        title="Ordenar el diagrama automáticamente sin traslapes"
      >
        <LayoutGrid size={13} />
        Ordenar
      </button>
      <button
        onClick={handleToggle}
        disabled={nodes.length === 0}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold text-gray-600 shadow-sm hover:bg-gray-50 cursor-pointer disabled:opacity-50 transition-colors"
        title={direction === 'TB' ? 'Cambiar a horizontal (→)' : 'Cambiar a vertical (↓)'}
      >
        {direction === 'TB' ? <ArrowDown size={13} /> : <ArrowRight size={13} />}
        {direction === 'TB' ? 'Vertical' : 'Horizontal'}
      </button>
    </div>
  )
}

// Auto-acomodo al abrir un diagrama: si los nodos guardados se traslapan
// (p.ej. coordenadas antiguas con los nodos nuevos más grandes), reordena la
// vista en vertical una sola vez por diagrama, sin marcar cambios.
function DiagramAutoArrange() {
  const diagramId = useDiagramStore((s) => s.diagramId)
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const setNodesView = useDiagramStore((s) => s.setNodesView)
  const setEdgesView = useDiagramStore((s) => s.setEdgesView)
  const { fitView } = useReactFlow()
  const arrangedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!diagramId || nodes.length === 0) return
    if (arrangedRef.current === diagramId) return
    if (!hasOverlaps(nodes as Node[])) { arrangedRef.current = diagramId; return }
    arrangedRef.current = diagramId
    const dir = getStoredOrientation()
    setNodesView(layoutNodes(nodes as Node[], edges as Edge[], dir) as never)
    setEdgesView(orientEdges(edges as Edge[], dir) as never)
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 80)
  }, [diagramId, nodes, edges, setNodesView, setEdgesView, fitView])

  return null
}

const UTILITY_ICONS: Record<string, typeof Zap> = {
  electricity: Zap, natural_gas: Flame, steam: Flame,
  compressed_air: Gauge, chilled_water: Gauge, hot_water: Gauge,
  industrial_water: Gauge, diesel: Flame, lpg: Flame,
}

function MapAssetBindingModal({
  pendingNode,
  siteId,
  diagramUtility,
  onClose,
  onCreate,
}: {
  pendingNode: PendingNode          // incluye snapAnchor si se soltó cerca de un edge
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
  const [meterRole, setMeterRole] = useState<'submeter' | 'boundary'>('submeter')
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
          .select('id, tag, name, meter_equipment_id, utility, measurement_type, quantity, unit, source_type')
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

  // ── Filtered lists ──────────────────────────────────────────────────────────

  const filteredAssets = useMemo(() => {
    const targetType = nodeTypeToEquipmentType[pendingNode.nodeType]
    const normalized = query.trim().toLowerCase()
    return assets
      .filter((asset) => {
        if (targetType && asset.equipment_type !== targetType) return false
        return asset.equipment_type !== 'meter'
      })
      .filter((asset) => !diagramUtility || asset.utility_type === diagramUtility)
      .filter((asset) => (
        !normalized ||
        asset.tag.toLowerCase().includes(normalized) ||
        asset.name.toLowerCase().includes(normalized)
      ))
  }, [assets, diagramUtility, pendingNode.nodeType, query])

  const filteredPoints = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return points
      .filter((mp) => !diagramUtility || mp.utility === diagramUtility)
      .filter((mp) => (
        !normalized ||
        mp.tag.toLowerCase().includes(normalized) ||
        mp.name.toLowerCase().includes(normalized)
      ))
  }, [points, diagramUtility, query])

  const selectedAsset = assets.find((a) => a.id === selectedAssetId) || null
  const selectedArea = areas.find((a) => a.id === selectedAreaId) || null
  const selectedPoint = points.find((p) => p.id === selectedPointId) || null
  const canCreate = isOrganizational ? Boolean(selectedArea) : isMeasurement ? true : Boolean(selectedAsset)

  function createNode() {
    if (!canCreate) return
    const id = crypto.randomUUID()

    let tag: string
    let label: string
    let baseUtility: string
    let properties: Record<string, unknown>

    if (isOrganizational) {
      tag = selectedArea!.code || selectedArea!.name
      label = selectedArea!.name
      baseUtility = diagramUtility || 'electricity'
      properties = {
        asset_binding: {
          required: true,
          entity_type: 'area',
          entity_id: selectedArea!.id,
          source: 'asset_tree',
          status: 'linked',
        },
      }
    } else if (isMeasurement) {
      tag = selectedPoint?.tag || `MP-${Date.now().toString(36).slice(-4)}`
      label = selectedPoint?.name || 'Nuevo medidor'
      baseUtility = selectedPoint?.utility || diagramUtility || 'electricity'
      properties = {
        asset_binding: { required: false, status: 'optional_unbound' },
        measurement_binding: {
          required: Boolean(selectedPointId),
          measurement_point_id: selectedPointId || null,
          status: selectedPointId ? 'linked' : 'unbound',
          role: meterRole,
          source_type: selectedPoint?.source_type || null,
          // 3a: ancla automática cuando se soltó cerca de un edge
          ...(pendingNode.snapAnchor ? { anchor: pendingNode.snapAnchor } : {}),
        },
      }
    } else {
      tag = selectedAsset!.tag
      label = selectedAsset!.name
      baseUtility = selectedAsset!.utility_type || diagramUtility || 'electricity'
      properties = {
        asset_binding: {
          required: true,
          entity_type: 'equipment',
          entity_id: selectedAsset!.id,
          source: 'asset_tree',
          status: 'linked',
        },
      }
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
      <div className="w-full max-w-lg rounded-(--radius-modal) border border-border bg-surface shadow-modal">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isMeasurement ? 'Agregar medidor al diagrama' : isOrganizational ? 'Vincular área del árbol' : 'Vincular equipo del árbol'}
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">
              {isMeasurement
                ? 'Selecciona el punto de medición que representa este instrumento'
                : 'El mapa representa activos existentes; no crea equipos sueltos'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-5">

          {/* ── MEASUREMENT: MP list → role ─────────────────────────────────── */}
          {isMeasurement && (
            <>
              {/* Search */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                  placeholder="Buscar por TAG o nombre..."
                />
              </div>

              {/* Feedback de snap automático */}
              {pendingNode.snapAnchor ? (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-2">
                  <span className="text-emerald-600 text-sm">⚡</span>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    Anclado automáticamente a la línea más cercana — el medidor medirá ese tramo.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 bg-gray-50 rounded-lg px-2.5 py-2 border border-gray-100">
                  Suelta el medidor cerca de una línea para anclarlo automáticamente.
                  Los medidores de proceso también aparecen en la tarjeta de su equipo.
                </p>
              )}

              {/* MP list */}
              <div className="max-h-44 space-y-1.5 overflow-y-auto pr-0.5">
                {filteredPoints.length === 0 ? (
                  <p className="py-6 text-center text-xs text-gray-400">
                    {diagramUtility
                      ? `No hay puntos de medición para ${getUtilityLabel(diagramUtility)}.`
                      : 'Sin puntos de medición disponibles.'}
                  </p>
                ) : filteredPoints.map((mp) => {
                  const UtilIcon = UTILITY_ICONS[mp.utility] || Gauge
                  const isSelected = selectedPointId === mp.id
                  return (
                    <button
                      key={mp.id}
                      onClick={() => setSelectedPointId(isSelected ? '' : mp.id)}
                      className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? 'border-purple-400 bg-purple-50'
                          : 'border-border bg-white hover:bg-gray-50'
                      }`}
                    >
                      <UtilIcon size={14} className={`mt-0.5 shrink-0 ${isSelected ? 'text-purple-600' : 'text-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`font-mono text-sm font-bold truncate ${isSelected ? 'text-purple-700' : 'text-[#1B6FF8]'}`}>
                          {mp.tag}
                        </p>
                        <p className="text-xs text-gray-600 truncate">{mp.name}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {mp.quantity} · {mp.unit} · {getUtilityLabel(mp.utility)}
                        </p>
                      </div>
                      {isSelected && <Check size={14} className="text-purple-600 shrink-0 mt-1" />}
                    </button>
                  )
                })}
              </div>

              {!selectedPointId && (
                <p className="text-[11px] text-gray-400 italic">
                  Sin selección: el medidor se colocará en el diagrama sin datos. Puedes configurarlo después desde el inspector.
                </p>
              )}

              {/* Role selector */}
              <div>
                <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol en el balance de energía</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMeterRole('submeter')}
                    className={`flex flex-col items-start rounded-xl border-2 px-3 py-3 text-left transition-colors ${
                      meterRole === 'submeter'
                        ? 'border-gray-800 bg-gray-800 text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-sm font-bold">Submedidor</span>
                    <span className={`mt-0.5 text-[11px] leading-tight ${meterRole === 'submeter' ? 'text-gray-300' : 'text-gray-400'}`}>
                      Explica consumo aguas abajo
                    </span>
                  </button>
                  <button
                    onClick={() => setMeterRole('boundary')}
                    className={`flex flex-col items-start rounded-xl border-2 px-3 py-3 text-left transition-colors ${
                      meterRole === 'boundary'
                        ? 'border-purple-600 bg-purple-600 text-white'
                        : 'border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100'
                    }`}
                  >
                    <span className="text-sm font-bold">Frontera</span>
                    <span className={`mt-0.5 text-[11px] leading-tight ${meterRole === 'boundary' ? 'text-purple-200' : 'text-purple-500'}`}>
                      Entrada total al sistema
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── ORGANIZATIONAL: area list ───────────────────────────────────── */}
          {isOrganizational && (
            <div className="space-y-1.5">
              {areas.map((area) => (
                <button
                  key={area.id}
                  onClick={() => setSelectedAreaId(area.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                    selectedAreaId === area.id ? 'border-brand-blue bg-brand-blue/5' : 'border-border hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium">{area.code ? `${area.code} · ${area.name}` : area.name}</span>
                  {selectedAreaId === area.id && <Badge size="sm">Seleccionada</Badge>}
                </button>
              ))}
            </div>
          )}

          {/* ── EQUIPMENT: search + list ────────────────────────────────────── */}
          {!isMeasurement && !isOrganizational && (
            <>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                  placeholder="Buscar por TAG o nombre"
                />
              </div>
              <div className="max-h-64 space-y-1.5 overflow-y-auto pr-0.5">
                {filteredAssets.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      selectedAssetId === asset.id ? 'border-brand-blue bg-brand-blue/5' : 'border-border hover:bg-gray-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-semibold text-brand-blue">{asset.tag}</p>
                      <p className="truncate text-sm text-gray-700">{asset.name}</p>
                      <p className="text-xs text-gray-400">{asset.equipment_type} · {getUtilityLabel(asset.utility_type)}</p>
                    </div>
                    {selectedAssetId === asset.id && <Link size={15} className="shrink-0 text-brand-blue" />}
                  </button>
                ))}
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <p className="text-[11px] text-gray-400">
            {isMeasurement && selectedPoint
              ? `${selectedPoint.tag} · ${selectedPoint.quantity}`
              : isMeasurement
                ? 'Sin MP seleccionado — configurable después'
                : ''}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={createNode} disabled={!canCreate}>
              {isMeasurement ? 'Colocar medidor' : 'Vincular y colocar'}
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
