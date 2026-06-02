import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card } from '@/shared/Card'
import { Button } from '@/shared/Button'
import { Badge } from '@/shared/Badge'
import { EmptyState } from '@/shared/EmptyState'
import { Modal } from '@/shared/Modal'
import { supabase } from '@/services/supabase'
import {
  getAllowedQuantities,
  getAllowedUnits,
  getDefaultUnit,
  isUnitCompatible,
  suggestTag,
  QUANTITY_LABELS,
  MEASUREMENT_TYPE_LABELS,
  SOURCE_TYPE_LABELS,
  type MeasurementQuantity,
} from '@/services/measurement-engine/unitCatalog'
import {
  Plus, Pencil, Trash2, Save, X, Gauge, ChevronRight,
  CheckCircle, AlertTriangle, Circle, Link, Zap,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MP {
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
  source_config: Record<string, unknown>
  accumulator_config: Record<string, unknown>
  is_active: boolean
}

interface TargetEntity {
  id: string
  label: string
  type: 'area' | 'system' | 'node' | 'edge'
  utility?: string
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
  target_type: 'area' | 'system' | 'node' | 'edge'
  target_id: string
  // Step 3
  measurement_type: string
  quantity: MeasurementQuantity
  unit: string
  source_type: string
  manual_frequency: string
  iot_protocol: string
  iot_address: string
  iot_polling: number
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
  target_type: 'system', target_id: '',
  measurement_type: 'accumulator',
  quantity: 'energy',
  unit: 'kWh',
  source_type: 'manual',
  manual_frequency: 'monthly',
  iot_protocol: 'mqtt', iot_address: '', iot_polling: 60,
  acc_multiplier: 1, acc_offset: 0,
  acc_allow_negative: false, acc_reset_detection: true,
  acc_rollover_enabled: false, acc_rollover_max: 999999,
}

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
  if (form.source_type === 'manual') {
    return { kind: 'manual', frequency: form.manual_frequency }
  }
  if (form.source_type === 'iot') {
    return {
      kind: 'iot',
      protocol: form.iot_protocol,
      address: form.iot_address,
      pollingSeconds: form.iot_polling,
    }
  }
  return { kind: 'calculated', formula: '', inputs: [] }
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
  const [tagCount, setTagCount] = useState(1)

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

  // Load target entities (areas + systems for now)
  useEffect(() => {
    async function loadTargets() {
      const [{ data: areas }, { data: systems }] = await Promise.all([
        supabase.from('energy_areas').select('id, name').eq('site_id', siteId),
        supabase.from('utility_systems').select('id, name, utility_type').eq('site_id', siteId),
      ])
      const entities: TargetEntity[] = [
        ...(areas || []).map((a) => ({ id: a.id, label: a.name, type: 'area' as const })),
        ...(systems || []).map((s) => ({ id: s.id, label: s.name, type: 'system' as const, utility: s.utility_type })),
      ]
      setTargetEntities(entities)
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
      target_type: (mp.target_type as WizardForm['target_type']) || 'system',
      target_id: mp.target_id === DUMMY_ID ? '' : mp.target_id,
      measurement_type: mp.measurement_type,
      quantity: (mp.quantity as MeasurementQuantity) || 'energy',
      unit: mp.unit,
      source_type: mp.source_type,
      manual_frequency: (srcCfg?.frequency as string) || 'monthly',
      iot_protocol: (srcCfg?.protocol as string) || 'mqtt',
      iot_address: (srcCfg?.address as string) || '',
      iot_polling: (srcCfg?.pollingSeconds as number) || 60,
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
    const payload = {
      tag: form.tag,
      name: form.name || form.tag,
      target_type: form.target_type,
      target_id: form.target_id,
      utility: form.utility,
      measurement_type: form.measurement_type,
      quantity: form.quantity,
      unit: form.unit,
      source_type: form.source_type,
      source_config: buildSourceConfig(form),
      accumulator_config: buildAccConfig(form),
      updated_at: new Date().toISOString(),
    }

    if (editingId) {
      await supabase.from('measurement_points').update(payload).eq('id', editingId)
    } else {
      await supabase.from('measurement_points').insert({ ...payload, site_id: siteId })
    }
    setSaving(false)
    setShowWizard(false)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este punto de medición? Las lecturas vinculadas se eliminarán.')) return
    await supabase.from('measurement_points').delete().eq('id', id)
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
                        <span className="text-xs text-gray-400">→ {mp.target_type}</span>
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
          onSave={handleSave}
          onCancel={() => setShowWizard(false)}
          saving={saving}
          isEdit={Boolean(editingId)}
        />
      </Modal>
    </div>
  )
}

// ─── Wizard component ─────────────────────────────────────────────────────────

function MpWizard({
  step, form, setForm, onStepChange,
  targetEntities, onSave, onCancel, saving, isEdit,
}: {
  step: number
  form: WizardForm
  setForm: (f: WizardForm) => void
  onStepChange: (s: number) => void
  targetEntities: TargetEntity[]
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
      if (form.target_type === 'area') return t.type === 'area'
      if (form.target_type === 'system') return t.type === 'system'
      return true
    }), [targetEntities, form.target_type])

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
                {(['area', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => set({ target_type: t, target_id: '' })}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      form.target_type === t
                        ? 'bg-brand-blue/10 border-brand-blue text-brand-blue'
                        : 'border-border text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {t === 'area' ? '📍 Área' : '🔧 Sistema de utility'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Los nodos de canvas (tipo node/edge) se vinculan desde el Mapa → Inspector.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {form.target_type === 'area' ? 'Selecciona el área' : 'Selecciona el sistema de utility'} *
              </label>
              {filteredTargets.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg">
                  No hay {form.target_type === 'area' ? 'áreas' : 'sistemas'} registrados para este sitio.
                  <br />Crea uno en las tabs correspondientes del Modelo.
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
                      <Link size={14} className={form.target_id === t.id ? 'text-brand-blue' : 'text-gray-400'} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${form.target_id === t.id ? 'text-brand-blue' : 'text-gray-700'}`}>
                          {t.label}
                        </p>
                        {t.utility && (
                          <p className="text-[10px] text-gray-400">{UTILITY_LABELS[t.utility] ?? t.utility}</p>
                        )}
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
                <input
                  value={form.unit}
                  onChange={(e) => set({ unit: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                  placeholder="Ej: kWh"
                />
              )}
              {!unitCompatible && form.unit && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertTriangle size={11} /> La unidad "{form.unit}" puede no ser compatible con {form.utility} / {QUANTITY_LABELS[form.quantity]}.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fuente de datos *</label>
              <div className="flex gap-2 mb-3">
                {(['manual', 'iot', 'calculated'] as const).map((src) => (
                  <button
                    key={src}
                    onClick={() => set({ source_type: src })}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      form.source_type === src
                        ? 'bg-brand-blue/10 border-brand-blue text-brand-blue'
                        : 'border-border text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {SOURCE_TYPE_LABELS[src]}
                  </button>
                ))}
              </div>

              {form.source_type === 'manual' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Frecuencia de lectura</label>
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
                </div>
              )}

              {form.source_type === 'iot' && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Protocolo</label>
                    <select
                      value={form.iot_protocol}
                      onChange={(e) => set({ iot_protocol: e.target.value })}
                      className="w-full px-2 py-1.5 border border-border rounded-lg text-xs focus:outline-none bg-white cursor-pointer"
                    >
                      {['mqtt', 'opcua', 'modbus', 'http', 'bacnet'].map((p) => (
                        <option key={p} value={p}>{p.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Dirección / Topic</label>
                    <input
                      value={form.iot_address}
                      onChange={(e) => set({ iot_address: e.target.value })}
                      className="w-full px-2 py-1.5 border border-border rounded-lg text-xs font-mono focus:outline-none"
                      placeholder="site/meter/energy"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Polling (s)</label>
                    <input
                      type="number"
                      value={form.iot_polling}
                      onChange={(e) => set({ iot_polling: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-border rounded-lg text-xs font-mono focus:outline-none"
                    />
                  </div>
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
                  label="Target"
                  value={`${form.target_type}: ${form.target_id ? form.target_id.slice(0, 8) + '…' : '—'}`}
                />
              </div>

              {/* Status chips */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
                <Chip ok={Boolean(form.target_id)} label="Target real vinculado" />
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
