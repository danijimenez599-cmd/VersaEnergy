import { useState } from 'react'
import { Button } from '@/shared/Button'
import { Modal } from '@/shared/Modal'
import { Save, X } from 'lucide-react'
import type { EnergyProjectPhase, EnergyProjectTask } from '../types'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface TaskFormData {
  title: string
  description: string
  assignee: string
  planned_start: string
  planned_finish: string
  actual_start: string
  actual_finish: string
  progress: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  depends_on: string[]
}

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: TaskFormData) => void
  initial?: Partial<TaskFormData>
  phases: EnergyProjectPhase[]
  tasks: EnergyProjectTask[]
  isPhase?: boolean
  title?: string
}

const PRIORITY_OPTS: { value: TaskFormData['priority']; label: string; color: string }[] = [
  { value: 'low',      label: 'Baja',     color: 'text-gray-500 bg-gray-50 border-gray-200' },
  { value: 'medium',   label: 'Media',    color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'high',     label: 'Alta',     color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'critical', label: 'Crítica',  color: 'text-red-600 bg-red-50 border-red-200' },
]

export function TaskForm({ open, onClose, onSave, initial, phases, tasks, isPhase = false, title }: Props) {
  const [form, setForm] = useState<TaskFormData>({
    title: initial?.title || '',
    description: initial?.description || '',
    assignee: initial?.assignee || '',
    planned_start: initial?.planned_start || '',
    planned_finish: initial?.planned_finish || '',
    actual_start: initial?.actual_start || '',
    actual_finish: initial?.actual_finish || '',
    progress: initial?.progress ?? 0,
    priority: initial?.priority || 'medium',
    depends_on: initial?.depends_on || [],
  })

  const s = (p: Partial<TaskFormData>) => setForm((f) => ({ ...f, ...p }))

  function toggleDep(id: string) {
    const current = form.depends_on
    s({ depends_on: current.includes(id) ? current.filter((d) => d !== id) : [...current, id] })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || (isPhase ? 'Nueva fase' : 'Nueva tarea')}
      size="lg"
    >
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {isPhase ? 'Nombre de la fase' : 'Título de la tarea'} *
          </label>
          <input
            value={form.title}
            onChange={(e) => s({ title: e.target.value })}
            autoFocus
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
            placeholder={isPhase ? 'Ej: Fase 1 — Ingeniería' : 'Ej: Instalar medidores en Planta A'}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => s({ description: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>

        {/* Dates + assignee */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Inicio planeado</label>
            <input type="date" value={form.planned_start} onChange={(e) => s({ planned_start: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fin planeado</label>
            <input type="date" value={form.planned_finish} onChange={(e) => s({ planned_finish: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Inicio real</label>
            <input type="date" value={form.actual_start} onChange={(e) => s({ actual_start: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fin real</label>
            <input type="date" value={form.actual_finish} onChange={(e) => s({ actual_finish: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Responsable</label>
            <input value={form.assignee} onChange={(e) => s({ assignee: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              placeholder="Nombre o email" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Avance (%)</label>
            <div className="flex items-center gap-2">
              <input type="range" min="0" max="100" step="5" value={form.progress}
                onChange={(e) => s({ progress: Number(e.target.value) })}
                className="flex-1 accent-brand-blue" />
              <span className="text-sm font-mono w-10 text-right text-gray-700">{form.progress}%</span>
            </div>
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Prioridad</label>
          <div className="flex gap-2">
            {PRIORITY_OPTS.map((p) => (
              <button
                key={p.value}
                onClick={() => s({ priority: p.value })}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  form.priority === p.value ? p.color + ' ring-2 ring-current ring-offset-1' : 'border-border text-gray-500 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dependencies — only for tasks */}
        {!isPhase && tasks.filter((t) => t.title !== form.title).length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Dependencias <span className="text-gray-400 font-normal">(finish-to-start)</span>
            </label>
            <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
              {tasks.map((t) => (
                <label key={t.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                  <input
                    type="checkbox"
                    checked={form.depends_on.includes(t.id)}
                    onChange={() => toggleDep(t.id)}
                    className="rounded accent-brand-blue"
                  />
                  <span className="text-sm text-gray-700">{t.title}</span>
                  {phases.find((p) => p.id === t.phase_id) && (
                    <span className="text-[10px] text-gray-400">{phases.find((p) => p.id === t.phase_id)?.name}</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="secondary" size="sm" onClick={onClose} rightIcon={<X size={13} />}>Cancelar</Button>
          <Button size="sm" onClick={() => onSave(form)} disabled={!form.title} leftIcon={<Save size={13} />}>
            {isPhase ? 'Crear fase' : 'Guardar tarea'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
