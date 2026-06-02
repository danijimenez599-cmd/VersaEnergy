import { useState, useEffect } from 'react'
import { supabase } from '@/services/supabase'
import { Card } from '@/shared/Card'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { ArrowLeft, Plus, Calendar, CheckSquare } from 'lucide-react'
import type { EnergyImprovement, EnergyProjectPhase, EnergyProjectTask } from '../types'
import { STATUS_LABELS, STATUS_COLORS } from '../types'
import { calculateProgress, calculatePhaseProgress } from '@/services/improvement-engine'

interface Props {
  item: EnergyImprovement
  onBack: () => void
}

export function ImprovementProjectWorkspace({ item, onBack }: Props) {
  const [phases, setPhases] = useState<EnergyProjectPhase[]>([])
  const [tasks, setTasks] = useState<EnergyProjectTask[]>([])
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    supabase.from('energy_project_phases').select('*').eq('improvement_id', item.id).order('order')
      .then(({ data }) => setPhases(data || []))
    supabase.from('energy_project_tasks').select('*').eq('improvement_id', item.id)
      .then(({ data }) => setTasks(data || []))
  }, [item.id])

  async function addPhase() {
    const name = prompt('Nombre de la fase') || 'Nueva fase'
    const { data } = await supabase.from('energy_project_phases').insert({
      improvement_id: item.id, name, order: phases.length + 1, progress: 0, budget: 0,
    }).select('*').single()
    if (data) setPhases((prev) => [...prev, data])
  }

  async function addTask(phaseId?: string) {
    const title = prompt('Título de la tarea') || 'Nueva tarea'
    const { data } = await supabase.from('energy_project_tasks').insert({
      improvement_id: item.id, phase_id: phaseId || null, title,
    }).select('*').single()
    if (data) setTasks((prev) => [...prev, data])
  }

  async function toggleTask(task: EnergyProjectTask) {
    const newStatus = task.status === 'completed' ? 'pending' : task.status === 'in_progress' ? 'completed' : 'in_progress'
    await supabase.from('energy_project_tasks').update({ status: newStatus }).eq('id', task.id)
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t))
    const phaseId = task.phase_id
    if (phaseId) {
      const phaseTasks = tasks.filter((t) => t.phase_id === phaseId)
      const newProgress = calculatePhaseProgress(phaseTasks.map((t) => t.id === task.id ? { ...t, status: newStatus } : t))
      await supabase.from('energy_project_phases').update({ progress: newProgress }).eq('id', phaseId)
      setPhases((prev) => prev.map((p) => p.id === phaseId ? { ...p, progress: newProgress } : p))
    }
  }

  const tabs = [
    { id: 'overview', label: 'Resumen' },
    { id: 'gantt', label: 'Plan / Gantt' },
    { id: 'tasks', label: 'Tareas' },
    { id: 'closeout', label: 'Cierre' },
  ]

  const overallProgress = calculateProgress(phases)

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 cursor-pointer">
        <ArrowLeft size={14} /> Volver al portfolio
      </button>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge color={STATUS_COLORS[item.status] as 'blue'} size="sm">{STATUS_LABELS[item.status]}</Badge>
            <Badge color="teal" size="sm">{item.utility}</Badge>
            <span className="text-xs text-gray-500">{item.currency} {item.estimated_investment?.toLocaleString()}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Avance general</p>
          <p className="text-lg font-semibold text-gray-800">{overallProgress}%</p>
          <div className="w-32 h-1.5 bg-gray-200 rounded-full mt-1">
            <div className="h-full bg-brand-teal rounded-full" style={{ width: overallProgress + '%' }} />
          </div>
        </div>
      </div>

      <div className="border-b border-border mb-4">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={'px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ' +
                (activeTab === t.id ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card padding="md">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Financiero</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Inversión</span><span className="font-medium">{item.currency} {item.estimated_investment?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Ahorro energético</span><span className="font-medium text-emerald-600">{item.estimated_energy_savings?.toLocaleString()} {item.savings_unit}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Ahorro costo</span><span className="font-medium text-emerald-600">{item.currency} {item.estimated_cost_savings?.toLocaleString()}</span></div>
              {item.payback_months && <div className="flex justify-between"><span className="text-gray-500">Payback</span><span className="font-medium">{item.payback_months} meses</span></div>}
            </div>
          </Card>
          <Card padding="md">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Fechas</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Inicio plan</span><span>{item.planned_start ? new Date(item.planned_start).toLocaleDateString() : '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Fin plan</span><span>{item.planned_finish ? new Date(item.planned_finish).toLocaleDateString() : '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Inicio real</span><span>{item.actual_start ? new Date(item.actual_start).toLocaleDateString() : '—'}</span></div>
            </div>
          </Card>
          <Card padding="md">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Fases y tareas</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Fases</span><span className="font-medium">{phases.length}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tareas</span><span className="font-medium">{tasks.length}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Completadas</span><span className="font-medium">{tasks.filter((t) => t.status === 'completed').length}</span></div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'gantt' && (
        <div>
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => addPhase()}>Añadir fase</Button>
          <Card className="mt-3" padding="none">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50/50">
                <th className="text-left px-3 py-2 text-gray-600">Fase</th>
                <th className="text-left px-3 py-2 text-gray-600">Inicio</th>
                <th className="text-left px-3 py-2 text-gray-600">Fin</th>
                <th className="text-left px-3 py-2 text-gray-600">Avance</th>
                <th className="w-40 px-3 py-2 text-gray-600">Barra</th>
              </tr></thead>
              <tbody>
                {phases.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-800">{p.name}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{p.planned_start ? new Date(p.planned_start).toLocaleDateString() : '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{p.planned_finish ? new Date(p.planned_finish).toLocaleDateString() : '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{p.progress}%</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <div className="h-5 rounded bg-gray-200 flex-1">
                          <div className="h-full rounded bg-brand-teal" style={{ width: p.progress + '%' }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div>
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => addTask()}>Añadir tarea</Button>
          <div className="mt-3 space-y-2">
            {tasks.map((t) => (
              <Card key={t.id} padding="sm" className="flex items-center gap-3">
                <button onClick={() => toggleTask(t)}
                  className={'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors ' +
                    (t.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : t.status === 'in_progress' ? 'border-brand-teal' : 'border-gray-300')}>
                  {t.status === 'completed' && <CheckSquare size={12} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={'text-sm ' + (t.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800')}>{t.title}</p>
                  {t.planned_date && <p className="text-xs text-gray-400"><Calendar size={10} className="inline mr-1" />{new Date(t.planned_date).toLocaleDateString()}</p>}
                </div>
                <Badge size="sm" color={t.status === 'completed' ? 'green' : t.status === 'in_progress' ? 'teal' : 'gray'}>{t.status === 'completed' ? 'Hecho' : t.status === 'in_progress' ? 'En progreso' : 'Pendiente'}</Badge>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'closeout' && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Cierre de proyecto</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ahorro real de energía ({item.savings_unit})</label>
              <input type="number" defaultValue={item.actual_energy_savings || 0}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm max-w-xs" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ahorro real en costo ({item.currency})</label>
              <input type="number" defaultValue={item.actual_cost_savings || 0}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm max-w-xs" />
            </div>
            <Button size="sm">Registrar cierre</Button>
          </div>
        </Card>
      )}
    </div>
  )
}
