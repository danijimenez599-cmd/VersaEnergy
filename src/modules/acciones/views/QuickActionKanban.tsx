import { useState, useEffect } from 'react'
import { supabase } from '@/services/supabase'
import { Card } from '@/shared/Card'
import { Badge } from '@/shared/Badge'
import { EmptyState } from '@/shared/EmptyState'
import { Columns } from 'lucide-react'
import type { EnergyImprovement, ImprovementStatus } from '../types'
import { STATUS_LABELS, STATUS_COLORS, KANBAN_COLUMNS } from '../types'

interface Props {
  siteId: string
  onSelect: (item: EnergyImprovement) => void
}

export function QuickActionKanban({ siteId, onSelect }: Props) {
  const [items, setItems] = useState<EnergyImprovement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!siteId) return
    supabase.from('energy_improvements')
      .select('*').eq('site_id', siteId).eq('work_type', 'quick_action')
      .not('status', 'in', '(closed,cancelled)')
      .order('priority', { ascending: false })
      .then(({ data }) => { setItems(data || []); setLoading(false) })
  }, [siteId])

  async function moveStatus(item: EnergyImprovement, newStatus: ImprovementStatus) {
    const oldStatus = item.status
    await supabase.from('energy_improvements').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', item.id)
    await supabase.from('energy_improvement_status_log').insert({
      improvement_id: item.id, from_status: oldStatus, to_status: newStatus,
    })
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: newStatus } : i))
  }

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Cargando...</div>
  if (items.length === 0) return <EmptyState icon={<Columns size={40} />} title="Sin acciones rápidas"
    description="Clasifica oportunidades como 'acción rápida' desde la bandeja de entrada." />

  const itemsByStatus = (status: ImprovementStatus) => items.filter((i) => i.status === status)

  return (
    <div className="flex gap-3 overflow-x-auto pb-2" style={{ minHeight: 400 }}>
      {KANBAN_COLUMNS.map((status) => {
        const colItems = itemsByStatus(status)
        return (
          <div key={status} className="flex-shrink-0 w-60 bg-gray-50 rounded-lg p-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5">
                <Badge color={STATUS_COLORS[status] as 'blue'} size="sm">{STATUS_LABELS[status]}</Badge>
              </div>
              <span className="text-xs text-gray-400">{colItems.length}</span>
            </div>
            <div className="space-y-2">
              {colItems.map((item) => (
                <Card key={item.id} padding="sm" onClick={() => onSelect(item)}>
                  <p className="text-xs font-medium text-gray-800 line-clamp-2">{item.title}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Badge color="teal" size="sm">{item.utility}</Badge>
                    {item.estimated_energy_savings > 0 && (
                      <span className="text-[10px] text-gray-500">{item.estimated_energy_savings} {item.savings_unit}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-2 border-t border-border pt-1.5">
                    {KANBAN_COLUMNS.filter((s) => s !== status).slice(
                      status === 'identified' || status === 'triage' ? 2 : Math.max(0, KANBAN_COLUMNS.indexOf(status) - 1),
                      KANBAN_COLUMNS.indexOf(status) + 2,
                    ).map((s) => (
                      <button key={s} onClick={(e) => { e.stopPropagation(); moveStatus(item, s) }}
                        className="text-[9px] px-1.5 py-0.5 rounded border border-gray-200 hover:bg-white hover:border-brand-blue/30 text-gray-500 cursor-pointer transition-colors">
                        {s === 'in_progress' ? '▶' : s === 'verification' ? '✓' : s === 'closed' ? '✅' : STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
