import { useState, useEffect } from 'react'
import {
  X, Gauge, Plus, ExternalLink,
  Settings, Activity, Wrench, Info, Trash2, FileText,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDiagramStore } from '../canvas/hooks/useDiagramStore'
import { supabase } from '@/services/supabase'
import { useUIStore } from '@/store/uiStore'
import type { Node, Edge } from '@xyflow/react'
import type { DiagramNodeData, DiagramEdgeData } from '@/services/topology-engine/graphTypes'
import { DiagramSummaryPanel } from './DiagramSummaryPanel'
import { QUALITY_COLORS, relativeTime } from '@/services/measurement-engine/lastReadings'
import { getUtilityLabel } from '@/shared/OperationalContext'
import { getMeterAnchorFromNodeData } from '../canvas/meterScopePreview'

// ── Types ────────────────────────────────────────────────────────────────────

interface LinkedMP {
  id: string
  tag: string
  name: string
  utility: string
  measurement_type: string
  unit: string
  quantity: string
  meter_equipment_id: string | null
  last_calibration_date: string | null
  calibration_due_date: string | null
  last_value: number | null
  last_reading_at: string | null
}

type NodeTab = 'props' | 'measurement' | 'specs' | 'actions'
type EdgeTab = 'connection' | 'params' | 'actions'

interface InspectorPanelProps {
  onValidate?: () => void
  validationIssueCount?: number
  errorCount?: number
  warnCount?: number
  onConfirmDelete?: (config: { title: string; description: string; onConfirm: () => void }) => void
}

// ── Utility options ──────────────────────────────────────────────────────────

const UTILITY_OPTIONS = [
  '', 'electricity', 'natural_gas', 'steam', 'compressed_air', 'chilled_water',
  'hot_water', 'industrial_water', 'diesel', 'lpg', 'solar_generation', 'battery_storage',
]

// ── Main panel ───────────────────────────────────────────────────────────────

export function InspectorPanel({
  onValidate,
  validationIssueCount = 0,
  errorCount = 0,
  warnCount = 0,
  onConfirmDelete,
}: InspectorPanelProps) {
  const selectedElement = useDiagramStore((s) => s.selectedElement)
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const selectElement = useDiagramStore((s) => s.selectElement)
  const updateNode = useDiagramStore((s) => s.updateNode)
  const removeNode = useDiagramStore((s) => s.removeNode)
  const updateEdge = useDiagramStore((s) => s.updateEdge)
  const removeEdge = useDiagramStore((s) => s.removeEdge)

  return (
    <div className="w-80 bg-white border-l border-gray-100 h-full flex flex-col shrink-0 shadow-[-1px_0_0_0_#f3f4f6]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0 bg-white">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          {selectedElement ? 'Inspector' : 'Resumen del diagrama'}
        </p>
        {selectedElement && (
          <button
            onClick={() => selectElement(null)}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {!selectedElement ? (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <DiagramSummaryPanel
                onValidate={onValidate}
                validationIssueCount={validationIssueCount}
                errorCount={errorCount}
                warnCount={warnCount}
              />
            </motion.div>
          ) : selectedElement.type === 'node' ? (() => {
            const node = nodes.find((n) => n.id === selectedElement.id)
            if (!node) return null
            return (
              <motion.div
                key={`node-${selectedElement.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <NodeInspector
                  node={node}
                  onUpdate={updateNode}
                  onRemove={() => {
                    if (onConfirmDelete) {
                      onConfirmDelete({
                        title: 'Eliminar nodo',
                        description: `¿Eliminar "${node.data.label || node.data.tag}"? Esta acción no se puede deshacer.`,
                        onConfirm: () => { removeNode(selectedElement.id); selectElement(null) },
                      })
                    } else {
                      removeNode(selectedElement.id)
                      selectElement(null)
                    }
                  }}
                />
              </motion.div>
            )
          })() : (() => {
            const edge = edges.find((e) => e.id === selectedElement.id)
            if (!edge) return null
            return (
              <motion.div
                key={`edge-${selectedElement.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <EdgeInspector
                  edge={edge}
                  onUpdate={updateEdge}
                  onRemove={() => {
                    if (onConfirmDelete) {
                      onConfirmDelete({
                        title: 'Eliminar conexión',
                        description: 'Se eliminará esta conexión del diagrama. Esta acción no se puede deshacer.',
                        onConfirm: () => { removeEdge(selectedElement.id); selectElement(null) },
                      })
                    } else {
                      removeEdge(selectedElement.id)
                      selectElement(null)
                    }
                  }}
                />
              </motion.div>
            )
          })()}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── NodeInspector ─────────────────────────────────────────────────────────────

function NodeInspector({ node, onUpdate, onRemove }: {
  node: Node<DiagramNodeData>
  onUpdate: (id: string, data: Partial<DiagramNodeData>) => void
  onRemove: () => void
}) {
  const d = node.data
  const [tab, setTab] = useState<NodeTab>('props')

  const tabs: { id: NodeTab; label: string; icon: typeof Info }[] = [
    { id: 'props',       label: 'Propiedades', icon: Info },
    { id: 'measurement', label: 'Medición',    icon: Activity },
    { id: 'specs',       label: 'Specs',        icon: Settings },
    { id: 'actions',     label: 'Acciones',     icon: Wrench },
  ]

  return (
    <div className="flex flex-col">
      {/* Node header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-[10px] text-gray-400 font-mono">{String(d.nodeType)}</p>
        <p className="text-sm font-semibold text-gray-800 truncate">{d.label || '—'}</p>
        {d.tag && <p className="text-[11px] text-[#1B6FF8] font-mono mt-0.5">{d.tag}</p>}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] font-medium transition-colors cursor-pointer border-b-2 ${
              tab === id
                ? 'text-[#1B6FF8] border-[#1B6FF8]'
                : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            <Icon size={12} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.12 }}
          className="p-4 space-y-3"
        >
          {tab === 'props' && <PropsTab node={node} onUpdate={onUpdate} />}
          {tab === 'measurement' && <MeasurementTab node={node} onUpdate={onUpdate} />}
          {tab === 'specs' && <SpecsTab node={node} />}
          {tab === 'actions' && <ActionsTab node={node} onRemove={onRemove} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── Props Tab ────────────────────────────────────────────────────────────────

function PropsTab({ node, onUpdate }: { node: Node<DiagramNodeData>; onUpdate: (id: string, data: Partial<DiagramNodeData>) => void }) {
  const d = node.data
  const properties = d.properties || {}
  const assetBinding = properties.asset_binding as Record<string, unknown> | undefined

  return (
    <>
      <InspectorField label="TAG" value={d.tag} onChange={(v) => onUpdate(node.id, { tag: v })} />
      <InspectorField label="Nombre" value={d.label} onChange={(v) => onUpdate(node.id, { label: v })} />
      <InspectorSelect
        label="Utility"
        value={(d.utility as string) || ''}
        onChange={(v) => onUpdate(node.id, { utility: v || undefined })}
        options={UTILITY_OPTIONS}
        renderOption={(v) => v === '' ? 'Seleccionar...' : getUtilityLabel(v)}
      />

      {/* Binding info */}
      {assetBinding?.status === 'linked' && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-1">Activo vinculado</p>
          <p className="text-[11px] text-emerald-800">
            {String(assetBinding.entity_type || '—')} ✓
          </p>
          <p className="text-[10px] text-emerald-600 font-mono">{String(assetBinding.entity_id || '—')}</p>
        </div>
      )}

      <div className="text-[10px] text-gray-300 pt-1">
        Pos: {Math.round(node.position.x)}, {Math.round(node.position.y)}
      </div>
    </>
  )
}

// ── Measurement Tab ───────────────────────────────────────────────────────────

function MeasurementTab({
  node,
  onUpdate,
}: {
  node: Node<DiagramNodeData>
  onUpdate: (id: string, data: Partial<DiagramNodeData>) => void
}) {
  const { selectedSiteId } = useUIStore()
  const [linkedMPs, setLinkedMPs] = useState<LinkedMP[]>([])
  const [availableMPs, setAvailableMPs] = useState<LinkedMP[]>([])
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const diagramNodes = useDiagramStore((s) => s.nodes)
  const diagramEdges = useDiagramStore((s) => s.edges)
  const properties = node.data.properties || {}
  const measurementBinding = properties.measurement_binding as Record<string, unknown> | undefined
  const boundMeasurementPointId = typeof measurementBinding?.measurement_point_id === 'string'
    ? measurementBinding.measurement_point_id
    : null
  const meterRole = measurementBinding?.role === 'boundary' ? 'boundary' : 'submeter'
  const meterAnchor = getMeterAnchorFromNodeData(node.data)
  const physicalEdges = diagramEdges.filter((edge) => edge.data?.edgeType !== 'signal' && edge.data?.edgeType !== 'logical')
  const anchorableNodes = diagramNodes.filter((item) => item.id !== node.id)

  function updateMeasurementBinding(next: Record<string, unknown>) {
    onUpdate(node.id, {
      properties: {
        ...properties,
        measurement_binding: {
          ...(measurementBinding || {}),
          ...next,
        },
      },
    })
  }

  function setMeterRole(role: 'boundary' | 'submeter') {
    updateMeasurementBinding({ role })
  }

  function setMeterAnchor(type: 'edge' | 'node', id: string, side?: string) {
    if (!id) return
    updateMeasurementBinding({
      anchor: {
        type,
        id,
        position: meterAnchor?.position ?? 0.5,
        side: side || meterAnchor?.side || (type === 'edge' ? 'line' : 'load'),
        offset: meterAnchor?.offset || { x: 0, y: -48 },
      },
    })
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: nodeMps } = await supabase
        .from('measurement_points')
        .select('id, tag, name, utility, measurement_type, unit, quantity, meter_equipment_id, last_calibration_date, calibration_due_date')
        .eq('target_type', 'node')
        .eq('target_id', node.id)

      let bindingMps: LinkedMP[] = []
      if (boundMeasurementPointId) {
        const { data } = await supabase
          .from('measurement_points')
          .select('id, tag, name, utility, measurement_type, unit, quantity, meter_equipment_id, last_calibration_date, calibration_due_date')
          .eq('id', boundMeasurementPointId)
        bindingMps = (data || []) as LinkedMP[]
      }

      const mps = [...(nodeMps || []), ...bindingMps]
        .filter((mp, index, list) => list.findIndex((item) => item.id === mp.id) === index)

      if (!mps || mps.length === 0) { setLinkedMPs([]); setLoading(false); return }

      // Load last reading for each MP
      const mpIds = mps.map((m) => m.id)
      const { data: readings } = await supabase
        .from('measurement_readings')
        .select('measurement_point_id, value, recorded_at')
        .in('measurement_point_id', mpIds)
        .order('recorded_at', { ascending: false })
        .limit(mpIds.length * 3)

      const latestByMp = new Map<string, { value: number | null; recorded_at: string }>()
      for (const r of readings || []) {
        if (!latestByMp.has(r.measurement_point_id)) {
          latestByMp.set(r.measurement_point_id, { value: r.value, recorded_at: r.recorded_at })
        }
      }

      setLinkedMPs(mps.map((mp) => {
        const reading = latestByMp.get(mp.id)
        return {
          ...mp,
          last_value: reading?.value ?? null,
          last_reading_at: reading?.recorded_at ?? null,
        } as LinkedMP
      }))
      setLoading(false)
    }
    load()
  }, [boundMeasurementPointId, node.id])

  async function openLinkModal() {
    if (!selectedSiteId) return
    const { data } = await supabase
      .from('measurement_points')
      .select('id, tag, name, utility, measurement_type, unit, quantity, meter_equipment_id, last_calibration_date, calibration_due_date')
      .eq('site_id', selectedSiteId)
      .neq('target_type', 'node')
    setAvailableMPs((data || []).map((mp) => ({ ...mp, last_value: null, last_reading_at: null })) as LinkedMP[])
    setShowLinkModal(true)
  }

  async function handleLink(mpId: string) {
    await supabase.from('measurement_points').update({
      target_type: 'node', target_id: node.id, updated_at: new Date().toISOString(),
    }).eq('id', mpId)
    setShowLinkModal(false)
    // Reload
    const { data: mps } = await supabase
      .from('measurement_points')
      .select('id, tag, name, utility, measurement_type, unit, quantity, meter_equipment_id, last_calibration_date, calibration_due_date')
      .eq('target_type', 'node').eq('target_id', node.id)
    setLinkedMPs((mps || []).map((mp) => ({ ...mp, last_value: null, last_reading_at: null })) as LinkedMP[])
  }

  async function handleUnlink(mp: LinkedMP) {
    await supabase.from('measurement_points').update({
      target_type: mp.meter_equipment_id ? 'equipment' : 'system',
      target_id: mp.meter_equipment_id || '',
      updated_at: new Date().toISOString(),
    }).eq('id', mp.id)
    setLinkedMPs((prev) => prev.filter((m) => m.id !== mp.id))
  }

  // Calibration alert
  function calibrationStatus(dueDate: string | null): 'ok' | 'warn' | 'overdue' {
    if (!dueDate) return 'ok'
    const daysUntil = (new Date(dueDate).getTime() - Date.now()) / 86_400_000
    if (daysUntil < 0) return 'overdue'
    if (daysUntil < 30) return 'warn'
    return 'ok'
  }

  return (
    <>
      {boundMeasurementPointId && (
        <>
          <div className="rounded-xl border border-purple-100 bg-purple-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-700">Rol en balance</p>
                <p className="mt-1 text-[11px] text-purple-700">
                  Frontera alimenta la entrada total; submedidor explica consumo aguas abajo.
                </p>
              </div>
              <Gauge size={16} className="mt-0.5 shrink-0 text-purple-500" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-white p-1 border border-purple-100">
              <button
                onClick={() => setMeterRole('submeter')}
                className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                  meterRole === 'submeter'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Submedidor
              </button>
              <button
                onClick={() => setMeterRole('boundary')}
                className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                  meterRole === 'boundary'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-500 hover:bg-purple-50'
                }`}
              >
                Frontera
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">Punto medido</p>
            <p className="mt-1 text-[11px] text-blue-700">
              Ancla el instrumento al tramo o equipo que representa fisicamente.
            </p>
            <div className="mt-3 space-y-2">
              <InspectorSelect
                label="Anclar a"
                value={meterAnchor?.type || 'edge'}
                onChange={(value) => {
                  if (value === 'node') {
                    const fallbackNode = anchorableNodes[0]
                    setMeterAnchor('node', fallbackNode?.id || '')
                  } else {
                    const fallbackEdge = physicalEdges[0]
                    setMeterAnchor('edge', fallbackEdge?.id || '')
                  }
                }}
                options={['edge', 'node']}
                renderOption={(value) => value === 'edge' ? 'Linea / tramo' : 'Equipo / nodo'}
              />
              {meterAnchor?.type !== 'node' ? (
                <InspectorSelect
                  label="Linea medida"
                  value={meterAnchor?.type === 'edge' ? meterAnchor.id : ''}
                  onChange={(value) => setMeterAnchor('edge', value)}
                  options={physicalEdges.map((edge) => edge.id)}
                  renderOption={(value) => {
                    const edge = physicalEdges.find((item) => item.id === value)
                    return edge ? `${edge.data?.tag || edge.data?.label || 'Linea'} · ${edge.data?.edgeType}` : value
                  }}
                />
              ) : (
                <InspectorSelect
                  label="Equipo/nodo medido"
                  value={meterAnchor.id}
                  onChange={(value) => setMeterAnchor('node', value)}
                  options={anchorableNodes.map((item) => item.id)}
                  renderOption={(value) => {
                    const target = anchorableNodes.find((item) => item.id === value)
                    return target ? `${target.data.tag || target.data.label} · ${target.data.nodeType}` : value
                  }}
                />
              )}
              <InspectorSelect
                label="Lado"
                value={meterAnchor?.side || 'line'}
                onChange={(value) => {
                  const type = meterAnchor?.type || 'edge'
                  const id = meterAnchor?.id || (type === 'edge' ? physicalEdges[0]?.id : anchorableNodes[0]?.id)
                  setMeterAnchor(type, id || '', value)
                }}
                options={['line', 'source', 'load', 'return']}
                renderOption={(value) => ({
                  line: 'Sobre linea',
                  source: 'Lado fuente',
                  load: 'Lado carga',
                  return: 'Retorno',
                }[value] || value)}
              />
            </div>
          </div>
        </>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Puntos de medición ({linkedMPs.length})
        </p>
        <button
          onClick={openLinkModal}
          className="flex items-center gap-1 text-[11px] text-[#1B6FF8] hover:underline cursor-pointer"
        >
          <Plus size={11} /> Vincular
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 py-2">Cargando...</p>
      ) : linkedMPs.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <Gauge size={18} className="text-gray-300 mx-auto mb-1.5" />
          <p className="text-[11px] text-gray-400">Sin medidores vinculados</p>
          <div className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-100 mt-1.5">
            Sin cobertura
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {linkedMPs.map((mp) => {
            const calStatus = calibrationStatus(mp.calibration_due_date)
            const ageMs = mp.last_reading_at ? Date.now() - new Date(mp.last_reading_at).getTime() : null
            const qualityColor = ageMs == null ? QUALITY_COLORS.none
              : ageMs < 7_200_000 ? QUALITY_COLORS.good
              : ageMs < 14_400_000 ? QUALITY_COLORS.delayed
              : QUALITY_COLORS.missing

            return (
              <div key={mp.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-mono font-semibold text-[#1B6FF8] truncate">{mp.tag}</p>
                    <p className="text-[10px] text-gray-500 truncate">{mp.name}</p>
                  </div>
                  <button
                    onClick={() => handleUnlink(mp)}
                    className="text-gray-300 hover:text-red-500 cursor-pointer shrink-0 p-0.5"
                    title="Desvincular"
                  >
                    <X size={12} />
                  </button>
                </div>

                {/* Value */}
                {mp.last_value != null ? (
                  <p className="text-sm font-bold text-gray-800 mt-1.5">
                    {Number(mp.last_value).toLocaleString('es-MX', { maximumFractionDigits: 2 })} {mp.unit}
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-400 mt-1 italic">Sin lectura</p>
                )}

                {/* Quality + timestamp */}
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: qualityColor }} />
                  <span className="text-[10px] text-gray-400">
                    {mp.last_reading_at ? relativeTime(mp.last_reading_at) : 'Sin datos'}
                  </span>
                  <span className="text-[10px] text-gray-300">· {mp.measurement_type}</span>
                </div>

                {/* Calibration */}
                {mp.calibration_due_date && (
                  <p className={`text-[10px] mt-1 ${calStatus === 'overdue' ? 'text-red-600' : calStatus === 'warn' ? 'text-amber-600' : 'text-gray-400'}`}>
                    {calStatus === 'overdue' ? '⚠ Calibración vencida' : `Calibra: ${mp.calibration_due_date}`}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Link modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowLinkModal(false)}>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 w-80 max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800">Vincular medidor</p>
              <button onClick={() => setShowLinkModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={14} /></button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Selecciona un MeasurementPoint para vincular a <span className="font-mono text-[#1B6FF8]">{node.data.tag}</span>.
            </p>
            <div className="flex-1 overflow-y-auto space-y-1.5">
              {availableMPs.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No hay puntos disponibles.</p>
              ) : availableMPs.map((mp) => (
                <button
                  key={mp.id}
                  onClick={() => handleLink(mp.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-gray-200 hover:border-[#1B6FF8] hover:bg-[#F0F6FF] text-left cursor-pointer transition-colors"
                >
                  <Gauge size={14} className="text-[#1B6FF8] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-semibold text-[#1B6FF8] truncate">{mp.tag}</p>
                    <p className="text-xs text-gray-400 truncate">{mp.name} · {mp.unit}</p>
                  </div>
                  <ExternalLink size={12} className="text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Specs Tab ─────────────────────────────────────────────────────────────────

function SpecsTab({ node: _node }: { node: Node<DiagramNodeData> }) {
  const properties = _node.data.properties || {}
  const specs = properties.specs as Record<string, unknown> | undefined

  if (!specs || Object.keys(specs).length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-4 text-center">
        <Settings size={18} className="text-gray-300 mx-auto mb-2" />
        <p className="text-[11px] text-gray-500 font-semibold">Sin especificaciones técnicas</p>
        <p className="text-[10px] text-gray-400 mt-1">
          Completa las specs desde la ficha de equipo en el módulo Modelo.
        </p>
        <a
          href="/modelo"
          className="inline-block mt-2 text-[11px] text-[#1B6FF8] hover:underline"
        >
          Ir a Equipos →
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {Object.entries(specs).map(([key, val]) => (
        <div key={key} className="flex items-center justify-between py-1 border-b border-gray-50">
          <span className="text-[11px] text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
          <span className="text-[11px] font-semibold text-gray-800">{String(val)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Actions Tab ───────────────────────────────────────────────────────────────

function ActionsTab({ node: _node, onRemove }: { node: Node<DiagramNodeData>; onRemove: () => void }) {
  return (
    <div className="space-y-2">
      <a
        href="/modelo"
        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[12px] text-gray-700 hover:bg-gray-50 hover:border-[#1B6FF8]/30 hover:text-[#1B6FF8] transition-colors cursor-pointer"
      >
        <FileText size={14} className="shrink-0" />
        Ir a ficha en Equipos
        <ExternalLink size={11} className="ml-auto text-gray-300" />
      </a>

      <div className="pt-2 border-t border-gray-100">
        <button
          onClick={onRemove}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-[12px] text-red-500 hover:bg-red-50 hover:border-red-200 border border-transparent transition-colors cursor-pointer"
        >
          <Trash2 size={14} />
          Eliminar del diagrama
        </button>
      </div>
    </div>
  )
}

// ── EdgeInspector ─────────────────────────────────────────────────────────────

function EdgeInspector({ edge, onUpdate, onRemove }: {
  edge: Edge<DiagramEdgeData>
  onUpdate: (id: string, data: Partial<DiagramEdgeData>) => void
  onRemove: () => void
}) {
  const d = edge.data || {} as DiagramEdgeData
  const [tab, setTab] = useState<EdgeTab>('connection')

  const tabs: { id: EdgeTab; label: string }[] = [
    { id: 'connection', label: 'Conexión' },
    { id: 'params',     label: 'Parámetros' },
    { id: 'actions',    label: 'Acciones' },
  ]

  return (
    <div className="flex flex-col">
      {/* Edge header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-[10px] text-gray-400 font-mono">edge</p>
        <p className="text-sm font-semibold text-gray-800">{d.label || d.tag || 'Conexión'}</p>
        {d.utility && (
          <p className="text-[11px] text-gray-500 mt-0.5">{getUtilityLabel(d.utility)}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2 text-[11px] font-medium transition-colors cursor-pointer border-b-2 ${
              tab === id ? 'text-[#1B6FF8] border-[#1B6FF8]' : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.12 }}
          className="p-4 space-y-3"
        >
          {tab === 'connection' && (
            <>
              <InspectorSelect
                label="Tipo de línea"
                value={String(d.edgeType || 'pipe')}
                onChange={(v) => onUpdate(edge.id, { edgeType: v as DiagramEdgeData['edgeType'] })}
                options={['pipe', 'cable', 'duct', 'busbar', 'signal', 'logical']}
              />
              <InspectorSelect
                label="Utility"
                value={String(d.utility || '')}
                onChange={(v) => onUpdate(edge.id, { utility: v })}
                options={UTILITY_OPTIONS}
                renderOption={(v) => v === '' ? 'Seleccionar...' : getUtilityLabel(v)}
              />
              <InspectorSelect
                label="Dirección"
                value={String(d.flowDirection || 'source_to_target')}
                onChange={(v) => onUpdate(edge.id, { flowDirection: v as DiagramEdgeData['flowDirection'] })}
                options={['source_to_target', 'target_to_source', 'bidirectional', 'unknown']}
              />
              <InspectorField label="TAG" value={String(d.tag || '')} onChange={(v) => onUpdate(edge.id, { tag: v || undefined })} />
              <InspectorField label="Nombre" value={String(d.label || '')} onChange={(v) => onUpdate(edge.id, { label: v || undefined })} />
            </>
          )}
          {tab === 'params' && (
            <>
              <InspectorField
                label="Factor de pérdida"
                value={d.lossFactor != null ? String(d.lossFactor) : ''}
                onChange={(v) => onUpdate(edge.id, { lossFactor: v ? Number(v) : undefined })}
                type="number"
              />
              <InspectorField
                label="Factor de fuga"
                value={d.leakFactor != null ? String(d.leakFactor) : ''}
                onChange={(v) => onUpdate(edge.id, { leakFactor: v ? Number(v) : undefined })}
                type="number"
              />
            </>
          )}
          {tab === 'actions' && (
            <div className="pt-1">
              <button
                onClick={onRemove}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-[12px] text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                Eliminar conexión
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── Field helpers ─────────────────────────────────────────────────────────────

function InspectorField({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <div>
      <label className="text-[10px] font-medium text-gray-500 block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1B6FF8]/20 focus:border-[#1B6FF8]/40 bg-white transition-shadow"
      />
    </div>
  )
}

function InspectorSelect({ label, value, onChange, options, renderOption }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  renderOption?: (v: string) => string
}) {
  return (
    <div>
      <label className="text-[10px] font-medium text-gray-500 block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1B6FF8]/20 bg-white cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {renderOption ? renderOption(opt) : opt === '' ? 'Seleccionar...' : opt}
          </option>
        ))}
      </select>
    </div>
  )
}
