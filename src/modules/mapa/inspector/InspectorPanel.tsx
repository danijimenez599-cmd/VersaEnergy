import { useState, useEffect, useMemo } from 'react'
import {
  X, Gauge, ExternalLink,
  Settings, Activity, Wrench, Info, Trash2, FileText,
  RefreshCw, Send, CheckCircle, Clock,
} from 'lucide-react'
import { SOURCE_TYPE_ICONS, SOURCE_TYPE_LABELS } from '@/services/measurement-engine/unitCatalog'
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
import { compileFromRows } from '@/services/topology-engine/compiler'
import { autoDetectMeterRole } from '@/services/topology-engine/meterBinding'

// ── Types ────────────────────────────────────────────────────────────────────

interface LinkedMP {
  id: string
  tag: string
  name: string
  utility: string
  measurement_type: string
  unit: string
  quantity: string
  source_type: string
  meter_equipment_id: string | null
  last_calibration_date: string | null
  calibration_due_date: string | null
  last_value: number | null
  last_reading_at: string | null
}

type NodeTab = 'props' | 'measurement' | 'specs' | 'actions' | 'supplier'
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
  const isSource = d.nodeType === 'utility_source'
  const [tab, setTab] = useState<NodeTab>(isSource ? 'supplier' : 'props')

  const tabs: { id: NodeTab; label: string; icon: typeof Info }[] = [
    ...(isSource ? [{ id: 'supplier' as NodeTab, label: 'Suministrador', icon: Info }] : []),
    { id: 'props',       label: 'Propiedades', icon: Info },
    { id: 'measurement', label: isSource ? 'Medidores' : 'Medición', icon: Activity },
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
      <div className="flex border-b border-gray-100 bg-white overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] font-medium transition-colors cursor-pointer border-b-2 min-w-[60px] ${
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
          {tab === 'supplier' && <SupplierTab node={node} onUpdate={onUpdate} />}
          {tab === 'props' && <PropsTab node={node} onUpdate={onUpdate} />}
          {tab === 'measurement' && <MeasurementTab node={node} onUpdate={onUpdate} />}
          {tab === 'specs' && <SpecsTab node={node} />}
          {tab === 'actions' && <ActionsTab node={node} onRemove={onRemove} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── Supplier Tab (utility_source only) ───────────────────────────────────────

function SupplierTab({ node, onUpdate }: { node: Node<DiagramNodeData>; onUpdate: (id: string, data: Partial<DiagramNodeData>) => void }) {
  const d = node.data
  const properties = d.properties || {}

  const supplierName = (properties.supplier_name as string) || ''
  const accountNumber = (properties.account_number as string) || ''
  const tariff = (properties.tariff as string) || ''
  const contractedCapacity = (properties.contracted_capacity as string) || ''

  const updateProp = (key: string, value: string) => {
    onUpdate(node.id, { properties: { ...properties, [key]: value } })
  }

  return (
    <>
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-2">
        <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider mb-1">Fuente de suministro</p>
        <p className="text-[11px] text-blue-600 leading-relaxed">
          Este nodo representa un proveedor externo de utility. Sus medidores son medidores de frontera y se usan como input en el balance energético.
        </p>
      </div>

      <InspectorField
        label="Nombre del suministrador"
        value={supplierName}
        onChange={(v) => updateProp('supplier_name', v)}
        placeholder="ej: CFE, Gas Natural Fenosa, PEMEX Gas"
      />
      <InspectorField
        label="N° de cuenta / contrato"
        value={accountNumber}
        onChange={(v) => updateProp('account_number', v)}
        placeholder="ej: 1234-5678-9"
      />
      <InspectorField
        label="Tarifa"
        value={tariff}
        onChange={(v) => updateProp('tariff', v)}
        placeholder="ej: GDMTH, PDBT, Industrial"
      />
      <InspectorField
        label="Capacidad contratada"
        value={contractedCapacity}
        onChange={(v) => updateProp('contracted_capacity', v)}
        placeholder="ej: 500 kW, 1000 Nm³/h"
      />

      <div className="pt-1 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 leading-relaxed">
          Para agregar medidores de frontera a esta fuente, ve al tab <strong>Medidores</strong> o configura MPs en Equipos → Medidores y vincula el activo.
        </p>
      </div>
    </>
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
  const [mpSearch, setMpSearch] = useState('')
  const [loading, setLoading] = useState(false)

  // Para auto-detect de rol necesitamos el grafo actual
  const diagramNodes = useDiagramStore((s) => s.nodes)
  const diagramEdges = useDiagramStore((s) => s.edges)

  const properties = node.data.properties || {}
  const measurementBinding = properties.measurement_binding as Record<string, unknown> | undefined
  const boundMeasurementPointId = typeof measurementBinding?.measurement_point_id === 'string'
    ? measurementBinding.measurement_point_id
    : null
  const manualRole = measurementBinding?.role === 'boundary' ? 'boundary'
    : measurementBinding?.role === 'submeter' ? 'submeter'
    : null  // null = sin override manual → usar auto
  const meterAnchor = getMeterAnchorFromNodeData(node.data)

  // 3c — Auto-detección de rol desde el grafo
  const autoRole = useMemo(() => {
    try {
      const graph = compileFromRows(
        'inspector-preview', 'inspector-preview',
        diagramNodes.map((n) => ({
          id: n.id, node_type: String(n.data.nodeType), tag: n.data.tag,
          label: n.data.label, utility: (n.data.utility as string) || null,
          position_x: n.position.x, position_y: n.position.y,
          properties: n.data.properties || {},
        })),
        diagramEdges.map((e) => ({
          id: e.id, source_node_id: e.source, target_node_id: e.target,
          edge_type: String(e.data?.edgeType || 'pipe'),
          utility: e.data?.utility || null,
          flow_direction: String(e.data?.flowDirection || 'source_to_target'),
          label: e.data?.label, loss_factor: e.data?.lossFactor,
          leak_factor: e.data?.leakFactor, properties: e.data?.properties || {},
        })),
        [],
      )
      return autoDetectMeterRole(node.id, graph)
    } catch {
      return 'unknown' as const
    }
  }, [node.id, diagramNodes, diagramEdges])

  const effectiveRole = manualRole || (autoRole !== 'unknown' ? autoRole : 'submeter')
  const isAutoRole = !manualRole

  // ── helpers ───────────────────────────────────────────────────────────────

  function updateMeasurementBinding(next: Record<string, unknown>) {
    onUpdate(node.id, {
      properties: {
        ...properties,
        measurement_binding: { ...(measurementBinding || {}), ...next },
      },
    })
  }

  function setMeterRole(role: 'boundary' | 'submeter') {
    updateMeasurementBinding({ role })
  }

  function clearMeterRoleOverride() {
    const { role: _removed, ...rest } = measurementBinding || {}
    onUpdate(node.id, { properties: { ...properties, measurement_binding: rest } })
  }

  // ── data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setLoading(true)
      const queries = [
        supabase
          .from('measurement_points')
          .select('id, tag, name, utility, measurement_type, unit, quantity, source_type, meter_equipment_id, last_calibration_date, calibration_due_date')
          .eq('target_type', 'node')
          .eq('target_id', node.id),
      ] as const

      const [{ data: nodeMps }] = await Promise.all(queries)

      let bindingMps: LinkedMP[] = []
      if (boundMeasurementPointId) {
        const { data } = await supabase
          .from('measurement_points')
          .select('id, tag, name, utility, measurement_type, unit, quantity, source_type, meter_equipment_id, last_calibration_date, calibration_due_date')
          .eq('id', boundMeasurementPointId)
        bindingMps = (data || []) as LinkedMP[]
      }

      const mps = [...(nodeMps || []), ...bindingMps].filter(
        (mp, i, list) => list.findIndex((m) => m.id === mp.id) === i,
      )

      if (!mps.length) { setLinkedMPs([]); setLoading(false); return }

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

      setLinkedMPs(
        mps.map((mp) => {
          const reading = latestByMp.get(mp.id)
          return { ...mp, last_value: reading?.value ?? null, last_reading_at: reading?.recorded_at ?? null } as LinkedMP
        }),
      )
      setLoading(false)
    }
    load()
  }, [boundMeasurementPointId, node.id])

  async function openLinkModal() {
    if (!selectedSiteId) return
    const { data } = await supabase
      .from('measurement_points')
      .select('id, tag, name, utility, measurement_type, unit, quantity, source_type, meter_equipment_id, last_calibration_date, calibration_due_date')
      .eq('site_id', selectedSiteId)
    setAvailableMPs((data || []).map((mp) => ({ ...mp, last_value: null, last_reading_at: null })) as LinkedMP[])
    setMpSearch('')
    setShowLinkModal(true)
  }

  async function handleLink(mpId: string) {
    setShowLinkModal(false)
    // Fetch the full MP to get source_type and tag for the binding
    const { data: mps } = await supabase
      .from('measurement_points')
      .select('id, tag, name, utility, measurement_type, unit, quantity, source_type, meter_equipment_id, last_calibration_date, calibration_due_date')
      .eq('id', mpId)
    const mp = mps?.[0]
    // Update measurement_binding with source_type so the node icon works without a reading
    updateMeasurementBinding({
      measurement_point_id: mpId,
      status: 'linked',
      source_type: mp?.source_type || null,
    })
    if (mp) {
      setLinkedMPs((prev) => {
        const next = prev.filter((m) => m.id !== mpId)
        return [...next, { ...mp, last_value: null, last_reading_at: null } as LinkedMP]
      })
    }
  }

  function handleChangeMp() {
    openLinkModal()
  }

  async function handleUnlink(mp: LinkedMP) {
    // Clear measurement_binding if it's the bound one
    if (boundMeasurementPointId === mp.id) {
      updateMeasurementBinding({ measurement_point_id: null, status: 'unbound' })
    }
    setLinkedMPs((prev) => prev.filter((m) => m.id !== mp.id))
  }

  function calibrationStatus(dueDate: string | null): 'ok' | 'warn' | 'overdue' {
    if (!dueDate) return 'ok'
    const daysUntil = (new Date(dueDate).getTime() - Date.now()) / 86_400_000
    if (daysUntil < 0) return 'overdue'
    if (daysUntil < 30) return 'warn'
    return 'ok'
  }

  // ── Bound MP (primary) ────────────────────────────────────────────────────

  const boundMP = linkedMPs.find((m) => m.id === boundMeasurementPointId)
  const ageMs = boundMP?.last_reading_at
    ? Date.now() - new Date(boundMP.last_reading_at).getTime()
    : null
  const qualityColor = ageMs == null
    ? QUALITY_COLORS.none
    : ageMs < 7_200_000 ? QUALITY_COLORS.good
    : ageMs < 14_400_000 ? QUALITY_COLORS.delayed
    : QUALITY_COLORS.missing

  const filteredAvailableMPs = availableMPs.filter((mp) => {
    const q = mpSearch.trim().toLowerCase()
    return !q || mp.tag.toLowerCase().includes(q) || mp.name.toLowerCase().includes(q)
  })

  // 4 — stale check para badge "Pendiente lectura"
  function isReadingStale(mp: LinkedMP): boolean {
    if (!mp.last_reading_at) return true
    const ageH = (Date.now() - new Date(mp.last_reading_at).getTime()) / 3_600_000
    // frecuency de source_config.frequency (daily=24h, weekly=168h, monthly=720h, on_demand=9999)
    const freqH = mp.source_type === 'manual' ? 24 : 2  // conservative 24h for manual
    return ageH > freqH
  }

  return (
    <div className="space-y-4">

      {/* ── Section 1: Punto de medición ──────────────────────────────────── */}
      <section>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Punto de medición
        </p>

        {loading ? (
          <div className="flex items-center gap-2 py-3 text-xs text-gray-400">
            <RefreshCw size={12} className="animate-spin" /> Cargando...
          </div>
        ) : boundMP ? (
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-mono font-bold text-purple-800 truncate">{boundMP.tag}</p>
                <p className="text-[11px] text-purple-600 truncate mt-0.5">{boundMP.name}</p>
                <p className="text-[10px] text-purple-400 mt-0.5">
                  {boundMP.quantity} · {boundMP.unit}
                  {boundMP.source_type && (
                    <span className="ml-1.5">
                      · {SOURCE_TYPE_ICONS[boundMP.source_type]} {SOURCE_TYPE_LABELS[boundMP.source_type]}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={handleChangeMp}
                className="text-[10px] text-purple-500 hover:text-purple-700 underline shrink-0 cursor-pointer"
              >
                Cambiar
              </button>
            </div>
            {/* Last reading */}
            {boundMP.last_value != null ? (
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-sm font-bold text-purple-900">
                  {Number(boundMP.last_value).toLocaleString('es-MX', { maximumFractionDigits: 2 })} {boundMP.unit}
                </span>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: qualityColor }} />
                <span className="text-[10px] text-purple-400">
                  {boundMP.last_reading_at ? relativeTime(boundMP.last_reading_at) : ''}
                </span>
                {/* 4 — Pendiente lectura badge */}
                {boundMP.source_type === 'manual' && isReadingStale(boundMP) && (
                  <span className="flex items-center gap-0.5 text-[9px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 ml-1">
                    <Clock size={8} />
                    Pendiente
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <p className="text-[11px] text-purple-400 italic">Sin lecturas aún</p>
                {boundMP.source_type === 'manual' && (
                  <span className="flex items-center gap-0.5 text-[9px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
                    <Clock size={8} />
                    Pendiente
                  </span>
                )}
              </div>
            )}
            {/* Calibration */}
            {boundMP.calibration_due_date && (() => {
              const cal = calibrationStatus(boundMP.calibration_due_date)
              return cal !== 'ok' ? (
                <p className={`mt-1.5 text-[10px] font-semibold ${cal === 'overdue' ? 'text-red-600' : 'text-amber-600'}`}>
                  {cal === 'overdue' ? '⚠ Calibración vencida' : `Calibrar antes del ${boundMP.calibration_due_date}`}
                </p>
              ) : null
            })()}
          </div>
        ) : (
          <button
            onClick={openLinkModal}
            className="w-full flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-3 py-3 text-left hover:border-[#1B6FF8]/40 hover:bg-blue-50/40 transition-colors group cursor-pointer"
          >
            <Gauge size={16} className="text-gray-300 group-hover:text-[#1B6FF8] shrink-0" />
            <div>
              <p className="text-[12px] text-gray-400 group-hover:text-[#1B6FF8] font-medium">Sin MP vinculado</p>
              <p className="text-[10px] text-gray-300">Toca para seleccionar un punto de medición</p>
            </div>
          </button>
        )}
      </section>

      {/* ── Phase 4: Ingreso manual inline ───────────────────────────────── */}
      {boundMP && boundMP.source_type === 'manual' && (
        <ManualReadingSection
          mp={boundMP}
          onSaved={(newValue, recordedAt) => {
            setLinkedMPs((prev) =>
              prev.map((m) =>
                m.id === boundMP.id
                  ? { ...m, last_value: newValue, last_reading_at: recordedAt }
                  : m,
              ),
            )
          }}
        />
      )}

      {/* ── Section 2: Ancla física (informativa — editable via conexión visual en Fase 3) ── */}
      {meterAnchor && (
        <section>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Ancla física
          </p>
          <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
            <p className="text-[11px] text-gray-600 font-medium">
              {meterAnchor.type === 'edge' ? 'Sobre línea' : 'En equipo/nodo'}
              {meterAnchor.side && meterAnchor.side !== 'line' && (
                <span className="ml-1 text-gray-400">· {
                  meterAnchor.side === 'source' ? 'lado fuente' :
                  meterAnchor.side === 'load' ? 'lado carga' :
                  meterAnchor.side === 'return' ? 'retorno' : meterAnchor.side
                }</span>
              )}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{meterAnchor.id.slice(0, 12)}…</p>
            <p className="text-[10px] text-gray-300 mt-1.5">
              Para cambiar el ancla, conecta el medidor al elemento en el canvas con una línea de señal.
            </p>
          </div>
        </section>
      )}

      {/* ── Section 3: Rol en balance (3c — auto-detectado) ─────────────── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Rol en balance
          </p>
          {isAutoRole && autoRole !== 'unknown' && (
            <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5 font-medium">
              🤖 auto
            </span>
          )}
          {!isAutoRole && (
            <button
              onClick={clearMeterRoleOverride}
              className="text-[10px] text-gray-400 hover:text-gray-600 underline cursor-pointer"
              title="Volver a detección automática"
            >
              auto
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMeterRole('submeter')}
            className={`flex flex-col items-start rounded-xl border-2 px-3 py-2.5 text-left transition-colors cursor-pointer ${
              effectiveRole === 'submeter'
                ? 'border-gray-800 bg-gray-800 text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="text-[12px] font-bold">Submedidor</span>
            <span className={`text-[10px] mt-0.5 leading-tight ${effectiveRole === 'submeter' ? 'text-gray-300' : 'text-gray-400'}`}>
              Explica consumo aguas abajo
            </span>
          </button>
          <button
            onClick={() => setMeterRole('boundary')}
            className={`flex flex-col items-start rounded-xl border-2 px-3 py-2.5 text-left transition-colors cursor-pointer ${
              effectiveRole === 'boundary'
                ? 'border-purple-600 bg-purple-600 text-white'
                : 'border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100'
            }`}
          >
            <span className="text-[12px] font-bold">Frontera</span>
            <span className={`text-[10px] mt-0.5 leading-tight ${effectiveRole === 'boundary' ? 'text-purple-200' : 'text-purple-500'}`}>
              Entrada total al sistema
            </span>
          </button>
        </div>
        {isAutoRole && (
          <p className="text-[10px] text-gray-400 mt-1.5 italic">
            Detectado automáticamente del grafo · toca un botón para fijar manualmente
          </p>
        )}
      </section>

      {/* ── Section 4: Otras lecturas vinculadas ──────────────────────────── */}
      {linkedMPs.filter((m) => m.id !== boundMeasurementPointId).length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Lecturas adicionales ({linkedMPs.filter((m) => m.id !== boundMeasurementPointId).length})
            </p>
          </div>
          <div className="space-y-1.5">
            {linkedMPs.filter((m) => m.id !== boundMeasurementPointId).map((mp) => {
              const age = mp.last_reading_at ? Date.now() - new Date(mp.last_reading_at).getTime() : null
              const qColor = age == null ? QUALITY_COLORS.none
                : age < 7_200_000 ? QUALITY_COLORS.good
                : age < 14_400_000 ? QUALITY_COLORS.delayed
                : QUALITY_COLORS.missing
              return (
                <div key={mp.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-mono font-semibold text-[#1B6FF8] truncate">{mp.tag}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: qColor }} />
                      <span className="text-[10px] text-gray-400">
                        {mp.last_value != null
                          ? `${Number(mp.last_value).toLocaleString('es-MX', { maximumFractionDigits: 2 })} ${mp.unit}`
                          : 'Sin lectura'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnlink(mp)}
                    className="text-gray-300 hover:text-red-500 cursor-pointer shrink-0"
                    title="Desvincular"
                  >
                    <X size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Link MP modal ─────────────────────────────────────────────────── */}
      {showLinkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowLinkModal(false)}
        >
          <div
            className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 w-80 max-h-[72vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">Seleccionar MP</p>
                <p className="text-[11px] text-gray-400">para <span className="font-mono text-[#1B6FF8]">{node.data.tag}</span></p>
              </div>
              <button onClick={() => setShowLinkModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={14} />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-2.5">
              <Activity size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={mpSearch}
                onChange={(e) => setMpSearch(e.target.value)}
                autoFocus
                placeholder="Buscar TAG o nombre..."
                className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#1B6FF8]/20"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5">
              {filteredAvailableMPs.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">Sin resultados.</p>
              ) : filteredAvailableMPs.map((mp) => (
                <button
                  key={mp.id}
                  onClick={() => handleLink(mp.id)}
                  className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-gray-200 hover:border-[#1B6FF8] hover:bg-[#F0F6FF] text-left cursor-pointer transition-colors"
                >
                  <Gauge size={13} className="text-[#1B6FF8] shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-mono font-bold text-[#1B6FF8] truncate">{mp.tag}</p>
                    <p className="text-[11px] text-gray-500 truncate">{mp.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{mp.quantity} · {mp.unit}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Phase 4: ManualReadingSection ─────────────────────────────────────────────
// Permite al operador ingresar una lectura manual directamente desde el inspector
// del mapa, sin salir al módulo de Medición.

function ManualReadingSection({
  mp,
  onSaved,
}: {
  mp: { id: string; tag: string; unit: string; last_value: number | null }
  onSaved: (value: number, recordedAt: string) => void
}) {
  const [inputValue, setInputValue] = useState(
    mp.last_value != null ? String(mp.last_value) : '',
  )
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSave() {
    const numVal = parseFloat(inputValue)
    if (isNaN(numVal)) { setErrorMsg('Ingresa un número válido'); return }
    setStatus('saving')
    setErrorMsg('')
    const recordedAt = new Date().toISOString()
    const { error } = await supabase
      .from('measurement_readings')
      .insert({
        measurement_point_id: mp.id,
        value: numVal,
        recorded_at: recordedAt,
        quality: 'manual',
        notes: 'Ingresado desde el mapa',
      })
    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
      return
    }
    setStatus('saved')
    onSaved(numVal, recordedAt)
    setTimeout(() => setStatus('idle'), 2500)
  }

  return (
    <section>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Registrar lectura
      </p>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2.5">
        <p className="text-[10px] text-amber-700">
          ⌨ Fuente manual — ingresa el valor actual del instrumento
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="number"
              step="any"
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value); setStatus('idle') }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Valor..."
              className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-shadow"
            />
          </div>
          <span className="text-[11px] text-amber-600 font-mono shrink-0">{mp.unit}</span>
          <button
            onClick={handleSave}
            disabled={status === 'saving'}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold transition-colors disabled:opacity-60 cursor-pointer shrink-0"
          >
            {status === 'saving' ? (
              <RefreshCw size={11} className="animate-spin" />
            ) : status === 'saved' ? (
              <CheckCircle size={11} />
            ) : (
              <Send size={11} />
            )}
            {status === 'saved' ? 'Guardado' : 'Registrar'}
          </button>
        </div>
        {errorMsg && (
          <p className="text-[10px] text-red-600 font-medium">{errorMsg}</p>
        )}
        {status === 'saved' && (
          <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle size={10} /> Lectura registrada · el valor se actualiza en la burbuja
          </p>
        )}
      </div>
    </section>
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

function InspectorField({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="text-[10px] font-medium text-gray-500 block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1B6FF8]/20 focus:border-[#1B6FF8]/40 bg-white transition-shadow placeholder:text-gray-300"
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
