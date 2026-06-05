import { useCallback, useEffect, useState } from 'react'
import {
  BarChart3, Download, FileSpreadsheet, TrendingUp, Layers,
  RefreshCw, ChevronDown, Scale, Zap, Flame,
  Wind, Snowflake, Droplets, FlameKindling,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend,
  Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { supabase } from '@/services/supabase'
import { Button } from '@/shared/Button'
import { Card } from '@/shared/Card'
import { Badge } from '@/shared/Badge'
import { getUtilityLabel } from '@/shared/OperationalContext'
import { useUIStore } from '@/store/uiStore'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SheetWithResult {
  id: string
  name: string
  period_start: string
  period_end: string
  utility: string | null
  status: string
  boundary_type: string | null
  boundary_id: string | null
  boundary_label?: string
  result: {
    id: string
    total_input_kwh_eq: number
    total_output_kwh_eq: number
    unaccounted_for_kwh_eq: number
    unaccounted_for_pct: number
    measurement_coverage: number
    by_utility: Record<string, { input_kwh: number; output_kwh: number; label: string }>
    calculated_at: string
  } | null
}

// ── Constants ──────────────────────────────────────────────────────────────────

const UTILITY_COLORS: Record<string, string> = {
  electricity: '#1d4ed8', natural_gas: '#c2410c', steam: '#6d28d9',
  compressed_air: '#0f766e', chilled_water: '#0e7490', hot_water: '#be123c',
  industrial_water: '#0369a1', diesel: '#a16207', lpg: '#b45309',
}

const UTILITY_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  electricity: Zap, natural_gas: Flame, steam: FlameKindling,
  compressed_air: Wind, chilled_water: Snowflake, hot_water: Droplets,
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', closed: 'Cerrado', approved: 'Aprobado',
}
const STATUS_CLASS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-500',
  closed: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-700',
}

const MONTHS_ES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
const MONTHS_SHORT = [
  'Ene','Feb','Mar','Abr','May','Jun',
  'Jul','Ago','Sep','Oct','Nov','Dic',
]

function fmtNum(v: number | null | undefined, dec = 1): string {
  if (v == null) return '—'
  return v.toLocaleString('es-MX', { maximumFractionDigits: dec })
}

function periodLabel(start: string): string {
  const [y, m] = start.split('-').map(Number)
  return `${MONTHS_ES[m - 1]} ${y}`
}

/** Etiqueta corta para ejes de gráficas: "Jun 26" */
function periodShort(start: string): string {
  const [y, m] = start.split('-').map(Number)
  return `${MONTHS_SHORT[m - 1]} ${String(y).slice(2)}`
}

function UtilityChip({ utility }: { utility: string | null }) {
  if (!utility) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-white">Multi</span>
  const color = UTILITY_COLORS[utility] ?? '#64748b'
  const Icon = UTILITY_ICONS[utility]
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ background: color + '18', color }}>
      {Icon && <Icon size={9} />}{getUtilityLabel(utility)}
    </span>
  )
}

// ── CSV export helper ──────────────────────────────────────────────────────────

function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => {
      const v = r[h]
      const s = v == null ? '' : String(v)
      return s.includes(',') ? `"${s}"` : s
    }).join(',')),
  ].join('\n')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  link.download = filename
  link.click()
}

// ── Data fetching ──────────────────────────────────────────────────────────────

async function loadSheetsForPeriod(siteId: string, period: string): Promise<SheetWithResult[]> {
  const y = period.slice(0, 4), m = period.slice(5, 7)
  const start = `${y}-${m}-01`
  const end = new Date(Number(y), Number(m), 0).toISOString().split('T')[0]

  const [{ data: sheets }, { data: areas }, { data: equips }] = await Promise.all([
    supabase
      .from('energy_balance_sheets')
      .select(`*, results:energy_balance_results(id,total_input_kwh_eq,total_output_kwh_eq,unaccounted_for_kwh_eq,unaccounted_for_pct,measurement_coverage,by_utility,calculated_at)`)
      .eq('site_id', siteId)
      .eq('period_start', start)
      .gte('period_end', end)
      .order('created_at'),
    supabase.from('energy_areas').select('id,name').eq('site_id', siteId),
    supabase.from('energy_equipment').select('id,tag,name').eq('site_id', siteId),
  ])

  const areaMap = new Map((areas ?? []).map((a) => [a.id, a.name]))
  const equipMap = new Map((equips ?? []).map((e) => [e.id, `${e.tag} ${e.name}`]))

  return (sheets ?? []).map((s) => {
    const resultsArr = Array.isArray(s.results) ? s.results : []
    const latest = resultsArr.sort((a: { calculated_at: string }, b: { calculated_at: string }) =>
      b.calculated_at.localeCompare(a.calculated_at))[0] ?? null

    const boundary_label = s.boundary_type === 'area'
      ? (areaMap.get(s.boundary_id) ?? '—')
      : s.boundary_type === 'equipment'
      ? (equipMap.get(s.boundary_id) ?? '—')
      : 'Sitio completo'

    return { ...s, result: latest ?? null, boundary_label }
  })
}

async function loadAllSheets(siteId: string): Promise<SheetWithResult[]> {
  const [{ data: sheets }, { data: areas }, { data: equips }] = await Promise.all([
    supabase
      .from('energy_balance_sheets')
      .select(`*, results:energy_balance_results(id,total_input_kwh_eq,total_output_kwh_eq,unaccounted_for_kwh_eq,unaccounted_for_pct,measurement_coverage,by_utility,calculated_at)`)
      .eq('site_id', siteId)
      .order('period_start', { ascending: false }),
    supabase.from('energy_areas').select('id,name').eq('site_id', siteId),
    supabase.from('energy_equipment').select('id,tag,name').eq('site_id', siteId),
  ])

  const areaMap = new Map((areas ?? []).map((a) => [a.id, a.name]))
  const equipMap = new Map((equips ?? []).map((e) => [e.id, `${e.tag} ${e.name}`]))

  return (sheets ?? []).map((s) => {
    const resultsArr = Array.isArray(s.results) ? s.results : []
    const latest = resultsArr.sort((a: { calculated_at: string }, b: { calculated_at: string }) =>
      b.calculated_at.localeCompare(a.calculated_at))[0] ?? null
    const boundary_label = s.boundary_type === 'area'
      ? (areaMap.get(s.boundary_id) ?? '—')
      : s.boundary_type === 'equipment'
      ? (equipMap.get(s.boundary_id) ?? '—')
      : 'Sitio completo'
    return { ...s, result: latest ?? null, boundary_label }
  })
}

// ── Tab: Comparativa ──────────────────────────────────────────────────────────

function ComparativaTab({ siteId }: { siteId: string }) {
  const now = new Date()
  const [period, setPeriod] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [sheets, setSheets] = useState<SheetWithResult[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setSheets(await loadSheetsForPeriod(siteId, period))
    setLoading(false)
  }, [siteId, period])

  useEffect(() => { load() }, [load])

  const withResult = sheets.filter((s) => s.result)
  const chartData = withResult.map((s) => ({
    name: s.name.length > 22 ? s.name.slice(0, 20) + '…' : s.name,
    Entrada: Math.round(s.result!.total_input_kwh_eq),
    Salida: Math.round(s.result!.total_output_kwh_eq),
    'No explic.': Math.round(s.result!.unaccounted_for_kwh_eq),
  }))

  function exportCSV() {
    downloadCSV(`comparativa_${period}.csv`, withResult.map((s) => ({
      Nombre: s.name,
      Período: periodLabel(s.period_start),
      Utility: s.utility ?? 'Multi',
      Frontera: s.boundary_label ?? '—',
      Estado: STATUS_LABELS[s.status] ?? s.status,
      'Entrada kWh-eq': s.result?.total_input_kwh_eq ?? '',
      'Salida kWh-eq': s.result?.total_output_kwh_eq ?? '',
      'No expl. kWh-eq': s.result?.unaccounted_for_kwh_eq ?? '',
      'No expl. %': s.result?.unaccounted_for_pct ?? '',
      'Cobertura %': s.result?.measurement_coverage ?? '',
    })))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-[11px] font-bold text-slate-500 mb-1">Período</p>
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </div>
        <Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} onClick={load} />
        <div className="ml-auto">
          <Button size="sm" variant="secondary" leftIcon={<Download size={13} />} disabled={!withResult.length} onClick={exportCSV}>
            Exportar CSV
          </Button>
        </div>
      </div>

      {loading && <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>}

      {!loading && sheets.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center">
          <Scale size={40} className="text-slate-200 mb-4" />
          <p className="text-sm font-bold text-slate-600 mb-1">Sin balances para {periodLabel(period + '-01')}</p>
          <p className="text-xs text-slate-400 max-w-xs">Crea balances en el módulo Balance y luego vuelve aquí a compararlos.</p>
        </div>
      )}

      {!loading && withResult.length > 0 && (
        <>
          <Card padding="none" className="overflow-hidden rounded-xl border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">kWh-eq comparados</p>
              <h3 className="text-sm font-bold text-slate-900">Entradas / Salidas / No explicado — {periodLabel(period + '-01')}</h3>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip contentStyle={{ borderRadius: 10, borderColor: '#e2e8f0', fontSize: 11 }}
                    formatter={(v) => [`${Number(v ?? 0).toLocaleString('es-MX')} kWh-eq`]} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Entrada" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Salida" fill="#64748b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="No explic." fill="#fca5a5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card padding="none" className="overflow-hidden rounded-xl border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['Balance','Utility','Frontera','Estado','Entrada kWh-eq','Salida kWh-eq','No explic.','Cobertura'].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheets.map((s) => {
                    const unacc = s.result?.unaccounted_for_pct ?? null
                    return (
                      <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-2.5 font-semibold text-slate-900 max-w-[200px] truncate">{s.name}</td>
                        <td className="px-3 py-2.5"><UtilityChip utility={s.utility} /></td>
                        <td className="px-3 py-2.5 text-slate-500">{s.boundary_label}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CLASS[s.status] ?? ''}`}>
                            {STATUS_LABELS[s.status] ?? s.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-blue-700 text-right">{fmtNum(s.result?.total_input_kwh_eq, 0)}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-700 text-right">{fmtNum(s.result?.total_output_kwh_eq, 0)}</td>
                        <td className={`px-3 py-2.5 font-mono text-right font-bold ${unacc != null && unacc > 15 ? 'text-red-600' : unacc != null && unacc > 8 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {fmtNum(unacc, 1)}{unacc != null ? '%' : ''}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {s.result ? (
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, s.result.measurement_coverage)}%` }} />
                              </div>
                              <span className="font-mono text-slate-600">{fmtNum(s.result.measurement_coverage, 0)}%</span>
                            </div>
                          ) : <span className="text-slate-300 italic">sin cálculo</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {!loading && sheets.length > 0 && withResult.length < sheets.length && (
        <p className="text-[11px] text-slate-400 text-center">
          {sheets.length - withResult.length} balance(s) sin resultado — presiona "Calcular" en el Balance Builder para incluirlos.
        </p>
      )}
    </div>
  )
}

// ── Tab: Evolución ────────────────────────────────────────────────────────────

function EvolucionTab({ siteId }: { siteId: string }) {
  const [allSheets, setAllSheets] = useState<SheetWithResult[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    loadAllSheets(siteId)
      .then((data) => {
        setAllSheets(data)
        if (!selectedId && data[0]) setSelectedId(data[0].id)
      })
      .finally(() => setLoading(false))
  }, [siteId])

  // Para "evolución" agrupamos por el mismo nombre base o misma frontera (boundary_id)
  const selected = allSheets.find((s) => s.id === selectedId)
  const sameBoundary = selected
    ? allSheets
        .filter((s) => s.boundary_id === selected.boundary_id && s.utility === selected.utility && s.result)
        .sort((a, b) => a.period_start.localeCompare(b.period_start))
    : []

  const chartData = sameBoundary.map((s) => ({
    period: periodShort(s.period_start),
    Entrada: Math.round(s.result!.total_input_kwh_eq),
    Salida: Math.round(s.result!.total_output_kwh_eq),
    'No explic. %': Number(s.result!.unaccounted_for_pct.toFixed(1)),
  }))

  function exportCSV() {
    downloadCSV(`evolucion_${selectedId}.csv`, sameBoundary.map((s) => ({
      Período: periodLabel(s.period_start),
      'Entrada kWh-eq': s.result?.total_input_kwh_eq ?? '',
      'Salida kWh-eq': s.result?.total_output_kwh_eq ?? '',
      'No expl. kWh-eq': s.result?.unaccounted_for_kwh_eq ?? '',
      'No expl. %': s.result?.unaccounted_for_pct ?? '',
      'Cobertura %': s.result?.measurement_coverage ?? '',
    })))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-48">
          <p className="text-[11px] font-bold text-slate-500 mb-1">Balance a seguir</p>
          <div className="relative">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              {allSheets.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div className="ml-auto">
          <Button size="sm" variant="secondary" leftIcon={<Download size={13} />} disabled={!sameBoundary.length} onClick={exportCSV}>
            Exportar CSV
          </Button>
        </div>
      </div>

      {loading && <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>}

      {!loading && selected && (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge variant="neutral">{selected.utility ? getUtilityLabel(selected.utility) : 'Multi-utility'}</Badge>
            <Badge variant="neutral">{selected.boundary_label}</Badge>
            {sameBoundary.length > 1
              ? <Badge variant="ok">{sameBoundary.length} períodos con datos</Badge>
              : <Badge variant="warn">1 período — acumula más balances para ver tendencia</Badge>}
          </div>

          {sameBoundary.length > 0 && (
            <Card padding="none" className="overflow-hidden rounded-xl border-slate-200">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Evolución</p>
                <h3 className="text-sm font-bold text-slate-900">{selected.name} — Entradas y salidas kWh-eq</h3>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={52} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={32} unit="%" />
                    <Tooltip contentStyle={{ borderRadius: 10, borderColor: '#e2e8f0', fontSize: 11 }} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left" dataKey="Entrada" fill="#1d4ed8" opacity={0.85} radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="Salida" fill="#64748b" opacity={0.7} radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="No explic. %" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <Card padding="none" className="overflow-hidden rounded-xl border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['Período','Entrada kWh-eq','Salida kWh-eq','No explic. kWh-eq','No explic. %','Cobertura'].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sameBoundary.length === 0
                    ? <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400 italic">Sin resultados calculados para este balance</td></tr>
                    : sameBoundary.map((s) => (
                      <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-3 py-2.5 font-semibold text-slate-700">{periodLabel(s.period_start)}</td>
                        <td className="px-3 py-2.5 font-mono text-blue-700 text-right">{fmtNum(s.result?.total_input_kwh_eq, 0)}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-700 text-right">{fmtNum(s.result?.total_output_kwh_eq, 0)}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-500 text-right">{fmtNum(s.result?.unaccounted_for_kwh_eq, 0)}</td>
                        <td className={`px-3 py-2.5 font-mono text-right font-bold ${(s.result?.unaccounted_for_pct ?? 0) > 15 ? 'text-red-600' : (s.result?.unaccounted_for_pct ?? 0) > 8 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {fmtNum(s.result?.unaccounted_for_pct, 1)}%
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, s.result?.measurement_coverage ?? 0)}%` }} />
                            </div>
                            <span className="font-mono text-slate-600">{fmtNum(s.result?.measurement_coverage, 0)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

// ── Tab: Multi-utility ────────────────────────────────────────────────────────

function MultiUtilityTab({ siteId }: { siteId: string }) {
  const now = new Date()
  const [period, setPeriod] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [sheets, setSheets] = useState<SheetWithResult[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const all = await loadSheetsForPeriod(siteId, period)
    setSheets(all)
    setLoading(false)
  }, [siteId, period])

  useEffect(() => { load() }, [load])

  // Recoger todos los utilities mencionados en los by_utility de los results
  const allUtilities = Array.from(new Set(
    sheets.flatMap((s) => s.result ? Object.keys(s.result.by_utility) : [])
  ))

  // Cada sheet con by_utility data
  const sheetsWithByUtil = sheets.filter((s) => s.result && Object.keys(s.result.by_utility).length > 0)

  // Stacked bar chart data: per utility, sum inputs/outputs across sheets
  const utilityTotals = allUtilities.map((util) => {
    const totalIn = sheetsWithByUtil.reduce((sum, s) => sum + (s.result?.by_utility[util]?.input_kwh ?? 0), 0)
    const totalOut = sheetsWithByUtil.reduce((sum, s) => sum + (s.result?.by_utility[util]?.output_kwh ?? 0), 0)
    const label = sheetsWithByUtil[0]?.result?.by_utility[util]?.label ?? getUtilityLabel(util)
    return { util, label, totalIn, totalOut }
  })

  function exportCSV() {
    const rows = allUtilities.flatMap((util) =>
      sheetsWithByUtil.map((s) => ({
        Balance: s.name,
        Período: periodLabel(s.period_start),
        Utility: util,
        'Entrada kWh-eq': s.result?.by_utility[util]?.input_kwh ?? 0,
        'Salida kWh-eq': s.result?.by_utility[util]?.output_kwh ?? 0,
      }))
    )
    downloadCSV(`multiutility_${period}.csv`, rows)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-[11px] font-bold text-slate-500 mb-1">Período</p>
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </div>
        <Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} onClick={load} />
        <div className="ml-auto">
          <Button size="sm" variant="secondary" leftIcon={<Download size={13} />} disabled={!sheetsWithByUtil.length} onClick={exportCSV}>
            Exportar CSV
          </Button>
        </div>
      </div>

      {loading && <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>}

      {!loading && sheetsWithByUtil.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center">
          <Layers size={40} className="text-slate-200 mb-4" />
          <p className="text-sm font-bold text-slate-600 mb-1">Sin desglose multi-utility para {periodLabel(period + '-01')}</p>
          <p className="text-xs text-slate-400 max-w-xs">Calcula balances con múltiples utilities y aparecerá el desglose aquí.</p>
        </div>
      )}

      {!loading && utilityTotals.length > 0 && (
        <>
          {/* Summary kpi tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {utilityTotals.map(({ util, label, totalIn }) => {
              const color = UTILITY_COLORS[util] ?? '#64748b'
              const Icon = UTILITY_ICONS[util]
              return (
                <div key={util} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    {Icon && <span style={{ color }}><Icon size={13} /></span>}
                    <span className="text-[10px] font-black uppercase tracking-wider" style={{ color }}>{label}</span>
                  </div>
                  <p className="text-lg font-black text-slate-900">{fmtNum(totalIn, 0)}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">kWh-eq entrada</p>
                </div>
              )
            })}
          </div>

          {/* Bar chart */}
          <Card padding="none" className="overflow-hidden rounded-xl border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Desglose por utility</p>
              <h3 className="text-sm font-bold text-slate-900">Entradas kWh-eq — {periodLabel(period + '-01')}</h3>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={utilityTotals} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 80 }}>
                  <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="4 4" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={{ borderRadius: 10, borderColor: '#e2e8f0', fontSize: 11 }}
                    formatter={(v) => [`${Number(v ?? 0).toLocaleString('es-MX')} kWh-eq`]} />
                  <Bar dataKey="totalIn" name="Entrada" radius={[0, 4, 4, 0]}>
                    {utilityTotals.map(({ util }) => (
                      <Cell key={util} fill={UTILITY_COLORS[util] ?? '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Matrix table: sheet × utility */}
          <Card padding="none" className="overflow-hidden rounded-xl border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Matriz balance × utility</p>
              <h3 className="text-sm font-bold text-slate-900">kWh-eq por utility en cada balance</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Balance</th>
                    {allUtilities.map((util) => (
                      <th key={util} className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wider whitespace-nowrap" style={{ color: UTILITY_COLORS[util] ?? '#64748b' }}>
                        {getUtilityLabel(util)}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sheetsWithByUtil.map((s) => {
                    const total = allUtilities.reduce((sum, u) => sum + (s.result?.by_utility[u]?.input_kwh ?? 0), 0)
                    return (
                      <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-3 py-2.5 font-semibold text-slate-900 max-w-[180px] truncate">{s.name}</td>
                        {allUtilities.map((util) => {
                          const val = s.result?.by_utility[util]?.input_kwh
                          return (
                            <td key={util} className="px-3 py-2.5 font-mono text-right text-slate-700">
                              {val ? fmtNum(val, 0) : <span className="text-slate-200">—</span>}
                            </td>
                          )
                        })}
                        <td className="px-3 py-2.5 font-mono font-bold text-right text-slate-900">{fmtNum(total, 0)}</td>
                      </tr>
                    )
                  })}
                  {/* Totals row */}
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Total</td>
                    {allUtilities.map((u) => {
                      const tot = sheetsWithByUtil.reduce((sum, s) => sum + (s.result?.by_utility[u]?.input_kwh ?? 0), 0)
                      return (
                        <td key={u} className="px-3 py-2.5 font-mono font-bold text-right" style={{ color: UTILITY_COLORS[u] ?? '#64748b' }}>
                          {fmtNum(tot, 0)}
                        </td>
                      )
                    })}
                    <td className="px-3 py-2.5 font-mono font-black text-right text-slate-900">
                      {fmtNum(allUtilities.reduce((s2, u) =>
                        s2 + sheetsWithByUtil.reduce((s3, sh) => s3 + (sh.result?.by_utility[u]?.input_kwh ?? 0), 0), 0), 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type TabId = 'comparativa' | 'evolucion' | 'multiutil'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'comparativa', label: 'Comparativa de balances', icon: <BarChart3 size={13} /> },
  { id: 'evolucion',   label: 'Evolución',               icon: <TrendingUp size={13} /> },
  { id: 'multiutil',  label: 'Multi-utility',            icon: <Layers size={13} /> },
]

export default function ReportesPage() {
  const { selectedSiteId } = useUIStore()
  const [tab, setTab] = useState<TabId>('comparativa')

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full px-5 py-5 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ingeniería energética</p>
            <h1 className="text-lg font-black text-slate-950">Reportes</h1>
            <p className="text-xs text-slate-400 mt-0.5">Compara balances, analiza tendencias y exporta datos</p>
          </div>
          <FileSpreadsheet size={28} className="text-slate-200" />
        </div>

        {!selectedSiteId ? (
          <div className="flex flex-col items-center py-24 text-center">
            <Scale size={40} className="text-slate-200 mb-4" />
            <p className="text-sm font-bold text-slate-600 mb-1">Sin sitio seleccionado</p>
            <p className="text-xs text-slate-400">Selecciona un sitio en el panel superior para ver reportes.</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 w-fit">
              {TABS.map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={[
                    'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer',
                    tab === id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700',
                  ].join(' ')}
                >
                  {icon}{label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {tab === 'comparativa' && <ComparativaTab siteId={selectedSiteId} />}
            {tab === 'evolucion'   && <EvolucionTab   siteId={selectedSiteId} />}
            {tab === 'multiutil'   && <MultiUtilityTab siteId={selectedSiteId} />}
          </>
        )}
      </div>
    </div>
  )
}
