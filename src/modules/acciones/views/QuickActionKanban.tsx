import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  BarChart3,
  ClipboardCheck,
  FileUp,
  Gauge,
  Plus,
  Target,
  UserRound,
  Zap,
} from 'lucide-react'
import { supabase } from '@/services/supabase'
import { Badge, utilityBadgeVariant } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { Card } from '@/shared/Card'
import { EmptyState } from '@/shared/EmptyState'
import type { EnergyImprovement, EnergyImprovementEvidence, EnergyProjectTask, ImprovementStatus } from '../types'
import { STATUS_LABELS, KANBAN_COLUMNS } from '../types'

interface Props {
  siteId: string
  onSelect: (item: EnergyImprovement) => void
}

interface EnpiSummary {
  id: string
  name: string
  unit: string
  utility: string
}

interface QuickActionItem extends EnergyImprovement {
  enpi?: EnpiSummary | null
  tasks?: EnergyProjectTask[]
  evidence?: EnergyImprovementEvidence[]
}

export function QuickActionKanban({ siteId, onSelect }: Props) {
  const [items, setItems] = useState<QuickActionItem[]>([])
  const [enpis, setEnpis] = useState<EnpiSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<ImprovementStatus | 'all'>('all')

  useEffect(() => {
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  async function load() {
    if (!siteId) return
    setLoading(true)
    const [{ data: actionRows }, { data: enpiRows }] = await Promise.all([
      supabase
        .from('energy_improvements')
        .select('*')
        .eq('site_id', siteId)
        .eq('work_type', 'quick_action')
        .not('status', 'in', '(closed,cancelled)')
        .order('updated_at', { ascending: false }),
      supabase
        .from('energy_enpis')
        .select('id,name,unit,utility')
        .eq('site_id', siteId)
        .eq('is_active', true)
        .order('name'),
    ])

    const actionIds = (actionRows || []).map((item) => item.id)
    const [{ data: tasks }, { data: evidence }] = actionIds.length > 0
      ? await Promise.all([
        supabase.from('energy_project_tasks').select('*').in('improvement_id', actionIds).order('created_at'),
        supabase.from('energy_improvement_evidence').select('*').in('improvement_id', actionIds).order('uploaded_at', { ascending: false }),
      ])
      : [{ data: [] }, { data: [] }]

    const enpiList = (enpiRows || []) as EnpiSummary[]
    setEnpis(enpiList)
    setItems(((actionRows || []) as EnergyImprovement[]).map((item) => ({
      ...item,
      enpi: enpiList.find((enpi) => enpi.id === item.source_enpi_id) || null,
      tasks: ((tasks || []) as EnergyProjectTask[]).filter((task) => task.improvement_id === item.id),
      evidence: ((evidence || []) as EnergyImprovementEvidence[]).filter((ev) => ev.improvement_id === item.id),
    })))
    setLoading(false)
  }

  async function moveStatus(item: QuickActionItem, newStatus: ImprovementStatus) {
    const oldStatus = item.status
    await supabase.from('energy_improvements').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', item.id)
    await supabase.from('energy_improvement_status_log').insert({
      improvement_id: item.id,
      from_status: oldStatus,
      to_status: newStatus,
    })
    setItems((prev) => prev.map((row) => row.id === item.id ? { ...row, status: newStatus } : row))
  }

  async function quickBindEnpi(item: QuickActionItem, enpiId: string) {
    const enpi = enpis.find((candidate) => candidate.id === enpiId) || null
    await supabase.from('energy_improvements').update({
      source_enpi_id: enpiId || null,
      utility: enpi?.utility || item.utility,
      savings_unit: enpi?.unit || item.savings_unit,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id)
    setItems((prev) => prev.map((row) => row.id === item.id ? {
      ...row,
      source_enpi_id: enpiId || undefined,
      utility: enpi?.utility || row.utility,
      savings_unit: enpi?.unit || row.savings_unit,
      enpi,
    } : row))
  }

  async function addDefaultChecklist(item: QuickActionItem) {
    const checklist = [
      { text: 'Responsable confirmado', done: Boolean(item.owner_id) },
      { text: 'Antes / línea base documentada', done: false },
      { text: 'Ejecución completada', done: false },
      { text: 'Impacto verificado contra EnPI', done: false },
    ]
    const { data } = await supabase.from('energy_project_tasks').insert({
      improvement_id: item.id,
      title: 'Checklist de acción rápida',
      status: 'pending',
      priority: item.priority === 'critical' ? 'urgent' : item.priority === 'high' ? 'high' : 'normal',
      owner_id: item.owner_id || null,
      planned_date: item.planned_finish || null,
      checklist,
    }).select('*').single()
    if (data) setItems((prev) => prev.map((row) => row.id === item.id ? { ...row, tasks: [...(row.tasks || []), data as EnergyProjectTask] } : row))
  }

  async function addEvidenceNote(item: QuickActionItem) {
    const stamp = new Date().toLocaleDateString('es')
    const { data } = await supabase.from('energy_improvement_evidence').insert({
      improvement_id: item.id,
      file_name: `Evidencia rápida ${stamp}`,
      file_type: 'manual_note',
      description: `Nota de evidencia creada para ${item.title}. Puedes reemplazarla por un adjunto o URL cuando esté disponible.`,
    }).select('*').single()
    if (data) setItems((prev) => prev.map((row) => row.id === item.id ? { ...row, evidence: [data as EnergyImprovementEvidence, ...(row.evidence || [])] } : row))
  }

  const filteredItems = useMemo(
    () => statusFilter === 'all' ? items : items.filter((item) => item.status === statusFilter),
    [items, statusFilter],
  )

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Cargando acciones rápidas...</div>
  if (items.length === 0) return <EmptyState icon={<Zap size={40} />} title="Sin acciones rápidas" description="Clasifica oportunidades como acción rápida o crea una nueva con EnPI, responsable y medición de impacto." />

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-white">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_65%_25%,rgba(34,197,94,0.22),transparent_34%),radial-gradient(circle_at_35%_80%,rgba(14,165,233,0.16),transparent_30%)]" />
        <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Acciones rápidas medibles</p>
            <h2 className="text-lg font-black tracking-tight">Impacto, responsable, checklist y evidencia</h2>
            <p className="mt-1 text-xs leading-5 text-slate-300">Cada acción debe quedar conectada a un EnPI o método M&V para saber si realmente mejoró el desempeño.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Abiertas" value={items.length} />
            <MiniStat label="Con EnPI" value={items.filter((item) => item.source_enpi_id).length} />
            <MiniStat label="Evidencia" value={items.reduce((sum, item) => sum + (item.evidence?.length || 0), 0)} />
          </div>
        </div>
      </section>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {(['all', ...KANBAN_COLUMNS] as Array<ImprovementStatus | 'all'>).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={[
              'shrink-0 border-b-2 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em]',
              statusFilter === status ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-400 hover:text-slate-700',
            ].join(' ')}
          >
            {status === 'all' ? 'Todas' : STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {filteredItems.map((item) => (
          <QuickActionCard
            key={item.id}
            item={item}
            enpis={enpis}
            onOpen={() => onSelect(item)}
            onStatus={moveStatus}
            onBindEnpi={quickBindEnpi}
            onChecklist={addDefaultChecklist}
            onEvidence={addEvidenceNote}
          />
        ))}
      </div>
    </div>
  )
}

function QuickActionCard({
  item,
  enpis,
  onOpen,
  onStatus,
  onBindEnpi,
  onChecklist,
  onEvidence,
}: {
  item: QuickActionItem
  enpis: EnpiSummary[]
  onOpen: () => void
  onStatus: (item: QuickActionItem, status: ImprovementStatus) => void
  onBindEnpi: (item: QuickActionItem, enpiId: string) => void
  onChecklist: (item: QuickActionItem) => void
  onEvidence: (item: QuickActionItem) => void
}) {
  const checklistItems = (item.tasks || []).flatMap((task) => Array.isArray(task.checklist) ? task.checklist : [])
  const checklistDone = checklistItems.filter((check) => check.done).length
  const checklistTotal = checklistItems.length
  const progress = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0
  const nextStatuses = getNextStatuses(item.status)

  return (
    <Card padding="none" className="overflow-hidden rounded-xl border-slate-200">
      <div className="border-b border-slate-200 bg-white p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <Badge variant={item.status === 'verification' ? 'info' : item.status === 'in_progress' ? 'brand' : 'neutral'} size="sm">{STATUS_LABELS[item.status]}</Badge>
              <Badge variant={item.priority === 'critical' || item.priority === 'high' ? 'warn' : 'neutral'} size="sm">{item.priority}</Badge>
              {item.utility && <Badge variant={utilityBadgeVariant(item.utility)} size="sm">{item.utility}</Badge>}
            </div>
            <button onClick={onOpen} className="line-clamp-2 text-left text-sm font-black leading-5 text-slate-950 hover:text-brand-blue">{item.title}</button>
            {item.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.description}</p>}
          </div>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-white">
            <Zap size={17} />
          </div>
        </div>
      </div>

      <div className="space-y-3 p-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <Target size={12} /> EnPI / M&V
            </span>
            {item.enpi ? <Badge variant="ok" size="sm">vinculado</Badge> : <Badge variant="warn" size="sm">pendiente</Badge>}
          </div>
          <select
            value={item.source_enpi_id || ''}
            onChange={(event) => onBindEnpi(item, event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
          >
            <option value="">Sin EnPI vinculado</option>
            {enpis.map((enpi) => (
              <option key={enpi.id} value={enpi.id}>{enpi.name} · {enpi.unit}</option>
            ))}
          </select>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <ImpactPill icon={<Gauge size={12} />} label="Ahorro" value={`${Number(item.estimated_energy_savings || 0).toLocaleString('es')} ${item.savings_unit || ''}`} />
            <ImpactPill icon={<BarChart3 size={12} />} label="M&V" value={item.measurement_verification_method || 'pendiente'} />
          </div>
          {(item.monitoring_start || item.monitoring_end || item.monitoring_status === 'in_progress') && (
            <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-2 text-[11px] font-semibold text-sky-700">
              Monitoreo: {item.monitoring_start ? formatDate(item.monitoring_start) : 'inicio pendiente'} - {item.monitoring_end ? formatDate(item.monitoring_end) : 'fin pendiente'}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatusTile icon={<ClipboardCheck size={14} />} label="Checklist" value={checklistTotal > 0 ? `${checklistDone}/${checklistTotal}` : 'crear'} tone={checklistTotal > 0 ? 'ok' : 'warn'} />
          <StatusTile icon={<UserRound size={14} />} label="Responsable" value={item.owner_id ? 'asignado' : 'pendiente'} tone={item.owner_id ? 'ok' : 'warn'} />
          <StatusTile icon={<FileUp size={14} />} label="Evidencia" value={String(item.evidence?.length || 0)} tone={(item.evidence?.length || 0) > 0 ? 'ok' : 'warn'} />
        </div>

        {checklistTotal > 0 && (
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>Avance de ejecución</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 border-t border-slate-200 pt-2">
          {checklistTotal === 0 && <Button size="xs" variant="secondary" leftIcon={<Plus size={12} />} onClick={() => onChecklist(item)}>Checklist</Button>}
          <Button size="xs" variant="secondary" leftIcon={<FileUp size={12} />} onClick={() => onEvidence(item)}>Evidencia</Button>
          {nextStatuses.map((status) => (
            <Button key={status} size="xs" variant={status === 'closed' ? 'success' : 'ghost'} onClick={() => onStatus(item, status)}>
              {status === 'in_progress' ? 'Iniciar' : status === 'verification' ? 'Verificar' : status === 'closed' ? 'Cerrar' : STATUS_LABELS[status]}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es', { month: 'short', day: 'numeric' })
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-2">
      <p className="text-lg font-black">{value}</p>
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">{label}</p>
    </div>
  )
}

function ImpactPill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2">
      <p className="mb-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">{icon}{label}</p>
      <p className="truncate text-[11px] font-bold text-slate-800">{value || '-'}</p>
    </div>
  )
}

function StatusTile({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: 'ok' | 'warn' }) {
  return (
    <div className={[
      'rounded-lg border p-2',
      tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700',
    ].join(' ')}>
      <div className="mb-1">{icon}</div>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-70">{label}</p>
      <p className="truncate text-[11px] font-black">{value}</p>
    </div>
  )
}

function getNextStatuses(status: ImprovementStatus): ImprovementStatus[] {
  if (status === 'approved' || status === 'planned' || status === 'triage' || status === 'identified') return ['in_progress']
  if (status === 'in_progress') return ['verification']
  if (status === 'verification') return ['closed']
  return []
}
