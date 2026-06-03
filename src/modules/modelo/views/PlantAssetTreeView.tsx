import {
  useCallback, useEffect, useMemo, useState, type ReactNode,
} from 'react'
import {
  BadgeCheck, Building2, CalendarClock,
  ExternalLink, Factory, Gauge, Map, Network, PackageCheck,
  Plus, Save, ShieldCheck, Wrench, X, Zap,
} from 'lucide-react'
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

const TYPE_LABELS: Record<EnergyAssetNodeType, string> = {
  plant: 'Planta', area: 'Área', system: 'Sistema', equipment: 'Equipo',
}

const TYPE_ICONS = {
  plant: Factory, area: Building2, system: Network, equipment: Wrench,
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

const EQUIPMENT_TYPE_OPTIONS: [string, string][] = [
  ['boiler', 'Caldera'], ['pump', 'Bomba'], ['compressor', 'Compresor'],
  ['chiller', 'Chiller'], ['cooling_tower', 'Torre enfriamiento'],
  ['tank', 'Tanque'], ['transformer', 'Transformador'], ['panel', 'Tablero'],
  ['generator', 'Generador'], ['heat_exchanger', 'Intercambiador'],
  ['motor', 'Motor'], ['consumer', 'Consumidor'], ['custom_equipment', 'Otro equipo'],
]

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
    if (!selectedNodeId && result.root) setSelectedNodeId(result.root.id)
    setLoading(false)
  }, [siteId, utilityType, selectedNodeId])

  useEffect(() => { refresh() }, [refresh])

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
    <div className="space-y-4">
      {/* Summary strip */}
      <SummaryStrip tree={tree} />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* ── Left panel — Tree ─────────────────────────────────────────── */}
        <Card padding="none" className="overflow-hidden flex flex-col h-[600px]">
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

// ── Summary strip ─────────────────────────────────────────────────────────────

function SummaryStrip({ tree }: { tree: EnergyAssetTreeResult }) {
  const items = [
    { label: 'Plantas',         value: tree.summary.plants,           icon: Factory },
    { label: 'Áreas',           value: tree.summary.areas,            icon: Building2 },
    { label: 'Sistemas',        value: tree.summary.systems,          icon: Network },
    { label: 'Equipos',         value: tree.summary.equipment,        icon: Wrench },
    { label: 'Medidores',       value: tree.summary.measurementPoints,icon: Gauge },
    { label: 'CMMS listos',     value: tree.summary.cmmsReadyEquipment, icon: PackageCheck },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className="rounded-[--radius-lg] border border-[--color-border-strong] bg-white px-3 py-3 shadow-card">
          <div className="flex items-center gap-2">
            <Icon size={14} className="text-brand" />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
          <p className="mt-1 text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
            {value}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── Node detail ───────────────────────────────────────────────────────────────

function NodeDetail({
  node, onCreate,
}: {
  node: EnergyAssetTreeNode
  onCreate: (kind: EnergyAssetCreateKind, parent: EnergyAssetTreeNode) => void
}) {
  const Icon = TYPE_ICONS[node.type]
  const allowedKinds = getAllowedCreateKinds(node.type)
  const [activeTab, setActiveTab] = useState<DetailTab>('info')
  const [measurementPoints, setMeasurementPoints] = useState<LinkedMeasurementPoint[]>([])
  const [mapNodes, setMapNodes] = useState<LinkedMapNode[]>([])

  useEffect(() => {
    let cancelled = false
    async function loadDetails() {
      const [{ data: points }, { data: diagramNodes }] = await Promise.all([
        supabase
          .from('measurement_points')
          .select('id,tag,name,target_type,target_id,utility,measurement_type,quantity,unit,source_type,source_config,last_calibration_date,calibration_due_date,meter_equipment_id')
          .or(`target_id.eq.${node.sourceId},meter_equipment_id.eq.${node.sourceId}`)
          .order('tag'),
        supabase
          .from('energy_diagram_nodes')
          .select('id,diagram_id,tag,label,node_type,utility,properties')
          .limit(500),
      ])
      if (cancelled) return
      setMeasurementPoints((points || []) as LinkedMeasurementPoint[])
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

  const tabs: Array<{ id: DetailTab; label: string; icon: ReactNode }> = [
    { id: 'info',  label: 'Información',          icon: <Wrench size={13} /> },
    { id: 'specs', label: 'Especificaciones',      icon: <Zap size={13} /> },
    { id: 'meters',label: 'Medidores',             icon: <Gauge size={13} /> },
    { id: 'map',   label: 'Mapa Energy',           icon: <Map size={13} /> },
    { id: 'cmms',  label: 'CMMS',                  icon: <ShieldCheck size={13} /> },
  ]

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Header */}
      <div className="border-b border-[--color-border-strong] px-5 py-4 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={READINESS_COLOR[node.cmmsReadiness]}>
                {READINESS_LABEL[node.cmmsReadiness]}
              </Badge>
              <Badge variant="brand">{TYPE_LABELS[node.type]}</Badge>
              {node.utility && (
                <Badge variant="neutral">{getUtilityLabel(node.utility)}</Badge>
              )}
            </div>
            <h2
              className="mt-2 text-lg font-bold text-gray-900 truncate"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {node.name}
            </h2>
            <p className="mt-0.5 text-sm text-gray-400 font-mono">{node.code || 'Sin código/TAG'}</p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-white">
            <Icon size={20} />
          </div>
        </div>

        {allowedKinds.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {allowedKinds.map((kind) => (
              <Button
                key={kind}
                size="sm"
                variant={kind === 'meter' ? 'secondary' : 'primary'}
                leftIcon={<Plus size={13} />}
                onClick={() => onCreate(kind, node)}
              >
                {KIND_LABELS[kind]}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-[--color-border-strong] bg-gray-50/60 px-4">
        <nav className="flex gap-0.5 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer',
                activeTab === tab.id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
              ].join(' ')}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="min-h-[400px] p-5 overflow-auto">
        {activeTab === 'info' && <InfoTab node={node} />}
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

// ── Tab: Info ─────────────────────────────────────────────────────────────────

function InfoTab({ node }: { node: EnergyAssetTreeNode }) {
  const specs = (node.properties?.specs || {}) as Record<string, unknown>
  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Ficha general</h3>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <InfoTile label="Tipo" value={TYPE_LABELS[node.type]} />
          <InfoTile label="Utility" value={node.utility ? getUtilityLabel(node.utility) : 'Multi-utility'} />
          <InfoTile label="Estado" value={node.status || 'Activo'} />
          <InfoTile label="Medidores" value={node.measurementPointCount} />
        </div>
      </section>
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

function InfoTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[--radius-md] border border-[--color-border-strong] bg-gray-50/60 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-800 truncate">{value || '—'}</p>
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
      title={kind ? `Nuevo ${KIND_LABELS[kind]}` : undefined}
      description={parent ? `Padre: ${parent.code ? `${parent.code} · ` : ''}${parent.name}` : undefined}
      size="lg"
      className="max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-[--radius-md] border border-[--color-danger-border] bg-[--color-danger-bg] px-3 py-2 text-sm text-[--color-danger]">
            {error}
          </div>
        )}

        <section className="rounded-[--radius-lg] border border-[--color-border-strong] bg-gray-50/60 p-4">
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

        {kind !== 'area' && (
          <section className="rounded-[--radius-lg] border border-[--color-border-strong] bg-white p-4">
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

        {kind === 'meter' && (
          <section className="rounded-[--radius-lg] border border-purple-100 bg-purple-50/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-purple-900">Perfil del medidor</p>
                <p className="text-xs text-purple-700 mt-0.5">Crea equipo mantenible + MeasurementPoint en una sola acción.</p>
              </div>
              <Badge variant="brand">Medición</Badge>
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
                <input value={form.unit} onChange={(e) => set({ unit: e.target.value })} className={`${inputClass} font-mono`} />
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

        <div className="flex justify-end gap-2 border-t border-[--color-border-strong] pt-4">
          <Button variant="secondary" onClick={onClose} rightIcon={<X size={14} />} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={onSave} loading={saving} disabled={!canSave} rightIcon={<Save size={14} />}>
            Crear
          </Button>
        </div>
      </div>
    </Modal>
  )
}
