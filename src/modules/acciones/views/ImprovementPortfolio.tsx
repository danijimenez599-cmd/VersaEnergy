import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  FolderKanban,
  Gauge,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import { supabase } from '@/services/supabase'
import { Badge, utilityBadgeVariant } from '@/shared/Badge'
import { Card } from '@/shared/Card'
import { EmptyState } from '@/shared/EmptyState'
import type { EnergyImprovement } from '../types'
import { STATUS_LABELS } from '../types'

interface Props {
  siteId: string
  onSelect: (item: EnergyImprovement) => void
}

interface EnpiSummary {
  id: string
  name: string
  unit: string
}

interface ProjectItem extends EnergyImprovement {
  enpi?: EnpiSummary | null
}

export function ImprovementPortfolio({ siteId, onSelect }: Props) {
  const [items, setItems] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  async function load() {
    if (!siteId) return
    setLoading(true)
    const [{ data: projects }, { data: enpis }] = await Promise.all([
      supabase
        .from('energy_improvements')
        .select('*')
        .eq('site_id', siteId)
        .eq('work_type', 'project')
        .not('status', 'in', '(cancelled)')
        .order('created_at', { ascending: false }),
      supabase
        .from('energy_enpis')
        .select('id,name,unit')
        .eq('site_id', siteId)
        .order('name'),
    ])

    if (!projects) {
      setLoading(false)
      return
    }

    const projectIds = projects.map((item) => item.id)
    const [{ data: phases }, { data: tasks }, { data: evidence }] = projectIds.length > 0
      ? await Promise.all([
        supabase.from('energy_project_phases').select('*').in('improvement_id', projectIds).order('order'),
        supabase.from('energy_project_tasks').select('*').in('improvement_id', projectIds),
        supabase.from('energy_improvement_evidence').select('*').in('improvement_id', projectIds),
      ])
      : [{ data: [] }, { data: [] }, { data: [] }]

    const enpiList = (enpis || []) as EnpiSummary[]
    setItems((projects as EnergyImprovement[]).map((item) => ({
      ...item,
      enpi: enpiList.find((enpi) => enpi.id === item.source_enpi_id) || null,
      phases: (phases || []).filter((phase) => phase.improvement_id === item.id),
      tasks: (tasks || []).filter((task) => task.improvement_id === item.id),
      evidence: (evidence || []).filter((ev) => ev.improvement_id === item.id),
    })))
    setLoading(false)
  }

  const stats = useMemo(() => {
    const investment = items.reduce((sum, item) => sum + Number(item.estimated_investment || 0), 0)
    const savings = items.reduce((sum, item) => sum + Number(item.estimated_cost_savings || 0), 0)
    return {
      count: items.length,
      investment,
      savings,
      inProgress: items.filter((item) => item.status === 'in_progress').length,
    }
  }, [items])

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Cargando portfolio...</div>
  if (items.length === 0) return <EmptyState icon={<FolderKanban size={40} />} title="Sin proyectos" description="Clasifica oportunidades como proyecto para gestionar Gantt, presupuesto, responsables, evidencias y verificación." />

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-white">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_70%_30%,rgba(34,197,94,0.22),transparent_34%),radial-gradient(circle_at_42%_70%,rgba(14,165,233,0.18),transparent_30%)]" />
        <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Portfolio de mejora energética</p>
            <h2 className="text-lg font-black tracking-tight">Proyectos con Gantt, presupuesto y verificación</h2>
            <p className="mt-1 text-xs leading-5 text-slate-300">Gestiona fases, tareas, responsables, inversión, ahorro y evidencia sin perder la conexión con EnPIs.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Proyectos" value={stats.count} />
            <MiniStat label="Inversión" value={formatMoney(stats.investment)} />
            <MiniStat label="Ahorro" value={formatMoney(stats.savings)} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {items.map((item) => <ProjectCard key={item.id} item={item} onOpen={() => onSelect(item)} />)}
      </div>
    </div>
  )
}

function ProjectCard({ item, onOpen }: { item: ProjectItem; onOpen: () => void }) {
  const completedTasks = (item.tasks || []).filter((task) => task.status === 'completed').length
  const totalTasks = (item.tasks || []).length
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const phaseBudget = (item.phases || []).reduce((sum, phase) => sum + Number(phase.budget || 0), 0)
  const budget = phaseBudget || Number(item.estimated_investment || 0)
  const hasSchedule = Boolean(item.planned_start && item.planned_finish)
  const riskTone = item.priority === 'critical' || item.priority === 'high' ? 'warn' : 'neutral'

  return (
    <Card padding="none" className="overflow-hidden rounded-xl border-slate-200">
      <div className="border-b border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <Badge variant={item.status === 'in_progress' ? 'brand' : item.status === 'verification' ? 'info' : 'neutral'} size="sm">{STATUS_LABELS[item.status]}</Badge>
              <Badge variant={riskTone} size="sm">{item.priority}</Badge>
              {item.utility && <Badge variant={utilityBadgeVariant(item.utility)} size="sm">{item.utility}</Badge>}
            </div>
            <button onClick={onOpen} className="line-clamp-2 text-left text-base font-black leading-6 text-slate-950 hover:text-brand-blue">{item.title}</button>
            {item.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.description}</p>}
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-white">
            <FolderKanban size={18} />
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <ProjectMetric icon={<Banknote size={13} />} label="Presupuesto" value={formatMoney(budget)} />
          <ProjectMetric icon={<TrendingUp size={13} />} label="Ahorro" value={`${Number(item.estimated_energy_savings || 0).toLocaleString('es')} ${item.savings_unit || ''}`} />
          <ProjectMetric icon={<Target size={13} />} label="EnPI" value={item.enpi?.name || 'sin EnPI'} />
          <ProjectMetric icon={<FileBadge />} label="Evidencia" value={String(item.evidence?.length || 0)} />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{completedTasks}/{totalTasks} tareas completadas</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <Signal icon={<CalendarClock size={13} />} label="Plan" value={hasSchedule ? `${formatDate(item.planned_start)} - ${formatDate(item.planned_finish)}` : 'sin fechas'} />
          <Signal icon={<Users size={13} />} label="Responsable" value={item.owner_id ? 'asignado' : 'pendiente'} />
          <Signal icon={<CheckCircle2 size={13} />} label="Fases" value={`${item.phases?.length || 0}`} />
        </div>
        {(item.monitoring_start || item.monitoring_end || item.monitoring_status === 'in_progress') && (
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">
            Monitoreo posterior: {item.monitoring_start ? formatDate(item.monitoring_start) : 'inicio pendiente'} - {item.monitoring_end ? formatDate(item.monitoring_end) : 'fin pendiente'} · {translateMonitoring(item.monitoring_status)}
          </div>
        )}
      </div>
    </Card>
  )
}

function ProjectMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
      <p className="mb-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">{icon}{label}</p>
      <p className="truncate text-xs font-black text-slate-900">{value || '-'}</p>
    </div>
  )
}

function Signal({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2">
      <p className="mb-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">{icon}{label}</p>
      <p className="truncate text-[11px] font-bold text-slate-700">{value}</p>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-2">
      <p className="text-sm font-black">{value}</p>
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">{label}</p>
    </div>
  )
}

function FileBadge() {
  return <Gauge size={13} />
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('es', { notation: value > 999999 ? 'compact' : 'standard', maximumFractionDigits: 0 }).format(value)
}

function formatDate(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('es', { month: 'short', day: 'numeric' })
}

function translateMonitoring(status?: string) {
  const labels: Record<string, string> = {
    not_started: 'no iniciado',
    in_progress: 'en monitoreo',
    passed: 'sostenido',
    failed: 'requiere corrección',
  }
  return labels[status || 'not_started'] || 'no iniciado'
}
