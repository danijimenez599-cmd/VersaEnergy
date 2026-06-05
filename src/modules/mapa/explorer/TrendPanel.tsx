// TrendPanel: slide-in panel with 12-month bar chart + CSV export.
// Uses recharts (already bundled in the app).

import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { X, Download, Loader2 } from 'lucide-react'
import { fetchMonthlyTrend, type MonthlyPoint } from '@/services/explorer-engine/monthlyTrend'
import { getUtilityLabel } from '@/shared/OperationalContext'
import type { ExplorerBlock, UtilitySummary } from '@/services/explorer-engine/loadExplorer'

const UTILITY_COLOR: Record<string, string> = {
  electricity: '#1B6FF8', natural_gas: '#ea580c', lpg: '#b45309', diesel: '#ca8a04',
  steam: '#7c3aed', compressed_air: '#0d9488', chilled_water: '#0891b2',
  hot_water: '#dc2626', industrial_water: '#0ea5e9',
}
function ucolor(u: string) { return UTILITY_COLOR[u] ?? '#64748b' }

function fmtValue(v: number, unit: string): string {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} M${unit}`
  if (abs >= 1_000) return `${(v / 1_000).toFixed(1)} k${unit}`
  return `${Math.round(v)} ${unit}`
}

function downloadCSV(points: MonthlyPoint[], blockName: string, utility: string) {
  if (!points.length) return
  const unit = points[0].unit
  const header = `Periodo,${getUtilityLabel(utility)} (${unit})\n`
  const rows = points.map((p) => `${p.period},${p.value}`).join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${blockName}_${utility}.csv`.replace(/\s+/g, '_')
  a.click()
  URL.revokeObjectURL(url)
}

interface TrendPanelProps {
  block: ExplorerBlock
  onClose: () => void
}

export function TrendPanel({ block, onClose }: TrendPanelProps) {
  const [trendData, setTrendData] = useState<Map<string, MonthlyPoint[]>>(new Map())
  const [loading, setLoading] = useState(false)
  const [activeUtility, setActiveUtility] = useState<string>(block.primaryUtility ?? '')

  const allMpIds = useMemo(() => Object.values(block.boundaryMpIds), [block.boundaryMpIds])

  useEffect(() => {
    if (!allMpIds.length) return
    setLoading(true)
    fetchMonthlyTrend(allMpIds, 12)
      .then(setTrendData)
      .finally(() => setLoading(false))
  }, [allMpIds.join(',')])

  // Set active utility from first available utility that has trend data
  useEffect(() => {
    if (!activeUtility && block.utilities.length) setActiveUtility(block.utilities[0].utility)
  }, [block.utilities])

  const utilsWithData = block.utilities.filter(
    (u: UtilitySummary) => block.boundaryMpIds[u.utility]
  )

  const activeMpId = block.boundaryMpIds[activeUtility]
  const points = (activeMpId ? trendData.get(activeMpId) : null) ?? []
  const unit = points[0]?.unit ?? block.utilities.find((u: UtilitySummary) => u.utility === activeUtility)?.unit ?? ''
  const barColor = ucolor(activeUtility)

  // Compute trend direction (last 3 vs first 3 months)
  const trend = useMemo(() => {
    if (points.length < 4) return null
    const half = Math.floor(points.length / 2)
    const firstHalfAvg = points.slice(0, half).reduce((s, p) => s + p.value, 0) / half
    const secondHalfAvg = points.slice(-half).reduce((s, p) => s + p.value, 0) / half
    const pct = ((secondHalfAvg - firstHalfAvg) / (firstHalfAvg || 1)) * 100
    return { pct: Math.round(pct), up: pct > 1, down: pct < -1 }
  }, [points])

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tendencia mensual</p>
          <h3 className="truncate text-sm font-black text-slate-900">{block.name}</h3>
          {block.code && <p className="text-[11px] text-slate-400">{block.code}</p>}
        </div>
        <button onClick={onClose} className="ml-3 grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X size={16} />
        </button>
      </div>

      {/* Utility tabs */}
      {utilsWithData.length > 1 && (
        <div className="flex gap-1 border-b border-slate-100 px-4 py-2">
          {utilsWithData.map((u: UtilitySummary) => (
            <button
              key={u.utility}
              onClick={() => setActiveUtility(u.utility)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                activeUtility === u.utility
                  ? 'text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
              style={activeUtility === u.utility ? { background: ucolor(u.utility) } : {}}
            >
              {getUtilityLabel(u.utility)}
            </button>
          ))}
        </div>
      )}

      {/* KPI row */}
      <div className="flex items-center gap-4 border-b border-slate-50 px-5 py-3">
        {block.utilities.filter((u: UtilitySummary) => u.utility === activeUtility).map((u: UtilitySummary) => (
          <div key={u.utility}>
            <p className="text-xs font-semibold text-slate-400">Último mes</p>
            <p className="text-xl font-black text-slate-900">{u.value != null ? fmtValue(u.value, u.unit) : '—'}</p>
          </div>
        ))}
        {trend && (
          <div className={`ml-auto rounded-lg px-2.5 py-1.5 text-xs font-bold ${
            trend.up ? 'bg-rose-50 text-rose-700' : trend.down ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'
          }`}>
            {trend.up ? '▲' : trend.down ? '▼' : '→'} {Math.abs(trend.pct)}% vs semestre anterior
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <div className="grid h-48 place-items-center">
            <Loader2 size={22} className="animate-spin text-slate-400" />
          </div>
        ) : points.length === 0 ? (
          <div className="grid h-48 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-400">Sin datos de consumo mensual</p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
              {getUtilityLabel(activeUtility)} · consumo mensual · {unit}
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={points} margin={{ top: 4, right: 4, bottom: 4, left: 0 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 11, fontWeight: 700, borderRadius: 10,
                    border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,.08)',
                  }}
                  formatter={(val: unknown) => [fmtValue(Number(val), unit), getUtilityLabel(activeUtility)]}
                  cursor={{ fill: barColor + '10' }}
                />
                <Bar dataKey="value" fill={barColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Monthly table (last 6) */}
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-3 py-2 text-left font-black text-slate-500">Mes</th>
                    <th className="px-3 py-2 text-right font-black text-slate-500">{unit}</th>
                    <th className="px-3 py-2 text-right font-black text-slate-500">vs anterior</th>
                  </tr>
                </thead>
                <tbody>
                  {points.slice(-6).reverse().map((p, i, arr) => {
                    const prev = arr[i + 1]
                    const delta = prev ? ((p.value - prev.value) / (prev.value || 1)) * 100 : null
                    return (
                      <tr key={p.period} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-3 py-2 font-semibold text-slate-700">{p.label}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">
                          {fmtValue(p.value, '')}
                        </td>
                        <td className={`px-3 py-2 text-right font-bold ${
                          delta == null ? 'text-slate-300'
                          : delta > 2 ? 'text-rose-600'
                          : delta < -2 ? 'text-emerald-600'
                          : 'text-slate-400'
                        }`}>
                          {delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Footer: CSV export */}
      <div className="border-t border-slate-100 px-5 py-3">
        <button
          onClick={() => downloadCSV(points, block.name, activeUtility)}
          disabled={!points.length}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
        >
          <Download size={13} />
          Exportar CSV
        </button>
      </div>
    </div>
  )
}
