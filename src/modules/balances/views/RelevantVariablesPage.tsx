import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  BarChart2, Check, ChevronRight, Database, FolderPlus, Package, Plus,
  RefreshCw, Save, SlidersHorizontal, TrendingUp,
} from 'lucide-react'
import {
  Bar, CartesianGrid, ComposedChart, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { supabase } from '@/services/supabase'
import { computeEnPITrend } from '@/services/enpi-engine'
import type { EnPITrendPoint } from '@/services/enpi-engine'
import { Button } from '@/shared/Button'
import { Card } from '@/shared/Card'
import { Modal } from '@/shared/Modal'

interface RelevantVariable {
  id: string
  name: string
  code: string | null
  description: string | null
  unit: string
  variable_type: string
  default_frequency: Frequency
  aggregation_method: string
  source_type: string
}

interface VariableGroup {
  id: string
  name: string
  group_type: string
  sort_order: number
}

interface GroupMember {
  group_id: string
  variable_id: string
}

interface EditRow {
  period: string
  period_start: string
  period_end: string
  value: string
  original: number | null
  dirty: boolean
}

interface LinkedEnPI {
  id: string
  name: string
  unit: string
  numerator_type: string
  numerator_ref_id: string | null
  numerator_side: string | null
}

type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'ad_hoc'

const FREQUENCIES: Array<{ value: Frequency; label: string; count: number }> = [
  { value: 'daily', label: 'Diaria', count: 14 },
  { value: 'weekly', label: 'Semanal', count: 12 },
  { value: 'monthly', label: 'Mensual', count: 18 },
  { value: 'quarterly', label: 'Trimestral', count: 8 },
  { value: 'annual', label: 'Anual', count: 5 },
  { value: 'ad_hoc', label: 'Rango libre', count: 10 },
]

const VARIABLE_TYPES = [
  ['production', 'Producción'],
  ['environment', 'Ambiente'],
  ['occupancy', 'Ocupación'],
  ['area', 'Área'],
  ['runtime', 'Horas / uso'],
  ['quality', 'Calidad'],
  ['cost', 'Costo'],
  ['operation', 'Operación'],
  ['custom', 'Custom'],
] as const

const AGGREGATIONS = [
  ['sum', 'Suma'],
  ['avg', 'Promedio'],
  ['min', 'Mínimo'],
  ['max', 'Máximo'],
  ['last', 'Último'],
  ['delta', 'Delta'],
  ['weighted_avg', 'Prom. ponderado'],
  ['count', 'Conteo'],
] as const

const SOURCE_LABEL: Record<string, string> = {
  manual: 'Manual',
  iot_db: 'IoT en desarrollo',
  api_pull: 'API pull en desarrollo',
  api_push: 'API push en desarrollo',
  file_import: 'Importación en desarrollo',
  calculated: 'Calculado',
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function isoDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function buildPeriods(frequency: Frequency): Array<{ period: string; start: string; end: string }> {
  const meta = FREQUENCIES.find((item) => item.value === frequency) ?? FREQUENCIES[2]
  const now = new Date()
  const periods: Array<{ period: string; start: string; end: string }> = []

  for (let i = meta.count - 1; i >= 0; i--) {
    if (frequency === 'daily') {
      const start = addDays(now, -i)
      periods.push({ period: isoDate(start), start: isoDate(start), end: isoDate(start) })
    } else if (frequency === 'weekly') {
      const end = addDays(now, -i * 7)
      const start = addDays(end, -6)
      periods.push({ period: `S${meta.count - i}`, start: isoDate(start), end: isoDate(end) })
    } else if (frequency === 'quarterly') {
      const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1)
      const q = Math.floor(d.getMonth() / 3) + 1
      const start = new Date(d.getFullYear(), (q - 1) * 3, 1)
      const end = new Date(d.getFullYear(), q * 3, 0)
      periods.push({ period: `${d.getFullYear()}-T${q}`, start: isoDate(start), end: isoDate(end) })
    } else if (frequency === 'annual') {
      const y = now.getFullYear() - i
      periods.push({ period: String(y), start: `${y}-01-01`, end: `${y}-12-31` })
    } else {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const y = d.getFullYear()
      const m = pad(d.getMonth() + 1)
      periods.push({ period: `${y}-${m}`, start: `${y}-${m}-01`, end: isoDate(endOfMonth(d)) })
    }
  }
  return periods
}

function fmtNum(value: number | null | undefined, decimals = 1) {
  if (value == null) return '-'
  return value.toLocaleString('es-MX', { maximumFractionDigits: decimals })
}

function typeLabel(type: string) {
  return VARIABLE_TYPES.find(([value]) => value === type)?.[1] ?? type
}

function frequencyLabel(frequency: string) {
  return FREQUENCIES.find((item) => item.value === frequency)?.label ?? frequency
}

export function RelevantVariablesPage({ siteId }: { siteId: string }) {
  const [variables, setVariables] = useState<RelevantVariable[]>([])
  const [groups, setGroups] = useState<VariableGroup[]>([])
  const [members, setMembers] = useState<GroupMember[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [newVariableOpen, setNewVariableOpen] = useState(false)
  const [newGroupOpen, setNewGroupOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: vars }, { data: groupRows }, { data: memberRows }] = await Promise.all([
      supabase
        .from('relevant_variables')
        .select('id,code,name,description,unit,variable_type,default_frequency,aggregation_method,source_type')
        .eq('site_id', siteId)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('relevant_variable_groups')
        .select('id,name,group_type,sort_order')
        .eq('site_id', siteId)
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('relevant_variable_group_members')
        .select('group_id,variable_id'),
    ])
    const normalized = (vars ?? []) as RelevantVariable[]
    setVariables(normalized)
    setGroups((groupRows ?? []) as VariableGroup[])
    setMembers((memberRows ?? []) as GroupMember[])
    if (!selectedId && normalized[0]) setSelectedId(normalized[0].id)
    setLoading(false)
  }, [siteId, selectedId])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    if (selectedGroup === 'all') return variables
    const allowed = new Set(members.filter((m) => m.group_id === selectedGroup).map((m) => m.variable_id))
    return variables.filter((variable) => allowed.has(variable.id))
  }, [members, selectedGroup, variables])

  const selected = variables.find((variable) => variable.id === selectedId) ?? filtered[0] ?? null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ingeniería energética</p>
          <h1 className="text-lg font-black text-slate-950">Variables relevantes</h1>
          <p className="mt-0.5 text-xs text-slate-400">Drivers, contexto y denominadores de EnPIs con unidad y frecuencia flexibles.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" leftIcon={<FolderPlus size={13} />} onClick={() => setNewGroupOpen(true)}>Bucket</Button>
          <Button variant="secondary" size="sm" leftIcon={<Plus size={13} />} onClick={() => setNewVariableOpen(true)}>Variable</Button>
          <Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} onClick={load} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" /></div>
      ) : variables.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Package size={40} className="mb-4 text-slate-200" />
          <p className="mb-1 text-sm font-bold text-slate-600">Sin variables relevantes</p>
          <p className="max-w-sm text-xs text-slate-400">Crea variables como toneladas, libras, temperatura ambiente, ocupación, litros, m2 u horas de operación.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[270px_1fr]">
          <VariableSidebar
            groups={groups}
            variables={filtered}
            selectedGroup={selectedGroup}
            selectedId={selected?.id ?? null}
            onGroup={setSelectedGroup}
            onSelect={setSelectedId}
          />
          <div className="min-w-0">
            {selected && <VariableDetail key={selected.id} siteId={siteId} variable={selected} />}
          </div>
        </div>
      )}

      {newVariableOpen && (
        <NewVariableModal
          siteId={siteId}
          groups={groups}
          onClose={() => setNewVariableOpen(false)}
          onSaved={() => { setNewVariableOpen(false); load() }}
        />
      )}
      {newGroupOpen && (
        <NewGroupModal
          siteId={siteId}
          onClose={() => setNewGroupOpen(false)}
          onSaved={() => { setNewGroupOpen(false); load() }}
        />
      )}
    </div>
  )
}

function VariableSidebar({
  groups,
  variables,
  selectedGroup,
  selectedId,
  onGroup,
  onSelect,
}: {
  groups: VariableGroup[]
  variables: RelevantVariable[]
  selectedGroup: string
  selectedId: string | null
  onGroup: (id: string) => void
  onSelect: (id: string) => void
}) {
  return (
    <Card padding="none" className="flex max-h-[calc(100vh-190px)] flex-col overflow-hidden rounded-xl border-slate-200">
      <div className="border-b border-slate-100 bg-slate-50 px-3 py-2.5">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Buckets</p>
        <div className="mt-2 flex flex-wrap gap-1">
          <BucketButton active={selectedGroup === 'all'} label="Todas" onClick={() => onGroup('all')} />
          {groups.map((group) => (
            <BucketButton key={group.id} active={selectedGroup === group.id} label={group.name} onClick={() => onGroup(group.id)} />
          ))}
        </div>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {variables.map((variable) => (
          <button
            key={variable.id}
            type="button"
            onClick={() => onSelect(variable.id)}
            className={[
              'flex w-full cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-all',
              selectedId === variable.id ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-transparent text-slate-700 hover:bg-slate-50',
            ].join(' ')}
          >
            <Package size={13} className={selectedId === variable.id ? 'text-blue-500' : 'text-slate-400'} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold">{variable.name}</p>
              <p className="truncate text-[10px] text-slate-400">
                {typeLabel(variable.variable_type)} · {variable.unit} · {frequencyLabel(variable.default_frequency)}
              </p>
            </div>
            <ChevronRight size={11} className="shrink-0 text-slate-300" />
          </button>
        ))}
      </div>
    </Card>
  )
}

function BucketButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-lg px-2 py-1 text-[10px] font-bold transition-colors',
        active ? 'bg-slate-950 text-white' : 'bg-white text-slate-500 hover:text-slate-900',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function VariableDetail({ siteId, variable }: { siteId: string; variable: RelevantVariable }) {
  const [frequency, setFrequency] = useState<Frequency>(variable.default_frequency || 'monthly')
  const [rows, setRows] = useState<EditRow[]>([])
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [linkedEnPI, setLinkedEnPI] = useState<LinkedEnPI | null>(null)
  const [trend, setTrend] = useState<EnPITrendPoint[]>([])
  const [trendLoading, setTrendLoading] = useState(false)

  const periods = useMemo(() => buildPeriods(frequency), [frequency])

  const load = useCallback(async () => {
    const [{ data: readings }, { data: enpis }] = await Promise.all([
      supabase
        .from('relevant_variable_readings')
        .select('id, period_start, value')
        .eq('variable_id', variable.id)
        .eq('frequency', frequency)
        .order('period_start', { ascending: true }),
      supabase
        .from('energy_enpis')
        .select('id, name, unit, numerator_type, numerator_ref_id, numerator_side')
        .eq('site_id', siteId)
        .eq('denominator_ref_id', variable.id),
    ])

    const readMap = new Map<string, number>()
    for (const reading of readings ?? []) {
      const key = frequency === 'monthly' ? reading.period_start.slice(0, 7) : reading.period_start.slice(0, 10)
      readMap.set(key, Number(reading.value))
    }

    setRows(periods.map((period) => {
      const key = frequency === 'monthly' ? period.start.slice(0, 7) : period.start
      const existing = readMap.get(key)
      return {
        period: period.period,
        period_start: period.start,
        period_end: period.end,
        value: existing != null ? String(existing) : '',
        original: existing ?? null,
        dirty: false,
      }
    }))

    const linked = (enpis ?? [])[0] ?? null
    setLinkedEnPI(linked)
    if (linked?.numerator_type && linked.numerator_type !== 'formula' && frequency === 'monthly') {
      setTrendLoading(true)
      computeEnPITrend({
        numerator_type: linked.numerator_type as 'measurement_point' | 'balance_sheet',
        numerator_ref_id: linked.numerator_ref_id ?? null,
        numerator_side: linked.numerator_side as 'input' | 'output' | 'net' | null,
        denominator_type: 'relevant_variable',
        denominator_ref_id: variable.id,
      }, 18).then(setTrend).finally(() => setTrendLoading(false))
    } else {
      setTrend([])
    }
  }, [frequency, periods, siteId, variable.id])

  useEffect(() => { load() }, [load])

  async function saveChanges() {
    const dirty = rows.filter((row) => row.dirty && row.value.trim() !== '')
    if (!dirty.length) return
    setSaving(true)
    try {
      await supabase
        .from('relevant_variable_readings')
        .upsert(dirty.map((row) => ({
          variable_id: variable.id,
          period_start: row.period_start,
          period_end: row.period_end,
          frequency,
          value: Number(row.value),
          unit_snapshot: variable.unit,
          quality: 'manual',
          source_type: 'manual',
          notes: null,
        })), { onConflict: 'variable_id,period_start,period_end,frequency' })
      setSavedAt(new Date())
      await load()
    } finally {
      setSaving(false)
    }
  }

  const values = rows.map((row) => row.original).filter((value): value is number => value != null)
  const lastValue = values.at(-1) ?? null
  const avgValue = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
  const sumValue = values.reduce((sum, value) => sum + value, 0)
  const trendMap = new Map(trend.map((point) => [point.period, point.enpi_value]))
  const chartData = rows.map((row) => ({
    period: row.period,
    variableValue: row.original,
    enpi: trendMap.get(row.period) ?? null,
  }))
  const dirtyCount = rows.filter((row) => row.dirty).length

  return (
    <div className="space-y-4">
      <Card padding="sm" className="rounded-xl border-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Package size={14} className="text-blue-500" />
              <h2 className="text-sm font-black text-slate-900">{variable.name}</h2>
            </div>
            <p className="text-xs text-slate-500">{variable.description || 'Variable relevante disponible para EnPIs, estudios y análisis.'}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold">
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">{typeLabel(variable.variable_type)}</span>
              <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-slate-600">{variable.unit}</span>
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">{AGGREGATIONS.find(([value]) => value === variable.aggregation_method)?.[1] ?? variable.aggregation_method}</span>
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">{SOURCE_LABEL[variable.source_type] ?? variable.source_type}</span>
            </div>
            {linkedEnPI && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                <TrendingUp size={10} />
                Denominador de {linkedEnPI.name} ({linkedEnPI.unit})
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <MiniStat label="Último" value={fmtNum(lastValue, 1)} unit={variable.unit} />
            <MiniStat label="Promedio" value={fmtNum(avgValue, 1)} unit={variable.unit} />
            <MiniStat label="Total" value={fmtNum(sumValue, 0)} unit={variable.unit} />
          </div>
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden rounded-xl border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={13} className="text-slate-400" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Editor flexible</p>
              <h3 className="text-sm font-bold text-slate-900">Lecturas de {variable.name}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={frequency}
              onChange={(event) => setFrequency(event.target.value as Frequency)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-400"
            >
              {FREQUENCIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            {savedAt && <span className="hidden items-center gap-1 text-[10px] font-semibold text-emerald-600 sm:flex"><Check size={11} /> {savedAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>}
            <Button size="sm" leftIcon={<Save size={12} />} disabled={dirtyCount === 0 || saving} loading={saving} onClick={saveChanges}>
              {dirtyCount > 0 ? `Guardar ${dirtyCount}` : 'Sin cambios'}
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Periodo</th>
                <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">Rango</th>
                <th className="px-3 py-2 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">Valor ({variable.unit})</th>
                {linkedEnPI && frequency === 'monthly' && (
                  <th className="px-3 py-2 text-right text-[10px] font-black uppercase tracking-wider text-emerald-600">{linkedEnPI.unit}</th>
                )}
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const enpiValue = trendMap.get(row.period)
                return (
                  <tr key={`${row.period_start}-${row.period_end}`} className={row.dirty ? 'border-b border-slate-50 bg-amber-50' : 'border-b border-slate-50 hover:bg-slate-50/60'}>
                    <td className="px-3 py-2 font-bold text-slate-700">{row.period}</td>
                    <td className="px-3 py-2 font-mono text-[10px] text-slate-400">{row.period_start} → {row.period_end}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end">
                        <input
                          type="number"
                          step="any"
                          value={row.value}
                          onChange={(event) => {
                            const next = event.target.value
                            setRows((prev) => prev.map((item) =>
                              item.period_start === row.period_start && item.period_end === row.period_end
                                ? { ...item, value: next, dirty: next !== String(item.original ?? '') }
                                : item
                            ))
                          }}
                          className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right font-mono text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          placeholder="-"
                        />
                      </div>
                    </td>
                    {linkedEnPI && frequency === 'monthly' && (
                      <td className="px-3 py-2 text-right font-mono text-emerald-700">
                        {enpiValue != null ? fmtNum(enpiValue, 3) : <span className="text-slate-200">-</span>}
                      </td>
                    )}
                    <td className="px-3 py-2 text-center">{row.dirty && <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden rounded-xl border-slate-200">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <BarChart2 size={13} className="text-slate-400" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Historial</p>
            <h3 className="text-sm font-bold text-slate-900">{variable.name}{linkedEnPI && frequency === 'monthly' && !trendLoading ? ` + ${linkedEnPI.unit}` : ''}</h3>
          </div>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={190}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="var" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={48} />
              {linkedEnPI && frequency === 'monthly' && <YAxis yAxisId="enpi" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={40} />}
              <Tooltip contentStyle={{ borderRadius: 10, borderColor: '#e2e8f0', fontSize: 11 }} />
              <Bar yAxisId="var" dataKey="variableValue" name={variable.unit} fill="#1d4ed8" opacity={0.8} radius={[3, 3, 0, 0]} />
              {linkedEnPI && frequency === 'monthly' && <Line yAxisId="enpi" type="monotone" dataKey="enpi" name={linkedEnPI.unit} stroke="#059669" strokeWidth={2} dot={{ r: 3 }} connectNulls />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

function MiniStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <p className="mb-0.5 text-[9px] text-slate-400">{label}</p>
      <p className="text-base font-black text-slate-900">{value}</p>
      <p className="text-[9px] text-slate-400">{unit}</p>
    </div>
  )
}

function NewVariableModal({
  siteId,
  groups,
  onSaved,
  onClose,
}: {
  siteId: string
  groups: VariableGroup[]
  onSaved: () => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    unit: '',
    variable_type: 'production',
    default_frequency: 'monthly' as Frequency,
    aggregation_method: 'sum',
    source_type: 'manual',
    group_id: groups[0]?.id ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.name || !form.unit) return
    setSaving(true)
    const { data } = await supabase
      .from('relevant_variables')
      .insert({
        site_id: siteId,
        name: form.name,
        code: form.code || null,
        description: form.description || null,
        unit: form.unit,
        variable_type: form.variable_type,
        default_frequency: form.default_frequency,
        aggregation_method: form.aggregation_method,
        source_type: form.source_type,
        scope_type: 'site',
        scope_id: siteId,
        is_driver_candidate: true,
      })
      .select('id')
      .single()

    if (data?.id && form.group_id) {
      await supabase.from('relevant_variable_group_members').insert({
        group_id: form.group_id,
        variable_id: data.id,
      })
    }
    setSaving(false)
    onSaved()
  }

  return (
    <Modal open onClose={onClose} title="Nueva variable relevante">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Nombre" required><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
          <Field label="Código"><input className={inputClass} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="RV-LINEA-A-TON" /></Field>
          <Field label="Unidad" required><input className={`${inputClass} font-mono`} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="lb, L, °C, personas, m2" /></Field>
          <Field label="Tipo">
            <select className={inputClass} value={form.variable_type} onChange={(e) => setForm({ ...form, variable_type: e.target.value })}>
              {VARIABLE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Frecuencia">
            <select className={inputClass} value={form.default_frequency} onChange={(e) => setForm({ ...form, default_frequency: e.target.value as Frequency })}>
              {FREQUENCIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
          <Field label="Agregación">
            <select className={inputClass} value={form.aggregation_method} onChange={(e) => setForm({ ...form, aggregation_method: e.target.value })}>
              {AGGREGATIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Bucket">
            <select className={inputClass} value={form.group_id} onChange={(e) => setForm({ ...form, group_id: e.target.value })}>
              <option value="">Sin bucket</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </Field>
          <Field label="Fuente">
            <select className={inputClass} value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value })}>
              {Object.entries(SOURCE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Descripción" className="md:col-span-2">
            <textarea className={`${inputClass} min-h-[72px] resize-none`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving} disabled={!form.name || !form.unit} leftIcon={<Save size={14} />}>Crear variable</Button>
        </div>
      </div>
    </Modal>
  )
}

function NewGroupModal({ siteId, onSaved, onClose }: { siteId: string; onSaved: () => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [groupType, setGroupType] = useState('custom')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name) return
    setSaving(true)
    await supabase.from('relevant_variable_groups').insert({
      site_id: siteId,
      name,
      code: name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, ''),
      group_type: groupType,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <Modal open onClose={onClose} title="Nuevo bucket de variables">
      <div className="space-y-4">
        <Field label="Nombre" required><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <Field label="Tipo">
          <select className={inputClass} value={groupType} onChange={(e) => setGroupType(e.target.value)}>
            <option value="production">Producción</option>
            <option value="environment">Ambiente</option>
            <option value="operation">Operación</option>
            <option value="area">Área</option>
            <option value="quality">Calidad</option>
            <option value="cost">Costo</option>
            <option value="custom">Custom</option>
          </select>
        </Field>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <Database size={13} className="mr-1 inline text-slate-400" />
          Los buckets son libres: puedes agrupar por línea, utility, área, clima, costo o cualquier criterio del estudio.
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving} disabled={!name} leftIcon={<Save size={14} />}>Crear bucket</Button>
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: ReactNode }) {
  return (
    <label className={className}>
      <span className="mb-1 block text-[11px] font-bold text-slate-500">{label}{required && <span className="text-red-500"> *</span>}</span>
      {children}
    </label>
  )
}

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
