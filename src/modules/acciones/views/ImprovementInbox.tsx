import { useState, useEffect } from 'react'
import { supabase } from '@/services/supabase'
import { Card } from '@/shared/Card'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { EmptyState } from '@/shared/EmptyState'
import { Inbox, ArrowRightLeft, FolderKanban } from 'lucide-react'
import type { EnergyImprovement, ImprovementStatus } from '../types'

interface Props {
  siteId: string
  onSelect: (item: EnergyImprovement) => void
}

export function ImprovementInbox({ siteId, onSelect }: Props) {
  const [items, setItems] = useState<EnergyImprovement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!siteId) return
    supabase.from('energy_improvements')
      .select('*').eq('site_id', siteId)
      .in('status', ['identified', 'triage'])
      .order('priority', { ascending: false })
      .then(({ data }) => { setItems(data || []); setLoading(false) })
  }, [siteId])

  async function handleClassify(item: EnergyImprovement, workType: 'quick_action' | 'project') {
    await supabase.from('energy_improvements').update({ work_type: workType, status: workType === 'project' ? 'approved' : 'approved' as ImprovementStatus, updated_at: new Date().toISOString() }).eq('id', item.id)
    setItems((prev) => prev.filter((i) => i.id !== item.id))
  }

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Cargando...</div>
  if (items.length === 0) return <EmptyState icon={<Inbox size={40} />} title="Bandeja vacía"
    description="Las oportunidades creadas desde balances, mapa, EnPI o manualmente aparecerán aquí." />

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} padding="md" onClick={() => onSelect(item)}>
          <div className="flex items-start justify-between">
            <div className="space-y-1 min-w-0 flex-1 mr-4">
              <p className="text-sm font-semibold text-gray-800">{item.title}</p>
              <p className="text-xs text-gray-500 line-clamp-2">{item.description || 'Sin descripción'}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge color="teal" size="sm">{item.utility}</Badge>
                <Badge color="gray" size="sm">{item.category}</Badge>
                {item.estimated_investment > 0 && (
                  <span className="text-xs text-gray-500">{item.currency} {item.estimated_investment?.toLocaleString()}</span>
                )}
                {item.payback_months && (
                  <span className="text-xs text-gray-400">Payback: {item.payback_months} meses</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" leftIcon={<ArrowRightLeft size={12} />}
                onClick={(e) => { e.stopPropagation(); handleClassify(item, 'quick_action') }}>
                Acción rápida
              </Button>
              <Button variant="secondary" size="sm" leftIcon={<FolderKanban size={12} />}
                onClick={(e) => { e.stopPropagation(); handleClassify(item, 'project') }}>
                Proyecto
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
