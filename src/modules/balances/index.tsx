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
  getEnergyPeriodRange,
  getUtilityLabel,
} from '@/shared/OperationalContext'
import {
  Scale, Calculator, ChevronRight, AlertTriangle,
  CheckCircle, Info, TrendingDown, BarChart2, Minus, Plus,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BalanceRow {
  id: string; utility: string; period_start: string; period_end: string
  total_input: number; measured_consumption: number; unaccounted_for: number
  unaccounted_for_percent: number; measurement_coverage: number
  status: string; node_results: BalanceNodeResult[]
  site_id: string; diagram_version_id?: string; notes?: string
}

interface BalanceNodeResult {
  nodeId: string; tag: string; consumption: number; coverage: string
}

interface DiagramMeta {
  id: string; name: string; utility_type: string | null; status: string
}

interface MPRow {
  id: string; tag: string; name: string; utility: string; unit: string; measurement_type: string
}

// ─── Wizard steps ─────────────────────────────────────────────────────────────

const WIZARD_STEPS = [
  { n: 1, label: 'Configurar' },
  { n: 2, label: 'Revisar datos' },
  { n: 3, label: 'Resultado' },
]

// ─── Coverage color ──────────────────────────────────────────────────────────

function coveragePct(pct: number): { color: string; label: string } {
  if (pct >= 80) return { color: 'text-emerald-600', label: 'Buena cobertura' }
  if (pct >= 50) return { color: 'text-amber-600', label: 'Cobertura parcial' }
  return { color: 'text-red-600', label: 'Cobertura baja' }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BalancesPage() {
  const [balances, setBalances] = useState<BalanceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<BalanceRow | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const { selectedSiteId, selectedUtilityType, selectedPeriod } = useUIStore()

  const loadBalances = useCallback(async () => {
    if (!selectedSiteId) { setBalances([]); return }
    setLoading(true)
    const { startIso, endIso } = getEnergyPeriodRange(selectedPeriod)
    let q = supabase.from('energy_balances')
      .select('*').eq('site_id', selectedSiteId)
      .gte('period_start', startIso).lte('period_end', endIso)
      .order('created_at', { ascending: false }).limit(20)
    if (selectedUtilityType) q = q.eq('utility', selectedUtilityType)
    const { data } = await q
    setBalances(data || [])
    setLoading(false)
  }, [selectedPeriod, selectedSiteId, selectedUtilityType])

  useEffect(() => { loadBalances() }, [loadBalances])

  const unaccPct = (b: BalanceRow) => Number(b.unaccounted_for_percent || 0)
  const covPct = (b: BalanceRow) => Number(b.measurement_coverage || 0)

  return (
    <div>
      <PageHeader title="Balances" description="Balance de utilities por periodo con trazabilidad de diagrama"
        actions={
          <Button size="sm" leftIcon={<Calculator size={14} />}
            onClick={() => setShowWizard(true)} disabled={!selectedSiteId || !selectedUtilityType}>
            Ejecutar balance
          </Button>
        } />

      <OperationalContextSummary />
      <OperationalContextBanner />

      {!selectedUtilityType && selectedSiteId && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 flex items-center gap-2">
          <AlertTriangle size={14} /> Selecciona un utility específico para ejecutar un balance trazable.
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">Cargando balances...</div>
      ) : balances.length === 0 ? (
        <EmptyState
          icon={<Scale size={48} strokeWidth={1.5} />}
          title="Sin balances"
          description={`No hay balances para ${getUtilityLabel(selectedUtilityType)} en el periodo seleccionado.`}
          action={selectedSiteId && selectedUtilityType && (
            <Button size="sm" leftIcon={<Calculator size={14} />} onClick={() => setShowWizard(true)}>
              Ejecutar primer balance
            </Button>
          )}
        />
      ) : (
        <div className="space-y-3">
          {balances.map((b) => {
            const ua = unaccPct(b)
            const cv = covPct(b)
            const { color: cvColor } = coveragePct(cv)
            return (
              <Card key={b.id} padding="md" className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelected(b === selected ? null : b)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <p className="text-sm font-semibold text-gray-800">
                        {new Date(b.period_start).toLocaleDateString('es', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' — '}
                        {new Date(b.period_end).toLocaleDateString('es', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <Badge color="teal" size="sm">{b.utility}</Badge>
                      <Badge color={b.status === 'final' ? 'green' : 'gray'} size="sm">{b.status}</Badge>
                    </div>
                    {/* Mini balance bar */}
                    <BalanceBar
                      input={b.total_input}
                      measured={b.measured_consumption}
                      unaccounted={Math.max(0, b.unaccounted_for)}
                      unit=""
                    />
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <div>
                      <p className="text-[10px] text-gray-400">No explicado</p>
                      <p className={`text-lg font-bold ${ua > 10 ? 'text-red-500' : ua > 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {ua.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Cobertura</p>
                      <p className={`text-sm font-semibold ${cvColor}`}>{cv.toFixed(0)}%</p>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {selected?.id === b.id && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <BalanceDetail balance={b} />
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Balance Run Wizard */}
      <Modal open={showWizard} onClose={() => setShowWizard(false)} title="Ejecutar balance" size="lg">
        <BalanceWizard
          siteId={selectedSiteId || ''}
          utilityType={selectedUtilityType || ''}
          selectedPeriod={selectedPeriod}
          onComplete={() => { setShowWizard(false); loadBalances() }}
          onCancel={() => setShowWizard(false)}
        />
      </Modal>
    </div>
  )
}

// ─── Balance bar visual ────────────────────────────────────────────────────────

function BalanceBar({ input, measured, unaccounted, unit }: {
  input: number; measured: number; unaccounted: number; unit: string
}) {
  if (!input) return null
  const measPct = Math.min(100, (measured / input) * 100)
  const unaccPct = Math.min(100 - measPct, (unaccounted / input) * 100)
  return (
    <div>
      <div className="flex h-4 rounded-full overflow-hidden bg-gray-100 w-full">
        <div className="bg-emerald-400 h-full transition-all" style={{ width: `${measPct}%` }} title={`Medido: ${measured.toLocaleString()}`} />
        <div className="bg-red-400 h-full transition-all" style={{ width: `${unaccPct}%` }} title={`No explicado: ${unaccounted.toLocaleString()}`} />
      </div>
      <div className="flex items-center gap-4 mt-1 text-[11px] text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Medido</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />No explicado</span>
        {unit && <span>Entrada: {input.toLocaleString()} {unit}</span>}
      </div>
    </div>
  )
}

// ─── Balance detail ────────────────────────────────────────────────────────────

function BalanceDetail({ balance: b }: { balance: BalanceRow }) {
  const metrics = [
    { label: 'Entrada total', value: b.total_input, icon: Plus, color: 'text-brand-blue' },
    { label: 'Medido', value: b.measured_consumption, icon: CheckCircle, color: 'text-emerald-600' },
    { label: 'No explicado', value: b.unaccounted_for, icon: Minus, color: 'text-red-500' },
    { label: 'Cobertura', value: b.measurement_coverage, icon: BarChart2, color: 'text-amber-600', suffix: '%' },
  ]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="bg-gray-50 rounded-xl p-3 border border-border">
            <div className="flex items-center gap-1.5 mb-1">
              <m.icon size={12} className={m.color} />
              <span className="text-[10px] text-gray-500 font-medium">{m.label}</span>
            </div>
            <p className={`text-base font-bold ${m.color}`}>
              {Number(m.value || 0).toLocaleString('es', { maximumFractionDigits: 1 })}{m.suffix || ''}
            </p>
          </div>
        ))}
      </div>

      {(b.node_results as BalanceNodeResult[] || []).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Desglose por punto</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1.5 px-2 text-xs font-medium text-gray-500">Tag</th>
                <th className="text-right py-1.5 px-2 text-xs font-medium text-gray-500">Consumo</th>
                <th className="text-left py-1.5 px-2 text-xs font-medium text-gray-500">Cobertura</th>
              </tr>
            </thead>
            <tbody>
              {(b.node_results as BalanceNodeResult[]).slice(0, 15).map((n) => (
                <tr key={n.nodeId} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-1.5 px-2 font-mono text-xs text-brand-blue">{n.tag}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{Number(n.consumption || 0).toLocaleString()}</td>
                  <td className="py-1.5 px-2">
                    <Badge size="sm" color={n.coverage === 'measured' ? 'green' : n.coverage === 'estimated' ? 'orange' : 'gray'}>
                      {n.coverage}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Balance Run Wizard ────────────────────────────────────────────────────────

function BalanceWizard({ siteId, utilityType, selectedPeriod, onComplete, onCancel }: {
  siteId: string; utilityType: string; selectedPeriod: string
  onComplete: () => void; onCancel: () => void
}) {
  const [step, setStep] = useState(1)
  const [diagrams, setDiagrams] = useState<DiagramMeta[]>([])
  const [selectedDiagram, setSelectedDiagram] = useState<string>('')
  const [mps, setMps] = useState<MPRow[]>([])
  const [mpSummary, setMpSummary] = useState<{ id: string; tag: string; count: number; sum: number }[]>([])
  const [result, setResult] = useState<{
    totalInput: number; measured: number; unaccounted: number; coverage: number
    nodeResults: BalanceNodeResult[]
  } | null>(null)
  const [running, setRunning] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    supabase.from('energy_diagrams').select('id, name, utility_type, status')
      .eq('site_id', siteId).eq('utility_type', utilityType)
      .then(({ data }) => { setDiagrams(data || []); if (data?.length === 1) setSelectedDiagram(data[0].id) })
    supabase.from('measurement_points').select('id, tag, name, utility, unit, measurement_type')
      .eq('site_id', siteId).eq('utility', utilityType)
      .then(({ data }) => setMps(data || []))
  }, [siteId, utilityType])

  async function loadDataPreview() {
    const { startIso, endIso } = getEnergyPeriodRange(selectedPeriod)
    const summary = await Promise.all(mps.map(async (mp) => {
      const { data } = await supabase.from('energy_readings_raw')
        .select('value').eq('measurement_point_id', mp.id)
        .gte('timestamp', startIso).lt('timestamp', endIso)
      const readings = data || []
      const sum = readings.reduce((s, r) => s + Number(r.value), 0)
      return { id: mp.id, tag: mp.tag, count: readings.length, sum }
    }))
    setMpSummary(summary)
  }

  async function runBalance() {
    setRunning(true)
    const { startIso, endIso } = getEnergyPeriodRange(selectedPeriod)
    const { data: readings } = await supabase.from('energy_readings_raw')
      .select('measurement_point_id, value, timestamp')
      .gte('timestamp', startIso).lt('timestamp', endIso)

    let totalInput = 0
    let measured = 0
    const nodeResults: BalanceNodeResult[] = []

    for (const mp of mps) {
      const mpReadings = (readings || []).filter((r) => r.measurement_point_id === mp.id)
      const sum = mpReadings.reduce((s, r) => s + Number(r.value), 0)
      totalInput += sum
      measured += sum
      nodeResults.push({ nodeId: mp.id, tag: mp.tag, consumption: sum, coverage: mpReadings.length > 0 ? 'measured' : 'unmetered' })
    }

    const unaccounted = Math.max(0, totalInput - measured)
    const coverage = totalInput > 0 ? (measured / totalInput) * 100 : 0

    await supabase.from('energy_balances').insert({
      site_id: siteId, utility: utilityType,
      period_start: startIso, period_end: endIso,
      total_input: totalInput, measured_consumption: measured,
      calculated_consumption: 0, estimated_consumption: 0,
      technical_losses: 0, estimated_leaks: 0, returns: 0,
      unaccounted_for: unaccounted,
      unaccounted_for_percent: totalInput > 0 ? (unaccounted / totalInput) * 100 : 0,
      measurement_coverage: coverage, node_results: JSON.stringify(nodeResults),
      diagram_version_id: selectedDiagram || null, notes,
    })

    setResult({ totalInput, measured, unaccounted, coverage, nodeResults })
    setRunning(false)
    setStep(3)
  }

  const canRun = mps.length > 0

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {WIZARD_STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1">
            <div className={`flex items-center gap-1.5 text-xs font-medium ${step >= s.n ? 'text-brand-blue' : 'text-gray-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${step > s.n ? 'bg-emerald-500 text-white border-emerald-500' : step === s.n ? 'bg-brand-blue text-white border-brand-blue' : 'border-gray-300 text-gray-400'}`}>
                {step > s.n ? '✓' : s.n}
              </span>
              {s.label}
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 ${step > s.n ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 — Configurar */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
            <Info size={14} className="text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">Balance para {getUtilityLabel(utilityType)}</p>
              <p className="text-xs text-blue-600 mt-0.5">
                {mps.length} puntos de medición disponibles.
                {diagrams.length > 0 ? ` ${diagrams.length} diagrama(s) de referencia.` : ' Sin diagramas publicados (opcional).'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Diagrama de referencia (opcional)</label>
            <select value={selectedDiagram} onChange={(e) => setSelectedDiagram(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface cursor-pointer">
              <option value="">Sin diagrama asociado</option>
              {diagrams.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.status})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas del balance</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Lectura de cierre mensual"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
          </div>

          {!canRun && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-sm text-amber-700">
              <AlertTriangle size={14} /> No hay puntos de medición para {getUtilityLabel(utilityType)} en este sitio.
            </div>
          )}
        </div>
      )}

      {/* Step 2 — Revisar datos */}
      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 font-medium">Lecturas disponibles en el periodo seleccionado:</p>
          {mpSummary.length === 0 ? (
            <div className="py-4 text-center text-sm text-gray-400">Sin lecturas en el periodo.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Tag</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">Lecturas</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">Total</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-gray-600">Estado</th>
                </tr>
              </thead>
              <tbody>
                {mpSummary.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-mono text-xs font-semibold text-brand-blue">{m.tag}</td>
                    <td className="px-3 py-2 text-right font-mono">{m.count}</td>
                    <td className="px-3 py-2 text-right font-mono">{m.sum.toLocaleString()}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge size="sm" color={m.count > 0 ? 'green' : 'orange'}>
                        {m.count > 0 ? 'Con datos' : 'Sin datos'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Step 3 — Resultado */}
      {step === 3 && result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-700">
            <CheckCircle size={15} /> Balance ejecutado y guardado correctamente.
          </div>

          <BalanceBar input={result.totalInput} measured={result.measured} unaccounted={result.unaccounted} unit="" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Entrada', value: result.totalInput, color: 'text-brand-blue' },
              { label: 'Medido', value: result.measured, color: 'text-emerald-600' },
              { label: 'No explicado', value: result.unaccounted, color: 'text-red-500' },
              { label: 'Cobertura', value: result.coverage, color: 'text-amber-600', suffix: '%' },
            ].map((m) => (
              <div key={m.label} className="bg-gray-50 rounded-xl p-3 border border-border text-center">
                <p className="text-[10px] text-gray-400 mb-1">{m.label}</p>
                <p className={`text-lg font-bold ${m.color}`}>
                  {Number(m.value).toLocaleString('es', { maximumFractionDigits: 1 })}{m.suffix || ''}
                </p>
              </div>
            ))}
          </div>

          {result.unaccounted / (result.totalInput || 1) > 0.1 && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-700">
              <TrendingDown size={14} className="mt-0.5 shrink-0" />
              El porcentaje no explicado supera el 10%. Revisa los puntos sin lecturas o posibles fugas.
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-3 border-t border-border">
        <div>
          {step > 1 && step < 3 && (
            <Button variant="secondary" size="sm" onClick={() => setStep(step - 1)}>← Anterior</Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancelar</Button>
          {step === 1 && (
            <Button size="sm" disabled={!canRun} onClick={() => { loadDataPreview(); setStep(2) }} rightIcon={<ChevronRight size={13} />}>
              Revisar datos
            </Button>
          )}
          {step === 2 && (
            <Button size="sm" loading={running} onClick={runBalance} leftIcon={<Calculator size={13} />}>
              Ejecutar balance
            </Button>
          )}
          {step === 3 && (
            <Button size="sm" onClick={onComplete} leftIcon={<CheckCircle size={13} />}>
              Ver balances
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
