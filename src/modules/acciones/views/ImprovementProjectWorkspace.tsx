import { useState, useEffect } from 'react'
import { supabase } from '@/services/supabase'
import { Card } from '@/shared/Card'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { ArrowLeft, Plus, CheckSquare, BarChart2, TrendingDown } from 'lucide-react'
import { GanttChart } from '../components/GanttChart'
import { TaskForm } from '../components/TaskForm'
import type { TaskFormData } from '../components/TaskForm'
import type { EnergyImprovement, EnergyProjectPhase, EnergyProjectTask } from '../types'
import { STATUS_LABELS, STATUS_COLORS } from '../types'
import { calculateProgress, calculatePhaseProgress } from '@/services/improvement-engine'

interface Props {
  item: EnergyImprovement
  onBack: () => void
}

// ─── Tab config ─────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview', label: 'Resumen' },
  { id: 'gantt',    label: 'Plan / Gantt' },
  { id: 'tasks',    label: 'Tareas' },
  { id: 'closeout', label: 'Cierre' },
]

// ─── Main component ──────────────────────────────────────────────────────────

export function ImprovementProjectWorkspace({ item, onBack }: Props) {
  const [phases, setPhases] = useState<EnergyProjectPhase[]>([])
  const [tasks,  setTasks]  = useState<EnergyProjectTask[]>([])
  const [activeTab, setActiveTab] = useState('gantt')
  const [closeoutForm, setCloseoutForm] = useState({
    actual_energy_savings: item.actual_energy_savings?.toString() || '',
    actual_cost_savings: item.actual_cost_savings?.toString() || '',
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
    await supabase.from('energy_improvements').update({
      actual_energy_savings: closeoutForm.actual_energy_savings ? parseFloat(closeoutForm.actual_energy_savings) : null,
      actual_cost_savings: closeoutForm.actual_cost_savings ? parseFloat(closeoutForm.actual_cost_savings) : null,
      status: 'closed', updated_at: new Date().toISOString(),
    }).eq('id', item.id)
    setSavingCloseout(false)
  }

  const overallProgress = calculateProgress(phases)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 cursor-pointer">
        <ArrowLeft size={14} /> Volver al portfolio
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-gray-900 truncate">{item.title}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge color={STATUS_COLORS[item.status] as 'blue'} size="sm">{STATUS_LABELS[item.status]}</Badge>
            <Badge color="teal" size="sm">{item.utility}</Badge>
            <span className="text-xs text-gray-500">{item.currency} {item.estimated_investment?.toLocaleString()}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-500">Avance general</p>
          <p className="text-2xl font-bold text-gray-800">{overallProgress}%</p>
          <div className="w-32 h-1.5 bg-gray-200 rounded-full mt-1">
            <div className="h-full bg-brand-teal rounded-full transition-all" style={{ width: overallProgress + '%' }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-4">
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
        />
      )}

      {/* ── Tab: Tareas ─────────────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <div>
          <div className="flex justify-end mb-3">
            <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setTaskModal({ open: true, isPhase: false })}>
              Nueva tarea
            </Button>
          </div>
          <div className="space-y-2">
            {tasks.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-400">Sin tareas. Crea una desde el Gantt o aquí.</div>
            )}
            {tasks.map((t) => {
              const phase = phases.find((p) => p.id === t.phase_id)
              return (
                <Card key={t.id} padding="sm">
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleTask(t)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                        t.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' :
                        t.status === 'in_progress' ? 'border-brand-teal' : 'border-gray-300'
                      }`}>
                      {t.status === 'completed' && <CheckSquare size={12} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${t.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                        {t.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {phase && <span className="text-[10px] text-purple-600">{phase.name}</span>}
                        {t.planned_date && <span className="text-[10px] text-gray-400">{new Date(t.planned_date).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <Badge size="sm" color={t.status === 'completed' ? 'green' : t.status === 'in_progress' ? 'teal' : 'gray'}>
                      {t.status === 'completed' ? 'Hecho' : t.status === 'in_progress' ? 'En progreso' : 'Pendiente'}
                    </Badge>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Tab: Cierre ─────────────────────────────────────────────── */}
      {activeTab === 'closeout' && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingDown size={15} className="text-emerald-500" /> Cierre de proyecto
          </h3>
          <div className="space-y-4 max-w-sm">
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
            <Button size="sm" onClick={handleCloseout} loading={savingCloseout}>
              Registrar cierre
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
