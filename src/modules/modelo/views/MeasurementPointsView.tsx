import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card } from '@/shared/Card'
import { Button } from '@/shared/Button'
import { Badge } from '@/shared/Badge'
import { EmptyState } from '@/shared/EmptyState'
import { Modal } from '@/shared/Modal'
import { ConfirmDialog } from '@/shared/ConfirmDialog'
import { supabase } from '@/services/supabase'
import {
  getAllowedQuantities,
  getAllowedUnits,
  getAllUnitsFromCatalog,
  getDefaultUnit,
  isUnitCompatible,
  suggestTag,
  QUANTITY_LABELS,
  MEASUREMENT_TYPE_LABELS,
  SOURCE_TYPE_LABELS,
  SOURCE_TYPE_ICONS,
  type MeasurementQuantity,
} from '@/services/measurement-engine/unitCatalog'
import {
  Plus, Pencil, Trash2, Save, X, Gauge, ChevronRight,
  CheckCircle, AlertTriangle, Circle, Link, Zap, Layers,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MP {
  id: string
  tag: string
  name: string
  target_type: string | null
  target_id: string | null
  asset_id?: string | null
  scope_asset_id?: string | null
  physical_meter_asset_id?: string | null
  domains?: string[] | null
  utility: string
  measurement_type: string
  quantity: string
  unit: string
  source_type: string
  source_config: Record<string, unknown>
  accumulator_config: Record<string, unknown>
  is_active: boolean
}

interface TargetEntity {
  id: string
  label: string
  type: 'asset' | 'energy_group'
  subtitle: string
  utility?: string | null
  nodeRole?: string | null
  maintainableKind?: string | null
}

interface PhysicalMeter {
  id: string
  label: string
  code: string | null
  subtitle: string
}

interface Props { siteId: string; utilityType: string | null }

// ─── Wizard state ─────────────────────────────────────────────────────────────

const DUMMY_ID = '00000000-0000-0000-0000-000000000000'

interface WizardForm {
  // Step 1
  tag: string
  name: string
  utility: string
  // Step 2
  target_type: 'asset' | 'energy_group'
  target_id: string
  physical_meter_asset_id: string
  domains: string[]
  // Step 3
  measurement_type: string
  quantity: MeasurementQuantity
  unit: string
  source_type: string
  // manual
  manual_frequency: string
  // iot_db
  iot_db_table: string
  iot_db_field_value: string
  iot_db_field_ts: string
  iot_db_filter: string
  // api_pull
  api_url: string
  api_field: string
  api_interval: number
  // api_push — solo muestra token generado, sin campos extra
  // file_import
  file_format: string
  file_frequency: string
  // Accumulator fields
  acc_multiplier: number
  acc_offset: number
  acc_allow_negative: boolean
  acc_reset_detection: boolean
  acc_rollover_enabled: boolean
  acc_rollover_max: number
}

const DEFAULT_FORM: WizardForm = {
  tag: '', name: '', utility: 'electricity',
  target_type: 'asset', target_id: '', physical_meter_asset_id: '',
  domains: ['energy'],
  measurement_type: 'accumulator',
  quantity: 'energy',
  unit: 'kWh',
  source_type: 'manual',
  manual_frequency: 'monthly',
  iot_db_table: 'iot_readings', iot_db_field_value: 'value',
  iot_db_field_ts: 'recorded_at', iot_db_filter: '',
  api_url: '', api_field: 'value', api_interval: 15,
  file_format: 'csv', file_frequency: 'monthly',
  acc_multiplier: 1, acc_offset: 0,
  acc_allow_negative: false, acc_reset_detection: true,
  acc_rollover_enabled: false, acc_rollover_max: 999999,
}

const DOMAIN_OPTIONS = [
  { id: 'energy', label: 'Energy' },
  { id: 'maintenance_condition', label: 'Condición MTTO' },
  { id: 'production', label: 'Producción' },
  { id: 'quality', label: 'Calidad' },
]

const SOURCE_OPTIONS = [
  { id: 'manual', label: SOURCE_TYPE_LABELS.manual ?? 'Manual', status: 'vigente' },
  { id: 'file_import', label: SOURCE_TYPE_LABELS.file_import ?? 'File import', status: 'EN DESARROLLO' },
  { id: 'api_pull', label: SOURCE_TYPE_LABELS.api_pull ?? 'API pull', status: 'EN DESARROLLO' },
  { id: 'api_push', label: SOURCE_TYPE_LABELS.api_push ?? 'API push', status: 'EN DESARROLLO' },
  { id: 'iot_db', label: SOURCE_TYPE_LABELS.iot_db ?? 'IoT DB', status: 'EN DESARROLLO' },
  { id: 'calculated', label: SOURCE_TYPE_LABELS.calculated ?? 'Calculado', status: 'EN DESARROLLO' },
]

// ─── Utility helpers ──────────────────────────────────────────────────────────

const UTILITY_LABELS: Record<string, string> = {
  electricity: 'Electricidad', natural_gas: 'Gas natural', steam: 'Vapor',
  compressed_air: 'Aire comprimido', chilled_water: 'Agua helada',
  hot_water: 'Agua caliente', industrial_water: 'Agua industrial',
  potable_water: 'Agua potable', process_water: 'Agua proceso',
  diesel: 'Diésel', lpg: 'GLP', condensate: 'Condensado',
  refrigeration: 'Refrigeración', industrial_gas: 'Gas industrial',
  solar_generation: 'Generación solar', battery_storage: 'Batería',
}

const UTILITY_COLORS: Record<string, string> = {
  electricity: 'bg-blue-100 text-blue-700 border-blue-200',
  natural_gas: 'bg-orange-100 text-orange-700 border-orange-200',
  steam: 'bg-purple-100 text-purple-700 border-purple-200',
  compressed_air: 'bg-teal-100 text-teal-700 border-teal-200',
  chilled_water: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  hot_water: 'bg-red-100 text-red-700 border-red-200',
  industrial_water: 'bg-sky-100 text-sky-700 border-sky-200',
}

function getUtilityColor(utility: string): string {
  return UTILITY_COLORS[utility] ?? 'bg-gray-100 text-gray-600 border-gray-200'
}

function buildSourceConfig(form: WizardForm): Record<string, unknown> {
  switch (form.source_type) {
    case 'manual':
      return { kind: 'manual', frequency: form.manual_frequency }
    case 'iot_db':
      return {
        kind: 'iot_db',
        table: form.iot_db_table,
        field_value: form.iot_db_field_value,
        field_ts: form.iot_db_field_ts,
        filter: form.iot_db_filter || null,
      }
    case 'api_pull':
      return {
        kind: 'api_pull',
        url: form.api_url,
        field: form.api_field,
        interval_minutes: form.api_interval,
      }
    case 'api_push':
      return { kind: 'api_push' }
    case 'file_import':
      return { kind: 'file_import', format: form.file_format, frequency: form.file_frequency }
    case 'calculated':
    default:
      return { kind: 'calculated', formula: '', inputs: [] }
  }
}

function buildAccConfig(form: WizardForm): Record<string, unknown> {
  if (form.measurement_type !== 'accumulator') return {}
  return {
    multiplier: form.acc_multiplier,
    offset: form.acc_offset,
    allowNegativeDelta: form.acc_allow_negative,
    resetDetection: form.acc_reset_detection,
    rollover: { enabled: form.acc_rollover_enabled, maxValue: form.acc_rollover_max },
  }
}

async function upsertEnergyMeasurementSatellite(
  measurementPointId: string,
  siteId: string,
  form: WizardForm,
) {
  await supabase
    .from('energy_measurement_point_profiles')
    .upsert({
      measurement_point_id: measurementPointId,
      energy_use_category: form.domains.includes('energy') ? 'energy' : 'other',
      aggregation_method: form.measurement_type === 'accumulator' || form.measurement_type === 'counter' ? 'delta' : 'latest',
      expected_frequency: form.manual_frequency || 'manual',
      validation_profile: {
        source_status: form.source_type === 'manual' ? 'active' : 'in_development',
        manual_capture_active: form.source_type === 'manual',
        future_source_requested: form.source_type !== 'manual' ? form.source_type : null,
      },
    })

  await supabase
    .from('energy_measurement_bindings')
    .update({ active: false, is_primary: false })
    .eq('measurement_point_id', measurementPointId)
    .eq('is_primary', true)

  const bindingPayload: Record<string, unknown> = form.target_type === 'asset'
    ? {
      site_id: siteId,
      measurement_point_id: measurementPointId,
      binding_type: 'asset',
      asset_id: form.target_id,
      energy_group_id: null,
      role: 'indicator',
      is_primary: true,
      active: true,
      properties: { source: 'measurement_points_wizard' },
    }
    : {
      site_id: siteId,
      measurement_point_id: measurementPointId,
      binding_type: 'energy_group',
      asset_id: null,
      energy_group_id: form.target_id,
      role: 'indicator',
      is_primary: true,
      active: true,
      properties: { source: 'measurement_points_wizard' },
    }

  await supabase.from('energy_measurement_bindings').insert(bindingPayload)
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MeasurementPointsView({ siteId, utilityType }: Props) {
  const [items, setItems] = useState<MP[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [wizardStep, setWizardStep] = useState(1)
  const [form, setForm] = useState<WizardForm>({ ...DEFAULT_FORM })
  const [saving, setSaving] = useState(false)
  const [targetEntities, setTargetEntities] = useState<TargetEntity[]>([])
  const [physicalMeters, setPhysicalMeters] = useState<PhysicalMeter[]>([])
  const [tagCount, setTagCount] = useState(1)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('measurement_points').select('*').eq('site_id', siteId).order('tag')
    if (utilityType) q = q.eq('utility', utilityType)
    const { data, error: err } = await q
    if (err) setError(err.message)
    else {
      const loaded = data || []
      setItems(loaded)
      setTagCount(loaded.length + 1)
    }
    setLoading(false)
  }, [siteId, utilityType])

  useEffect(() => { load() }, [load])

  // Load canonical scopes (Core assets + Energy groups) and physical meters.
  useEffect(() => {
    async function loadTargets() {
      const [{ data: assets, error: assetsError }, { data: groups }, { data: areas }, { data: systems }] = await Promise.all([
        supabase
          .from('assets')
          .select('id, name, code, node_type, node_role, maintainable_kind, status')
          .eq('site_id', siteId)
          .neq('status', 'decommissioned')
          .order('name'),
        supabase
          .from('energy_groups')
          .select('id, name, code, group_type, utility_type, active')
          .eq('site_id', siteId)
          .eq('active', true)
          .order('name'),
        supabase.from('energy_areas').select('id, name').eq('site_id', siteId),
        supabase.from('utility_systems').select('id, name, utility_type').eq('site_id', siteId),
      ])

      const coreAssets = assetsError ? [] : (assets || [])
      const entities: TargetEntity[] = coreAssets.length > 0
        ? [
          ...coreAssets.map((asset) => ({
            id: asset.id,
            label: asset.code ? `${asset.code} · ${asset.name}` : asset.name,
            type: 'asset' as const,
            subtitle: `${asset.node_type} / ${asset.node_role}${asset.maintainable_kind ? ` / ${asset.maintainable_kind}` : ''}`,
            nodeRole: asset.node_role,
            maintainableKind: asset.maintainable_kind,
          })),
          ...((groups || []).map((group) => ({
            id: group.id,
            label: group.code ? `${group.code} · ${group.name}` : group.name,
            type: 'energy_group' as const,
            subtitle: `Energy group / ${group.group_type}`,
            utility: group.utility_type,
          }))),
        ]
        : [
          ...((areas || []).map((a) => ({
            id: a.id,
            label: a.name,
            type: 'asset' as const,
            subtitle: 'Legacy area fallback',
            nodeRole: 'grouping',
          }))),
          ...((systems || []).map((s) => ({
            id: s.id,
            label: s.name,
            type: 'asset' as const,
            subtitle: 'Legacy system fallback',
            utility: s.utility_type,
            nodeRole: 'grouping',
          }))),
        ]

      const meters = coreAssets
        .filter((asset) => asset.maintainable_kind === 'meter')
        .map((asset) => ({
          id: asset.id,
          label: asset.name,
          code: asset.code,
          subtitle: `${asset.node_type} / medidor fisico mantenible`,
        }))

      setTargetEntities(entities)
      setPhysicalMeters(meters)
    }
    if (siteId) loadTargets()
  }, [siteId])

  function openCreate() {
    const defaultUtility = utilityType || 'electricity'
    const defaultQuantity = getAllowedQuantities(defaultUtility)[0] ?? 'energy'
    const defaultUnit = getDefaultUnit(defaultUtility, defaultQuantity)
    const suggested = suggestTag(defaultUtility, defaultQuantity, tagCount)
    setForm({
      ...DEFAULT_FORM,
      utility: defaultUtility,
      quantity: defaultQuantity,
      unit: defaultUnit,
      tag: suggested,
    })
    setEditingId(null)
    setWizardStep(1)
    setShowWizard(true)
  }

  function openEdit(mp: MP) {
    const accCfg = mp.accumulator_config as Record<string, unknown>
    const srcCfg = mp.source_config as Record<string, unknown>
    setForm({
      tag: mp.tag, name: mp.name, utility: mp.utility,
      target_type: mp.target_type === 'energy_group' ? 'energy_group' : 'asset',
      target_id: (mp.scope_asset_id || mp.target_id) === DUMMY_ID ? '' : (mp.scope_asset_id || mp.target_id || ''),
      physical_meter_asset_id: mp.physical_meter_asset_id || '',
      domains: Array.isArray(mp.domains) && mp.domains.length > 0 ? mp.domains : ['energy'],
      measurement_type: mp.measurement_type,
      quantity: (mp.quantity as MeasurementQuantity) || 'energy',
      unit: mp.unit,
      source_type: mp.source_type,
      manual_frequency: (srcCfg?.frequency as string) || 'monthly',
      iot_db_table: (srcCfg?.table as string) || 'iot_readings',
      iot_db_field_value: (srcCfg?.field_value as string) || 'value',
      iot_db_field_ts: (srcCfg?.field_ts as string) || 'recorded_at',
      iot_db_filter: (srcCfg?.filter as string) || '',
      api_url: (srcCfg?.url as string) || '',
      api_field: (srcCfg?.field as string) || 'value',
      api_interval: (srcCfg?.interval_minutes as number) || 15,
      file_format: (srcCfg?.format as string) || 'csv',
      file_frequency: (srcCfg?.frequency as string) || 'monthly',
      acc_multiplier: (accCfg?.multiplier as number) ?? 1,
      acc_offset: (accCfg?.offset as number) ?? 0,
      acc_allow_negative: Boolean(accCfg?.allowNegativeDelta),
      acc_reset_detection: Boolean(accCfg?.resetDetection ?? true),
      acc_rollover_enabled: Boolean((accCfg?.rollover as Record<string, unknown>)?.enabled),
      acc_rollover_max: ((accCfg?.rollover as Record<string, unknown>)?.maxValue as number) ?? 999999,
    })
    setEditingId(mp.id)
    setWizardStep(1)
    setShowWizard(true)
  }

  async function handleSave() {
    if (!form.target_id) return
    setSaving(true)
    const isAssetScope = form.target_type === 'asset'
    const payload = {
      tag: form.tag,
      name: form.name || form.tag,
      target_type: form.target_type,
      target_id: form.target_id,
      asset_id: isAssetScope ? form.target_id : null,
      scope_asset_id: isAssetScope ? form.target_id : null,
      physical_meter_asset_id: form.physical_meter_asset_id || null,
      domains: form.domains.length > 0 ? form.domains : ['energy'],
      utility: form.utility,
      measurement_type: form.measurement_type,
      quantity: form.quantity,
      unit: form.unit,
      source_type: form.source_type,
      source_config: buildSourceConfig(form),
      accumulator_config: buildAccConfig(form),
      updated_at: new Date().toISOString(),
    }

    let measurementPointId = editingId
    if (editingId) {
      await supabase.from('measurement_points').update(payload).eq('id', editingId)
    } else {
      const { data, error: insertError } = await supabase
        .from('measurement_points')
        .insert({ ...payload, site_id: siteId })
        .select('id')
        .single()
      if (insertError) {
        setError(insertError.message)
        setSaving(false)
        return
      }
      measurementPointId = data?.id || null
    }

    if (measurementPointId) {
      await upsertEnergyMeasurementSatellite(measurementPointId, siteId, form)
    }

    setSaving(false)
    setShowWizard(false)
    load()
  }

  function handleDelete(id: string) {
    setDeleteConfirm({ open: true, id })
  }

  async function confirmDelete() {
    if (!deleteConfirm.id) return
    setDeleteConfirm({ open: false, id: null })
    await supabase.from('measurement_points').delete().eq('id', deleteConfirm.id)
    load()
  }

  // ─── Status helpers ─────────────────────────────────────────────────────────

  function getStatus(mp: MP): 'ok' | 'no-target' | 'inactive' {
    if (!mp.is_active) return 'inactive'
    if (!mp.target_id || mp.target_id === DUMMY_ID) return 'no-target'
    return 'ok'
  }

  const statusMap = {
    ok:        { label: 'Listo', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle, iconColor: 'text-emerald-500' },
    'no-target': { label: 'Sin target real', color: 'bg-red-50 text-red-700 border-red-200', Icon: AlertTriangle, iconColor: 'text-red-500' },
    inactive:  { label: 'Inactivo', color: 'bg-gray-50 text-gray-500 border-gray-200', Icon: Circle, iconColor: 'text-gray-400' },
  }

  const typeBadge: Record<string, 'purple' | 'blue' | 'teal' | 'gray' | 'orange' | 'cyan'> = {
    instantaneous: 'purple', accumulator: 'blue', counter: 'teal',
    status: 'gray', calculated: 'orange', manual: 'cyan',
  }

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Cargando puntos de medición...</div>
  if (error) return <div className="py-12 text-center text-sm text-red-500">{error}</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{items.length} puntos de medición</p>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>Nuevo punto</Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Gauge size={40} strokeWidth={1.5} />}
            title="Sin puntos de medición"
            description="Crea tu primer MeasurementPoint. Es una entidad independiente que vincula a un área, sistema o equipo."
            action={<Button size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>Nuevo punto</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((mp) => {
            const st = getStatus(mp)
            const { label, color, Icon, iconColor } = statusMap[st]
            return (
              <Card key={mp.id} padding="md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-brand-blue/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Gauge size={16} className="text-brand-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-brand-blue">{mp.tag}</span>
                        {mp.name && <span className="text-sm text-gray-700 truncate">{mp.name}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <Badge color={typeBadge[mp.measurement_type] ?? 'gray'} size="sm">
                          {MEASUREMENT_TYPE_LABELS[mp.measurement_type] ?? mp.measurement_type}
                        </Badge>
                        <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full border font-medium ${getUtilityColor(mp.utility)}`}>
                          <Zap size={10} />
                          {UTILITY_LABELS[mp.utility] ?? mp.utility}
                        </span>
                        <span className="text-xs text-gray-400">{QUANTITY_LABELS[mp.quantity as MeasurementQuantity] ?? mp.quantity} · {mp.unit}</span>
                        <span className="text-xs text-gray-400">
                          {SOURCE_TYPE_ICONS[mp.source_type] ?? '?'} {SOURCE_TYPE_LABELS[mp.source_type] ?? mp.source_type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${color}`}>
                      <Icon size={10} className={iconColor} />
                      {label}
                    </span>
                    <button onClick={() => openEdit(mp)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(mp.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Wizard modal */}
      <Modal
        open={showWizard}
        onClose={() => setShowWizard(false)}
        title={editingId ? 'Editar punto de medición' : 'Nuevo punto de medición'}
        size="lg"
      >
        <MpWizard
          step={wizardStep}
          form={form}
          setForm={setForm}
          onStepChange={setWizardStep}
          targetEntities={targetEntities}
          physicalMeters={physicalMeters}
          onSave={handleSave}
          onCancel={() => setShowWizard(false)}
          saving={saving}
          isEdit={Boolean(editingId)}
        />
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Eliminar punto de medición"
        description="Se eliminarán el punto de medición y todas sus lecturas vinculadas. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
      />
    </div>
  )
}

// ─── Wizard component ─────────────────────────────────────────────────────────

function MpWizard({
  step, form, setForm, onStepChange,
  targetEntities, physicalMeters, onSave, onCancel, saving, isEdit,
}: {
  step: number
  form: WizardForm
  setForm: (f: WizardForm) => void
  onStepChange: (s: number) => void
  targetEntities: TargetEntity[]
  physicalMeters: PhysicalMeter[]
  onSave: () => void
  onCancel: () => void
  saving: boolean
  isEdit: boolean
}) {
  const steps = [
    { n: 1, label: 'Identificación' },
    { n: 2, label: 'Vinculación' },
    { n: 3, label: 'Magnitud' },
    { n: 4, label: 'Confirmación' },
  ]

  const allowedQuantities = useMemo(() => getAllowedQuantities(form.utility), [form.utility])
  const allowedUnits = useMemo(() => getAllowedUnits(form.utility, form.quantity), [form.utility, form.quantity])
  const unitCompatible = useMemo(() =>
    isUnitCompatible(form.utility, form.quantity, form.unit), [form.utility, form.quantity, form.unit])

  function set(partial: Partial<WizardForm>) {
    setForm({ ...form, ...partial })
  }

  // Auto-update unit when utility/quantity changes
  function handleUtilityChange(utility: string) {
    const quantities = getAllowedQuantities(utility)
    const q = quantities.includes(form.quantity) ? form.quantity : quantities[0]
    const u = getDefaultUnit(utility, q)
    set({ utility, quantity: q, unit: u })
  }

  function handleQuantityChange(q: MeasurementQuantity) {
    const u = getDefaultUnit(form.utility, q)
    set({ quantity: q, unit: u })
  }

  const canAdvanceStep1 = form.tag.trim().length > 0 && form.utility
  const canAdvanceStep2 = form.target_id.trim().length > 0 && form.target_id !== '00000000-0000-0000-0000-000000000000'
  const canAdvanceStep3 = form.quantity && form.unit && unitCompatible

  const filteredTargets = useMemo(() =>
    targetEntities.filter((t) => {
      if (t.type !== form.target_type) return false
      return !t.utility || t.utility === form.utility
    }), [targetEntities, form.target_type])
  const selectedTarget = useMemo(
    () => targetEntities.find((target) => target.id === form.target_id),
    [targetEntities, form.target_id],
  )
  const selectedPhysicalMeter = useMemo(
    () => physicalMeters.find((meter) => meter.id === form.physical_meter_asset_id),
    [physicalMeters, form.physical_meter_asset_id],
  )

  function toggleDomain(domain: string) {
    const next = form.domains.includes(domain)
      ? form.domains.filter((item) => item !== domain)
      : [...form.domains, domain]
    set({ domains: next.length > 0 ? next : ['energy'] })
  }

  // ── Step indicator ────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Step tabs */}
      <div className="flex items-center gap-0">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1">
            <button
              onClick={() => step > s.n ? onStepChange(s.n) : undefined}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors cursor-default ${
                step === s.n ? 'text-brand-blue' :
                step > s.n ? 'text-emerald-600 cursor-pointer' : 'text-gray-400'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${
                step === s.n ? 'bg-brand-blue text-white border-brand-blue' :
                step > s.n ? 'bg-emerald-500 text-white border-emerald-500' :
                'border-gray-300 text-gray-400'
              }`}>{step > s.n ? '✓' : s.n}</span>
              {s.label}
            </button>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-2 ${step > s.n ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="min-h-[280px]">
        {/* STEP 1 — Identificación */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tag * <span className="text-gray-400 font-normal">(ISA-5.1)</span></label>
                <input
                  value={form.tag}
                  onChange={(e) => set({ tag: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                  placeholder="Ej: FQI-401"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">Sugerido: {suggestTag(form.utility, form.quantity, 1)}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre descriptivo</label>
                <input
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                  placeholder="Medidor vapor principal"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Utility *</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(UTILITY_LABELS).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => handleUtilityChange(id)}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium text-left transition-all cursor-pointer ${
                      form.utility === id
                        ? `${getUtilityColor(id)} ring-2 ring-offset-1 ring-current`
                        : 'border-border text-gray-600 hover:border-gray-300 bg-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — Vinculación */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de objetivo *</label>
              <div className="flex gap-2">
                {(['asset', 'energy_group'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => set({ target_type: t, target_id: '' })}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      form.target_type === t
                        ? 'bg-brand-blue/10 border-brand-blue text-brand-blue'
                        : 'border-border text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {t === 'asset' ? 'Asset Core/CMMS' : 'Energy group'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                El scope medido puede ser un activo/agrupador Core o un grupo Energy. Nodos y edges se vinculan desde Mapa.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {form.target_type === 'asset' ? 'Selecciona asset/agrupador Core' : 'Selecciona Energy group'} *
              </label>
              {filteredTargets.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg">
                  No hay {form.target_type === 'asset' ? 'assets Core' : 'Energy groups'} disponibles para este sitio y utility.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                  {filteredTargets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => set({ target_id: t.id })}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        form.target_id === t.id
                          ? 'bg-brand-blue/5 border-brand-blue'
                          : 'border-border hover:border-gray-300 bg-white'
                      }`}
                    >
                      {t.type === 'energy_group' ? (
                        <Layers size={14} className={form.target_id === t.id ? 'text-brand-blue' : 'text-gray-400'} />
                      ) : (
                        <Link size={14} className={form.target_id === t.id ? 'text-brand-blue' : 'text-gray-400'} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${form.target_id === t.id ? 'text-brand-blue' : 'text-gray-700'}`}>
                          {t.label}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {t.subtitle}{t.utility ? ` · ${UTILITY_LABELS[t.utility] ?? t.utility}` : ''}
                        </p>
                      </div>
                      {form.target_id === t.id && <CheckCircle size={14} className="text-brand-blue shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!canAdvanceStep2 && form.target_id === '' && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle size={12} /> Debes seleccionar un objetivo real para este punto.
              </p>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Medidor físico vinculado</label>
              <select
                value={form.physical_meter_asset_id}
                onChange={(e) => set({ physical_meter_asset_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-white cursor-pointer"
              >
                <option value="">Sin medidor físico</option>
                {physicalMeters.map((meter) => (
                  <option key={meter.id} value={meter.id}>
                    {meter.code ? `${meter.code} · ` : ''}{meter.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">
                Opcional. Úsalo solo si existe un medidor mantenible en el Asset Registry.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Dominios de uso</label>
              <div className="grid grid-cols-2 gap-2">
                {DOMAIN_OPTIONS.map((domain) => (
                  <button
                    key={domain.id}
                    type="button"
                    onClick={() => toggleDomain(domain.id)}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      form.domains.includes(domain.id)
                        ? 'border-brand-blue bg-brand-blue/5 text-brand-blue'
                        : 'border-border bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {domain.label}
                    {form.domains.includes(domain.id) && <CheckCircle size={12} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — Magnitud y medición */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de medición *</label>
                <select
                  value={form.measurement_type}
                  onChange={(e) => set({ measurement_type: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-white cursor-pointer"
                >
                  {Object.entries(MEASUREMENT_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Magnitud *</label>
                <select
                  value={form.quantity}
                  onChange={(e) => handleQuantityChange(e.target.value as MeasurementQuantity)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-white cursor-pointer"
                >
                  {allowedQuantities.map((q) => (
                    <option key={q} value={q}>{QUANTITY_LABELS[q]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unidad *</label>
              {allowedUnits.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {allowedUnits.map((u) => (
                    <button
                      key={u}
                      onClick={() => set({ unit: u })}
                      className={`px-2.5 py-1 rounded-md border text-xs font-mono font-medium cursor-pointer transition-colors ${
                        form.unit === u
                          ? 'bg-brand-blue text-white border-brand-blue'
                          : 'border-border text-gray-600 hover:border-gray-400'
                      }`}
                    >{u}</button>
                  ))}
                </div>
              ) : (
                <select
                  value={form.unit}
                  onChange={(e) => set({ unit: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-white"
                >
                  {getAllUnitsFromCatalog().map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              )}
              {!unitCompatible && form.unit && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertTriangle size={11} /> La unidad "{form.unit}" puede no ser compatible con {form.utility} / {QUANTITY_LABELS[form.quantity]}.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Fuente de datos *</label>

              {/* Source type selector — grid de tarjetas */}
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {SOURCE_OPTIONS.map(({ id: src, label, status }) => (
                  <button
                    key={src}
                    onClick={() => {
                      if (src === 'manual') set({ source_type: src })
                    }}
                    disabled={src !== 'manual'}
                    className={`flex flex-col items-start px-2.5 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                      form.source_type === src
                        ? 'bg-brand-blue/10 border-brand-blue text-brand-blue'
                        : src === 'manual'
                          ? 'border-border text-gray-600 hover:border-gray-300 bg-white'
                          : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-base leading-none mb-0.5">{SOURCE_TYPE_ICONS[src]}</span>
                    <span className="text-[11px] font-medium leading-tight">{label}</span>
                    {src !== 'manual' && (
                      <span className="mt-1 rounded bg-amber-50 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-700">
                        {status}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Config contextual por fuente */}
              {form.source_type === 'manual' && (
                <div className="bg-gray-50 rounded-lg p-3 border border-border space-y-2">
                  <label className="block text-xs text-gray-500">Frecuencia de lectura</label>
                  <select
                    value={form.manual_frequency}
                    onChange={(e) => set({ manual_frequency: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-white cursor-pointer"
                  >
                    <option value="daily">Diaria</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                    <option value="on_demand">Bajo demanda</option>
                  </select>
                  <p className="text-[10px] text-gray-400">El operador ingresa el valor manualmente desde el mapa o la página de rondas.</p>
                </div>
              )}

              {form.source_type === 'iot_db' && (
                <div className="bg-gray-50 rounded-lg p-3 border border-border space-y-2">
                  <p className="text-[10px] text-gray-500 font-medium">El gateway IoT escribe a una tabla en Supabase. Versa lee de ahí.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">Tabla / vista</label>
                      <input
                        value={form.iot_db_table}
                        onChange={(e) => set({ iot_db_table: e.target.value })}
                        className="w-full px-2 py-1.5 border border-border rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-blue/30"
                        placeholder="iot_readings"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">Campo del valor</label>
                      <input
                        value={form.iot_db_field_value}
                        onChange={(e) => set({ iot_db_field_value: e.target.value })}
                        className="w-full px-2 py-1.5 border border-border rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-blue/30"
                        placeholder="value"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">Campo timestamp</label>
                      <input
                        value={form.iot_db_field_ts}
                        onChange={(e) => set({ iot_db_field_ts: e.target.value })}
                        className="w-full px-2 py-1.5 border border-border rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-blue/30"
                        placeholder="recorded_at"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">Filtro device_id</label>
                      <input
                        value={form.iot_db_filter}
                        onChange={(e) => set({ iot_db_filter: e.target.value })}
                        className="w-full px-2 py-1.5 border border-border rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-blue/30"
                        placeholder="sensor-045"
                      />
                    </div>
                  </div>
                </div>
              )}

              {form.source_type === 'api_pull' && (
                <div className="bg-gray-50 rounded-lg p-3 border border-border space-y-2">
                  <p className="text-[10px] text-gray-500 font-medium">Versa llama periódicamente a un endpoint REST externo.</p>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">URL del endpoint</label>
                    <input
                      value={form.api_url}
                      onChange={(e) => set({ api_url: e.target.value })}
                      className="w-full px-2 py-1.5 border border-border rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-blue/30"
                      placeholder="https://api.ejemplo.mx/meters/FE-101"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">Campo del valor (JSON path)</label>
                      <input
                        value={form.api_field}
                        onChange={(e) => set({ api_field: e.target.value })}
                        className="w-full px-2 py-1.5 border border-border rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-blue/30"
                        placeholder="data.value"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">Intervalo (min)</label>
                      <input
                        type="number"
                        value={form.api_interval}
                        onChange={(e) => set({ api_interval: Number(e.target.value) })}
                        className="w-full px-2 py-1.5 border border-border rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-blue/30"
                      />
                    </div>
                  </div>
                </div>
              )}

              {form.source_type === 'api_push' && (
                <div className="bg-gray-50 rounded-lg p-3 border border-border">
                  <p className="text-[10px] text-gray-500 font-medium mb-1">Un sistema externo enviará lecturas al endpoint de Versa.</p>
                  <p className="text-[10px] text-gray-400">
                    El token de autenticación y la URL del webhook se generarán al guardar este punto de medición.
                  </p>
                </div>
              )}

              {form.source_type === 'file_import' && (
                <div className="bg-gray-50 rounded-lg p-3 border border-border space-y-2">
                  <p className="text-[10px] text-gray-500 font-medium">Lecturas importadas periódicamente desde un archivo.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">Formato</label>
                      <select
                        value={form.file_format}
                        onChange={(e) => set({ file_format: e.target.value })}
                        className="w-full px-2 py-1.5 border border-border rounded text-xs bg-white cursor-pointer"
                      >
                        <option value="csv">CSV</option>
                        <option value="xlsx">Excel (.xlsx)</option>
                        <option value="json">JSON</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-0.5">Frecuencia esperada</label>
                      <select
                        value={form.file_frequency}
                        onChange={(e) => set({ file_frequency: e.target.value })}
                        className="w-full px-2 py-1.5 border border-border rounded text-xs bg-white cursor-pointer"
                      >
                        <option value="daily">Diaria</option>
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensual</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {form.source_type === 'calculated' && (
                <div className="bg-gray-50 rounded-lg p-3 border border-border">
                  <p className="text-[10px] text-gray-500 font-medium mb-1">Valor derivado automáticamente de otros MPs.</p>
                  <p className="text-[10px] text-gray-400">La fórmula se configura desde el detalle del punto de medición una vez creado.</p>
                </div>
              )}
            </div>

            {form.measurement_type === 'accumulator' && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-blue-700">Configuración de acumulador</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Multiplicador</label>
                    <input
                      type="number" step="any" value={form.acc_multiplier}
                      onChange={(e) => set({ acc_multiplier: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-border rounded text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Offset</label>
                    <input
                      type="number" step="any" value={form.acc_offset}
                      onChange={(e) => set({ acc_offset: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-border rounded text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox" checked={form.acc_reset_detection}
                      onChange={(e) => set({ acc_reset_detection: e.target.checked })}
                      className="rounded"
                    />
                    Detectar resets
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox" checked={form.acc_allow_negative}
                      onChange={(e) => set({ acc_allow_negative: e.target.checked })}
                      className="rounded"
                    />
                    Permitir delta negativo
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox" checked={form.acc_rollover_enabled}
                      onChange={(e) => set({ acc_rollover_enabled: e.target.checked })}
                      className="rounded"
                    />
                    Rollover
                  </label>
                  {form.acc_rollover_enabled && (
                    <div className="flex items-center gap-1">
                      <label className="text-[10px] text-gray-500">Máx:</label>
                      <input
                        type="number" value={form.acc_rollover_max}
                        onChange={(e) => set({ acc_rollover_max: Number(e.target.value) })}
                        className="w-24 px-2 py-1 border border-border rounded text-xs font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4 — Preview / Confirmación */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                  <Gauge size={18} className="text-brand-blue" />
                </div>
                <div>
                  <p className="font-mono text-base font-bold text-brand-blue">{form.tag || '—'}</p>
                  <p className="text-sm text-gray-600">{form.name || '(sin nombre)'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Row label="Utility" value={UTILITY_LABELS[form.utility] ?? form.utility} />
                <Row label="Tipo" value={MEASUREMENT_TYPE_LABELS[form.measurement_type]} />
                <Row label="Magnitud" value={QUANTITY_LABELS[form.quantity]} />
                <Row label="Unidad" value={<span className="font-mono">{form.unit}</span>} />
                <Row label="Fuente" value={SOURCE_TYPE_LABELS[form.source_type]} />
                <Row
                  label="Scope"
                  value={selectedTarget ? selectedTarget.label : '—'}
                />
                <Row
                  label="Medidor físico"
                  value={selectedPhysicalMeter ? `${selectedPhysicalMeter.code ? `${selectedPhysicalMeter.code} · ` : ''}${selectedPhysicalMeter.label}` : 'Sin medidor físico'}
                />
                <Row label="Dominios" value={form.domains.join(', ')} />
              </div>

              {/* Status chips */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
                <Chip ok={Boolean(form.target_id)} label="Scope real vinculado" />
                <Chip ok label={form.physical_meter_asset_id ? 'Medidor físico vinculado' : 'Sin medidor físico'} />
                <Chip ok={form.source_type === 'manual'} label="Captura manual vigente" />
                <Chip ok={unitCompatible} label="Unidad compatible" />
                <Chip
                  ok={form.measurement_type !== 'accumulator' || form.acc_multiplier > 0}
                  label={form.measurement_type === 'accumulator' ? 'Config acumulador válida' : 'Config fuente lista'}
                />
                <Chip
                  ok={['energy', 'volume', 'mass', 'flow'].includes(form.quantity)}
                  label="Alimenta balance"
                  warn
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-3 border-t border-border">
        <div>
          {step > 1 && (
            <Button variant="secondary" size="sm" onClick={() => onStepChange(step - 1)}>
              ← Anterior
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel} rightIcon={<X size={13} />}>
            Cancelar
          </Button>
          {step < 4 ? (
            <Button
              size="sm"
              onClick={() => onStepChange(step + 1)}
              disabled={
                (step === 1 && !canAdvanceStep1) ||
                (step === 2 && !canAdvanceStep2) ||
                (step === 3 && !canAdvanceStep3)
              }
              rightIcon={<ChevronRight size={13} />}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onSave}
              loading={saving}
              rightIcon={<Save size={13} />}
              disabled={!form.target_id || !unitCompatible}
            >
              {isEdit ? 'Guardar cambios' : 'Crear punto'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-gray-500 text-xs">{label}: </span>
      <span className="text-gray-800 text-sm font-medium">{value}</span>
    </div>
  )
}

function Chip({ ok, label, warn = false }: { ok: boolean; label: string; warn?: boolean }) {
  if (!ok && warn) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <AlertTriangle size={9} /> {label}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
      ok
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-red-50 text-red-700 border-red-200'
    }`}>
      {ok ? <CheckCircle size={9} /> : <AlertTriangle size={9} />}
      {label}
    </span>
  )
}
