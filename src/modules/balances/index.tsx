import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/services/supabase'
import { Button } from '@/shared/Button'
import { useUIStore } from '@/store/uiStore'
import { getUtilityLabel } from '@/shared/OperationalContext'
import { calculateOfficialSheet, persistOfficialResult } from '@/services/balance-sheet-engine'
import type {
  BalanceSheet, BalanceEntry, SheetCalcResult, EntryCalcResult,
} from '@/services/balance-sheet-engine'
import { RelevantVariablesPage } from './views/RelevantVariablesPage'
import {
  Scale, Plus, ChevronRight, ChevronDown, Trash2,
  Calculator, TrendingDown, X, Search, Zap, Flame,
  Wind, Snowflake, Droplets, ArrowDownToLine, ArrowUpFromLine,
  FlameKindling, BarChart2, RefreshCw, Edit3, Package, AlertTriangle, ShieldCheck,
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

const UTILITY_COLORS: Record<string, string> = {
  electricity: '#1d4ed8', natural_gas: '#c2410c', steam: '#6d28d9',
  compressed_air: '#0f766e', chilled_water: '#0e7490', hot_water: '#be123c',
  industrial_water: '#0369a1', diesel: '#a16207', lpg: '#b45309',
}

const UTILITY_ICONS: Record<string, React.FC<{ size?: number }>> = {
  electricity: Zap, natural_gas: Flame, steam: FlameKindling,
  compressed_air: Wind, chilled_water: Snowflake, hot_water: Droplets,
}

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function periodLabel(start: string): string {
  const [y, m] = start.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

function fmtNum(v: number | null | undefined, dec = 1): string {
  if (v == null) return '—'
  return v.toLocaleString('es-MX', { maximumFractionDigits: dec })
}

// ── Picker types ──────────────────────────────────────────────────────────────

interface EquipRow {
  id: string; tag: string; name: string; equipment_type: string
  utility_type: string; area_id: string | null
}
interface MPRow {
  id: string; tag: string; name: string; utility: string
  measurement_type: string; unit: string; source_type: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function CoverageDot({ coverage }: { coverage: EntryCalcResult['coverage'] }) {
  const map: Record<string, string> = {
    measured: 'bg-emerald-500', estimated: 'bg-amber-400',
    manual: 'bg-blue-400', no_data: 'bg-gray-300',
  }
  const title: Record<string, string> = {
    measured: 'Medido', estimated: 'Estimado', manual: 'Manual', no_data: 'Sin datos',
  }
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${map[coverage] ?? 'bg-gray-300'}`}
      title={title[coverage] ?? coverage}
    />
  )
}

function UtilityChip({ utility }: { utility: string }) {
  const color = UTILITY_COLORS[utility] ?? '#64748b'
  const Icon = UTILITY_ICONS[utility]
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ background: color + '18', color }}
    >
      {Icon && <Icon size={9} />}
      {getUtilityLabel(utility)}
    </span>
  )
}

// ── Sheet card (list view) ────────────────────────────────────────────────────

function SheetCard({ sheet, onOpen, onDelete }: {
  sheet: BalanceSheet; onOpen: () => void; onDelete: () => void
}) {
  const result = sheet.last_result
  const STATUS: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600',
    closed: 'bg-blue-50 text-blue-700',
    approved: 'bg-emerald-50 text-emerald-700',
  }
  const STATUS_LABEL: Record<string, string> = {
    draft: 'Borrador', closed: 'Cerrado', approved: 'Aprobado',
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-wrap gap-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS[sheet.status]}`}>
              {STATUS_LABEL[sheet.status]}
            </span>
            {sheet.utility
              ? <UtilityChip utility={sheet.utility} />
              : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-white">Multi-utility</span>
            }
            {result?.is_official && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                <ShieldCheck size={10} /> E7
              </span>
            )}
          </div>
          <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-slate-200 hover:text-red-400 transition-colors cursor-pointer">
            <Trash2 size={13} />
          </button>
        </div>
        <h3 className="text-sm font-bold text-slate-900 truncate">{sheet.name}</h3>
        <p className="text-[11px] text-slate-400 mt-0.5">{periodLabel(sheet.period_start)}</p>

        {result ? (
          <div className="mt-3 grid grid-cols-3 gap-1 text-center">
            {[
              { label: 'Entrada', val: result.total_input_kwh_eq, color: 'text-blue-700' },
              { label: 'Salida', val: result.total_output_kwh_eq, color: 'text-slate-700' },
              { label: 'No explic.', val: result.unaccounted_for_pct, color: (result.unaccounted_for_pct ?? 0) > 15 ? 'text-red-600' : 'text-amber-600', pct: true },
            ].map(({ label, val, color, pct }) => (
              <div key={label}>
                <p className="text-[9px] text-slate-400">{label}</p>
                <p className={`text-[11px] font-bold ${color}`}>{fmtNum(val, pct ? 1 : 0)}{pct ? '%' : ''}</p>
                {!pct && <p className="text-[8px] text-slate-300">kWh-eq</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[10px] text-slate-400 italic">Sin cálculo</p>
        )}
      </div>
      <div className="border-t border-slate-100 px-4 py-2.5">
        <button onClick={onOpen} className="w-full flex items-center justify-between text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">
          Abrir balance <ChevronRight size={12} />
        </button>
      </div>
    </div>
  )
}

// ── New sheet modal ───────────────────────────────────────────────────────────

function NewSheetModal({ siteId, onCreated, onClose }: {
  siteId: string; onCreated: (sheet: BalanceSheet) => void; onClose: () => void
}) {
  const now = new Date()
  const [name, setName]         = useState('')
  const [utility, setUtility]   = useState<string | null>(null)
  const [period, setPeriod]     = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [saving, setSaving]     = useState(false)

  const OPTS = [
    { v: 'electricity', l: 'Electricidad', c: '#1d4ed8' },
    { v: 'natural_gas', l: 'Gas natural',  c: '#c2410c' },
    { v: 'steam',       l: 'Vapor',        c: '#6d28d9' },
    { v: 'compressed_air', l: 'Aire comp.',c: '#0f766e' },
    { v: 'chilled_water',  l: 'Agua helada',c:'#0e7490' },
    { v: 'diesel',      l: 'Diésel',       c: '#a16207' },
  ]

  async function create() {
    if (!name || !period) return
    setSaving(true)
    const [y, m] = period.split('-').map(Number)
    const start = `${y}-${String(m).padStart(2, '0')}-01`
    const end   = new Date(y, m, 0).toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('energy_balance_sheets')
      .insert({
        site_id: siteId,
        name,
        utility: utility || null,
        boundary_type: 'site',
        boundary_id: siteId,
        scope_type: 'site',
        scope_id: siteId,
        calculation_mode: 'topology_official',
        period_start: start,
        period_end: end,
      })
      .select().single()
    setSaving(false)
    if (!error && data) onCreated(data as BalanceSheet)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Nuevo balance energético</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <label className="block">
            <span className="text-[11px] font-bold text-slate-500 block mb-1">Nombre</span>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Sala de calderas — Enero 2026"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              autoFocus />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold text-slate-500 block mb-1">Período</span>
            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </label>
          <div>
            <span className="text-[11px] font-bold text-slate-500 block mb-2">Utility del balance</span>
            <button onClick={() => setUtility(null)}
              className={`mb-2 w-full flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all cursor-pointer ${utility === null ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[8px] font-black">∞</span>
              Multi-utility — totales en kWh equivalentes
            </button>
            <div className="grid grid-cols-2 gap-1.5">
              {OPTS.map(({ v, l, c }) => (
                <button key={v} onClick={() => setUtility(v)}
                  className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition-all cursor-pointer ${utility === v ? 'text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  style={utility === v ? { borderColor: c, backgroundColor: c } : undefined}>
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: c }} />{l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" disabled={!name || saving} loading={saving} onClick={create}>Crear</Button>
        </div>
      </div>
    </div>
  )
}

// ── Equipment picker ──────────────────────────────────────────────────────────

function EquipmentPicker({ siteId, utilityFilter, onPick, onClose }: {
  siteId: string; utilityFilter: string | null
  onPick: (equip: EquipRow, mp: MPRow, side: 'input' | 'output') => void
  onClose: () => void
}) {
  const [equipment, setEquipment] = useState<EquipRow[]>([])
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [mps, setMps]             = useState<MPRow[]>([])
  const [loading, setLoading]     = useState(false)
  const [query, setQuery]         = useState('')

  useEffect(() => {
    let q = supabase.from('energy_equipment')
      .select('id, tag, name, equipment_type, utility_type, area_id')
      .eq('site_id', siteId).order('tag')
    if (utilityFilter) q = (q as typeof q).eq('utility_type', utilityFilter)
    q.then(({ data }) => setEquipment((data ?? []) as EquipRow[]))
  }, [siteId, utilityFilter])

  async function expand(equip: EquipRow) {
    if (expanded === equip.id) { setExpanded(null); setMps([]); return }
    setExpanded(equip.id); setLoading(true)
    const { data } = await supabase.from('measurement_points')
      .select('id, tag, name, utility, measurement_type, unit, source_type')
      .eq('site_id', siteId)
      .or(`target_id.eq.${equip.id},meter_equipment_id.eq.${equip.id}`)
      .order('tag')
    setMps((data ?? []) as MPRow[]); setLoading(false)
  }

  const filtered = equipment.filter((e) =>
    !query || e.tag.toLowerCase().includes(query.toLowerCase()) || e.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="flex flex-col" style={{ maxHeight: 440 }}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
        <p className="text-[11px] font-bold text-slate-700">Agregar medición</p>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X size={13} /></button>
      </div>
      <div className="px-3 py-2 border-b border-slate-100">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5">
          <Search size={11} className="text-slate-400 shrink-0" />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar equipo..." className="flex-1 text-xs outline-none bg-transparent" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map((equip) => {
          const isOpen = expanded === equip.id
          const color = UTILITY_COLORS[equip.utility_type] ?? '#64748b'
          return (
            <div key={equip.id} className="border-b border-slate-50 last:border-0">
              <button onClick={() => expand(equip)}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer text-left">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-800 truncate">{equip.tag} · {equip.name}</p>
                  <p className="text-[9px] text-slate-400">{equip.equipment_type}</p>
                </div>
                {isOpen ? <ChevronDown size={11} className="text-slate-400 shrink-0" /> : <ChevronRight size={11} className="text-slate-400 shrink-0" />}
              </button>
              {isOpen && (
                <div className="bg-slate-50 px-3 pb-2 pt-1">
                  {loading && <p className="text-[10px] text-slate-400 py-2 text-center">Cargando...</p>}
                  {!loading && mps.length === 0 && <p className="text-[10px] text-slate-400 italic py-1">Sin MPs vinculados</p>}
                  {mps.map((mp) => (
                    <div key={mp.id} className="py-1.5 border-b border-slate-100 last:border-0">
                      <p className="text-[10px] font-bold text-slate-700">{mp.tag} <span className="font-normal text-slate-400">· {mp.measurement_type} · {mp.unit}</span></p>
                      <div className="flex gap-1.5 mt-1">
                        <button onClick={() => onPick(equip, mp, 'input')}
                          className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 py-1 text-[9px] font-bold text-blue-700 hover:bg-blue-100 cursor-pointer">
                          <ArrowDownToLine size={9} /> Entrada
                        </button>
                        <button onClick={() => onPick(equip, mp, 'output')}
                          className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-1 text-[9px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
                          <ArrowUpFromLine size={9} /> Salida
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Entry row ─────────────────────────────────────────────────────────────────

function EntryRow({ entry, calc, onRemove, onEditLabel }: {
  entry: BalanceEntry; calc?: EntryCalcResult
  onRemove: () => void; onEditLabel: (l: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel]     = useState(entry.label ?? entry.measurement_point?.tag ?? '—')
  function save() { setEditing(false); onEditLabel(label) }
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-100 rounded-xl hover:border-slate-200 group transition-colors">
      {calc && <CoverageDot coverage={calc.coverage} />}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input value={label} onChange={(e) => setLabel(e.target.value)}
            onBlur={save} onKeyDown={(e) => e.key === 'Enter' && save()}
            className="w-full text-xs outline-none border-b border-blue-300 bg-transparent" autoFocus />
        ) : (
          <div className="flex items-center gap-1">
            <p className="text-xs font-semibold text-slate-800 truncate">{label}</p>
            <button onClick={() => setEditing(true)}
              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-500 cursor-pointer">
              <Edit3 size={9} />
            </button>
          </div>
        )}
        <div className="flex items-center gap-1 mt-0.5">
          {entry.measurement_point && (
            <p className="text-[9px] text-slate-400 font-mono">{entry.measurement_point.tag}</p>
          )}
          {calc?.utility && <UtilityChip utility={calc.utility} />}
        </div>
      </div>
      <div className="text-right shrink-0">
        {calc && calc.value > 0 ? (
          <>
            <p className="text-xs font-bold text-slate-900">{fmtNum(calc.value, 1)} <span className="text-[9px] text-slate-400">{calc.unit}</span></p>
            {calc.value_kwh_eq != null && (
              <p className="text-[9px] text-slate-400">{fmtNum(calc.value_kwh_eq, 0)} kWh-eq</p>
            )}
          </>
        ) : (
          <p className="text-[10px] text-slate-300 italic">sin datos</p>
        )}
      </div>
      <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 cursor-pointer p-1 transition-all">
        <Trash2 size={12} />
      </button>
    </div>
  )
}

// ── Result panel ──────────────────────────────────────────────────────────────

function ResultPanel({ result, unit }: { result: SheetCalcResult; unit: string | null }) {
  const unacc = result.unaccounted_for_pct
  const uncColor = unacc > 15 ? 'text-red-600' : unacc > 8 ? 'text-amber-600' : 'text-emerald-600'
  const official = result.official
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resultado</p>
        {official && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-emerald-300">
            <ShieldCheck size={10} /> E7 oficial
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        {[
          { icon: <ArrowDownToLine size={11} className="text-blue-500" />, label: 'Entrada', val: result.total_input_kwh_eq, native: result.total_input, color: 'text-slate-900' },
          { icon: <ArrowUpFromLine size={11} className="text-slate-500" />, label: 'Salida', val: result.total_output_kwh_eq, native: result.total_output, color: 'text-slate-900' },
          { icon: <TrendingDown size={11} className="text-red-400" />, label: 'No explic.', val: result.unaccounted_for_pct, isPct: true, color: uncColor },
        ].map(({ icon, label, val, native, color, isPct }) => (
          <div key={label} className="px-3 py-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">{icon}<p className="text-[9px] text-slate-400">{label}</p></div>
            <p className={`text-sm font-black ${color}`}>{fmtNum(val, isPct ? 1 : 0)}{isPct ? '%' : ''}</p>
            {!isPct && <p className="text-[9px] text-slate-400">kWh-eq</p>}
            {!isPct && unit && native != null && <p className="text-[8px] text-slate-300">{fmtNum(native, 0)} {unit}</p>}
          </div>
        ))}
      </div>
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3">
        <BarChart2 size={11} className="text-slate-400 shrink-0" />
        <p className="text-[10px] text-slate-500 flex-1">Cobertura</p>
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, result.measurement_coverage)}%` }} />
          </div>
          <span className="text-[10px] font-bold text-slate-700">{fmtNum(result.measurement_coverage, 1)}%</span>
        </div>
      </div>
      {official && (
        <div className="px-4 py-3 border-b border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Versión topológica</span>
            <span className="font-mono text-slate-700">v{official.topology_snapshot.diagram_version_number}</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Confianza</span>
            <span className="font-bold text-emerald-700">{official.confidence_score}%</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Versiones hijas</span>
            <span className="font-mono text-slate-700">{official.child_diagram_version_ids.length}</span>
          </div>
        </div>
      )}
      {official?.findings.length ? (
        <div className="px-4 py-3 border-b border-slate-100 space-y-2">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Hallazgos</p>
          {official.findings.slice(0, 3).map((finding) => (
            <div key={finding.id} className="rounded-lg bg-slate-50 px-2.5 py-2">
              <p className="text-[10px] font-bold text-slate-700">{finding.title}</p>
              <p className="text-[9px] text-slate-500 leading-snug">{finding.detail}</p>
            </div>
          ))}
        </div>
      ) : null}
      {Object.keys(result.by_utility).length > 1 && (
        <div className="px-4 py-3 space-y-1.5">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Por utility (kWh-eq)</p>
          {Object.entries(result.by_utility).map(([util, data]) => {
            const c = UTILITY_COLORS[util] ?? '#64748b'
            return (
              <div key={util} className="flex items-center gap-2 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c }} />
                <span className="text-slate-600 flex-1 truncate">{data.label}</span>
                <span className="font-mono text-blue-600">{fmtNum(data.input_kwh, 0)}</span>
                <span className="text-slate-300 text-[8px]">in</span>
                <span className="font-mono text-slate-500">{fmtNum(data.output_kwh, 0)}</span>
                <span className="text-slate-300 text-[8px]">out</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Balance editor ────────────────────────────────────────────────────────────

function BalanceEditor({ sheet: init, onBack }: { sheet: BalanceSheet; onBack: () => void }) {
  const [sheet, setSheet]     = useState<BalanceSheet>(init)
  const [entries, setEntries] = useState<BalanceEntry[]>([])
  const [result, setResult]   = useState<SheetCalcResult | null>(null)
  const [showPicker, setPicker] = useState(false)
  const [calculating, setCalc]  = useState(false)
  const [saving, setSaving]     = useState(false)
  const [calcError, setCalcError] = useState<string | null>(null)

  const loadEntries = useCallback(async () => {
    const { data } = await supabase
      .from('energy_balance_entries')
      .select(`*, equipment:energy_equipment(id,tag,name,equipment_type,utility_type), measurement_point:measurement_points(id,tag,name,utility,measurement_type,unit,source_type)`)
      .eq('sheet_id', sheet.id).order('side').order('order_index')
    setEntries((data ?? []) as BalanceEntry[])
  }, [sheet.id])

  useEffect(() => { loadEntries() }, [loadEntries])

  async function addEntry(equip: EquipRow, mp: MPRow, side: 'input' | 'output') {
    const max = entries.filter((e) => e.side === side).length
    const { data } = await supabase.from('energy_balance_entries')
      .insert({ sheet_id: sheet.id, side, equipment_id: equip.id, measurement_point_id: mp.id, label: `${equip.tag} — ${mp.tag}`, order_index: max })
      .select(`*, equipment:energy_equipment(id,tag,name,equipment_type,utility_type), measurement_point:measurement_points(id,tag,name,utility,measurement_type,unit,source_type)`)
      .single()
    if (data) setEntries((prev) => [...prev, data as BalanceEntry])
    setPicker(false)
  }

  async function removeEntry(id: string) {
    await supabase.from('energy_balance_entries').delete().eq('id', id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  async function updateLabel(id: string, label: string) {
    await supabase.from('energy_balance_entries').update({ label }).eq('id', id)
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, label } : e))
  }

  async function runCalc() {
    setCalc(true)
    setCalcError(null)
    try {
      const calc = await calculateOfficialSheet(sheet, entries)
      setResult(calc as never)
      await persistOfficialResult(calc)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo calcular el balance oficial.'
      setCalcError(message)
    }
    setCalc(false)
  }

  async function setStatus(status: BalanceSheet['status']) {
    setSaving(true)
    await supabase.from('energy_balance_sheets').update({ status }).eq('id', sheet.id)
    setSheet((s) => ({ ...s, status }))
    setSaving(false)
  }

  const inputs  = entries.filter((e) => e.side === 'input')
  const outputs = entries.filter((e) => e.side === 'output')
  const calcMap = result ? new Map(result.entries.map((e) => [e.entry_id, e])) : new Map<string, EntryCalcResult>()
  const nativeUnit = inputs[0]?.measurement_point?.unit ?? null

  const STATUS_NEXT: Record<string, { label: string; to: BalanceSheet['status']; variant: 'primary' | 'success' }> = {
    draft:    { label: 'Cerrar período', to: 'closed',   variant: 'primary' },
    closed:   { label: 'Aprobar',        to: 'approved', variant: 'success' },
    approved: { label: '✓ Aprobado',     to: 'approved', variant: 'success' },
  }
  const action = STATUS_NEXT[sheet.status]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-white shrink-0">
        <button onClick={onBack} className="text-[11px] text-slate-400 hover:text-slate-700 cursor-pointer">← Balances</button>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-slate-900 truncate">{sheet.name}</h2>
          <p className="text-[10px] text-slate-400">{periodLabel(sheet.period_start)} · {sheet.utility ? getUtilityLabel(sheet.utility) : 'Multi-utility'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="secondary" leftIcon={<Calculator size={12} />} loading={calculating} onClick={runCalc}>
            Calcular oficial
          </Button>
          {sheet.status !== 'approved' && (
            <Button size="sm" variant={action.variant} loading={saving} onClick={() => setStatus(action.to)}>
              {action.label}
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-5 py-5 grid grid-cols-1 lg:grid-cols-[1fr_1fr_300px] gap-5">

          {/* Entradas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ArrowDownToLine size={13} className="text-blue-500" />
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Entradas</h3>
                <span className="text-[10px] text-slate-400">({inputs.length})</span>
              </div>
              {result && <span className="text-[11px] font-bold text-blue-700">{fmtNum(result.total_input_kwh_eq, 0)} kWh-eq</span>}
            </div>
            <div className="space-y-2">
              {inputs.map((e) => (
                <EntryRow key={e.id} entry={e} calc={calcMap.get(e.id)}
                  onRemove={() => removeEntry(e.id)} onEditLabel={(l) => updateLabel(e.id, l)} />
              ))}
              {inputs.length === 0 && (
                <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/40 py-8 text-center">
                  <p className="text-xs text-blue-400">Agrega entradas →</p>
                </div>
              )}
            </div>
          </div>

          {/* Salidas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ArrowUpFromLine size={13} className="text-slate-500" />
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Salidas / Consumos</h3>
                <span className="text-[10px] text-slate-400">({outputs.length})</span>
              </div>
              {result && <span className="text-[11px] font-bold text-slate-600">{fmtNum(result.total_output_kwh_eq, 0)} kWh-eq</span>}
            </div>
            <div className="space-y-2">
              {outputs.map((e) => (
                <EntryRow key={e.id} entry={e} calc={calcMap.get(e.id)}
                  onRemove={() => removeEntry(e.id)} onEditLabel={(l) => updateLabel(e.id, l)} />
              ))}
              {outputs.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                  <p className="text-xs text-slate-400">Agrega salidas →</p>
                </div>
              )}
            </div>
          </div>

          {/* Panel lateral */}
          <div className="space-y-4">
            {showPicker ? (
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <EquipmentPicker siteId={sheet.site_id} utilityFilter={sheet.utility}
                  onPick={addEntry} onClose={() => setPicker(false)} />
              </div>
            ) : (
              <button onClick={() => setPicker(true)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 py-5 text-xs font-semibold text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer">
                <Plus size={13} /> Agregar equipo / medición
              </button>
            )}
            {result && <ResultPanel result={result} unit={nativeUnit} />}
            {calcError && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <p>{calcError}</p>
                </div>
              </div>
            )}
            {!result && entries.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 py-10 text-center">
                <Calculator size={22} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Presiona "Calcular oficial"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type BalanceTab = 'balances' | 'variables'

export default function BalancesPage() {
  const [tab, setTab]           = useState<BalanceTab>('balances')
  const [sheets, setSheets]     = useState<BalanceSheet[]>([])
  const [loading, setLoading]   = useState(false)
  const [showNew, setShowNew]   = useState(false)
  const [open, setOpen]         = useState<BalanceSheet | null>(null)
  const { selectedSiteId }      = useUIStore()

  const load = useCallback(async () => {
    if (!selectedSiteId) { setSheets([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('energy_balance_sheets')
      .select(`*, last_result:energy_balance_results(id, total_input_kwh_eq, total_output_kwh_eq, unaccounted_for_kwh_eq, unaccounted_for_pct, measurement_coverage, is_official, result_status, confidence_score)`)
      .eq('site_id', selectedSiteId)
      .order('created_at', { ascending: false }).limit(50)
    const rows = (data ?? []).map((s: Record<string, unknown>) => {
      const arr = Array.isArray(s.last_result) ? s.last_result : []
      return { ...s, last_result: arr[0] ?? null }
    })
    setSheets(rows as BalanceSheet[])
    setLoading(false)
  }, [selectedSiteId])

  useEffect(() => { load() }, [load])

  // El editor ocupa pantalla completa, sin tabs
  if (open) {
    return <BalanceEditor sheet={open} onBack={() => { setOpen(null); load() }} />
  }

  const TABS: { id: BalanceTab; label: string; icon: React.ReactNode }[] = [
    { id: 'balances',  label: 'Balances energéticos', icon: <Scale size={12} /> },
    { id: 'variables', label: 'Variables relevantes', icon: <Package size={12} /> },
  ]

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full px-5 py-5 space-y-5">

        {/* Tab strip */}
        <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 w-fit">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={[
                'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer',
                tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        {/* ── Tab: Balances ─────────────────────────────────────────────── */}
        {tab === 'balances' && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ingeniería energética</p>
                <h1 className="text-lg font-black text-slate-950">Balances energéticos</h1>
                <p className="text-xs text-slate-400 mt-0.5">Compón entradas y salidas · cuantifica consumo y pérdidas no explicadas</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} onClick={load} />
                <Button size="sm" leftIcon={<Plus size={13} />} onClick={() => setShowNew(true)}>Nuevo balance</Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-[10px] text-slate-400">
              {[['bg-emerald-500','Medido'],['bg-amber-400','Estimado'],['bg-gray-300','Sin datos']].map(([cls,lbl]) => (
                <span key={lbl} className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${cls}`} />{lbl}</span>
              ))}
            </div>

            {loading && <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>}

            {!loading && sheets.length === 0 && (
              <div className="flex flex-col items-center py-20 text-center">
                <Scale size={40} className="text-slate-200 mb-4" />
                <h3 className="text-sm font-bold text-slate-600 mb-1">Sin balances todavía</h3>
                <p className="text-xs text-slate-400 mb-5 max-w-xs">Crea un balance, arrastra los medidores como entradas/salidas y calcula el no-explicado.</p>
                <Button size="sm" leftIcon={<Plus size={13} />} onClick={() => setShowNew(true)}>Crear primer balance</Button>
              </div>
            )}

            {!loading && sheets.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sheets.map((s) => (
                  <SheetCard key={s.id} sheet={s} onOpen={() => setOpen(s)}
                    onDelete={async () => {
                      await supabase.from('energy_balance_sheets').delete().eq('id', s.id)
                      setSheets((prev) => prev.filter((x) => x.id !== s.id))
                    }} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Tab: Variables relevantes ─────────────────────────────────── */}
        {tab === 'variables' && selectedSiteId && (
          <RelevantVariablesPage siteId={selectedSiteId} />
        )}
      </div>

      {showNew && selectedSiteId && tab === 'balances' && (
        <NewSheetModal siteId={selectedSiteId}
          onCreated={(s) => { setSheets((prev) => [s, ...prev]); setOpen(s); setShowNew(false) }}
          onClose={() => setShowNew(false)} />
      )}
    </div>
  )
}
