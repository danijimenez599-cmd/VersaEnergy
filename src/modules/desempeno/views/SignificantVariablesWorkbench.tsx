import { useState, useEffect, useCallback, type ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Info,
  Lightbulb,
  Plus,
  Save,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import { supabase } from '@/services/supabase'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import {
  correlationMatrix,
  interpretR,
  interpretR2,
  interpretVIF,
  multipleOLS,
  pearsonR,
  simpleOLS,
  significanceLabel,
  mean,
  stddev,
} from '@/lib/statistics'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnPIRef {
  id: string
  name: string
  unit: string
}

interface MeasurementPoint {
  id: string
  tag: string
  name: string
  unit: string
}

interface SigVariable {
  id: string
  enpi_id: string
  name: string
  description: string | null
  unit: string
  data_type: 'continuous' | 'discrete'
  aggregation_method: 'sum' | 'average' | 'max' | 'min' | 'last'
  measurement_point_id: string | null
  expected_impact: 'positive' | 'negative' | 'neutral' | 'unknown'
  sort_order: number
  is_active: boolean
}

interface EnpiPeriodValue {
  id: string
  period_label: string
  period_start: string
  actual_value: number
  notes: string | null
}

interface VarPeriodValue {
  id: string
  variable_id: string
  period_label: string
  period_start: string
  value: number
}

type WorkbenchTab = 'variables' | 'datos' | 'analisis'

interface Props {
  enpi: EnPIRef
  measurementPoints: MeasurementPoint[]
  onClose: () => void
}

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'
const AGG_LABELS: Record<string, string> = {
  sum: 'Suma del periodo',
  average: 'Promedio del periodo',
  max: 'Valor máximo',
  min: 'Valor mínimo',
  last: 'Último valor',
}
const IMPACT_LABELS: Record<string, string> = {
  positive: 'Positivo (+EnPI)', negative: 'Negativo (−EnPI)', neutral: 'Neutro', unknown: 'Desconocido',
}

function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] font-bold text-slate-500">{label}</span>
      {hint && <span className="mb-1 block text-[10px] text-slate-400">{hint}</span>}
      {children}
    </label>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SignificantVariablesWorkbench({ enpi, measurementPoints, onClose }: Props) {
  const [tab, setTab] = useState<WorkbenchTab>('variables')
  const [variables, setVariables] = useState<SigVariable[]>([])
  const [enpiValues, setEnpiValues] = useState<EnpiPeriodValue[]>([])
  const [varValues, setVarValues] = useState<VarPeriodValue[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: vars }, { data: enpiVals }, { data: vVals }] = await Promise.all([
      supabase.from('enpi_significant_variables').select('*').eq('enpi_id', enpi.id).order('sort_order').order('created_at'),
      supabase.from('enpi_period_values').select('*').eq('enpi_id', enpi.id).order('period_start'),
      supabase.from('enpi_variable_period_values').select('*').in(
        'variable_id',
        ((await supabase.from('enpi_significant_variables').select('id').eq('enpi_id', enpi.id)).data || []).map((v) => v.id)
      ).order('period_start'),
    ])
    setVariables((vars || []) as SigVariable[])
    setEnpiValues((enpiVals || []) as EnpiPeriodValue[])
    setVarValues((vVals || []) as VarPeriodValue[])
    setLoading(false)
  }, [enpi.id])

  useEffect(() => { load() }, [load])

  const tabs: Array<{ id: WorkbenchTab; label: string; icon: ReactNode }> = [
    { id: 'variables', label: 'Variables', icon: <Activity size={14} /> },
    { id: 'datos', label: 'Datos de periodos', icon: <BarChart3 size={14} /> },
    { id: 'analisis', label: 'Análisis estadístico', icon: <TrendingUp size={14} /> },
  ]

  return (
    <div className="flex max-h-[85vh] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Variables significativas</p>
          <h2 className="text-base font-black text-slate-950">{enpi.name}</h2>
          <p className="text-xs text-slate-500">Unidad del EnPI: <strong>{enpi.unit}</strong></p>
        </div>
        <button onClick={onClose} className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-slate-700"><X size={15} /></button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] transition-colors',
              tab === t.id ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-400 hover:text-slate-700',
            ].join(' ')}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Cargando...</div>
        ) : tab === 'variables' ? (
          <VariablesTab enpiId={enpi.id} variables={variables} measurementPoints={measurementPoints} onSaved={load} />
        ) : tab === 'datos' ? (
          <DatosTab enpi={enpi} variables={variables} enpiValues={enpiValues} varValues={varValues} onSaved={load} />
        ) : (
          <AnalisisTab enpi={enpi} variables={variables} enpiValues={enpiValues} varValues={varValues} />
        )}
      </div>
    </div>
  )
}

// ─── Tab 1: Variable Configuration ───────────────────────────────────────────

function VariablesTab({
  enpiId, variables, measurementPoints, onSaved,
}: {
  enpiId: string; variables: SigVariable[]; measurementPoints: MeasurementPoint[]; onSaved: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', unit: '', data_type: 'continuous' as 'continuous' | 'discrete',
    aggregation_method: 'average' as SigVariable['aggregation_method'],
    measurement_point_id: '', expected_impact: 'unknown' as SigVariable['expected_impact'],
  })

  // Auto-suggest aggregation based on data type
  function handleDataTypeChange(dt: 'continuous' | 'discrete') {
    setForm({ ...form, data_type: dt, aggregation_method: dt === 'discrete' ? 'sum' : 'average' })
  }

  async function handleSave() {
    setSaving(true)
    await supabase.from('enpi_significant_variables').insert({
      enpi_id: enpiId,
      name: form.name,
      description: form.description || null,
      unit: form.unit,
      data_type: form.data_type,
      aggregation_method: form.aggregation_method,
      measurement_point_id: form.measurement_point_id || null,
      expected_impact: form.expected_impact,
      sort_order: variables.length,
    })
    setSaving(false)
    setShowForm(false)
    setForm({ name: '', description: '', unit: '', data_type: 'continuous', aggregation_method: 'average', measurement_point_id: '', expected_impact: 'unknown' })
    onSaved()
  }

  async function handleDelete(id: string) {
    await supabase.from('enpi_significant_variables').delete().eq('id', id)
    onSaved()
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-3 text-xs leading-5 text-brand-blue">
        <strong>¿Qué es una variable significativa?</strong> Es una condición operativa que puede explicar por qué el EnPI sube o baja entre periodos — producción, temperatura ambiente, turnos, mezcla de producto, etc. Definirlas aquí permite hacer análisis de regresión para cuantificar su impacto real.
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-700">{variables.length} variable(s) configurada(s)</span>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : 'Agregar variable'}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Nueva variable</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nombre" className="sm:col-span-2">
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Producción mensual, Temperatura exterior, Turnos de operación" />
            </Field>
            <Field label="Unidad">
              <input className={inputClass} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="ton, °C, turnos, h, %" />
            </Field>
            <Field label="Tipo de variable" hint="Determina el método de agregación sugerido">
              <select className={inputClass} value={form.data_type} onChange={(e) => handleDataTypeChange(e.target.value as 'continuous' | 'discrete')}>
                <option value="continuous">Continua (temperatura, presión, humedad)</option>
                <option value="discrete">Discreta (producción, lotes, turnos, defectos)</option>
              </select>
            </Field>
            <Field label="Cómo agregar en el periodo" hint="¿Cómo se convierte en un solo número por mes/trimestre?">
              <select className={inputClass} value={form.aggregation_method} onChange={(e) => setForm({ ...form, aggregation_method: e.target.value as SigVariable['aggregation_method'] })}>
                <option value="sum">Suma — producción, defectos, lotes (se acumulan)</option>
                <option value="average">Promedio — temperatura, humedad, presión</option>
                <option value="max">Máximo — demanda pico, temperatura máxima</option>
                <option value="min">Mínimo — temperatura mínima exterior</option>
                <option value="last">Último valor — estado final del periodo</option>
              </select>
            </Field>
            <Field label="Impacto esperado en el EnPI" hint="¿Más de esta variable eleva o baja el EnPI?">
              <select className={inputClass} value={form.expected_impact} onChange={(e) => setForm({ ...form, expected_impact: e.target.value as SigVariable['expected_impact'] })}>
                <option value="unknown">No sé aún</option>
                <option value="positive">Positivo — más variable → EnPI más alto</option>
                <option value="negative">Negativo — más variable → EnPI más bajo</option>
                <option value="neutral">Neutro — variable de control, no de impacto</option>
              </select>
            </Field>
            <Field label="Medidor vinculado (opcional)" hint="Para futura auto-agregación desde lecturas">
              <select className={inputClass} value={form.measurement_point_id} onChange={(e) => setForm({ ...form, measurement_point_id: e.target.value })}>
                <option value="">Sin vínculo a medidor</option>
                {measurementPoints.map((mp) => <option key={mp.id} value={mp.id}>{mp.tag} — {mp.name} ({mp.unit})</option>)}
              </select>
            </Field>
            <Field label="Descripción" className="sm:col-span-2">
              <textarea className={`${inputClass} min-h-[60px] resize-none`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Contexto adicional: por qué esta variable importa, cómo se mide, qué rango es normal." />
            </Field>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" loading={saving} disabled={!form.name || !form.unit} leftIcon={<Save size={13} />} onClick={handleSave}>
              Agregar variable
            </Button>
          </div>
        </div>
      )}

      {variables.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          Sin variables configuradas. Agrega las condiciones operativas que crees que explican la variabilidad del EnPI.
        </div>
      ) : (
        <div className="space-y-2">
          {variables.map((v) => (
            <div key={v.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{v.name}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600">{v.unit}</span>
                  <Badge variant={v.data_type === 'discrete' ? 'info' : 'neutral'} size="sm">
                    {v.data_type === 'discrete' ? 'Discreta' : 'Continua'}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500">
                  <strong>Agregación:</strong> {AGG_LABELS[v.aggregation_method]} ·{' '}
                  <strong>Impacto esperado:</strong> {IMPACT_LABELS[v.expected_impact]}
                </p>
                {v.description && <p className="mt-0.5 text-[11px] text-slate-400">{v.description}</p>}
              </div>
              <button onClick={() => handleDelete(v.id)} className="shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-rose-500">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-700">
        <strong>Guía de selección:</strong> incluye de 2 a 5 variables. Más de 5 con pocos datos puede dar resultados poco confiables. Prioriza las que tienen mayor impacto operativo y que cambian significativamente entre periodos.
      </div>
    </div>
  )
}

// ─── Tab 2: Period Data Entry ─────────────────────────────────────────────────

function DatosTab({
  enpi, variables, enpiValues, varValues, onSaved,
}: {
  enpi: EnPIRef; variables: SigVariable[]; enpiValues: EnpiPeriodValue[]; varValues: VarPeriodValue[]; onSaved: () => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newPeriod, setNewPeriod] = useState({
    period_label: '', period_start: '', period_end: '', enpi_value: '',
    var_values: {} as Record<string, string>,
  })

  const activeVars = variables.filter((v) => v.is_active)

  // Build period matrix: periods sorted by date
  const allPeriodStarts = [...new Set([
    ...enpiValues.map((e) => e.period_start),
    ...varValues.map((v) => v.period_start),
  ])].sort()

  async function handleSavePeriod() {
    if (!newPeriod.period_start || !newPeriod.enpi_value) return
    setSaving(true)
    const label = newPeriod.period_label || newPeriod.period_start.slice(0, 7)
    const periodEnd = newPeriod.period_end || newPeriod.period_start

    // Upsert EnPI value
    await supabase.from('enpi_period_values').upsert({
      enpi_id: enpi.id,
      period_label: label,
      period_start: newPeriod.period_start,
      period_end: periodEnd,
      actual_value: Number(newPeriod.enpi_value),
    }, { onConflict: 'enpi_id,period_start' })

    // Upsert variable values
    for (const v of activeVars) {
      const val = newPeriod.var_values[v.id]
      if (val === undefined || val === '') continue
      await supabase.from('enpi_variable_period_values').upsert({
        variable_id: v.id,
        period_label: label,
        period_start: newPeriod.period_start,
        period_end: periodEnd,
        value: Number(val),
        source: 'manual',
      }, { onConflict: 'variable_id,period_start' })
    }

    setSaving(false)
    setShowAdd(false)
    setNewPeriod({ period_label: '', period_start: '', period_end: '', enpi_value: '', var_values: {} })
    onSaved()
  }

  const completePeriods = allPeriodStarts.filter((ps) => {
    const hasEnpi = enpiValues.some((e) => e.period_start === ps)
    const hasAllVars = activeVars.every((v) => varValues.some((vv) => vv.variable_id === v.id && vv.period_start === ps))
    return hasEnpi && hasAllVars
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">{allPeriodStarts.length} periodos capturados · {completePeriods.length} completos</p>
          <p className="text-xs text-slate-500">Se recomiendan ≥12 periodos completos para regresión confiable.</p>
        </div>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Cancelar' : 'Agregar periodo'}
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Nuevo periodo</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Etiqueta (opcional)">
              <input className={inputClass} value={newPeriod.period_label} onChange={(e) => setNewPeriod({ ...newPeriod, period_label: e.target.value })} placeholder="Ej. Ene-2025, Q1-2025" />
            </Field>
            <Field label="Fecha inicio del periodo" className="required">
              <input className={inputClass} type="date" value={newPeriod.period_start} onChange={(e) => setNewPeriod({ ...newPeriod, period_start: e.target.value })} />
            </Field>
            <Field label="Fecha fin del periodo">
              <input className={inputClass} type="date" value={newPeriod.period_end} onChange={(e) => setNewPeriod({ ...newPeriod, period_end: e.target.value })} />
            </Field>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="mb-2 text-[11px] font-bold text-slate-500">Valores del periodo</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Field label={`★ ${enpi.name} (${enpi.unit}) — Variable respuesta Y`}>
                <input
                  className={`${inputClass} border-brand-blue/30 bg-brand-blue/5`}
                  type="number" step="any"
                  value={newPeriod.enpi_value}
                  onChange={(e) => setNewPeriod({ ...newPeriod, enpi_value: e.target.value })}
                  placeholder={`Valor del EnPI en ${enpi.unit}`}
                />
              </Field>
              {activeVars.map((v) => (
                <Field key={v.id} label={`${v.name} (${v.unit}) — ${AGG_LABELS[v.aggregation_method]}`}>
                  <input
                    className={inputClass}
                    type="number" step="any"
                    value={newPeriod.var_values[v.id] || ''}
                    onChange={(e) => setNewPeriod({ ...newPeriod, var_values: { ...newPeriod.var_values, [v.id]: e.target.value } })}
                    placeholder={`${v.aggregation_method === 'sum' ? 'Total' : 'Valor'} en ${v.unit}`}
                  />
                </Field>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
            <Button variant="secondary" size="sm" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button size="sm" loading={saving} disabled={!newPeriod.period_start || !newPeriod.enpi_value} leftIcon={<Save size={13} />} onClick={handleSavePeriod}>
              Guardar periodo
            </Button>
          </div>
        </div>
      )}

      {allPeriodStarts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          Sin datos de periodos aún. Agrega los valores históricos del EnPI y sus variables periodo a periodo.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-3 py-2 text-left font-black text-slate-500">Periodo</th>
                <th className="px-3 py-2 text-right font-black text-brand-blue">
                  {enpi.unit} <span className="font-normal text-slate-400">(Y)</span>
                </th>
                {activeVars.map((v) => (
                  <th key={v.id} className="px-3 py-2 text-right font-black text-slate-600">
                    {v.name} <span className="font-normal text-slate-400">({v.unit})</span>
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-black text-slate-400">Estado</th>
              </tr>
            </thead>
            <tbody>
              {allPeriodStarts.map((ps) => {
                const enpiVal = enpiValues.find((e) => e.period_start === ps)
                const isComplete = completePeriods.includes(ps)
                return (
                  <tr key={ps} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-semibold text-slate-700">
                      {enpiVal?.period_label || ps.slice(0, 7)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-brand-blue">
                      {enpiVal ? Number(enpiVal.actual_value).toFixed(3) : <span className="text-rose-400">—</span>}
                    </td>
                    {activeVars.map((v) => {
                      const vv = varValues.find((x) => x.variable_id === v.id && x.period_start === ps)
                      return (
                        <td key={v.id} className="px-3 py-2 text-right font-mono text-slate-600">
                          {vv ? Number(vv.value).toLocaleString('es') : <span className="text-rose-400">—</span>}
                        </td>
                      )
                    })}
                    <td className="px-3 py-2 text-center">
                      {isComplete
                        ? <CheckCircle2 size={14} className="mx-auto text-emerald-500" />
                        : <AlertTriangle size={14} className="mx-auto text-amber-400" />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {allPeriodStarts.length > 0 && completePeriods.length < 8 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          Tienes {completePeriods.length} periodo(s) completo(s). Para análisis estadístico confiable se recomienda tener al menos 8–12 periodos donde todas las variables estén capturadas.
        </div>
      )}
    </div>
  )
}

// ─── Tab 3: Statistical Analysis ──────────────────────────────────────────────

function AnalisisTab({
  enpi, variables, enpiValues, varValues,
}: {
  enpi: EnPIRef; variables: SigVariable[]; enpiValues: EnpiPeriodValue[]; varValues: VarPeriodValue[]
}) {
  const [selectedVarIds, setSelectedVarIds] = useState<Set<string>>(new Set())
  const [step, setStep] = useState<'correlation' | 'model' | 'results'>('correlation')
  const [regressionResult, setRegressionResult] = useState<ReturnType<typeof runRegression> | null>(null)

  const activeVars = variables.filter((v) => v.is_active)

  // Build aligned dataset: only periods where ALL variables + EnPI have values
  const completePeriods = buildCompleteDataset(enpiValues, varValues, activeVars)
  const n = completePeriods.length

  // ── Correlation analysis
  const correlations = activeVars.map((v) => {
    const varSeries = completePeriods.map((p) => p.varValues[v.id] ?? NaN)
    const enpiSeries = completePeriods.map((p) => p.enpiValue)
    const r = pearsonR(varSeries, enpiSeries)
    return { variable: v, r, interp: interpretR(r) }
  })

  // Correlation between independent variables (for multicollinearity warning)
  const varCorrMatrix = correlationMatrix(
    activeVars.map((v) => completePeriods.map((p) => p.varValues[v.id] ?? 0))
  )

  function toggleVar(id: string) {
    const next = new Set(selectedVarIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedVarIds(next)
    setRegressionResult(null)
    setStep('correlation')
  }

  function handleRunRegression() {
    const selected = activeVars.filter((v) => selectedVarIds.has(v.id))
    if (selected.length === 0 || n < 3) return
    const y = completePeriods.map((p) => p.enpiValue)
    const X = completePeriods.map((p) => selected.map((v) => p.varValues[v.id] ?? 0))
    const result = runRegression(selected, X, y, enpi)
    setRegressionResult(result)
    setStep('results')
  }

  if (n === 0) {
    return (
      <div className="space-y-4">
        <InfoBox icon={<Info size={16} />} color="blue">
          <strong>Sin datos suficientes.</strong> Completa al menos 3 periodos en la pestaña "Datos de periodos" donde el EnPI y todas las variables tengan valor.
        </InfoBox>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Data summary */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
        <CheckCircle2 size={14} className={n >= 12 ? 'text-emerald-500' : n >= 8 ? 'text-amber-500' : 'text-rose-400'} />
        <span><strong>{n}</strong> periodos completos disponibles para análisis
          {n < 8 && ' — ⚠ Se recomiendan ≥8 para resultados confiables'}
          {n >= 12 && ' — ✓ Suficiente para regresión múltiple'}
        </span>
      </div>

      {/* ── Section 1: Correlation ── */}
      <section>
        <SectionHeader
          step={1}
          title="Análisis de correlación"
          subtitle="¿Qué variables están más asociadas con el EnPI? (r de Pearson)"
        />

        {activeVars.length === 0 ? (
          <InfoBox icon={<AlertTriangle size={14} />} color="amber">Sin variables configuradas. Ve a la pestaña Variables.</InfoBox>
        ) : (
          <div className="space-y-2">
            {correlations.map(({ variable: v, r, interp }) => {
              const direction = r > 0 ? <TrendingUp size={13} className="text-rose-400" /> : <TrendingDown size={13} className="text-emerald-500" />
              const isSelected = selectedVarIds.has(v.id)
              return (
                <div
                  key={v.id}
                  className={[
                    'flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition',
                    isSelected ? 'border-brand-blue bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300',
                  ].join(' ')}
                  onClick={() => toggleVar(v.id)}
                >
                  <input type="checkbox" checked={isSelected} onChange={() => toggleVar(v.id)} className="shrink-0 rounded" onClick={(e) => e.stopPropagation()} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{v.name}</span>
                      <span className="text-[11px] text-slate-400">{v.unit}</span>
                      <Badge variant="neutral" size="sm">{v.aggregation_method === 'sum' ? 'Suma' : v.aggregation_method === 'average' ? 'Promedio' : v.aggregation_method}</Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                      <span>Impacto esperado: {IMPACT_LABELS[v.expected_impact]}</span>
                      {v.expected_impact !== 'unknown' && (
                        <span className={r * (v.expected_impact === 'positive' ? 1 : v.expected_impact === 'negative' ? -1 : 0) >= 0
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                        }>
                          {r * (v.expected_impact === 'positive' ? 1 : -1) >= 0 ? '✓ Signo coincide' : '⚠ Signo opuesto al esperado'}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Correlation bar */}
                  <div className="flex shrink-0 items-center gap-2">
                    {direction}
                    <div className="relative h-2 w-20 rounded-full bg-slate-200">
                      <div
                        className={`absolute left-0 top-0 h-2 rounded-full ${Math.abs(r) >= 0.7 ? 'bg-emerald-500' : Math.abs(r) >= 0.5 ? 'bg-amber-400' : 'bg-rose-400'}`}
                        style={{ width: `${Math.abs(r) * 100}%` }}
                      />
                    </div>
                    <div className="w-28 text-right">
                      <span className={`font-mono text-sm font-bold ${interp.color}`}>{isNaN(r) ? 'N/A' : r.toFixed(3)}</span>
                      <span className={`ml-1 text-[10px] ${interp.color}`}>{interp.label}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Inter-variable correlation warning */}
        {activeVars.length >= 2 && (() => {
          const pairs: Array<{ a: string; b: string; r: number }> = []
          for (let i = 0; i < activeVars.length; i++)
            for (let j = i + 1; j < activeVars.length; j++) {
              const r = varCorrMatrix[i][j]
              if (Math.abs(r) > 0.80) pairs.push({ a: activeVars[i].name, b: activeVars[j].name, r })
            }
          return pairs.length > 0 ? (
            <InfoBox icon={<AlertTriangle size={14} />} color="amber">
              <strong>Posible multicolinealidad:</strong> {pairs.map((p) => `${p.a} y ${p.b} (r=${p.r.toFixed(2)})`).join(', ')} están altamente correlacionadas entre sí. Si las incluyes juntas en el modelo, los coeficientes individuales pueden ser inestables. Considera incluir solo una de ellas.
            </InfoBox>
          ) : null
        })()}
      </section>

      {/* ── Section 2: Model selection ── */}
      {selectedVarIds.size > 0 && (
        <section>
          <SectionHeader
            step={2}
            title="Configurar el modelo"
            subtitle={`${selectedVarIds.size} variable(s) seleccionada(s) para la regresión`}
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm text-slate-600">
              Modelo: <strong>EnPI = β₀ + {activeVars.filter((v) => selectedVarIds.has(v.id)).map((v, i) => `β${i + 1}·${v.name}`).join(' + ')}</strong>
            </div>
            <Button size="sm" leftIcon={<Activity size={14} />} onClick={handleRunRegression} disabled={n < 3}>
              Ejecutar regresión OLS
            </Button>
          </div>
          {n < selectedVarIds.size + 2 && (
            <InfoBox icon={<AlertTriangle size={14} />} color="amber">
              Con {n} periodos y {selectedVarIds.size} variable(s), el modelo está sobredeterminado. Necesitas al menos {selectedVarIds.size + 2} periodos completos.
            </InfoBox>
          )}
        </section>
      )}

      {/* ── Section 3: Results ── */}
      {regressionResult && step === 'results' && (
        <section>
          <SectionHeader
            step={3}
            title="Resultados de la regresión"
            subtitle={`OLS con ${regressionResult.n} observaciones · ${regressionResult.k} variable(s)`}
          />

          {/* R² quality */}
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className={`text-lg font-black ${regressionResult.r2Interp.color}`}>
              {regressionResult.r2Interp.label}
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-600">{regressionResult.r2Interp.advice}</p>
            {regressionResult.adjR2 !== undefined && (
              <p className="mt-1 text-[11px] text-slate-400">
                R² ajustado: {(regressionResult.adjR2 * 100).toFixed(1)}% · Error estándar residual: {regressionResult.residualSE.toFixed(4)} {enpi.unit}
              </p>
            )}
          </div>

          {/* Equation */}
          <div className="mb-4 rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4">
            <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-brand-blue">Ecuación del modelo</p>
            <p className="font-mono text-sm font-bold text-slate-900">{regressionResult.equation}</p>
          </div>

          {/* Coefficients table */}
          <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2 text-left font-black text-slate-500">Variable</th>
                  <th className="px-3 py-2 text-right font-black text-slate-500">Coeficiente β</th>
                  <th className="px-3 py-2 text-right font-black text-slate-500">t-stat</th>
                  <th className="px-3 py-2 text-left font-black text-slate-500">Significancia</th>
                  <th className="px-3 py-2 text-left font-black text-slate-500">VIF</th>
                  <th className="px-3 py-2 text-left font-black text-slate-500">Interpretación</th>
                </tr>
              </thead>
              <tbody>
                {regressionResult.coefficients.map((c, i) => {
                  const sig = significanceLabel(c.significance)
                  return (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-semibold text-slate-700">{c.name}</td>
                      <td className={`px-3 py-2 text-right font-mono font-bold ${c.beta > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {c.beta >= 0 ? '+' : ''}{c.beta.toFixed(4)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">{c.tStat.toFixed(2)}</td>
                      <td className={`px-3 py-2 ${sig.color}`}>{sig.label}</td>
                      <td className="px-3 py-2">
                        {c.vif !== undefined ? (() => {
                          const vifInterp = interpretVIF(c.vif)
                          return <span className={vifInterp.color}>{vifInterp.label.split('—')[0].trim()}</span>
                        })() : '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-500 max-w-xs">{c.interpretation}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Residuals check */}
          <div className="mb-4">
            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Verificación visual de residuos</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-end gap-1 h-16">
                {regressionResult.residuals.map((r, i) => {
                  const maxAbs = Math.max(...regressionResult.residuals.map(Math.abs), 0.001)
                  const h = Math.abs(r) / maxAbs * 56
                  return (
                    <div key={i} className="flex flex-col items-center flex-1 min-w-0">
                      <div
                        className={`w-full rounded-t-sm ${r > 0 ? 'bg-rose-300' : 'bg-emerald-300'}`}
                        style={{ height: `${h}px`, alignSelf: r > 0 ? 'flex-end' : 'flex-start' }}
                        title={`Periodo ${i + 1}: residuo ${r.toFixed(4)}`}
                      />
                    </div>
                  )
                })}
              </div>
              <p className="mt-2 text-[10px] text-slate-400">Residuos por periodo (barras arriba = sobreestimado, abajo = subestimado). Busca que sean aleatorios sin patrón sistemático.</p>
            </div>
          </div>

          {/* Descriptive stats of residuals */}
          {(() => {
            const res = regressionResult.residuals
            const meanRes = mean(res)
            const sdRes = stddev(res)
            const hasPattern = Math.abs(meanRes) > sdRes * 0.3
            return (
              <InfoBox icon={hasPattern ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />} color={hasPattern ? 'amber' : 'green'}>
                Media de residuos: {meanRes.toFixed(4)} {enpi.unit} · Desv. estándar: {sdRes.toFixed(4)} {enpi.unit}
                {hasPattern
                  ? ' — Hay sesgo sistemático. El modelo podría mejorar con transformación de variables o incluyendo un driver no capturado.'
                  : ' — Los residuos son aproximadamente centrados en cero, lo cual es indicativo de un buen ajuste.'}
              </InfoBox>
            )
          })()}

          {/* Final recommendation */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Lightbulb size={15} className="text-amber-500" />
              <p className="text-sm font-black text-slate-950">Recomendación para el ingeniero</p>
            </div>
            <ul className="space-y-1.5 text-xs leading-5 text-slate-600">
              {regressionResult.r2Interp.canUseForNormalization && (
                <li className="flex gap-2"><ChevronRight size={12} className="mt-0.5 shrink-0 text-emerald-500" />
                  El modelo puede usarse para <strong>ajustar comparaciones del EnPI por condiciones</strong>: periodos con mayor producción o temperatura pueden normalizarse.
                </li>
              )}
              {!regressionResult.r2Interp.canUseForNormalization && (
                <li className="flex gap-2"><ChevronRight size={12} className="mt-0.5 shrink-0 text-amber-500" />
                  El ajuste actual no es suficiente para normalizar el EnPI. Considera agregar más periodos o incluir otras variables relevantes.
                </li>
              )}
              {regressionResult.coefficients.filter((c) => c.name !== 'Intercepto' && c.significance === 'none').map((c) => (
                <li key={c.name} className="flex gap-2"><ChevronRight size={12} className="mt-0.5 shrink-0 text-slate-400" />
                  <strong>{c.name}</strong> no es estadísticamente significativa con estos datos. No significa que no importe — puede ser que los datos no cubran suficiente variabilidad operativa.
                </li>
              ))}
              {regressionResult.coefficients.filter((c) => c.vif !== undefined && c.vif > 5).map((c) => (
                <li key={c.name} className="flex gap-2"><ChevronRight size={12} className="mt-0.5 shrink-0 text-rose-500" />
                  <strong>{c.name}</strong> tiene VIF alto ({c.vif?.toFixed(1)}). Sus coeficientes son inestables por colinealidad con otra variable del modelo.
                </li>
              ))}
              <li className="flex gap-2"><ChevronRight size={12} className="mt-0.5 shrink-0 text-slate-400" />
                Guarda estos resultados en Evidencia SGEn si los usas para tomar decisiones sobre el baseline.
              </li>
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}

// ─── Analysis helpers ─────────────────────────────────────────────────────────

interface CompletePeriod {
  periodLabel: string
  periodStart: string
  enpiValue: number
  varValues: Record<string, number>
}

function buildCompleteDataset(
  enpiValues: EnpiPeriodValue[],
  varValues: VarPeriodValue[],
  activeVars: SigVariable[]
): CompletePeriod[] {
  return enpiValues
    .map((ep) => {
      const varMap: Record<string, number> = {}
      for (const v of activeVars) {
        const vv = varValues.find((x) => x.variable_id === v.id && x.period_start === ep.period_start)
        if (!vv) return null
        varMap[v.id] = vv.value
      }
      return { periodLabel: ep.period_label, periodStart: ep.period_start, enpiValue: ep.actual_value, varValues: varMap }
    })
    .filter((p): p is CompletePeriod => p !== null)
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart))
}

interface RegressionOutput {
  n: number
  k: number
  r2: number
  adjR2: number
  residualSE: number
  r2Interp: ReturnType<typeof interpretR2>
  equation: string
  coefficients: Array<{
    name: string
    beta: number
    tStat: number
    significance: 'very_high' | 'high' | 'marginal' | 'none'
    vif?: number
    interpretation: string
  }>
  predicted: number[]
  residuals: number[]
}

function runRegression(
  selectedVars: SigVariable[],
  X: number[][],
  y: number[],
  enpi: EnPIRef
): RegressionOutput | null {
  const k = selectedVars.length
  const n = X.length

  let beta: number[]
  let r2: number
  let adjR2: number
  let residualSE: number
  let tStats: number[]
  let significances: Array<'very_high' | 'high' | 'marginal' | 'none'>
  let vifs: number[]
  let predicted: number[]
  let residuals: number[]

  if (k === 1) {
    const res = simpleOLS(X.map((r) => r[0]), y)
    beta = [res.intercept, res.slope]
    r2 = res.r2
    adjR2 = res.adjR2
    residualSE = res.residualSE
    tStats = [0, res.slopeTE]
    significances = ['none', res.significance]
    vifs = [1]
    predicted = res.predicted
    residuals = res.residuals
  } else {
    const res = multipleOLS(X, y)
    if (!res) return null
    beta = res.beta
    r2 = res.r2
    adjR2 = res.adjR2
    residualSE = res.residualSE
    tStats = res.tStats
    significances = res.significance
    vifs = res.vif
    predicted = res.predicted
    residuals = res.residuals
  }

  const r2Interp = interpretR2(r2, n, k)

  // Build equation string
  const interceptStr = beta[0] >= 0 ? beta[0].toFixed(4) : `(${beta[0].toFixed(4)})`
  const terms = selectedVars.map((v, i) => {
    const b = beta[i + 1]
    const sign = b >= 0 ? ' + ' : ' − '
    return `${sign}${Math.abs(b).toFixed(4)}·${v.name}`
  })
  const equation = `${enpi.unit} = ${interceptStr}${terms.join('')}`

  // Build coefficient rows
  const coefficients = [
    {
      name: 'Intercepto (β₀)',
      beta: beta[0],
      tStat: tStats[0],
      significance: significances[0],
      vif: undefined,
      interpretation: 'Valor del EnPI cuando todas las variables son cero (puede no tener sentido físico directo)',
    },
    ...selectedVars.map((v, i) => {
      const b = beta[i + 1]
      const up = b > 0 ? 'aumenta' : 'disminuye'
      const interpretation = `Por cada unidad adicional de ${v.name} (${v.unit}), el EnPI ${up} en ${Math.abs(b).toFixed(4)} ${enpi.unit}, manteniendo las demás variables constantes.`
      return {
        name: v.name,
        beta: b,
        tStat: tStats[i + 1],
        significance: significances[i + 1],
        vif: vifs[i],
        interpretation,
      }
    }),
  ]

  return { n, k, r2, adjR2, residualSE, r2Interp, equation, coefficients, predicted, residuals }
}

// ─── UI Sub-components ───────────────────────────────────────────────────────

function SectionHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">{step}</div>
      <div>
        <p className="text-sm font-black text-slate-950">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  )
}

function InfoBox({ icon, color, children }: { icon: ReactNode; color: 'blue' | 'amber' | 'green' | 'red'; children: ReactNode }) {
  const styles = {
    blue: 'border-brand-blue/20 bg-brand-blue/5 text-brand-blue',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    red: 'border-rose-200 bg-rose-50 text-rose-700',
  }
  return (
    <div className={`flex items-start gap-2 rounded-xl border p-3 text-xs leading-5 ${styles[color]}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  )
}
