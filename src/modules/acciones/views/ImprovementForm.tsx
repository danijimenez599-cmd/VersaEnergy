import { useState } from 'react'
import { supabase } from '@/services/supabase'
import { Button } from '@/shared/Button'
import { Card } from '@/shared/Card'
import { Save } from 'lucide-react'
import type { EnergyImprovement, ImprovementWorkType } from '../types'

interface Props {
  siteId: string
  item: EnergyImprovement | null
  onClose: () => void
  onSave: () => void
}

export function ImprovementForm({ siteId, item, onClose, onSave }: Props) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: item?.title || '',
    description: item?.description || '',
    work_type: item?.work_type || 'quick_action' as ImprovementWorkType,
    status: item?.status || 'identified',
    priority: item?.priority || 'medium' as string,
    category: item?.category || 'efficiency' as string,
    utility: item?.utility || 'electricity',
    estimated_energy_savings: item?.estimated_energy_savings || 0,
    savings_unit: item?.savings_unit || 'kWh',
    estimated_cost_savings: item?.estimated_cost_savings || 0,
    estimated_investment: item?.estimated_investment || 0,
    currency: item?.currency || 'USD',
    payback_months: item?.payback_months || '',
    owner_id: item?.owner_id || '',
    department: item?.department || '',
    planned_start: item?.planned_start?.split('T')[0] || '',
    planned_finish: item?.planned_finish?.split('T')[0] || '',
    scope: item?.project?.scope || '',
    business_case: item?.project?.business_case || '',
  })

  async function handleSave() {
    setSaving(true)
    const payload = {
      site_id: siteId,
      title: form.title,
      description: form.description,
      work_type: form.work_type,
      status: form.status,
      priority: form.priority,
      category: form.category,
      utility: form.utility,
      estimated_energy_savings: form.estimated_energy_savings,
      savings_unit: form.savings_unit,
      estimated_cost_savings: form.estimated_cost_savings,
      estimated_investment: form.estimated_investment,
      currency: form.currency,
      payback_months: form.payback_months ? Number(form.payback_months) : null,
      owner_id: form.owner_id || null,
      department: form.department || null,
      planned_start: form.planned_start || null,
      planned_finish: form.planned_finish || null,
      updated_at: new Date().toISOString(),
    }

    if (item) {
      await supabase.from('energy_improvements').update(payload).eq('id', item.id)
    } else {
      await supabase.from('energy_improvements').insert(payload)
    }
    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm pt-10 overflow-y-auto pb-10">
      <Card className="w-full max-w-xl" padding="lg">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">
          {item ? 'Editar' : 'Nueva'} oportunidad
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Título *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" rows={2} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
              <select value={form.work_type} onChange={(e) => setForm({ ...form, work_type: e.target.value as ImprovementWorkType })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface cursor-pointer">
                <option value="quick_action">Acción rápida</option>
                <option value="project">Proyecto</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prioridad</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface cursor-pointer">
                <option value="low">Baja</option><option value="medium">Media</option>
                <option value="high">Alta</option><option value="critical">Crítica</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface cursor-pointer">
                <option value="efficiency">Eficiencia</option><option value="leakage">Fuga</option>
                <option value="maintenance">Mantenimiento</option><option value="controls">Controles</option>
                <option value="measurement">Medición</option><option value="investment">Inversión</option>
                <option value="behavioral">Conductual</option><option value="iso">ISO</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Utility</label>
              <select value={form.utility} onChange={(e) => setForm({ ...form, utility: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface cursor-pointer">
                <option value="electricity">Electricidad</option><option value="steam">Vapor</option>
                <option value="compressed_air">Aire comprimido</option><option value="natural_gas">Gas natural</option>
                <option value="chilled_water">Agua helada</option><option value="industrial_water">Agua industrial</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Responsable</label>
              <input value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
            </div>
          </div>

          <p className="text-xs font-semibold text-gray-500 pt-2">Financiero</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Inversión ({form.currency})</label>
              <input type="number" value={form.estimated_investment} onChange={(e) => setForm({ ...form, estimated_investment: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ahorro energético</label>
              <div className="flex gap-1">
                <input type="number" value={form.estimated_energy_savings} onChange={(e) => setForm({ ...form, estimated_energy_savings: parseFloat(e.target.value) || 0 })}
                  className="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
                <input value={form.savings_unit} onChange={(e) => setForm({ ...form, savings_unit: e.target.value })}
                  className="w-16 px-2 py-2 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Payback (meses)</label>
              <input type="number" value={form.payback_months} onChange={(e) => setForm({ ...form, payback_months: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
            </div>
          </div>

          {form.work_type === 'project' && (
            <>
              <p className="text-xs font-semibold text-gray-500 pt-2">Planificación del proyecto</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Inicio planificado</label>
                  <input type="date" value={form.planned_start} onChange={(e) => setForm({ ...form, planned_start: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fin planificado</label>
                  <input type="date" value={form.planned_finish} onChange={(e) => setForm({ ...form, planned_finish: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Alcance</label>
                <textarea value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" rows={2} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Business case</label>
                <textarea value={form.business_case} onChange={(e) => setForm({ ...form, business_case: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" rows={2} />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} loading={saving} rightIcon={<Save size={14} />}>
              {item ? 'Guardar cambios' : 'Crear oportunidad'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
