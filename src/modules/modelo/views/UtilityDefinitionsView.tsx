import { useState, useEffect } from 'react'
import { Card } from '@/shared/Card'
import { Badge } from '@/shared/Badge'
import { supabase } from '@/services/supabase'

interface UtilityDef {
  id: string
  name: string
  category: string
  default_unit: string
  line_color: string
  line_stroke_width: number
  line_stroke_dasharray: string | null
}

const categoryLabels: Record<string, string> = { electrical: 'Eléctrica', thermal: 'Térmica', gas: 'Gas', fluid: 'Fluido', custom: 'Custom' }
const categoryColors: Record<string, 'blue' | 'purple' | 'orange' | 'cyan' | 'gray'> = { electrical: 'blue', thermal: 'purple', gas: 'orange', fluid: 'cyan', custom: 'gray' }

export function UtilityDefinitionsView() {
  const [utilities, setUtilities] = useState<UtilityDef[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('utility_definitions').select('*').order('category').order('name')
      setUtilities(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Cargando catálogo...</div>

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">Catálogo de referencia — {utilities.length} utilities definidas</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {utilities.map((u) => (
          <Card key={u.id} padding="md">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-8 rounded-full shrink-0"
                style={{ backgroundColor: u.line_color }}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge color={categoryColors[u.category] || 'gray'} size="sm">{categoryLabels[u.category] || u.category}</Badge>
                  <span className="text-xs text-gray-400 font-mono">{u.default_unit}</span>
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-0.5 rounded" style={{
                backgroundColor: u.line_color,
                opacity: 0.2,
                backgroundImage: u.line_stroke_dasharray ? `repeating-linear-gradient(90deg, ${u.line_color} 0, ${u.line_color} ${u.line_stroke_dasharray.split(' ')[0] || '4'}px, transparent ${u.line_stroke_dasharray.split(' ')[0] || '4'}px, transparent ${Number(u.line_stroke_dasharray.split(' ')[0] || 4) + Number(u.line_stroke_dasharray.split(' ')[1] || 4)}px)` : undefined,
              }} />
              <span className="text-[10px] text-gray-400 font-mono">{u.line_stroke_width}px {u.line_stroke_dasharray ? `dash ${u.line_stroke_dasharray}` : 'sólido'}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
