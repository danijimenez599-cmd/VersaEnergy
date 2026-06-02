import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/services/supabase'
import { PageHeader } from '@/shared/PageHeader'
import { Button } from '@/shared/Button'
import { Badge } from '@/shared/Badge'
import { Card } from '@/shared/Card'
import { EmptyState } from '@/shared/EmptyState'
import { Modal } from '@/shared/Modal'
import { useUIStore } from '@/store/uiStore'
import {
  OperationalContextBanner,
  OperationalContextSummary,
  getUtilityLabel,
} from '@/shared/OperationalContext'
import {
  TrendingUp, Plus, Target, Save, X, TrendingDown,
  AlertTriangle, CheckCircle, ChevronRight, BarChart2,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface EnPI {
  id: string; name: string; utility: string; unit: string
  scope: string; frequency: string; is_active: boolean; description?: string
  baselines?: Baseline[]; targets?: Target[]; results?: PerformanceResult[]
}

interface Baseline {
  id: string; value: number; version: number; method: string
  period_start?: string; period_end?: string; unit: string
}

interface Target {
  id: string; name: string; target_type: string; target_value: number
  unit: string; status: string; deadline?: string
}

interface PerformanceResult {
  id: string; period_start: string; actual_value: number
  baseline_value: number; deviation_percent: number
}

// ─── Modal form shapes ──────────────────────────────────────────────────────

type EnPIFormModal = { open: boolean; enpiId: string | null }

const EMPTY_ENPI = { name: '', utility: 'electricity', unit: 'kWh/ton', scope: 'site', frequency: 'monthly', description: '' }
const EMPTY_BASELINE = { value: '', method: 'average', period_start: '', period_end: '' }
const EMPTY_TARGET = { name: '', target_type: 'absolute_value', target_value: '', deadline: '' }

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function DesempenoPage() {
  const [enpis, setEnpis] = useState<EnPI[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  // Modals
  const [showEnPIForm, setShowEnPIForm] = useState(false)
  const [baselineModal, setBaselineModal] = useState<EnPIFormModal>({ open: false, enpiId: null })
  const [targetModal, setTargetModal] = useState<EnPIFormModal>({ open: false, enpiId: null })

  const { selectedSiteId, selectedUtilityType } = useUIStore()

  const loadEnpis = useCallback(async () => {
    if (!selectedSiteId) { setEnpis([]); return }
    setLoading(true)
    let q = supabase.from('energy_enpis').select('*').eq('site_id', selectedSiteId).order('name')
    if (selectedUtilityType) q = q.eq('utility', selectedUtilityType)
    const { data } = await q
    if (!data) { setLoading(false); return }

    const enriched: EnPI[] = await Promise.all(data.map(async (enpi) => {
      const [{ data: bl }, { data: tg }, { data: rs }] = await Promise.all([
        supabase.from('energy_baselines').select('*').eq('enpi_id', enpi.id).order('version', { ascending: false }).limit(3),
        supabase.from('energy_targets').select('*').eq('enpi_id', enpi.id).order('created_at', { ascending: false }),
        supabase.from('energy_performance_results').select('*').eq('enpi_id', enpi.id).order('period_start', { ascending: false }).limit(12),
      ])
      return { ...enpi, baselines: bl || [], targets: tg || [], results: rs || [] }
    }))
    setEnpis(enriched)
    setLoading(false)
  }, [selectedSiteId, selectedUtilityType])

  useEffect(() => { loadEnpis() }, [loadEnpis])

  async function handleCreateEnPI(form: typeof EMPTY_ENPI) {
    if (!selectedSiteId || !form.name) return
    await supabase.from('energy_enpis').insert({
      site_id: selectedSiteId, name: form.name, utility: form.utility,
      unit: form.unit, scope: form.scope, frequency: form.frequency,
      description: form.description, formula: { numerator: '', denominator: '' },
    })
    setShowEnPIForm(false)
    loadEnpis()
  }

  async function handleAddBaseline(enpiId: string, form: typeof EMPTY_BASELINE) {
    const enpi = enpis.find((e) => e.id === enpiId)
    if (!enpi || !form.value) return
    const maxVersion = Math.max(0, ...(enpi.baselines?.map((b) => b.version) || []))
    await supabase.from('energy_baselines').insert({
      enpi_id: enpiId, method: form.method, value: parseFloat(form.value),
      unit: enpi.unit, version: maxVersion + 1,
      period_start: form.period_start || null, period_end: form.period_end || null,
    })
    setBaselineModal({ open: false, enpiId: null })
    loadEnpis()
  }

  async function handleAddTarget(enpiId: string, form: typeof EMPTY_TARGET) {
    const enpi = enpis.find((e) => e.id === enpiId)
    if (!enpi || !form.name || !form.target_value) return
    await supabase.from('energy_targets').insert({
      enpi_id: enpiId, name: form.name, target_type: form.target_type,
      target_value: parseFloat(form.target_value), unit: enpi.unit,
      deadline: form.deadline || null,
    })
    setTargetModal({ open: false, enpiId: null })
    loadEnpis()
  }

  async function handleDeleteEnPI(id: string) {
    if (!confirm('¿Eliminar este EnPI y sus datos históricos?')) return
    await supabase.from('energy_enpis').delete().eq('id', id)
    loadEnpis()
  }

  return (
    <div>
      <PageHeader
        title="Desempeño Energético"
        description="EnPI, líneas base y objetivos de rendimiento"
        actions={
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowEnPIForm(true)} disabled={!selectedSiteId}>
            Nuevo EnPI
          </Button>
        }
      />
      <OperationalContextSummary />
      <OperationalContextBanner />

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">Cargando...</div>
      ) : enpis.length === 0 ? (
        <EmptyState
          icon={<TrendingUp size={48} strokeWidth={1.5} />}
          title="Sin EnPIs"
          description={`No hay indicadores de desempeño para ${getUtilityLabel(selectedUtilityType)} en este sitio.`}
          action={selectedSiteId && (
            <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowEnPIForm(true)}>Crear primer EnPI</Button>
          )}
        />
      ) : (
        <div className="space-y-4">
          {enpis.map((enpi) => {
            const latestBaseline = enpi.baselines?.[0]
            const activeTargets = enpi.targets?.filter((t) => t.status !== 'achieved') || []
            const isSelected = selected === enpi.id

            // Build chart data
            const chartData = (enpi.results || []).slice().reverse().map((r) => ({
              period: new Date(r.period_start).toLocaleDateString('es', { month: 'short', year: '2-digit' }),
              actual: r.actual_value,
              baseline: r.baseline_value || latestBaseline?.value,
              dev: r.deviation_percent,
            }))

            const lastResult = enpi.results?.[0]
            const lastDev = lastResult?.deviation_percent || 0

            return (
              <Card key={enpi.id} padding="md">
                <div className="flex items-start justify-between gap-3">
                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-gray-800">{enpi.name}</h3>
                      <Badge color="teal" size="sm">{enpi.utility}</Badge>
                      <span className="text-xs font-mono text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">{enpi.unit}</span>
                      <Badge color="gray" size="sm">{enpi.scope}</Badge>
                    </div>

                    {/* Baseline + target inline */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                      {latestBaseline ? (
                        <span className="flex items-center gap-1">
                          <BarChart2 size={11} className="text-brand-blue" />
                          Baseline v{latestBaseline.version}: <strong className="text-gray-700 ml-1">{latestBaseline.value} {enpi.unit}</strong>
                        </span>
                      ) : (
                        <span className="text-amber-600 flex items-center gap-1">
                          <AlertTriangle size={11} /> Sin baseline
                        </span>
                      )}
                      {activeTargets.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Target size={11} className="text-brand-blue" />
                          {activeTargets.length} objetivo(s) activo(s)
                        </span>
                      )}
                      {lastResult && (
                        <span className={`flex items-center gap-1 font-medium ${lastDev > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                          {lastDev > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {lastDev > 0 ? '+' : ''}{lastDev.toFixed(1)}% vs baseline
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <Button variant="ghost" size="sm" leftIcon={<BarChart2 size={12} />}
                      onClick={() => setBaselineModal({ open: true, enpiId: enpi.id })}>Baseline</Button>
                    <Button variant="ghost" size="sm" leftIcon={<Target size={12} />}
                      onClick={() => setTargetModal({ open: true, enpiId: enpi.id })}>Objetivo</Button>
                    <button onClick={() => setSelected(isSelected ? null : enpi.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer px-2 py-1 rounded hover:bg-gray-100">
                      {isSelected ? '▲ Menos' : '▼ Más'}
                    </button>
                    <button onClick={() => handleDeleteEnPI(enpi.id)}
                      className="text-[11px] text-gray-300 hover:text-red-500 cursor-pointer p-1 rounded hover:bg-red-50">
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Expanded: chart + targets */}
                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-border space-y-4">
                    {chartData.length > 1 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tendencia</p>
                        <ResponsiveContainer width="100%" height={140}>
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id={`grad-${enpi.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1e40af" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#1e40af" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="period" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={45} />
                            <Tooltip contentStyle={{ fontSize: 11 }} />
                            {latestBaseline && (
                              <ReferenceLine y={latestBaseline.value} stroke="#ea580c" strokeDasharray="4 2"
                                label={{ value: 'Baseline', position: 'right', fontSize: 10, fill: '#ea580c' }} />
                            )}
                            <Area type="monotone" dataKey="actual" stroke="#1e40af" strokeWidth={2}
                              fill={`url(#grad-${enpi.id})`} dot={{ r: 3, fill: '#1e40af' }} name={enpi.unit} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Targets */}
                    {(enpi.targets || []).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Objetivos</p>
                        <div className="space-y-1.5">
                          {enpi.targets!.map((t) => (
                            <div key={t.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 border border-border">
                              <Target size={13} className="text-brand-blue shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-700">{t.name}</span>
                                <span className="text-xs text-gray-400 ml-2">→ {t.target_value} {enpi.unit}</span>
                              </div>
                              {t.deadline && <span className="text-xs text-gray-400">{new Date(t.deadline).toLocaleDateString()}</span>}
                              <Badge size="sm" color={t.status === 'achieved' ? 'green' : t.status === 'at_risk' ? 'orange' : 'gray'}>
                                {t.status === 'achieved' ? 'Logrado' : t.status === 'at_risk' ? 'En riesgo' : 'Activo'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Baselines */}
                    {(enpi.baselines || []).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Historial de baselines</p>
                        <div className="space-y-1">
                          {enpi.baselines!.map((b) => (
                            <div key={b.id} className="flex items-center gap-3 text-xs text-gray-600 px-3 py-1.5 rounded bg-blue-50/50 border border-blue-100/60">
                              <BarChart2 size={12} className="text-brand-blue" />
                              <span>v{b.version}</span>
                              <strong>{b.value} {enpi.unit}</strong>
                              <span className="text-gray-400">{b.method}</span>
                              {b.period_start && <span className="text-gray-400">{new Date(b.period_start).toLocaleDateString()} — {b.period_end ? new Date(b.period_end).toLocaleDateString() : 'hoy'}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Create EnPI modal */}
      <Modal open={showEnPIForm} onClose={() => setShowEnPIForm(false)} title="Nuevo EnPI">
        <EnPIForm onSave={handleCreateEnPI} onCancel={() => setShowEnPIForm(false)} utilityType={selectedUtilityType} />
      </Modal>

      {/* Baseline modal */}
      <Modal
        open={baselineModal.open}
        onClose={() => setBaselineModal({ open: false, enpiId: null })}
        title="Registrar baseline"
      >
        {baselineModal.enpiId && (
          <BaselineForm
            enpi={enpis.find((e) => e.id === baselineModal.enpiId)!}
            onSave={(f) => handleAddBaseline(baselineModal.enpiId!, f)}
            onCancel={() => setBaselineModal({ open: false, enpiId: null })}
          />
        )}
      </Modal>

      {/* Target modal */}
      <Modal
        open={targetModal.open}
        onClose={() => setTargetModal({ open: false, enpiId: null })}
        title="Nuevo objetivo"
      >
        {targetModal.enpiId && (
          <TargetForm
            enpi={enpis.find((e) => e.id === targetModal.enpiId)!}
            onSave={(f) => handleAddTarget(targetModal.enpiId!, f)}
            onCancel={() => setTargetModal({ open: false, enpiId: null })}
          />
        )}
      </Modal>
    </div>
  )
}

// ─── EnPI Form ─────────────────────────────────────────────────────────────────

function EnPIForm({ onSave, onCancel, utilityType }: {
  onSave: (f: typeof EMPTY_ENPI) => void
  onCancel: () => void
  utilityType: string | null
}) {
  const [form, setForm] = useState({ ...EMPTY_ENPI, utility: utilityType || 'electricity' })
  const s = (p: Partial<typeof EMPTY_ENPI>) => setForm({ ...form, ...p })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Nombre del indicador *</label>
          <input value={form.name} onChange={(e) => s({ name: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
            placeholder="Ej: Consumo eléctrico por tonelada" autoFocus />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Utility</label>
          <select value={form.utility} onChange={(e) => s({ utility: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface cursor-pointer">
            {[['electricity','Electricidad'],['natural_gas','Gas natural'],['steam','Vapor'],
              ['compressed_air','Aire comprimido'],['chilled_water','Agua helada'],
              ['diesel','Diésel'],['lpg','GLP'],['solar_generation','Solar']
            ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Unidad *</label>
          <input value={form.unit} onChange={(e) => s({ unit: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
            placeholder="kWh/ton" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Alcance</label>
          <select value={form.scope} onChange={(e) => s({ scope: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface cursor-pointer">
            {[['site','Sitio'],['area','Área'],['equipment','Equipo'],['process','Proceso']].map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Frecuencia</label>
          <select value={form.frequency} onChange={(e) => s({ frequency: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface cursor-pointer">
            {[['daily','Diario'],['weekly','Semanal'],['monthly','Mensual'],['annual','Anual']].map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Descripción</label>
          <textarea rows={2} value={form.description} onChange={(e) => s({ description: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
            placeholder="Descripción opcional" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" onClick={() => onSave(form)} disabled={!form.name} leftIcon={<Save size={13} />}>
          Crear EnPI
        </Button>
      </div>
    </div>
  )
}

// ─── Baseline Form ─────────────────────────────────────────────────────────────

function BaselineForm({ enpi, onSave, onCancel }: {
  enpi: EnPI; onSave: (f: typeof EMPTY_BASELINE) => void; onCancel: () => void
}) {
  const [form, setForm] = useState({ ...EMPTY_BASELINE })
  const s = (p: Partial<typeof EMPTY_BASELINE>) => setForm({ ...form, ...p })
  const existingVersions = enpi.baselines?.length || 0

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
        EnPI: <strong>{enpi.name}</strong> · Unidad: <strong className="font-mono">{enpi.unit}</strong>
        {existingVersions > 0 && ` · Baseline actual: v${enpi.baselines![0].value} ${enpi.unit}`}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Valor del baseline *</label>
          <div className="flex items-center gap-1.5">
            <input type="number" step="any" value={form.value} onChange={(e) => s({ value: e.target.value })}
              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              placeholder="0.00" autoFocus />
            <span className="text-sm text-gray-400 font-mono">{enpi.unit}</span>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Método</label>
          <select value={form.method} onChange={(e) => s({ method: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface cursor-pointer">
            {[['average','Promedio histórico'],['regression','Regresión'],['manual','Manual/Experto'],['standard','Estándar industria']].map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Periodo inicio</label>
          <input type="date" value={form.period_start} onChange={(e) => s({ period_start: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Periodo fin</label>
          <input type="date" value={form.period_end} onChange={(e) => s({ period_end: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" onClick={() => onSave(form)} disabled={!form.value} leftIcon={<Save size={13} />}>
          Guardar baseline
        </Button>
      </div>
    </div>
  )
}

// ─── Target Form ───────────────────────────────────────────────────────────────

function TargetForm({ enpi, onSave, onCancel }: {
  enpi: EnPI; onSave: (f: typeof EMPTY_TARGET) => void; onCancel: () => void
}) {
  const [form, setForm] = useState({ ...EMPTY_TARGET })
  const s = (p: Partial<typeof EMPTY_TARGET>) => setForm({ ...form, ...p })
  const latestBaseline = enpi.baselines?.[0]

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
        EnPI: <strong>{enpi.name}</strong> · Unidad: <strong className="font-mono">{enpi.unit}</strong>
        {latestBaseline && ` · Baseline: ${latestBaseline.value} ${enpi.unit}`}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Nombre del objetivo *</label>
          <input value={form.name} onChange={(e) => s({ name: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
            placeholder="Ej: Reducción 10% anual" autoFocus />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tipo de objetivo</label>
          <select value={form.target_type} onChange={(e) => s({ target_type: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface cursor-pointer">
            {[['absolute_value','Valor absoluto'],['percent_reduction','% reducción vs baseline'],['benchmark','Benchmark industria']].map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            {form.target_type === 'percent_reduction' ? 'Reducción (%)' : `Valor (${enpi.unit})`} *
          </label>
          <input type="number" step="any" value={form.target_value} onChange={(e) => s({ target_value: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Fecha límite</label>
          <input type="date" value={form.deadline} onChange={(e) => s({ deadline: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
        </div>
      </div>
      {form.target_type === 'percent_reduction' && latestBaseline && form.target_value && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-700">
          <CheckCircle size={12} />
          Objetivo calculado: {(latestBaseline.value * (1 - parseFloat(form.target_value) / 100)).toFixed(2)} {enpi.unit}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" onClick={() => onSave(form)} disabled={!form.name || !form.target_value}
          leftIcon={<ChevronRight size={13} />}>
          Crear objetivo
        </Button>
      </div>
    </div>
  )
}
