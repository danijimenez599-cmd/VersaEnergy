import { useState, useEffect, type ReactNode } from 'react'
import { supabase } from '@/services/supabase'
import { Card } from '@/shared/Card'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import {
  ArrowLeft,
  Banknote,
  BarChart2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileUp,
  Gauge,
  History,
  Plus,
  Send,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react'
import { GanttChart } from '../components/GanttChart'
import { TaskForm } from '../components/TaskForm'
import type { TaskFormData } from '../components/TaskForm'
import type { EnergyCmmsHandoffRequest, EnergyImprovement, EnergyImprovementEvent, EnergyMvPlan, EnergyProjectPhase, EnergyProjectTask } from '../types'
import { STATUS_LABELS, STATUS_COLORS } from '../types'
import { calculateProgress, calculatePhaseProgress, createCmmsHandoffRequest, createMvPlan, loadExecutionLedger } from '@/services/improvement-engine'

interface Props {
  item: EnergyImprovement
  onBack: () => void
}

// ─── Tab config ─────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview', label: 'Resumen' },
  { id: 'gantt',    label: 'Plan de Trabajo' },
  { id: 'm_and_v',  label: 'M&V (Monitoreo)' },
  { id: 'audit',    label: 'Auditoría / CMMS' },
  { id: 'closeout', label: 'Cierre' },
]

// ─── Main component ──────────────────────────────────────────────────────────

export function ImprovementProjectWorkspace({ item, onBack }: Props) {
  const [phases, setPhases] = useState<EnergyProjectPhase[]>([])
  const [tasks,  setTasks]  = useState<EnergyProjectTask[]>([])
  const [evidenceCount, setEvidenceCount] = useState(0)
  const [enpiName, setEnpiName] = useState<string | null>(null)
  const [mvPlans, setMvPlans] = useState<EnergyMvPlan[]>([])
  const [handoffs, setHandoffs] = useState<EnergyCmmsHandoffRequest[]>([])
  const [events, setEvents] = useState<EnergyImprovementEvent[]>([])
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [executionAction, setExecutionAction] = useState<'mv' | 'cmms' | null>(null)
  const [activeTab, setActiveTab] = useState('gantt')
  const [closeoutForm, setCloseoutForm] = useState({
    actual_energy_savings: item.actual_energy_savings?.toString() || '',
    actual_cost_savings: item.actual_cost_savings?.toString() || '',
    monitoring_start: item.monitoring_start?.split('T')[0] || new Date().toISOString().slice(0, 10),
    monitoring_end: item.monitoring_end?.split('T')[0] || defaultMonitoringEnd(),
    monitoring_notes: item.monitoring_notes || '',
    monitoring_status: item.monitoring_status || 'in_progress',
  })
  const [savingCloseout, setSavingCloseout] = useState(false)

  // TaskForm modal state
  const [taskModal, setTaskModal] = useState<{
    open: boolean
    isPhase: boolean
    phaseId?: string
    editing?: EnergyProjectTask | null
    editingPhase?: EnergyProjectPhase | null
  }>({ open: false, isPhase: false })

  useEffect(() => {
    supabase.from('energy_project_phases').select('*').eq('improvement_id', item.id).order('order')
      .then(({ data }) => setPhases(data || []))
    supabase.from('energy_project_tasks').select('*').eq('improvement_id', item.id)
      .then(({ data }) => setTasks(data || []))
    supabase.from('energy_improvement_evidence').select('*', { count: 'exact', head: true }).eq('improvement_id', item.id)
      .then(({ count }) => setEvidenceCount(count || 0))
    if (item.source_enpi_id) {
      supabase.from('energy_enpis').select('name,unit').eq('id', item.source_enpi_id).single()
        .then(({ data }) => setEnpiName(data ? `${data.name} · ${data.unit}` : null))
    } else {
      setEnpiName(null)
    }
  }, [item.id])

  useEffect(() => {
    refreshExecutionLedger()
  }, [item.id])

  // ── Phase helpers ──────────────────────────────────────────────────────────

  async function handleSavePhase(data: TaskFormData) {
    const ph = taskModal.editingPhase
    if (ph) {
      await supabase.from('energy_project_phases').update({
        name: data.title, planned_start: data.planned_start || null,
        planned_finish: data.planned_finish || null,
        actual_start: data.actual_start || null, actual_finish: data.actual_finish || null,
        progress: data.progress,
      }).eq('id', ph.id)
      setPhases((prev) => prev.map((p) => p.id === ph.id
        ? { ...p, name: data.title, progress: data.progress, planned_start: data.planned_start, planned_finish: data.planned_finish }
        : p
      ))
    } else {
      const { data: created } = await supabase.from('energy_project_phases').insert({
        improvement_id: item.id, name: data.title, order: phases.length + 1, progress: data.progress,
        budget: 0, planned_start: data.planned_start || null, planned_finish: data.planned_finish || null,
      }).select('*').single()
      if (created) setPhases((prev) => [...prev, created])
    }
    setTaskModal({ open: false, isPhase: false })
  }

  // ── Task helpers ───────────────────────────────────────────────────────────

  async function handleSaveTask(data: TaskFormData) {
    const tk = taskModal.editing
    const phaseId = taskModal.phaseId || null

    if (tk) {
      await supabase.from('energy_project_tasks').update({
        title: data.title, planned_date: data.planned_start || null,
        actual_date: data.actual_start || null,
        priority: mapPriority(data.priority),
        status: data.progress === 100 ? 'completed' : data.progress > 0 ? 'in_progress' : 'pending',
      }).eq('id', tk.id)
      setTasks((prev) => prev.map((t) => t.id === tk.id
        ? { ...t, title: data.title, planned_date: data.planned_start || undefined, priority: mapPriority(data.priority) as EnergyProjectTask['priority'] }
        : t
      ))
    } else {
      const { data: created } = await supabase.from('energy_project_tasks').insert({
        improvement_id: item.id, phase_id: phaseId, title: data.title,
        planned_date: data.planned_start || null, priority: mapPriority(data.priority),
        status: 'pending',
      }).select('*').single()
      if (created) setTasks((prev) => [...prev, created])
    }
    setTaskModal({ open: false, isPhase: false })
  }

  function mapPriority(p: string): string {
    return p === 'critical' ? 'urgent' : p === 'high' ? 'high' : 'normal'
  }

  async function toggleTask(task: EnergyProjectTask) {
    const newStatus: EnergyProjectTask['status'] =
      task.status === 'completed' ? 'pending' : task.status === 'in_progress' ? 'completed' : 'in_progress'
    await supabase.from('energy_project_tasks').update({ status: newStatus }).eq('id', task.id)
    const updatedTasks = tasks.map((t) => t.id === task.id ? { ...t, status: newStatus } : t)
    setTasks(updatedTasks)
    if (task.phase_id) {
      const phaseTasks = updatedTasks.filter((t) => t.phase_id === task.phase_id)
      const prog = calculatePhaseProgress(phaseTasks)
      await supabase.from('energy_project_phases').update({ progress: prog }).eq('id', task.phase_id)
      setPhases((prev) => prev.map((p) => p.id === task.phase_id ? { ...p, progress: prog } : p))
    }
  }

  async function handleCloseout() {
    setSavingCloseout(true)
    const closingAfterMonitoring = item.status === 'verification'
    await supabase.from('energy_improvements').update({
      actual_energy_savings: closeoutForm.actual_energy_savings ? parseFloat(closeoutForm.actual_energy_savings) : null,
      actual_cost_savings: closeoutForm.actual_cost_savings ? parseFloat(closeoutForm.actual_cost_savings) : null,
      actual_finish: closingAfterMonitoring ? (item.actual_finish || new Date().toISOString()) : item.actual_finish || null,
      monitoring_start: closeoutForm.monitoring_start || null,
      monitoring_end: closeoutForm.monitoring_end || null,
      monitoring_notes: closeoutForm.monitoring_notes || null,
      monitoring_status: closingAfterMonitoring ? 'passed' : 'in_progress',
      status: closingAfterMonitoring ? 'closed' : 'verification',
      updated_at: new Date().toISOString(),
    }).eq('id', item.id)
    setSavingCloseout(false)
  }

  async function refreshExecutionLedger() {
    setLedgerLoading(true)
    try {
      const ledger = await loadExecutionLedger(item.id)
      setMvPlans(ledger.mvPlans)
      setHandoffs(ledger.handoffs)
      setEvents(ledger.events)
    } catch (error) {
      console.error('Failed to load E9 execution ledger', error)
    } finally {
      setLedgerLoading(false)
    }
  }

  async function handleCreateMvPlan() {
    setExecutionAction('mv')
    try {
      await createMvPlan({ improvement: item })
      await refreshExecutionLedger()
    } finally {
      setExecutionAction(null)
    }
  }

  async function handleSendToCmms() {
    setExecutionAction('cmms')
    try {
      await createCmmsHandoffRequest({ improvement: item })
      await refreshExecutionLedger()
    } finally {
      setExecutionAction(null)
    }
  }

  const overallProgress = calculateProgress(phases)

  // ── Render ─────────────────────────────────────────────────────────────────

  const completedTasks = tasks.filter((task) => task.status === 'completed').length
  const phaseBudget = phases.reduce((sum, phase) => sum + Number(phase.budget || 0), 0)
  const budget = phaseBudget || Number(item.estimated_investment || 0)
  const latestMvPlan = mvPlans[0]
  const latestHandoff = handoffs[0]

  return (
    <div className="space-y-4">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 cursor-pointer">
        <ArrowLeft size={14} /> Volver al portfolio
      </button>

      {/* Header */}
      <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-white">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_70%_30%,rgba(34,197,94,0.22),transparent_34%),radial-gradient(circle_at_42%_70%,rgba(14,165,233,0.18),transparent_30%)]" />
        <div className="relative z-10 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2 flex-wrap">
              <Badge color={STATUS_COLORS[item.status] as 'blue'} size="sm">{STATUS_LABELS[item.status]}</Badge>
              <Badge color="teal" size="sm">{item.utility}</Badge>
              <Badge color="gray" size="sm">{item.priority}</Badge>
            </div>
            <h2 className="truncate text-xl font-black tracking-tight">{item.title}</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-300">
              {item.description || 'Proyecto de mejora energética con Gantt, presupuesto, responsables, evidencia y verificación de impacto.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[560px]">
            <WorkspaceMetric icon={<Gauge size={14} />} label="Avance" value={`${overallProgress}%`} />
            <WorkspaceMetric icon={<Banknote size={14} />} label="Presupuesto" value={`${item.currency} ${budget.toLocaleString()}`} />
            <WorkspaceMetric icon={<TrendingUp size={14} />} label="Ahorro" value={`${Number(item.estimated_energy_savings || 0).toLocaleString()} ${item.savings_unit || ''}`} />
            <WorkspaceMetric icon={<FileUp size={14} />} label="Evidencia" value={String(evidenceCount)} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <SignalCard icon={<Target size={14} />} label="EnPI asociado" value={enpiName || 'Sin EnPI'} />
        <SignalCard icon={<Users size={14} />} label="Responsable" value={item.owner_id ? 'Asignado' : 'Pendiente'} />
        <SignalCard icon={<CalendarClock size={14} />} label="Plan" value={item.planned_start && item.planned_finish ? `${new Date(item.planned_start).toLocaleDateString()} - ${new Date(item.planned_finish).toLocaleDateString()}` : 'Sin fechas'} />
        <SignalCard icon={<CheckCircle2 size={14} />} label="Tareas" value={`${completedTasks}/${tasks.length}`} />
        <SignalCard icon={<BarChart2 size={14} />} label="M&V" value={item.measurement_verification_method || 'Pendiente'} />
        <SignalCard icon={<CalendarClock size={14} />} label="Monitoreo" value={item.monitoring_end ? `hasta ${new Date(item.monitoring_end).toLocaleDateString()}` : 'Por definir'} />
        <SignalCard icon={<Wrench size={14} />} label="CMMS" value={latestHandoff ? latestHandoff.status : (item.cmms_handoff_status || 'not_required')} />
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === t.id ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab: Resumen ─────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card padding="md">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Financiero</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Inversión" value={`${item.currency} ${item.estimated_investment?.toLocaleString()}`} />
              <InfoRow label="Ahorro energético" value={`${item.estimated_energy_savings?.toLocaleString()} ${item.savings_unit}`} green />
              <InfoRow label="Ahorro costo" value={`${item.currency} ${item.estimated_cost_savings?.toLocaleString()}`} green />
              {item.payback_months && <InfoRow label="Payback" value={`${item.payback_months} meses`} />}
            </div>
          </Card>
          <Card padding="md">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Fechas</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Inicio plan" value={item.planned_start ? new Date(item.planned_start).toLocaleDateString() : '—'} />
              <InfoRow label="Fin plan" value={item.planned_finish ? new Date(item.planned_finish).toLocaleDateString() : '—'} />
              <InfoRow label="Inicio real" value={item.actual_start ? new Date(item.actual_start).toLocaleDateString() : '—'} />
            </div>
          </Card>
          <Card padding="md">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Progreso</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Fases" value={String(phases.length)} />
              <InfoRow label="Tareas" value={String(tasks.length)} />
              <InfoRow label="Completadas" value={String(tasks.filter((t) => t.status === 'completed').length)} green />
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab: Gantt ───────────────────────────────────────────────── */}
      {activeTab === 'gantt' && (
        <GanttChart
          phases={phases}
          tasks={tasks}
          onAddPhase={() => setTaskModal({ open: true, isPhase: true })}
          onAddTask={(phaseId) => setTaskModal({ open: true, isPhase: false, phaseId })}
          onEditTask={(task) => setTaskModal({ open: true, isPhase: false, editing: task })}
          onEditPhase={(phase) => setTaskModal({ open: true, isPhase: true, editingPhase: phase })}
          onToggleTask={toggleTask}
        />
      )}

      {/* ── Tab: M&V (Monitoreo y Verificación) ────────────────────────────────── */}
      {activeTab === 'm_and_v' && (
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <BarChart2 size={15} className="text-brand-blue" />
              Monitoreo y Verificación (IPMVP)
            </h3>
            <Button size="sm" variant="secondary" leftIcon={<Plus size={13} />}>
              Registrar lectura
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2 mb-4">
            <div className="mt-0.5 shrink-0"><BarChart2 size={14} className="text-blue-600" /></div>
            <div>
              <p className="text-sm font-medium text-blue-800">Seguimiento de ahorros proyectados</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Compara los ahorros reales verificados contra la línea base ajustada.
                Ahorro esperado: {item.estimated_energy_savings?.toLocaleString()} {item.savings_unit}/año.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-border rounded-lg p-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Variables de Línea Base</p>
              <div className="space-y-2 text-sm">
                <InfoRow label="Periodo de Línea Base" value="Ene 2023 - Dic 2023" />
                <InfoRow label="Consumo base promedio" value={`15,000 ${item.savings_unit}/mes`} />
                <InfoRow label="Factor de ajuste (Producción)" value="Variable independiente" />
              </div>
            </div>

            <div className="border border-border rounded-lg p-3 bg-emerald-50">
              <p className="text-xs font-semibold text-emerald-700 uppercase mb-2">Desempeño actual</p>
              <div className="space-y-2 text-sm">
                <InfoRow label="Ahorro verificado (acumulado)" value={`0 ${item.savings_unit}`} green />
                <InfoRow label="Cumplimiento del objetivo" value="0%" green />
                <InfoRow label="Periodo de reporte M&V" value="En curso" />
              </div>
            </div>
          </div>

          <div className="mt-6 py-8 text-center text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg">
            No hay lecturas de verificación registradas aún. <br/>
            Agrega el primer registro posterior a la implementación para iniciar el tracking.
          </div>
        </Card>
      )}

      {/* ── Tab: Auditoría / CMMS ───────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card padding="md" className="xl:col-span-1">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <ClipboardCheck size={15} className="text-brand-blue" />
                Plan M&V
              </h3>
              <Badge color={latestMvPlan ? 'green' : 'gray'} size="sm">{latestMvPlan?.status || 'pendiente'}</Badge>
            </div>
            {latestMvPlan ? (
              <div className="space-y-2 text-sm">
                <InfoRow label="Versión" value={`v${latestMvPlan.version}`} />
                <InfoRow label="Método" value={latestMvPlan.method} />
                <InfoRow label="Ahorro esperado" value={`${Number(latestMvPlan.expected_savings || 0).toLocaleString()} ${latestMvPlan.expected_savings_unit || ''}`} green />
                <InfoRow label="Fuente baseline" value={latestMvPlan.baseline_source_type || 'manual'} />
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  {latestMvPlan.acceptance_criteria || 'Criterio de aceptación pendiente.'}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs leading-5 text-slate-500">
                  Define baseline, método, ventana de verificación y criterio de aceptación antes de cerrar ahorros.
                </p>
                <Button size="sm" leftIcon={<Plus size={13} />} onClick={handleCreateMvPlan} loading={executionAction === 'mv'}>
                  Crear plan M&V
                </Button>
              </div>
            )}
          </Card>

          <Card padding="md" className="xl:col-span-1">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Wrench size={15} className="text-emerald-600" />
                Handoff Maint/CMMS
              </h3>
              <Badge color={latestHandoff ? 'blue' : 'gray'} size="sm">{latestHandoff?.status || 'sin solicitud'}</Badge>
            </div>
            {latestHandoff ? (
              <div className="space-y-2 text-sm">
                <InfoRow label="Dirección" value={latestHandoff.request_direction} />
                <InfoRow label="Tipo" value={latestHandoff.request_type} />
                <InfoRow label="Prioridad" value={latestHandoff.maintenance_priority} />
                <InfoRow label="OT CMMS" value={latestHandoff.cmms_work_order_id || 'Pendiente'} />
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 text-emerald-700">
                  {latestHandoff.energy_rationale || latestHandoff.description || 'Solicitud enviada a mantenimiento.'}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs leading-5 text-slate-500">
                  Energy registra la solicitud. Maint/CMMS decide activo mantenible, prioridad, OT y cierre técnico.
                </p>
                <Button size="sm" leftIcon={<Send size={13} />} onClick={handleSendToCmms} loading={executionAction === 'cmms'}>
                  Enviar a Maint/CMMS
                </Button>
              </div>
            )}
          </Card>

          <Card padding="md" className="xl:col-span-1">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <History size={15} className="text-slate-500" />
                Bitácora auditada
              </h3>
              <Badge color="gray" size="sm">{events.length}</Badge>
            </div>
            {ledgerLoading ? (
              <p className="text-xs text-slate-400">Cargando bitácora...</p>
            ) : events.length > 0 ? (
              <div className="space-y-3">
                {events.slice(0, 6).map((event) => (
                  <div key={event.id} className="border-l-2 border-slate-200 pl-3">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">{eventLabel(event.event_type)}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{event.notes || 'Evento registrado.'}</p>
                    <p className="mt-1 text-[10px] font-medium text-slate-400">{new Date(event.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs leading-5 text-slate-500">
                Sin eventos E9 registrados. Crear un plan M&V o enviar a CMMS iniciará la bitácora.
              </p>
            )}
          </Card>
        </div>
      )}

      {/* ── Tab: Cierre ─────────────────────────────────────────────── */}
      {activeTab === 'closeout' && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingDown size={15} className="text-emerald-500" /> Monitoreo y cierre de mejora
          </h3>
          <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-700">
            Primero se inicia un periodo de monitoreo personalizado para comprobar que la mejora se sostiene. El cierre final ocurre cuando la verificación de eficacia pasa ese periodo.
          </div>
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Ahorro real de energía ({item.savings_unit})
              </label>
              <div className="flex items-center gap-2">
                <input type="number" value={closeoutForm.actual_energy_savings}
                  onChange={(e) => setCloseoutForm({ ...closeoutForm, actual_energy_savings: e.target.value })}
                  className="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
                <span className="text-sm text-gray-400">{item.savings_unit}</span>
              </div>
              {item.estimated_energy_savings && closeoutForm.actual_energy_savings && (
                <p className="text-xs text-gray-400 mt-1">
                  <BarChart2 size={10} className="inline mr-1" />
                  Estimado: {item.estimated_energy_savings.toLocaleString()} {item.savings_unit}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Ahorro real en costo ({item.currency})
              </label>
              <div className="flex items-center gap-2">
                <input type="number" value={closeoutForm.actual_cost_savings}
                  onChange={(e) => setCloseoutForm({ ...closeoutForm, actual_cost_savings: e.target.value })}
                  className="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
                <span className="text-sm text-gray-400">{item.currency}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Inicio monitoreo</label>
                <input type="date" value={closeoutForm.monitoring_start}
                  onChange={(e) => setCloseoutForm({ ...closeoutForm, monitoring_start: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fin monitoreo</label>
                <input type="date" value={closeoutForm.monitoring_end}
                  onChange={(e) => setCloseoutForm({ ...closeoutForm, monitoring_end: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Criterio / notas de sostenimiento</label>
              <textarea value={closeoutForm.monitoring_notes}
                onChange={(e) => setCloseoutForm({ ...closeoutForm, monitoring_notes: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                rows={3}
                placeholder="Ej. Confirmar que el EnPI permanece bajo objetivo durante el periodo y que no hay regresión operativa." />
            </div>
            <Button size="sm" onClick={handleCloseout} loading={savingCloseout}>
              {item.status === 'verification' ? 'Cerrar mejora sostenida' : 'Iniciar monitoreo'}
            </Button>
          </div>
        </Card>
      )}

      {/* TaskForm modal */}
      <TaskForm
        open={taskModal.open}
        onClose={() => setTaskModal({ open: false, isPhase: false })}
        onSave={taskModal.isPhase ? handleSavePhase : handleSaveTask}
        isPhase={taskModal.isPhase}
        phases={phases}
        tasks={tasks}
        initial={
          taskModal.editingPhase
            ? { title: taskModal.editingPhase.name, planned_start: taskModal.editingPhase.planned_start, planned_finish: taskModal.editingPhase.planned_finish, progress: taskModal.editingPhase.progress }
            : taskModal.editing
            ? { title: taskModal.editing.title, planned_start: taskModal.editing.planned_date, progress: taskModal.editing.status === 'completed' ? 100 : taskModal.editing.status === 'in_progress' ? 50 : 0 }
            : undefined
        }
        title={taskModal.isPhase ? (taskModal.editingPhase ? 'Editar fase' : 'Nueva fase') : (taskModal.editing ? 'Editar tarea' : 'Nueva tarea')}
      />
    </div>
  )
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value, green = false }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${green ? 'text-emerald-600' : 'text-gray-800'}`}>{value}</span>
    </div>
  )
}

function WorkspaceMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-2">
      <p className="mb-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-300">{icon}{label}</p>
      <p className="truncate text-sm font-black text-white">{value}</p>
    </div>
  )
}

function SignalCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card padding="sm" className="rounded-xl border-slate-200">
      <div className="mb-1.5 flex items-center gap-1.5 text-slate-400">
        {icon}
        <p className="text-[9px] font-black uppercase tracking-widest">{label}</p>
      </div>
      <p className="truncate text-xs font-black text-slate-900">{value}</p>
    </Card>
  )
}

function defaultMonitoringEnd() {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

function eventLabel(type: EnergyImprovementEvent['event_type']) {
  const labels: Record<EnergyImprovementEvent['event_type'], string> = {
    created_from_study: 'Creada desde estudio',
    created_manually: 'Creada manualmente',
    status_changed: 'Cambio de estado',
    mv_plan_defined: 'Plan M&V definido',
    mv_plan_approved: 'Plan M&V aprobado',
    mv_started: 'M&V iniciado',
    mv_result_recorded: 'Resultado M&V',
    sent_to_cmms: 'Solicitud enviada',
    cmms_request_accepted: 'Solicitud aceptada',
    cmms_request_rejected: 'Solicitud rechazada',
    cmms_work_order_created: 'OT creada',
    cmms_work_order_closed: 'OT cerrada',
    cmms_feedback_received: 'Feedback CMMS',
    energy_followup_required: 'Seguimiento Energy',
    evidence_added: 'Evidencia agregada',
    closed_with_savings: 'Cierre con ahorro',
    closed_without_savings: 'Cierre sin ahorro',
    audit_reviewed: 'Auditoría revisada',
  }
  return labels[type]
}
