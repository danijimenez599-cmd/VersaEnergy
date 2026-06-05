import {
  useCallback, useEffect, useMemo, useState, type ReactNode,
} from 'react'
import React from 'react'
import {
  BadgeCheck, CalendarClock,
  ExternalLink, Factory, Gauge, Map, Network,
  Plus, Save, ShieldCheck, Wrench, X, Zap,
  ChevronRight, Activity, Cpu, Layers,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { AssetTree } from '@/shared/AssetTree'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { Card } from '@/shared/Card'
import { ConfirmDialog } from '@/shared/ConfirmDialog'
import { EmptyState } from '@/shared/EmptyState'
import { FormField, inputClass, selectClass } from '@/shared/FormField'
import { Modal } from '@/shared/Modal'
import { getUtilityLabel, utilityOptions } from '@/shared/OperationalContext'
import { supabase } from '@/services/supabase'
import {
  getAllowedQuantities,
  getAllowedUnits,
  getAllUnitsFromCatalog,
  getDefaultUnit,
  QUANTITY_LABELS,
  type MeasurementQuantity,
} from '@/services/measurement-engine/unitCatalog'
import {
  createEnergyAssetFromTree,
  getAllowedCreateKinds,
  loadEnergyAssetTree,
  type CmmsReadiness,
  type EnergyAssetCreateKind,
  type EnergyAssetNodeType,
  type EnergyAssetTreeNode,
  type EnergyAssetTreeResult,
} from '@/services/asset-tree'
import {
  getEquipmentSpecSchema,
  type SpecField,
} from '@/services/equipmentSpecs'

// ── Constants ────────────────────────────────────────────────────────────────

interface Props {
  siteId: string
  utilityType: string | null
}

type DetailTab = 'info' | 'specs' | 'meters' | 'map' | 'cmms'
type DetailTabConfig = { id: DetailTab; label: string; icon: ReactNode }

const TYPE_LABELS: Record<EnergyAssetNodeType, string> = {
  plant: 'Planta', area: 'Área', system: 'Sistema', equipment: 'Equipo',
}

const READINESS_COLOR: Record<CmmsReadiness, 'ok' | 'warn' | 'danger'> = {
  ready: 'ok', partial: 'warn', missing: 'danger',
}

const READINESS_LABEL: Record<CmmsReadiness, string> = {
  ready: 'CMMS listo', partial: 'CMMS parcial', missing: 'Falta base',
}

const KIND_LABELS: Record<EnergyAssetCreateKind, string> = {
  area: 'Área', system: 'Sistema', equipment: 'Equipo', meter: 'Medidor',
}

const NODE_ROLE_LABELS: Record<string, string> = {
  grouping: 'Agrupador',
  maintainable: 'Mantenible',
}

const MAINTAINABLE_KIND_LABELS: Record<string, string> = {
  equipment: 'Equipo',
  meter: 'Medidor',
  instrument: 'Instrumento',
  infrastructure: 'Infraestructura',
  facility: 'Instalacion',
}

const EQUIPMENT_TYPE_OPTIONS: [string, string][] = [
  ['boiler', 'Caldera'], ['pump', 'Bomba'], ['compressor', 'Compresor'],
  ['chiller', 'Chiller'], ['cooling_tower', 'Torre enfriamiento'],
  ['tank', 'Tanque'], ['transformer', 'Transformador'], ['panel', 'Tablero'],
  ['generator', 'Generador'], ['heat_exchanger', 'Intercambiador'],
  ['motor', 'Motor'], ['consumer', 'Consumidor'], ['custom_equipment', 'Otro equipo'],
]

const SOURCE_TYPE_LABELS: Record<string, string> = {
  utility_grid: 'Fuente externa - Red publica',
  fuel_delivery: 'Fuente externa - Combustible',
  water_main: 'Fuente externa - Acometida de agua',
  renewable: 'Fuente externa - Renovable contratada',
  generator: 'Fuente externa - Generador de tercero',
  storage: 'Fuente externa - Almacenamiento externo',
  custom: 'Fuente externa',
}

const PRODUCER_EQUIPMENT_TYPES = new Set([
  'boiler',
  'compressor',
  'chiller',
  'cooling_tower',
  'generator',
  'solar_array',
  'pv_array',
])

// ── Types ────────────────────────────────────────────────────────────────────

interface AssetFormState {
  name: string; code: string; description: string; utility: string
  equipmentType: string; measurementType: string; quantity: MeasurementQuantity
  unit: string; sourceMode: 'manual' | 'csv' | 'iot'
  frequency: 'daily' | 'weekly' | 'monthly' | 'on_demand'
  lastCalibrationDate: string; calibrationDueDate: string
}

interface LinkedMeasurementPoint {
  id: string; tag: string; name: string; target_type: string; target_id: string
  utility: string; measurement_type: string; quantity: string; unit: string
  source_type: string; source_config: Record<string, unknown> | null
  last_calibration_date: string | null; calibration_due_date: string | null
  meter_equipment_id: string | null
}

interface LinkedMapNode {
  id: string; diagram_id: string; tag: string; label: string
  node_type: string; utility: string | null; properties: Record<string, unknown> | null
}

interface ExternalSource {
  id: string
  name: string
  source_type: string
  utility_type: string
  description: string | null
  is_active: boolean
}

function createDefaultForm(utilityType?: string | null): AssetFormState {
  const utility = utilityType || 'electricity'
  const quantities = getAllowedQuantities(utility)
  const quantity = (quantities[0] || 'energy') as MeasurementQuantity
  return {
    name: '', code: '', description: '', utility,
    equipmentType: 'consumer', measurementType: 'accumulator',
    quantity, unit: getDefaultUnit(utility, quantity),
    sourceMode: 'manual', frequency: 'monthly',
    lastCalibrationDate: '', calibrationDueDate: '',
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export function PlantAssetTreeView({ siteId, utilityType }: Props) {
  const [tree, setTree] = useState<EnergyAssetTreeResult | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // diagramScopeIds removed — diagram layer no longer exists
  const [formKind, setFormKind] = useState<EnergyAssetCreateKind | null>(null)
  const [formParent, setFormParent] = useState<EnergyAssetTreeNode | null>(null)
  const [form, setForm] = useState<AssetFormState>(() => createDefaultForm(utilityType))
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ node: EnergyAssetTreeNode } | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const result = await loadEnergyAssetTree(siteId, utilityType)
    setTree(result)
    setLoading(false)
  }, [siteId, utilityType])

  useEffect(() => { refresh() }, [refresh])


  // Select root automatically on load if none is selected
  useEffect(() => {
    if (tree?.root && !selectedNodeId) {
      setSelectedNodeId(tree.root.id)
    }
  }, [tree, selectedNodeId])

  const selectedNode = useMemo(
    () => tree?.flatNodes.find((n) => n.id === selectedNodeId) ?? tree?.root ?? null,
    [selectedNodeId, tree],
  )

  function handleSelectNode(id: string) {
    setSelectedNodeId(id)
  }

  function openCreate(kind: EnergyAssetCreateKind, parent: EnergyAssetTreeNode) {
    setFormKind(kind)
    setFormParent(parent)
    setForm(createDefaultForm(parent.utility || utilityType))
    setFormError(null)
  }

  async function handleCreate() {
    if (!formKind || !formParent) return
    setSaving(true); setFormError(null)
    try {
      await createEnergyAssetFromTree({
        siteId, parentType: formParent.type, parentSourceId: formParent.sourceId,
        kind: formKind, name: form.name, code: form.code,
        description: form.description || null, utility: form.utility,
        equipmentType: form.equipmentType,
        measurement: formKind === 'meter' ? {
          measurementType: form.measurementType, quantity: form.quantity,
          unit: form.unit, sourceMode: form.sourceMode, frequency: form.frequency,
          lastCalibrationDate: form.lastCalibrationDate || null,
          calibrationDueDate: form.calibrationDueDate || null,
        } : undefined,
      })
      setFormKind(null); setFormParent(null)
      await refresh()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo crear el activo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(node: EnergyAssetTreeNode) {
    try {
      if (node.source === 'core') {
        console.warn('Core assets are governed by the shared registry and cannot be deleted from Energy.')
        return
      }
      if (node.type === 'equipment') {
        await supabase.from('energy_equipment').delete().eq('id', node.sourceId)
      } else if (node.type === 'system') {
        await supabase.from('utility_systems').delete().eq('id', node.sourceId)
      } else if (node.type === 'area') {
        await supabase.from('energy_areas').delete().eq('id', node.sourceId)
      }
      if (selectedNodeId === node.id) setSelectedNodeId(null)
      await refresh()
    } catch (err) {
      console.error('Delete error', err)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="h-[560px] rounded-[--radius-lg] border border-[--color-border-strong] bg-white animate-pulse" />
        <div className="h-[560px] rounded-[--radius-lg] border border-[--color-border-strong] bg-white animate-pulse" />
      </div>
    )
  }

  if (!tree?.root) {
    return (
      <EmptyState
        icon={<Factory size={48} strokeWidth={1.5} />}
        title="Sin planta configurada"
        description="Crea o selecciona un sitio para construir el árbol de activos energético."
      />
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* ── Left panel — Tree ─────────────────────────────────────────── */}
        <Card padding="none" className="overflow-hidden flex flex-col h-[calc(100dvh-8.5rem)] min-h-[560px]">
          <AssetTree
            root={tree.root}
            loading={loading}
            selectedId={selectedNodeId}
            onSelect={(id) => handleSelectNode(id)}
            onNewChild={(kind, parent) => openCreate(kind, parent)}
            onDelete={(node) => setDeleteTarget({ node })}
          />
        </Card>

        {/* ── Right panel — Detail ──────────────────────────────────────── */}
        {selectedNode && (
          <NodeDetail
            node={selectedNode}
            onCreate={openCreate}
            tree={tree}
          />
        )}
      </div>

      {/* Create modal */}
      <AssetNodeFormModal
        kind={formKind}
        parent={formParent}
        form={form}
        setForm={setForm}
        error={formError}
        saving={saving}
        onSave={handleCreate}
        onClose={() => { setFormKind(null); setFormParent(null); setFormError(null) }}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Eliminar ${deleteTarget ? TYPE_LABELS[deleteTarget.node.type] : ''}`}
        description={`Se eliminará "${deleteTarget?.node.name}" ${deleteTarget?.node.childCount ? `y sus ${deleteTarget.node.childCount} sub-activos` : ''}. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget.node)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

// ── Node detail ───────────────────────────────────────────────────────────────

function NodeDetail({
  node, onCreate, tree,
}: {
  node: EnergyAssetTreeNode
  onCreate: (kind: EnergyAssetCreateKind, parent: EnergyAssetTreeNode) => void
  tree: EnergyAssetTreeResult | null
}) {
  const allowedKinds = getAllowedCreateKinds(node.type)
  const [activeTab, setActiveTab] = useState<DetailTab>('info')
  const [measurementPoints, setMeasurementPoints] = useState<LinkedMeasurementPoint[]>([])
  const [mapNodes, setMapNodes] = useState<LinkedMapNode[]>([])
  const [externalSources, setExternalSources] = useState<ExternalSource[]>([])
  const tabs = useMemo(() => getDetailTabs(node), [node])

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0]?.id ?? 'info')
    }
  }, [activeTab, tabs])

  useEffect(() => {
    let cancelled = false
    async function loadDetails() {
      const sourcesQuery = node.type === 'plant'
        ? supabase
          .from('energy_sources')
          .select('id,name,source_type,utility_type,description,is_active')
          .eq('site_id', node.siteId)
          .eq('is_active', true)
          .order('name')
        : Promise.resolve({ data: [] as ExternalSource[], error: null })

      const [{ data: points }, { data: diagramNodes }, { data: sources }] = await Promise.all([
        supabase
          .from('measurement_points')
          .select('id,tag,name,target_type,target_id,utility,measurement_type,quantity,unit,source_type,source_config,last_calibration_date,calibration_due_date,meter_equipment_id')
          .or(`target_id.eq.${node.sourceId},meter_equipment_id.eq.${node.sourceId}`)
          .order('tag'),
        supabase
          .from('energy_diagram_nodes')
          .select('id,diagram_id,tag,label,node_type,utility,properties')
          .limit(500),
        sourcesQuery,
      ])
      if (cancelled) return
      setMeasurementPoints((points || []) as LinkedMeasurementPoint[])
      setExternalSources((sources || []) as ExternalSource[])
      setMapNodes(
        ((diagramNodes || []) as LinkedMapNode[]).filter((item) => {
          const b = (item.properties?.asset_binding || {}) as Record<string, unknown>
          const mb = (item.properties?.measurement_binding || {}) as Record<string, unknown>
          return b.entity_id === node.sourceId || mb.meter_equipment_id === node.sourceId
        }),
      )
    }
    loadDetails()
    return () => { cancelled = true }
  }, [node.sourceId])

  // Resolve dynamic parents for CMMS-style breadcrumbs
  const breadcrumbs = useMemo(() => {
    const list: typeof node[] = []
    let curr = node
    while (curr.parentId) {
      const parent = tree?.flatNodes.find(n => n.id === curr.parentId)
      if (!parent) break
      list.unshift(parent)
      curr = parent
    }
    return list
  }, [node, tree])

  return (
    <Card padding="none" className="overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm">
      {/* CMMS-style header context block */}
      <div className="bg-slate-50/50 border-b border-slate-200 px-6 py-4 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 p-4 opacity-[0.02] pointer-events-none">
          <Factory size={100} />
        </div>

        {/* Dynamic technical breadcrumbs */}
        <div className="hidden sm:flex items-center gap-1.5 mb-2.5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sede</span>
          {breadcrumbs.map(b => (
            <React.Fragment key={b.id}>
              <ChevronRight size={10} className="text-slate-300" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[120px]">{b.name}</span>
            </React.Fragment>
          ))}
          <ChevronRight size={10} className="text-slate-300" />
          <span className="text-[9px] font-black text-brand-blue uppercase tracking-widest truncate">{node.name}</span>
        </div>

        <div className="flex items-center justify-between gap-4 relative z-10">
          <div className="flex-1 min-w-0">
            <p className="mb-1 hidden text-[9px] font-black uppercase tracking-widest text-slate-400 sm:block">
              Expediente Técnico de Activo
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-blue text-white flex items-center justify-center shadow-md shadow-brand-blue/20 border border-brand-blue/10 shrink-0">
                <Cpu size={15} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base tracking-tight truncate leading-tight">{node.name}</h2>
                <p className="mt-0.5 text-[11px] text-slate-400 font-mono leading-none">{node.code || 'Sin código/TAG'}</p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-1.5 mt-3">
              <Badge variant="brand" className="text-[9px] px-2 py-0.5">
                {TYPE_LABELS[node.type]}
              </Badge>
              {node.nodeRole && (
                <Badge variant="neutral" className="text-[9px] px-2 py-0.5">
                  {NODE_ROLE_LABELS[node.nodeRole] || node.nodeRole}
                </Badge>
              )}
              {node.maintainableKind && (
                <Badge variant={node.maintainableKind === 'meter' ? 'info' : 'neutral'} className="text-[9px] px-2 py-0.5">
                  {MAINTAINABLE_KIND_LABELS[node.maintainableKind] || node.maintainableKind}
                </Badge>
              )}
              {node.isMeasurementAsset && (
                <Badge variant="brand" className="text-[9px] px-2 py-0.5">
                  Medicion
                </Badge>
              )}
              <Badge variant={READINESS_COLOR[node.cmmsReadiness]} className="text-[9px] px-2 py-0.5">
                {READINESS_LABEL[node.cmmsReadiness]}
              </Badge>
              {node.utility && (
                <Badge variant="neutral" className="text-[9px] px-2 py-0.5">
                  {getUtilityLabel(node.utility)}
                </Badge>
              )}
            </div>
          </div>

          {allowedKinds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {allowedKinds.map((kind) => (
                <Button
                  key={kind}
                  size="sm"
                  variant={kind === 'meter' ? 'secondary' : 'primary'}
                  leftIcon={<Plus size={12} />}
                  onClick={() => onCreate(kind, node)}
                >
                  {KIND_LABELS[kind]}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="flex gap-4 overflow-x-auto scrollbar-none sm:gap-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 py-3 text-[10px] font-bold uppercase tracking-[0.15em] relative transition-all cursor-pointer ${
                activeTab === t.id ? 'text-brand-blue' : 'text-slate-400 hover:text-slate-900'
              }`}
            >
              {t.icon}
              {t.label}
              {activeTab === t.id && (
                <motion.div
                  layoutId="activeDetailTabIndicator"
                  className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-blue"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-[400px] p-6 overflow-auto bg-slate-50/10">
        {activeTab === 'info' && (
          <InfoTab node={node} tree={tree} externalSources={externalSources} />
        )}
        {activeTab === 'specs' && <SpecsTab node={node} />}
        {activeTab === 'meters' && (
          <MetersTab points={measurementPoints} node={node} onCreate={onCreate} />
        )}
        {activeTab === 'map' && <MapTab nodes={mapNodes} />}
        {activeTab === 'cmms' && <CmmsTab node={node} />}
      </div>
    </Card>
  )
}

function getDetailTabs(node: EnergyAssetTreeNode): DetailTabConfig[] {
  const tabs: DetailTabConfig[] = [
    { id: 'info', label: 'Información', icon: <Wrench size={12} /> },
  ]

  if (node.nodeRole === 'maintainable') {
    tabs.push({ id: 'specs', label: 'Especificaciones', icon: <Zap size={12} /> })
  }

  tabs.push({
    id: 'meters',
    label: node.isMeasurementAsset ? 'Medición' : 'Medidores',
    icon: <Gauge size={12} />,
  })
  tabs.push({ id: 'map', label: 'Mapa Energy', icon: <Map size={12} /> })
  tabs.push({ id: 'cmms', label: 'Registry', icon: <ShieldCheck size={12} /> })

  return tabs
}

function InfoTab({
  node,
  tree,
  externalSources,
}: {
  node: EnergyAssetTreeNode
  tree: EnergyAssetTreeResult | null
  externalSources: ExternalSource[]
}) {
  const specs = (node.properties?.specs || {}) as Record<string, unknown>
  const producerEquipment = tree?.flatNodes.filter(isProducerEquipment) || []

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
          <Wrench size={13} /> Ficha General
        </h3>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <InfoTile label="Tipo" value={TYPE_LABELS[node.type]} icon={<Layers size={14} />} />
          <InfoTile label="Rol energético" value={getEnergyRoleLabel(node)} icon={<Zap size={14} />} />
          <InfoTile label="Utility" value={node.utility ? getUtilityLabel(node.utility) : 'Multi-utility'} icon={<Network size={14} />} />
          <InfoTile label="Estado" value={node.status || 'Activo'} icon={<Activity size={14} />} />
          {node.type !== 'plant' && (
            <InfoTile label="Medidores" value={node.measurementPointCount} icon={<Gauge size={14} />} />
          )}
        </div>
      </section>

      {node.type === 'plant' && (
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <Factory size={13} /> Suministro y producción de utilities
          </h3>
          <div className="mb-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-900">
            <span className="font-bold">Fuente externa</span> es lo que entra a la planta desde fuera: red pública, acometida, entrega de combustible o suministro de tercero.{' '}
            <span className="font-bold">Equipo productor</span> es un activo mantenible dentro de la planta, como una caldera, compresor o chiller.
            No dupliques una caldera como fuente externa; declárala como equipo productor.
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ExternalSourcesPanel sources={externalSources} />
            <ProducerEquipmentPanel equipment={producerEquipment} />
          </div>
        </section>
      )}

      {node.description && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Descripción</h3>
          <p className="text-sm text-gray-600">{node.description}</p>
        </section>
      )}
      {Object.keys(specs).length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Resumen de specs</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(specs).slice(0, 6).map(([k, v]) => (
              <InfoTile key={k} label={k.replace(/_/g, ' ')} value={String(v ?? '—')} />
            ))}
          </div>
          {Object.keys(specs).length > 6 && (
            <p className="text-xs text-gray-400 mt-2">+{Object.keys(specs).length - 6} campos adicionales en Especificaciones</p>
          )}
        </section>
      )}
    </div>
  )
}

function ExternalSourcesPanel({ sources }: { sources: ExternalSource[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-900">Fuentes externas</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Suministros que no son activos mantenibles.</p>
        </div>
        <Badge variant="neutral" className="shrink-0 text-[9px]">{sources.length}</Badge>
      </div>
      {sources.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
          No hay fuentes externas configuradas para esta planta. Úsalas para red pública, acometidas o entregas externas.
        </div>
      ) : (
        <div className="space-y-2">
          {sources.map((source) => (
            <div key={source.id} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{source.name}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {SOURCE_TYPE_LABELS[source.source_type] || SOURCE_TYPE_LABELS.custom}
                  </p>
                </div>
                <Badge variant="info" className="shrink-0 text-[9px]">
                  {getUtilityLabel(source.utility_type)}
                </Badge>
              </div>
              {source.description && (
                <p className="mt-2 text-xs leading-5 text-slate-500">{source.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProducerEquipmentPanel({ equipment }: { equipment: EnergyAssetTreeNode[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-900">Equipos productores</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Activos internos que producen o transforman utilities.</p>
        </div>
        <Badge variant="brand" className="shrink-0 text-[9px]">{equipment.length}</Badge>
      </div>
      {equipment.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
          No se detectaron equipos productores. Revisa el tipo de equipo si esperabas ver calderas, compresores o chillers.
        </div>
      ) : (
        <div className="space-y-2">
          {equipment.slice(0, 8).map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{item.name}</p>
                  <p className="mt-1 font-mono text-[11px] text-slate-400">{item.code || 'Sin TAG'}</p>
                </div>
                <Badge variant="ok" className="shrink-0 text-[9px]">Activo mantenible</Badge>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {item.utility ? getUtilityLabel(item.utility) : 'Multi-utility'} · {getEquipmentTypeLabel(item)}
              </p>
            </div>
          ))}
          {equipment.length > 8 && (
            <p className="text-[11px] font-semibold text-slate-400">+{equipment.length - 8} equipos productores adicionales</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tab: Specs (Especificaciones Energía) ────────────────────────────────────

function SpecsTab({ node }: { node: EnergyAssetTreeNode }) {
  const equipmentType = (node.properties?.equipment_type as string) ||
    (node.properties?.equipmentType as string) || 'consumer'
  const schema = getEquipmentSpecSchema(equipmentType)
  const storedSpecs = (node.properties?.specs || {}) as Record<string, string>

  const [specs, setSpecs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    schema.forEach((group) => group.fields.forEach((f) => {
      initial[f.key] = storedSpecs[f.key] !== undefined ? String(storedSpecs[f.key]) : ''
    }))
    return initial
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Reset when node changes
  useEffect(() => {
    const initial: Record<string, string> = {}
    schema.forEach((group) => group.fields.forEach((f) => {
      initial[f.key] = storedSpecs[f.key] !== undefined ? String(storedSpecs[f.key]) : ''
    }))
    setSpecs(initial)
    setSaved(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.sourceId])

  async function handleSave() {
    setSaving(true)
    const cleaned: Record<string, unknown> = {}
    Object.entries(specs).forEach(([k, v]) => { if (v !== '') cleaned[k] = v })

    const table =
      node.type === 'equipment' ? 'energy_equipment' :
      node.type === 'system'    ? 'utility_systems' :
      node.type === 'area'      ? 'energy_areas' : null

    if (table) {
      const currentProps = (node.properties || {}) as Record<string, unknown>
      await supabase.from(table).update({
        properties: { ...currentProps, specs: cleaned },
      }).eq('id', node.sourceId)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (schema.length === 0) {
    return (
      <div className="rounded-[--radius-lg] border border-dashed border-[--color-border-strong] bg-gray-50 p-6 text-center">
        <Zap size={24} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">No hay especificaciones energéticas definidas para este tipo de activo.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Tipo: <span className="font-semibold text-gray-600">{equipmentType}</span>
        </p>
        <Button
          size="sm"
          variant={saved ? 'success' : 'primary'}
          leftIcon={<Save size={13} />}
          loading={saving}
          onClick={handleSave}
        >
          {saved ? 'Guardado ✓' : 'Guardar specs'}
        </Button>
      </div>

      {schema.map((group) => (
        <section key={group.label}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
            {group.label}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {group.fields.map((field) => (
              <SpecFieldInput
                key={field.key}
                field={field}
                value={specs[field.key] ?? ''}
                onChange={(v) => setSpecs((prev) => ({ ...prev, [field.key]: v }))}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function SpecFieldInput({
  field, value, onChange,
}: { field: SpecField; value: string; onChange: (v: string) => void }) {
  const label = field.unit ? `${field.label} (${field.unit})` : field.label
  return (
    <FormField label={label} hint={field.hint}>
      {field.type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={selectClass}
        >
          <option value="">— Seleccionar —</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          type={field.type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={inputClass}
          step={field.type === 'number' ? 'any' : undefined}
        />
      )}
    </FormField>
  )
}

// ── Tab: Meters ───────────────────────────────────────────────────────────────

function MetersTab({
  points, node, onCreate,
}: {
  points: LinkedMeasurementPoint[]
  node: EnergyAssetTreeNode
  onCreate: (kind: EnergyAssetCreateKind, parent: EnergyAssetTreeNode) => void
}) {
  const canAddMeter = getAllowedCreateKinds(node.type).includes('meter')
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Puntos de medición</h3>
        {canAddMeter && (
          <Button size="sm" variant="secondary" leftIcon={<Plus size={13} />} onClick={() => onCreate('meter', node)}>
            Medidor
          </Button>
        )}
      </div>
      {points.length === 0 ? (
        <div className="rounded-[--radius-lg] border border-dashed border-[--color-border-strong] bg-gray-50 p-5 text-sm text-gray-500">
          Este activo no tiene medidores vinculados.
        </div>
      ) : (
        <div className="space-y-2">
          {points.map((pt) => (
            <div key={pt.id} className="rounded-[--radius-lg] border border-[--color-border-strong] bg-white p-3 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-bold text-brand">{pt.tag}</p>
                  <p className="text-sm text-gray-700">{pt.name}</p>
                </div>
                <Badge variant={pt.measurement_type === 'accumulator' ? 'brand' : 'info'}>
                  {pt.measurement_type}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-400">
                <span>{getUtilityLabel(pt.utility)}</span>
                <span>·</span>
                <span>{pt.quantity} · {pt.unit}</span>
                <span>·</span>
                <span>{pt.source_type}</span>
              </div>
              {(pt.last_calibration_date || pt.calibration_due_date) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {pt.last_calibration_date && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                      <CalendarClock size={10} /> Últ. {pt.last_calibration_date}
                    </span>
                  )}
                  {pt.calibration_due_date && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] text-purple-700">
                      <CalendarClock size={10} /> Próx. {pt.calibration_due_date}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab: Map ──────────────────────────────────────────────────────────────────

function MapTab({ nodes }: { nodes: LinkedMapNode[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">En el mapa Energy & Utilities</h3>
      {nodes.length === 0 ? (
        <div className="rounded-[--radius-lg] border border-dashed border-[--color-border-strong] bg-gray-50 p-5 text-sm text-gray-500">
          Este activo no está colocado en ningún diagrama Energy aún.
          <p className="mt-1 text-xs text-gray-400">Ve al módulo Mapa y arrastra este equipo al canvas desde la paleta.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {nodes.map((item) => (
            <div key={item.id} className="rounded-[--radius-lg] border border-[--color-border-strong] bg-white p-3 shadow-card flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-400">
                  <span className="font-mono">{item.tag}</span>
                  <span>·</span>
                  <span>{item.node_type}</span>
                  {item.utility && <><span>·</span><span>{getUtilityLabel(item.utility)}</span></>}
                </div>
              </div>
              <span className="shrink-0 text-[10px] font-semibold text-brand bg-brand/10 px-2 py-1 rounded-lg">
                En mapa
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab: CMMS ─────────────────────────────────────────────────────────────────

function CmmsTab({ node }: { node: EnergyAssetTreeNode }) {
  const syncStatus = String(node.properties?.sync_status || node.properties?.syncStatus || 'local')
  const cmmsId = node.properties?.cmms_asset_id as string | undefined

  const checks: { label: string; ok: boolean }[] = [
    { label: 'Nombre definido',         ok: Boolean(node.name) },
    { label: 'Código/TAG asignado',     ok: Boolean(node.code) },
    { label: 'Tipo de equipo definido', ok: node.type !== 'plant' },
    { label: 'Utility asignado',        ok: Boolean(node.utility) },
    { label: 'Con medidores',           ok: node.measurementPointCount > 0 },
    { label: 'Con specs técnicas',      ok: Object.keys((node.properties?.specs || {}) as object).length > 0 },
    { label: 'Vinculado a CMMS',        ok: Boolean(cmmsId) },
  ]

  const score = checks.filter((c) => c.ok).length
  const total = checks.length

  return (
    <div className="space-y-4">
      {/* Score */}
      <div className="rounded-[--radius-lg] border border-[--color-border-strong] bg-white p-4 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-gray-900">Preparación para VersaMaint</p>
            <p className="text-xs text-gray-400 mt-0.5">Estado de sync: <span className="font-mono">{syncStatus}</span></p>
          </div>
          <span
            className="text-2xl font-black"
            style={{ fontFamily: 'var(--font-display)', color: score === total ? 'var(--color-ok)' : score >= 4 ? 'var(--color-warn)' : 'var(--color-danger)' }}
          >
            {score}/{total}
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(score / total) * 100}%`,
              backgroundColor: score === total ? 'var(--color-ok)' : score >= 4 ? 'var(--color-warn)' : 'var(--color-danger)',
            }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-1.5">
        {checks.map((check) => (
          <div
            key={check.label}
            className={[
              'flex items-center gap-2 rounded-xl px-3 py-2 border text-xs',
              check.ok
                ? 'bg-[--color-ok-bg] border-[--color-ok-border] text-[--color-ok]'
                : 'bg-gray-50 border-[--color-border-strong] text-gray-500',
            ].join(' ')}
          >
            <BadgeCheck size={14} className={check.ok ? 'text-[--color-ok]' : 'text-gray-300'} />
            <span className="font-medium">{check.label}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        {cmmsId ? (
          <Button
            size="sm"
            variant="secondary"
            rightIcon={<ExternalLink size={12} />}
            onClick={() => window.open(`/maint/assets/${cmmsId}`, '_blank')}
          >
            Ver en VersaMaint
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled>
            Importar desde VersaMaint
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getEquipmentType(node: EnergyAssetTreeNode) {
  return String(node.properties?.equipment_type || node.properties?.equipmentType || '').toLowerCase()
}

function getEquipmentTypeLabel(node: EnergyAssetTreeNode) {
  const equipmentType = getEquipmentType(node)
  return EQUIPMENT_TYPE_OPTIONS.find(([value]) => value === equipmentType)?.[1] || 'Equipo productor'
}

function isProducerEquipment(node: EnergyAssetTreeNode) {
  if (node.type !== 'equipment') return false

  const assetRole = String(node.properties?.asset_role || '')
  if (assetRole === 'producer' || assetRole === 'utility_producer') return true
  if (assetRole === 'measurement_device' || assetRole === 'measurement_subsystem') return false

  const equipmentType = getEquipmentType(node)
  if (PRODUCER_EQUIPMENT_TYPES.has(equipmentType)) return true

  return /\b(caldera|boiler|compresor|compressor|chiller|generador|generator|torre|cooling tower|solar|fotovoltaic)/i.test(node.name)
}

function getEnergyRoleLabel(node: EnergyAssetTreeNode) {
  if (node.type === 'plant') return 'Planta con fuentes externas configurables'
  if (node.type === 'area') return 'Área operacional'
  if (node.type === 'system') return 'Sistema de distribución o uso'

  const assetRole = String(node.properties?.asset_role || '')
  if (assetRole === 'measurement_device' || assetRole === 'measurement_subsystem') return 'Equipo medidor'
  if (isProducerEquipment(node)) {
    return `Equipo productor${node.utility ? ` de ${getUtilityLabel(node.utility)}` : ''}`
  }
  return 'Equipo consumidor o mantenible'
}

function InfoTile({ label, value, icon }: { label: string; value: string | number; icon?: ReactNode }) {
  return (
    <div className="bg-white border border-slate-200/60 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-slate-400">{icon}</span>}
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-xs font-bold text-slate-900 tracking-tight truncate">{value || '—'}</p>
    </div>
  )
}

// ── Asset create modal ────────────────────────────────────────────────────────

function AssetNodeFormModal({
  kind, parent, form, setForm, error, saving, onSave, onClose,
}: {
  kind: EnergyAssetCreateKind | null
  parent: EnergyAssetTreeNode | null
  form: AssetFormState
  setForm: (next: AssetFormState) => void
  error: string | null
  saving: boolean
  onSave: () => void
  onClose: () => void
}) {
  const open = Boolean(kind && parent)
  const allowedQuantities = getAllowedQuantities(form.utility)
  const canSave = form.name.trim().length > 0 && form.code.trim().length > 0

  function set(partial: Partial<AssetFormState>) { setForm({ ...form, ...partial }) }

  function changeUtility(utility: string) {
    const quantities = getAllowedQuantities(utility)
    const quantity = quantities.includes(form.quantity) ? form.quantity : quantities[0] || 'energy'
    set({ utility, quantity: quantity as MeasurementQuantity, unit: getDefaultUnit(utility, quantity as MeasurementQuantity) })
  }

  function changeQuantity(quantity: MeasurementQuantity) {
    set({ quantity, unit: getDefaultUnit(form.utility, quantity) })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-900 text-white shadow-md shadow-slate-900/10">
            <Factory size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-slate-900">
              {kind ? `Nuevo ${KIND_LABELS[kind]}` : 'Nuevo activo'}
            </h3>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              {parent ? `Padre: ${parent.code ? `${parent.code} · ` : ''}${parent.name}` : 'Ficha técnica del árbol de activos'}
            </p>
          </div>
        </div>
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} rightIcon={<X size={13} />} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={onSave} loading={saving} disabled={!canSave} rightIcon={<Save size={13} />}>
            Crear
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        {/* Section 1: Identidad y jerarquía */}
        <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="mb-3.5 flex items-center gap-2">
            <Factory size={13} className="text-brand-blue" />
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Identidad y jerarquía</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Nombre" required>
              <input value={form.name} onChange={(e) => set({ name: e.target.value })} className={inputClass} placeholder="Ej. Compresor C-02" autoFocus />
            </FormField>
            <FormField label={kind === 'meter' ? 'TAG del medidor' : 'Código / TAG'} required>
              <input value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} className={`${inputClass} font-mono`} placeholder={kind === 'meter' ? 'Ej. FQI-501' : 'Ej. PROD-AIR'} />
            </FormField>
            <FormField label="Descripción" className="sm:col-span-2">
              <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} className={inputClass} rows={2} placeholder="Descripción corta para ficha técnica" />
            </FormField>
          </div>
        </section>

        {/* Section 2: Clasificación operacional */}
        {kind !== 'area' && (
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3.5 flex items-center gap-2">
              <Gauge size={13} className="text-brand-blue" />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Clasificación operacional</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Utility">
                <select value={form.utility} onChange={(e) => changeUtility(e.target.value)} className={selectClass}>
                  {utilityOptions.filter((u) => u.value !== '').map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </FormField>
              {kind === 'equipment' && (
                <FormField label="Tipo de equipo">
                  <select value={form.equipmentType} onChange={(e) => set({ equipmentType: e.target.value })} className={selectClass}>
                    {EQUIPMENT_TYPE_OPTIONS.map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </FormField>
              )}
            </div>
          </section>
        )}

        {/* Section 3: Perfil del medidor */}
        {kind === 'meter' && (
          <section className="rounded-xl border border-purple-200 bg-purple-50/30 p-4">
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap size={13} className="text-purple-600" />
                <div>
                  <p className="text-xs font-bold text-purple-900">Perfil del medidor</p>
                  <p className="text-[10px] text-purple-600 mt-0.5">Crea equipo mantenible + MeasurementPoint en una sola acción.</p>
                </div>
              </div>
              <Badge variant="brand" className="text-[9px] bg-purple-600 text-white border-none">Medición</Badge>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Tipo de medición">
                <select value={form.measurementType} onChange={(e) => set({ measurementType: e.target.value })} className={selectClass}>
                  <option value="accumulator">Acumulador</option>
                  <option value="instantaneous">Instantánea</option>
                  <option value="counter">Contador</option>
                  <option value="status">Estado</option>
                </select>
              </FormField>
              <FormField label="Magnitud">
                <select value={form.quantity} onChange={(e) => changeQuantity(e.target.value as MeasurementQuantity)} className={selectClass}>
                  {allowedQuantities.map((q) => (
                    <option key={q} value={q}>{QUANTITY_LABELS[q]}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Unidad">
                <select
                  value={form.unit}
                  onChange={(e) => set({ unit: e.target.value })}
                  className={`${selectClass} font-mono`}
                >
                  {(getAllowedUnits(form.utility, form.quantity as MeasurementQuantity).length > 0
                    ? getAllowedUnits(form.utility, form.quantity as MeasurementQuantity)
                    : getAllUnitsFromCatalog()
                  ).map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Fuente de datos">
                <select value={form.sourceMode} onChange={(e) => set({ sourceMode: e.target.value as AssetFormState['sourceMode'] })} className={selectClass}>
                  <option value="manual">Rutina manual</option>
                  <option value="csv">Import CSV</option>
                  <option value="iot">IoT futuro</option>
                </select>
              </FormField>
              <FormField label="Frecuencia">
                <select value={form.frequency} onChange={(e) => set({ frequency: e.target.value as AssetFormState['frequency'] })} className={selectClass}>
                  <option value="daily">Diaria</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                  <option value="on_demand">Bajo demanda</option>
                </select>
              </FormField>
              <FormField label="Última calibración">
                <input type="date" value={form.lastCalibrationDate} onChange={(e) => set({ lastCalibrationDate: e.target.value })} className={inputClass} />
              </FormField>
              <FormField label="Próxima calibración">
                <input type="date" value={form.calibrationDueDate} onChange={(e) => set({ calibrationDueDate: e.target.value })} className={inputClass} />
              </FormField>
            </div>
          </section>
        )}

      </div>
    </Modal>
  )
}
