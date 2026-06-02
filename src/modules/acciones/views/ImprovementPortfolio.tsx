import { useState, useEffect } from 'react'
import { supabase } from '@/services/supabase'
import { Card } from '@/shared/Card'
import { Badge } from '@/shared/Badge'
import { EmptyState } from '@/shared/EmptyState'
import { FolderKanban, TrendingUp, DollarSign, Clock } from 'lucide-react'
import type { EnergyImprovement } from '../types'
import { STATUS_LABELS, STATUS_COLORS } from '../types'

interface Props {
  siteId: string
  onSelect: (item: EnergyImprovement) => void
}

export function ImprovementPortfolio({ siteId, onSelect }: Props) {
  const [items, setItems] = useState<EnergyImprovement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!siteId) return
    supabase.from('energy_improvements')
      .select('*').eq('site_id', siteId).eq('work_type', 'project')
      .not('status', 'in', '(cancelled)')
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        if (!data) { setLoading(false); return }
        const enriched: EnergyImprovement[] = []
        for (const item of data) {
          const { data: phases } = await supabase.from('energy_project_phases')
            .select('*').eq('improvement_id', item.id).order('order')
          const { data: tasks } = await supabase.from('energy_project_tasks')
            .select('*').eq('improvement_id', item.id)
          enriched.push({ ...item, phases: phases || [], tasks: tasks || [] })
        }
        setItems(enriched)
        setLoading(false)
      })
  }, [siteId])

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Cargando portfolio...</div>
  if (items.length === 0) return <EmptyState icon={<FolderKanban size={40} />} title="Sin proyectos"
    description="Clasifica oportunidades como 'proyecto' desde la bandeja de entrada." />

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const completedTasks = (item.tasks || []).filter((t) => t.status === 'completed').length
        const totalTasks = (item.tasks || []).length
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

        return (
          <Card key={item.id} padding="md" onClick={() => onSelect(item)}>
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">{item.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge color={STATUS_COLORS[item.status] as 'blue'} size="sm">{STATUS_LABELS[item.status]}</Badge>
                    <Badge color="teal" size="sm">{item.utility}</Badge>
                    <Badge color="gray" size="sm">{item.category}</Badge>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {item.estimated_energy_savings > 0 && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <TrendingUp size={12} className="text-emerald-500" />
                      {item.estimated_energy_savings?.toLocaleString()} {item.savings_unit}
                    </p>
                  )}
                  {item.estimated_investment > 0 && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <DollarSign size={12} />{item.currency} {item.estimated_investment?.toLocaleString()}
                    </p>
                  )}
                  {item.payback_months && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Clock size={12} />Payback: {item.payback_months} meses
                    </p>
                  )}
                </div>
              </div>

              {totalTasks > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Avance: {completedTasks}/{totalTasks} tareas</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-teal rounded-full transition-all" style={{ width: progress + '%' }} />
                  </div>
                </div>
              )}

              {item.planned_start && item.planned_finish && (
                <p className="text-xs text-gray-400">
                  {new Date(item.planned_start).toLocaleDateString()} — {new Date(item.planned_finish).toLocaleDateString()}
                </p>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
