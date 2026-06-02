import { useState, useEffect } from 'react'
import { supabase } from '@/services/supabase'
import { PageHeader } from '@/shared/PageHeader'
import { Button } from '@/shared/Button'
import { Badge } from '@/shared/Badge'
import { Card } from '@/shared/Card'
import { EmptyState } from '@/shared/EmptyState'
import { TrendingUp, Plus, Target } from 'lucide-react'

interface EnPI {
  id: string; name: string; utility: string; unit: string; scope: string; frequency: string; is_active: boolean;
  baselines?: { id: string; value: number; version: number }[];
  targets?: { id: string; name: string; target_type: string; target_value: number; status: string }[];
  results?: { period_start: string; actual_value: number; baseline_value: number; deviation_percent: number }[];
}

export default function DesempenoPage() {
  const [siteId, setSiteId] = useState<string | null>(null)
  const [sites, setSites] = useState<{ id: string; name: string }[]>([])
  const [enpis, setEnpis] = useState<EnPI[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', utility: 'electricity', unit: 'kWh/ton', scope: 'site', scope_id: '', frequency: 'monthly', description: '' })

  useEffect(() => {
    supabase.from('sites').select('id, name').order('name').then(({ data }) => {
      setSites(data || [])
      if (data && data.length > 0) setSiteId(data[0].id)
    })
  }, [])

  async function loadEnpis() {
    if (!siteId) return
    setLoading(true)
    const { data } = await supabase.from('energy_enpis').select('*').eq('site_id', siteId).order('name')
    if (!data) { setLoading(false); return }
    const enriched: EnPI[] = []
    for (const enpi of data) {
      const { data: bl } = await supabase.from('energy_baselines').select('*').eq('enpi_id', enpi.id).order('version', { ascending: false }).limit(1)
      const { data: tg } = await supabase.from('energy_targets').select('*').eq('enpi_id', enpi.id).order('created_at', { ascending: false })
      const { data: rs } = await supabase.from('energy_performance_results').select('*').eq('enpi_id', enpi.id).order('period_start', { ascending: false }).limit(6)
      enriched.push({ ...enpi, baselines: bl || [], targets: tg || [], results: rs || [] })
    }
    setEnpis(enriched)
    setLoading(false)
  }

  useEffect(() => { loadEnpis() }, [siteId])

  async function handleCreate() {
    await supabase.from('energy_enpis').insert({
      site_id: siteId, name: form.name, utility: form.utility,
      unit: form.unit, scope: form.scope, frequency: form.frequency,
      description: form.description, formula: { numerator: '', denominator: '' },
    })
    setShowForm(false)
    loadEnpis()
  }

  async function addBaseline(enpiId: string) {
    const val = prompt('Valor del baseline')
    if (!val) return
    await supabase.from('energy_baselines').insert({
      enpi_id: enpiId, method: 'average', value: parseFloat(val),
      unit: enpis.find((e) => e.id === enpiId)?.unit || '', version: 1,
    })
    loadEnpis()
  }

  async function addTarget(enpiId: string) {
    const name = prompt('Nombre del objetivo') || 'Objetivo'
    const val = prompt('Valor objetivo')
    if (!val) return
    await supabase.from('energy_targets').insert({
      enpi_id: enpiId, name, target_type: 'absolute_value',
      target_value: parseFloat(val), unit: enpis.find((e) => e.id === enpiId)?.unit || '',
    })
    loadEnpis()
  }

  return (
    <div>
      <PageHeader title="Desempe\u00f1o Energ\u00e9tico" description="EnPI, l\u00edneas base y objetivos"
        actions={<Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowForm(true)}>Nuevo EnPI</Button>} />

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-gray-600">Sitio:</label>
        <select value={siteId || ''} onChange={(e) => setSiteId(e.target.value)}
          className="px-3 py-1.5 text-sm border border-border rounded-lg bg-surface cursor-pointer">
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? <div className="py-12 text-center text-sm text-gray-400">Cargando...</div>
        : enpis.length === 0 ? <EmptyState icon={<TrendingUp size={48} />} title="Sin EnPIs" description="Crea tu primer indicador de desempe\u00f1o." />
          : <div className="space-y-4">
            {enpis.map((enpi) => (
              <Card key={enpi.id} padding="md">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">{enpi.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge color="teal" size="sm">{enpi.utility}</Badge>
                      <span className="text-xs text-gray-500">{enpi.unit}</span>
                      <Badge color="gray" size="sm">{enpi.scope}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" leftIcon={<TrendingUp size={12} />} onClick={() => addBaseline(enpi.id)}>Baseline</Button>
                    <Button variant="ghost" size="sm" leftIcon={<Target size={12} />} onClick={() => addTarget(enpi.id)}>Target</Button>
                  </div>
                </div>

                {enpi.baselines && enpi.baselines.length > 0 && (
                  <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                    <span className="text-gray-500">Baseline: </span>
                    <span className="font-semibold">{enpi.baselines[0].value} {enpi.unit}</span>
                    <span className="text-gray-400 ml-2">v{enpi.baselines[0].version}</span>
                  </div>
                )}

                {enpi.targets && enpi.targets.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {enpi.targets.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 text-xs">
                        <Target size={12} className="text-brand-blue" />
                        <span>{t.name}: {t.target_value} {enpi.unit}</span>
                        <Badge size="sm" color={t.status === 'achieved' ? 'green' : 'gray'}>{t.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {enpi.results && enpi.results.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1">Resultados recientes</p>
                    <div className="flex gap-3">
                      {enpi.results.slice(0, 6).reverse().map((r, i) => (
                        <div key={i} className="flex-1 bg-gray-50 rounded p-2 text-center">
                          <p className="text-[10px] text-gray-400">{new Date(r.period_start).toLocaleDateString('es', { month: 'short' })}</p>
                          <p className="text-xs font-semibold text-gray-700">{r.actual_value?.toFixed(1)}</p>
                          {r.deviation_percent && (
                            <p className={'text-[10px] ' + (r.deviation_percent > 0 ? 'text-red-500' : 'text-emerald-500')}>
                              {r.deviation_percent > 0 ? '+' : ''}{r.deviation_percent.toFixed(1)}%
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="w-full max-w-sm" padding="lg">
            <h3 className="text-sm font-semibold mb-3">Nuevo EnPI</h3>
            <div className="space-y-3">
              <div><label className="block text-xs text-gray-500 mb-1">Nombre</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Ej: kWh/tonelada" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-gray-500 mb-1">Utility</label>
                  <select value={form.utility} onChange={(e) => setForm({ ...form, utility: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-surface cursor-pointer">
                    <option value="electricity">Electricidad</option><option value="steam">Vapor</option>
                    <option value="compressed_air">Aire comprimido</option></select></div>
                <div><label className="block text-xs text-gray-500 mb-1">Unidad</label>
                  <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-gray-500 mb-1">Alcance</label>
                  <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-surface cursor-pointer">
                    <option value="site">Sitio</option><option value="area">Área</option>
                    <option value="equipment">Equipo</option><option value="process">Proceso</option></select></div>
                <div><label className="block text-xs text-gray-500 mb-1">Frecuencia</label>
                  <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-surface cursor-pointer">
                    <option value="daily">Diario</option><option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option></select></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleCreate}>Crear EnPI</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
