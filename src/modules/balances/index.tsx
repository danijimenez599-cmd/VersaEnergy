import { useState, useEffect } from 'react'
import { supabase } from '@/services/supabase'
import { PageHeader } from '@/shared/PageHeader'
import { Button } from '@/shared/Button'
import { Badge } from '@/shared/Badge'
import { Card } from '@/shared/Card'
import { EmptyState } from '@/shared/EmptyState'
import { Scale, Calculator } from 'lucide-react'

interface BalanceRow {
  id: string; utility: string; period_start: string; period_end: string;
  total_input: number; measured_consumption: number; unaccounted_for: number;
  unaccounted_for_percent: number; measurement_coverage: number;
  status: string; node_results: BalanceNodeResult[];
}

interface BalanceNodeResult {
  nodeId: string; tag: string; consumption: number; coverage: string;
}

export default function BalancesPage() {
  const [siteId, setSiteId] = useState<string | null>(null)
  const [sites, setSites] = useState<{ id: string; name: string }[]>([])
  const [balances, setBalances] = useState<BalanceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<BalanceRow | null>(null)

  useEffect(() => {
    supabase.from('sites').select('id, name').order('name').then(({ data }) => {
      setSites(data || [])
      if (data && data.length > 0) setSiteId(data[0].id)
    })
  }, [])

  async function loadBalances() {
    if (!siteId) return
    setLoading(true)
    const { data } = await supabase.from('energy_balances')
      .select('*').eq('site_id', siteId).order('created_at', { ascending: false }).limit(20)
    setBalances(data || [])
    setLoading(false)
  }

  useEffect(() => { loadBalances() }, [siteId])

  async function runBalance() {
    if (!siteId) return
    const { data: diagrams } = await supabase.from('energy_diagrams').select('id').eq('site_id', siteId).limit(1)
    if (!diagrams || diagrams.length === 0) return
    const { data: mpData } = await supabase.from('measurement_points').select('*').eq('site_id', siteId)
    if (!mpData) return

    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const to = now.toISOString()
    const { data: readings } = await supabase.from('energy_readings_raw')
      .select('*').gte('timestamp', from).lte('timestamp', to)

    let totalInput = 0
    let measured = 0
    const nodes: BalanceNodeResult[] = []
    if (mpData && readings) {
      for (const mp of mpData) {
        const mpReadings = readings.filter((r: { measurement_point_id: string }) => r.measurement_point_id === mp.id)
        const sum = mpReadings.reduce((s: number, r: { value: number }) => s + Number(r.value), 0)
        totalInput += mpReadings.length > 0 ? sum : 0
        measured += sum
        nodes.push({ nodeId: mp.id, tag: mp.tag, consumption: sum, coverage: 'measured' })
      }
    }

    const unacc = totalInput - measured
    const coverage = totalInput > 0 ? (measured / totalInput) * 100 : 0

    await supabase.from('energy_balances').insert({
      site_id: siteId, utility: 'electricity',
      period_start: from, period_end: to,
      total_input: totalInput, measured_consumption: measured,
      calculated_consumption: 0, estimated_consumption: 0,
      technical_losses: 0, estimated_leaks: 0, returns: 0,
      unaccounted_for: unacc,
      unaccounted_for_percent: totalInput > 0 ? (unacc / totalInput) * 100 : 0,
      measurement_coverage: coverage,
      node_results: JSON.stringify(nodes),
    })
    loadBalances()
  }

  return (
    <div>
      <PageHeader title="Balances" description="C\u00e1lculo de balances de utilities por periodo"
        actions={<Button size="sm" leftIcon={<Calculator size={14} />} onClick={runBalance}>Ejecutar balance</Button>} />

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-gray-600">Sitio:</label>
        <select value={siteId || ''} onChange={(e) => setSiteId(e.target.value)}
          className="px-3 py-1.5 text-sm border border-border rounded-lg bg-surface cursor-pointer">
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? <div className="py-12 text-center text-sm text-gray-400">Cargando...</div>
        : balances.length === 0 ? <EmptyState icon={<Scale size={48} />} title="Sin balances" description="Ejecuta un balance para este sitio." />
          : <div className="space-y-4">
            {balances.map((b) => (
              <Card key={b.id} padding="md" onClick={() => setSelected(b)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {new Date(b.period_start).toLocaleDateString()} — {new Date(b.period_end).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge color="teal" size="sm">{b.utility}</Badge>
                      <Badge color={b.status === 'final' ? 'green' : 'gray'} size="sm">{b.status}</Badge>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-xs text-gray-500">No explicado</p>
                    <p className={'text-lg font-semibold ' + (b.unaccounted_for_percent > 10 ? 'text-red-500' : 'text-gray-800')}>
                      {b.unaccounted_for_percent?.toFixed(1) || 0}%
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>}

      {selected && (
        <div className="mt-6">
          <Card>
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Detalle del balance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[{ label: 'Entrada total', value: selected.total_input, unit: 'kWh' },
                { label: 'Medido', value: selected.measured_consumption, unit: 'kWh' },
                { label: 'No explicado', value: selected.unaccounted_for, unit: 'kWh' },
                { label: 'Cobertura', value: selected.measurement_coverage, unit: '%' },
              ].map((m) => (
                <div key={m.label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{m.label}</p>
                  <p className="text-lg font-semibold text-gray-800">{Number(m.value || 0).toLocaleString()} {m.unit}</p>
                </div>
              ))}
            </div>
            {(selected.node_results as BalanceNodeResult[] || []).length > 0 && (
              <table className="w-full text-sm">
                <thead><tr className="border-b">
                  <th className="text-left py-2 px-2 text-gray-600">Tag</th><th className="text-right py-2 px-2 text-gray-600">Consumo</th><th className="text-right py-2 px-2 text-gray-600">Cobertura</th></tr></thead>
                <tbody>
                  {(selected.node_results as BalanceNodeResult[]).slice(0, 15).map((n) => (
                    <tr key={n.nodeId} className="border-b border-gray-100">
                      <td className="py-2 px-2 font-mono text-xs">{n.tag}</td>
                      <td className="py-2 px-2 text-right">{n.consumption.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right"><Badge size="sm" color={n.coverage === 'measured' ? 'green' : 'gray'}>{n.coverage}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
