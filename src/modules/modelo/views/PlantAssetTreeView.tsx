import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  ChevronRight,
  FileText,
  Factory,
  Gauge,
  GitBranch,
  Map,
  Network,
  Paperclip,
  PackageCheck,
  Plus,
  Save,
  ShieldCheck,
  Tags,
  Wrench,
  X,
} from 'lucide-react'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { Card } from '@/shared/Card'
import { EmptyState } from '@/shared/EmptyState'
import { Modal } from '@/shared/Modal'
import { getUtilityLabel } from '@/shared/OperationalContext'
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

interface Props {
  siteId: string
  utilityType: string | null
}

const typeLabels: Record<EnergyAssetNodeType, string> = {
  plant: 'Planta',
  area: 'Area',
  system: 'Sistema',
  equipment: 'Equipo',
}

const typeIcons = {
  plant: Factory,
  area: Building2,
  system: Network,
  equipment: Wrench,
}

const readinessColor: Record<CmmsReadiness, 'green' | 'orange' | 'red'> = {
  ready: 'green',
  partial: 'orange',
  missing: 'red',
}

const readinessLabel: Record<CmmsReadiness, string> = {
  ready: 'CMMS listo',
  partial: 'CMMS parcial',
  missing: 'Falta base',
}

const kindLabels: Record<EnergyAssetCreateKind, string> = {
  area: 'Área',
  system: 'Sistema',
  equipment: 'Equipo',
  meter: 'Medidor',
}

const utilityOptions = [
  'electricity',
  'natural_gas',
  'steam',
  'compressed_air',
  'chilled_water',
  'hot_water',
  'industrial_water',
  'diesel',
  'lpg',
]

const equipmentTypes = [
  ['boiler', 'Caldera'],
  ['pump', 'Bomba'],
  ['compressor', 'Compresor'],
  ['chiller', 'Chiller'],
  ['cooling_tower', 'Torre enfriamiento'],
  ['tank', 'Tanque'],
  ['transformer', 'Transformador'],
  ['panel', 'Tablero'],
  ['generator', 'Generador'],
  ['heat_exchanger', 'Intercambiador'],
  ['motor', 'Motor'],
  ['consumer', 'Consumidor'],
  ['custom_equipment', 'Otro equipo'],
]

interface AssetFormState {
  name: string
  code: string
  description: string
  utility: string
  equipmentType: string
  measurementType: string
  quantity: MeasurementQuantity
  unit: string
  sourceMode: 'manual' | 'csv' | 'iot'
  frequency: 'daily' | 'weekly' | 'monthly' | 'on_demand'
  lastCalibrationDate: string
  calibrationDueDate: string
}

type DetailTab = 'info' | 'attachments' | 'taxonomy' | 'meters' | 'map' | 'cmms'

interface LinkedMeasurementPoint {
  id: string
  tag: string
  name: string
  target_type: string
  target_id: string
  utility: string
  measurement_type: string
  quantity: string
  unit: string
  source_type: string
  source_config: Record<string, unknown> | null
  last_calibration_date: string | null
  calibration_due_date: string | null
  meter_equipment_id: string | null
}

interface LinkedMapNode {
  id: string
  diagram_id: string
  tag: string
  label: string
  node_type: string
  utility: string | null
  properties: Record<string, unknown> | null
}

export function PlantAssetTreeView({ siteId, utilityType }: Props) {
  const [tree, setTree] = useState<EnergyAssetTreeResult | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [formKind, setFormKind] = useState<EnergyAssetCreateKind | null>(null)
  const [formParent, setFormParent] = useState<EnergyAssetTreeNode | null>(null)
  const [form, setForm] = useState<AssetFormState>(() => createDefaultForm(utilityType))
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const result = await loadEnergyAssetTree(siteId, utilityType)
    setTree(result)
    setSelectedNodeId((current) => current || result.root?.id || null)
    setLoading(false)
  }, [siteId, utilityType])

  useEffect(() => { refresh() }, [refresh])

  const selectedNode = useMemo(
    () => tree?.flatNodes.find((node) => node.id === selectedNodeId) ?? tree?.root ?? null,
    [selectedNodeId, tree],
  )

  function openCreate(kind: EnergyAssetCreateKind, parent: EnergyAssetTreeNode) {
    setFormKind(kind)
    setFormParent(parent)
    setForm(createDefaultForm(parent.utility || utilityType))
    setFormError(null)
  }

  async function handleCreate() {
    if (!formKind || !formParent) return
    setSaving(true)
    setFormError(null)
    try {
      await createEnergyAssetFromTree({
        siteId,
        parentType: formParent.type,
        parentSourceId: formParent.sourceId,
        kind: formKind,
        name: form.name,
        code: form.code,
        description: form.description || null,
        utility: form.utility,
        equipmentType: form.equipmentType,
        measurement: formKind === 'meter' ? {
          measurementType: form.measurementType,
          quantity: form.quantity,
          unit: form.unit,
          sourceMode: form.sourceMode,
          frequency: form.frequency,
          lastCalibrationDate: form.lastCalibrationDate || null,
          calibrationDueDate: form.calibrationDueDate || null,
        } : undefined,
      })
      setFormKind(null)
      setFormParent(null)
      await refresh()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo crear el activo.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
        <div className="h-[520px] rounded-(--radius-card) border border-border bg-surface shadow-card animate-pulse" />
        <div className="h-[520px] rounded-(--radius-card) border border-border bg-surface shadow-card animate-pulse" />
      </div>
    )
  }

  if (!tree?.root) {
    return (
      <EmptyState
        icon={<Factory size={48} strokeWidth={1.5} />}
        title="Sin planta"
        description="Crea o selecciona un sitio para construir el arbol de activos energetico."
      />
    )
  }

  return (
    <div className="space-y-4">
      <SummaryStrip tree={tree} />

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
        <Card padding="none" className="overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-800">Arbol de planta</h2>
            <p className="text-xs text-gray-500">
              Base compartible con CMMS: planta, area, sistema y equipo.
            </p>
          </div>
          <div className="max-h-[560px] overflow-auto p-2">
            <TreeNodeButton
              node={tree.root}
              depth={0}
              selectedNodeId={selectedNode?.id ?? null}
              onSelect={setSelectedNodeId}
              onCreate={openCreate}
            />
          </div>
        </Card>

        {selectedNode && <NodeDetail node={selectedNode} onCreate={openCreate} />}
      </div>

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
    </div>
  )
}

function SummaryStrip({ tree }: { tree: EnergyAssetTreeResult }) {
  const items = [
    { label: 'Plantas', value: tree.summary.plants, icon: Factory },
    { label: 'Areas', value: tree.summary.areas, icon: Building2 },
    { label: 'Sistemas', value: tree.summary.systems, icon: Network },
    { label: 'Equipos', value: tree.summary.equipment, icon: Wrench },
    { label: 'Medidores', value: tree.summary.measurementPoints, icon: Gauge },
    { label: 'Equipos CMMS listos', value: tree.summary.cmmsReadyEquipment, icon: PackageCheck },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border bg-surface px-3 py-3 shadow-card">
          <div className="flex items-center gap-2">
            <item.icon size={14} className="text-brand-blue" />
            <span className="text-xs text-gray-500">{item.label}</span>
          </div>
          <p className="mt-1 text-xl font-semibold text-gray-800">{item.value}</p>
        </div>
      ))}
    </div>
  )
}

function TreeNodeButton({
  node,
  depth,
  selectedNodeId,
  onSelect,
  onCreate,
}: {
  node: EnergyAssetTreeNode
  depth: number
  selectedNodeId: string | null
  onSelect: (id: string) => void
  onCreate: (kind: EnergyAssetCreateKind, parent: EnergyAssetTreeNode) => void
}) {
  const Icon = typeIcons[node.type]
  const selected = selectedNodeId === node.id
  const firstAllowedKind = getAllowedCreateKinds(node.type)[0]

  return (
    <div>
      <button
        onClick={() => onSelect(node.id)}
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors cursor-pointer ${
          selected ? 'bg-brand-blue/8 text-brand-blue' : 'text-gray-700 hover:bg-gray-50'
        }`}
        style={{ paddingLeft: `${8 + depth * 18}px` }}
      >
        {node.children.length > 0 ? (
          <ChevronRight size={13} className="shrink-0 text-gray-400" />
        ) : (
          <span className="w-[13px] shrink-0" />
        )}
        <Icon size={15} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{node.code ? `${node.code} · ${node.name}` : node.name}</span>
        {node.isMeasurementAsset && (
          <span className="rounded-full bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
            met
          </span>
        )}
        {node.measurementPointCount > 0 && (
          <span className="rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-teal">
            {node.measurementPointCount}
          </span>
        )}
        {selected && firstAllowedKind && (
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation()
              onCreate(firstAllowedKind, node)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                event.stopPropagation()
                onCreate(firstAllowedKind, node)
              }
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-gray-400 shadow-sm ring-1 ring-border hover:text-brand-blue"
            title={`Agregar ${kindLabels[firstAllowedKind]}`}
          >
            <Plus size={12} />
          </span>
        )}
      </button>
      {node.children.map((child) => (
        <TreeNodeButton
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedNodeId={selectedNodeId}
          onSelect={onSelect}
          onCreate={onCreate}
        />
      ))}
    </div>
  )
}

function NodeDetail({
  node,
  onCreate,
}: {
  node: EnergyAssetTreeNode
  onCreate: (kind: EnergyAssetCreateKind, parent: EnergyAssetTreeNode) => void
}) {
  const Icon = typeIcons[node.type]
  const allowedKinds = getAllowedCreateKinds(node.type)
  const [activeTab, setActiveTab] = useState<DetailTab>('info')
  const [measurementPoints, setMeasurementPoints] = useState<LinkedMeasurementPoint[]>([])
  const [mapNodes, setMapNodes] = useState<LinkedMapNode[]>([])
  const specs = (node.properties?.specs || node.properties || {}) as Record<string, unknown>
  const syncStatus = String(node.properties?.sync_status || node.properties?.syncStatus || 'local')

  useEffect(() => {
    let cancelled = false

    async function loadDetails() {
      const [{ data: points }, { data: diagramNodes }] = await Promise.all([
        supabase
          .from('measurement_points')
          .select('id, tag, name, target_type, target_id, utility, measurement_type, quantity, unit, source_type, source_config, last_calibration_date, calibration_due_date, meter_equipment_id')
          .or(`target_id.eq.${node.sourceId},meter_equipment_id.eq.${node.sourceId}`)
          .order('tag'),
        supabase
          .from('energy_diagram_nodes')
          .select('id, diagram_id, tag, label, node_type, utility, properties')
          .limit(500),
      ])

      if (cancelled) return

      setMeasurementPoints((points || []) as LinkedMeasurementPoint[])
      setMapNodes(((diagramNodes || []) as LinkedMapNode[]).filter((item) => {
        const binding = (item.properties?.asset_binding || {}) as Record<string, unknown>
        const measurementBinding = (item.properties?.measurement_binding || {}) as Record<string, unknown>
        return binding.entity_id === node.sourceId || measurementBinding.meter_equipment_id === node.sourceId
      }))
    }

    loadDetails()
    return () => {
      cancelled = true
    }
  }, [node.sourceId])

  const tabs: Array<{ id: DetailTab; label: string; icon: ReactNode }> = [
    { id: 'info', label: 'Informacion', icon: <FileText size={13} /> },
    { id: 'attachments', label: 'Adjuntos', icon: <Paperclip size={13} /> },
    { id: 'taxonomy', label: 'Taxonomia', icon: <Tags size={13} /> },
    { id: 'meters', label: 'Medidores', icon: <Gauge size={13} /> },
    { id: 'map', label: 'Mapa Energy', icon: <Map size={13} /> },
    { id: 'cmms', label: 'CMMS', icon: <ShieldCheck size={13} /> },
  ]

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="border-b border-border px-5 py-4 bg-surface">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="blue" size="sm">{typeLabels[node.type]}</Badge>
              <Badge color={readinessColor[node.cmmsReadiness]} size="sm">
                {readinessLabel[node.cmmsReadiness]}
              </Badge>
              {node.utility && <Badge color="teal" size="sm">{getUtilityLabel(node.utility)}</Badge>}
            </div>
            <h2 className="mt-2 text-lg font-semibold text-gray-900">{node.name}</h2>
            <p className="mt-1 text-sm text-gray-500">{node.code || 'Sin codigo/TAG'}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-blue text-white">
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
                {kindLabels[kind]}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="border-b border-border bg-gray-50/60 px-4">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-[420px] p-5">
        {activeTab === 'info' && (
          <div className="space-y-5">
            <section>
              <h3 className="text-xs font-semibold uppercase text-gray-500">Ficha tecnica</h3>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <InfoTile label="Tipo" value={typeLabels[node.type]} />
                <InfoTile label="Utility" value={node.utility ? getUtilityLabel(node.utility) : 'Multi-utility'} />
                <InfoTile label="Estado" value={node.status} />
                <InfoTile label="Rol" value={node.isMeasurementAsset ? 'Medicion mantenible' : 'Activo operativo'} />
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase text-gray-500">Especificaciones</h3>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(specs).filter(([key]) => !['asset_binding', 'measurement_binding'].includes(key)).slice(0, 10).map(([key, value]) => (
                  <InfoTile key={key} label={humanizeKey(key)} value={formatSpecValue(value)} />
                ))}
                {Object.keys(specs).length === 0 && (
                  <div className="rounded-lg border border-dashed border-border bg-gray-50 p-4 text-sm text-gray-500">
                    Sin especificaciones capturadas.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'attachments' && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-gray-500">Adjuntos del activo</h3>
            <div className="rounded-lg border border-dashed border-border bg-gray-50 p-5">
              <div className="flex items-center gap-3">
                <Paperclip size={18} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Preparado para manuales, fotos y certificados.</p>
                  <p className="text-xs text-gray-500">Los certificados de calibracion de medidores quedan asociados al MeasurementPoint y al equipo medidor.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'taxonomy' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase text-gray-500">Taxonomia tecnica compatible</h3>
            <div className="rounded-lg border border-border bg-gray-50/60 p-4 text-sm text-gray-600">
              <p>
                Energy conserva la jerarquia hasta equipo. Componentes, familias
                tecnicas, modos de falla y repuestos viven en VersaMaint.
              </p>
              <div className="mt-3 rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center gap-2 text-gray-700">
                  <GitBranch size={14} className="text-brand-blue" />
                  <span className="font-medium">Ruta compartida</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">Planta {'->'} Area {'->'} Sistema {'->'} Equipo</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'meters' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase text-gray-500">Puntos de medicion</h3>
              {getAllowedCreateKinds(node.type).includes('meter') && (
                <Button size="sm" variant="secondary" leftIcon={<Plus size={13} />} onClick={() => onCreate('meter', node)}>
                  Medidor
                </Button>
              )}
            </div>
            {measurementPoints.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-gray-50 p-5 text-sm text-gray-500">
                Este nodo no tiene medidores vinculados.
              </div>
            ) : (
              <div className="space-y-2">
                {measurementPoints.map((point) => (
                  <div key={point.id} className="rounded-lg border border-border bg-surface p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-semibold text-brand-blue">{point.tag}</p>
                        <p className="text-sm text-gray-700">{point.name}</p>
                      </div>
                      <Badge color={point.measurement_type === 'accumulator' ? 'blue' : 'purple'} size="sm">
                        {point.measurement_type}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500 md:grid-cols-4">
                      <span>{getUtilityLabel(point.utility)}</span>
                      <span>{point.quantity} · {point.unit}</span>
                      <span>{point.source_type}</span>
                      <span>{point.target_type}</span>
                    </div>
                    {(point.last_calibration_date || point.calibration_due_date) && (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {point.last_calibration_date && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                            <CalendarClock size={11} /> Ultima {point.last_calibration_date}
                          </span>
                        )}
                        {point.calibration_due_date && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-purple-700">
                            <CalendarClock size={11} /> Proxima {point.calibration_due_date}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'map' && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-gray-500">Representacion en mapa</h3>
            {mapNodes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-gray-50 p-5 text-sm text-gray-500">
                Este activo todavia no esta colocado en ningun diagrama Energy & Utilities.
              </div>
            ) : (
              <div className="space-y-2">
                {mapNodes.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border bg-surface p-3">
                    <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                      <span className="font-mono">{item.tag}</span>
                      <span>{item.node_type}</span>
                      {item.utility && <span>{getUtilityLabel(item.utility)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'cmms' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase text-gray-500">Readiness VersaMaint</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <InfoTile label="Estado sync" value={syncStatus} />
              <InfoTile label="Preparacion" value={readinessLabel[node.cmmsReadiness]} />
              <InfoTile label="Medidores" value={node.measurementPointCount} />
            </div>
            <div className="rounded-lg border border-border bg-gray-50/60 p-3">
              <div className="flex items-center gap-2">
                <BadgeCheck size={15} className="text-brand-teal" />
                <p className="text-sm font-medium text-gray-700">Checklist de compatibilidad</p>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                {node.cmmsNotes.map((note) => (
                  <li key={note} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-blue" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

function InfoTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-800">{value}</p>
    </div>
  )
}

function humanizeKey(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatSpecValue(value: unknown): string {
  if (value == null || value === '') return 'Sin dato'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function AssetNodeFormModal({
  kind,
  parent,
  form,
  setForm,
  error,
  saving,
  onSave,
  onClose,
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

  function set(partial: Partial<AssetFormState>) {
    setForm({ ...form, ...partial })
  }

  function changeUtility(utility: string) {
    const quantities = getAllowedQuantities(utility)
    const quantity = quantities.includes(form.quantity) ? form.quantity : quantities[0] || 'energy'
    set({
      utility,
      quantity,
      unit: getDefaultUnit(utility, quantity),
    })
  }

  function changeQuantity(quantity: MeasurementQuantity) {
    set({ quantity, unit: getDefaultUnit(form.utility, quantity) })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={kind ? `Nuevo ${kindLabels[kind]}` : undefined}
      description={parent ? `Padre: ${parent.code ? `${parent.code} · ` : ''}${parent.name}` : undefined}
      size="lg"
      className="max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-lg border border-border bg-gray-50/60 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nombre" required>
              <input value={form.name} onChange={(event) => set({ name: event.target.value })} className={inputClass} placeholder="Ej. Compresor C-02" autoFocus />
            </Field>
            <Field label={kind === 'meter' ? 'TAG del medidor' : 'Codigo / TAG'} required>
              <input value={form.code} onChange={(event) => set({ code: event.target.value.toUpperCase() })} className={`${inputClass} font-mono`} placeholder={kind === 'meter' ? 'Ej. FQI-501' : 'Ej. PROD-AIR'} />
            </Field>
            <Field label="Descripcion" className="sm:col-span-2">
              <textarea value={form.description} onChange={(event) => set({ description: event.target.value })} className={inputClass} rows={2} placeholder="Descripcion corta para ficha tecnica" />
            </Field>
          </div>
        </section>

        {kind !== 'area' && (
          <section className="rounded-lg border border-border bg-white p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Utility">
                <select value={form.utility} onChange={(event) => changeUtility(event.target.value)} className={inputClass}>
                  {utilityOptions.map((utility) => (
                    <option key={utility} value={utility}>{getUtilityLabel(utility)}</option>
                  ))}
                </select>
              </Field>

              {kind === 'equipment' && (
                <Field label="Tipo de equipo">
                  <select value={form.equipmentType} onChange={(event) => set({ equipmentType: event.target.value })} className={inputClass}>
                    {equipmentTypes.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          </section>
        )}

        {kind === 'meter' && (
          <section className="rounded-lg border border-purple-100 bg-purple-50/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-purple-900">Perfil del medidor</h3>
                <p className="text-xs text-purple-700">
                  Crea equipo mantenible + MeasurementPoint en una sola accion.
                </p>
              </div>
              <Badge color="purple" size="sm">Medicion</Badge>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Tipo de medicion">
                <select value={form.measurementType} onChange={(event) => set({ measurementType: event.target.value })} className={inputClass}>
                  <option value="accumulator">Acumulador</option>
                  <option value="instantaneous">Instantanea</option>
                  <option value="counter">Contador</option>
                  <option value="status">Estado</option>
                </select>
              </Field>
              <Field label="Magnitud">
                <select value={form.quantity} onChange={(event) => changeQuantity(event.target.value as MeasurementQuantity)} className={inputClass}>
                  {allowedQuantities.map((quantity) => (
                    <option key={quantity} value={quantity}>{QUANTITY_LABELS[quantity]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Unidad">
                <input value={form.unit} onChange={(event) => set({ unit: event.target.value })} className={`${inputClass} font-mono`} />
              </Field>
              <Field label="Fuente de datos">
                <select value={form.sourceMode} onChange={(event) => set({ sourceMode: event.target.value as AssetFormState['sourceMode'] })} className={inputClass}>
                  <option value="manual">Rutina manual</option>
                  <option value="csv">Import CSV</option>
                  <option value="iot">IoT futuro</option>
                </select>
              </Field>
              <Field label="Frecuencia">
                <select value={form.frequency} onChange={(event) => set({ frequency: event.target.value as AssetFormState['frequency'] })} className={inputClass}>
                  <option value="daily">Diaria</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                  <option value="on_demand">Bajo demanda</option>
                </select>
              </Field>
              <Field label="Ultima calibracion">
                <input type="date" value={form.lastCalibrationDate} onChange={(event) => set({ lastCalibrationDate: event.target.value })} className={inputClass} />
              </Field>
              <Field label="Proxima calibracion">
                <input type="date" value={form.calibrationDueDate} onChange={(event) => set({ calibrationDueDate: event.target.value })} className={inputClass} />
              </Field>
            </div>
          </section>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
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

function createDefaultForm(utilityType?: string | null): AssetFormState {
  const utility = utilityType || 'electricity'
  const quantity = (getAllowedQuantities(utility)[0] || 'energy') as MeasurementQuantity
  return {
    name: '',
    code: '',
    description: '',
    utility,
    equipmentType: 'consumer',
    measurementType: 'accumulator',
    quantity,
    unit: getDefaultUnit(utility, quantity),
    sourceMode: 'manual',
    frequency: 'monthly',
    lastCalibrationDate: '',
    calibrationDueDate: '',
  }
}

function Field({
  label,
  required,
  className = '',
  children,
}: {
  label: string
  required?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-gray-600">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  )
}

const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20'
