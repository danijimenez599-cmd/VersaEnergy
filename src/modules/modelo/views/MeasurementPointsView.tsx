import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/shared/Card'
import { Button } from '@/shared/Button'
import { Badge } from '@/shared/Badge'
import { EmptyState } from '@/shared/EmptyState'
import { Modal } from '@/shared/Modal'
import { supabase } from '@/services/supabase'
import { Plus, Pencil, Trash2, Save, X, Gauge } from 'lucide-react'

interface MP {
  id: string
  tag: string
  name: string
  target_type: string
  utility: string
  measurement_type: string
  quantity: string
  unit: string
  source_type: string
  source_config: Record<string, unknown>
  accumulator_config: Record<string, unknown>
  is_active: boolean
}

interface Props { siteId: string; utilityType: string | null }

export function MeasurementPointsView({ siteId, utilityType }: Props) {
  const [items, setItems] = useState<MP[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<MP | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    tag: '', name: '', target_type: 'system', target_id: '',
    utility: utilityType || 'electricity', measurement_type: 'accumulator',
    quantity: 'energy', unit: 'kWh', source_type: 'manual',
    source_config: '{}', accumulator_config: '{"multiplier":1,"offset":0,"allowNegativeDelta":false,"resetDetection":true}',
  })

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('measurement_points').select('*').eq('site_id', siteId).order('tag')
    if (utilityType) q = q.eq('utility', utilityType)
    const { data, error: err } = await q
    if (err) setError(err.message)
    else setItems(data || [])
    setLoading(false)
  }, [siteId, utilityType])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setForm({ tag: '', name: '', target_type: 'system', target_id: '', utility: utilityType || 'electricity', measurement_type: 'accumulator', quantity: 'energy', unit: 'kWh', source_type: 'manual', source_config: '{}', accumulator_config: '{"multiplier":1,"offset":0,"allowNegativeDelta":false,"resetDetection":true}' })
    setEditing(null); setShowForm(true)
  }

  function openEdit(mp: MP) {
    setForm({ tag: mp.tag, name: mp.name, target_type: mp.target_type || 'system', target_id: '', utility: mp.utility, measurement_type: mp.measurement_type, quantity: mp.quantity, unit: mp.unit, source_type: mp.source_type, source_config: JSON.stringify(mp.source_config || {}, null, 2), accumulator_config: JSON.stringify(mp.accumulator_config || {}, null, 2) })
    setEditing(mp); setShowForm(true)
  }

  async function handleSave() {
    setSaving(true)
    let sc: Record<string, unknown> = {}
    let ac: Record<string, unknown> = {}
    try { sc = JSON.parse(form.source_config) } catch { /* keep empty */ }
    try { ac = JSON.parse(form.accumulator_config) } catch { /* keep empty */ }

    const payload = {
      tag: form.tag, name: form.name, target_type: form.target_type,
      utility: form.utility, measurement_type: form.measurement_type,
      quantity: form.quantity, unit: form.unit, source_type: form.source_type,
      source_config: sc, accumulator_config: ac,
      updated_at: new Date().toISOString(),
    }

    if (editing) {
      await supabase.from('measurement_points').update(payload).eq('id', editing.id)
    } else {
      const _targetId = '00000000-0000-0000-0000-000000000000'
      await supabase.from('measurement_points').insert({ ...payload, site_id: siteId, target_id: _targetId })
    }
    setSaving(false); setShowForm(false); load()
  }

  async function handleDelete(id: string) { await supabase.from('measurement_points').delete().eq('id', id); load() }

  const typeLabels: Record<string, string> = { instantaneous: 'Instantáneo', accumulator: 'Acumulador', counter: 'Contador', status: 'Estado', calculated: 'Calculado', manual: 'Manual' }
  const typeBadgeColors: Record<string, 'purple' | 'blue' | 'teal' | 'gray' | 'orange' | 'cyan'> = { instantaneous: 'purple', accumulator: 'blue', counter: 'teal', status: 'gray', calculated: 'orange', manual: 'cyan' }

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Cargando puntos de medición...</div>
  if (error) return <div className="py-12 text-center text-sm text-red-500">{error}</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{items.length} puntos de medición</p>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>Nuevo punto</Button>
      </div>

      {items.length === 0 ? (
        <Card><EmptyState icon={<Gauge size={40} strokeWidth={1.5} />} title="Sin puntos de medición" description="Crea tu primer MeasurementPoint. Recuerda: es una entidad independiente, no un nodo visual." /></Card>
      ) : (
        <div className="space-y-3">
          {items.map((mp) => (
            <Card key={mp.id} padding="md">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                    <Gauge size={18} className="text-brand-blue" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-brand-blue">{mp.tag}</span>
                      <span className="text-sm text-gray-700">{mp.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge color={typeBadgeColors[mp.measurement_type] || 'gray'} size="sm">{typeLabels[mp.measurement_type] || mp.measurement_type}</Badge>
                      <Badge color="teal" size="sm" variant="solid">{mp.utility}</Badge>
                      <span className="text-xs text-gray-400">{mp.quantity} · {mp.unit} · {mp.target_type}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(mp)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(mp.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer"><Trash2 size={14} /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar punto de medición' : 'Nuevo punto de medición'} size="lg">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tag *</label>
              <input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue/20" placeholder="Ej: FQI-401" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" placeholder="Medidor de vapor principal" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo medición</label>
              <select value={form.measurement_type} onChange={(e) => setForm({ ...form, measurement_type: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-surface cursor-pointer">
                <option value="instantaneous">Instantáneo</option><option value="accumulator">Acumulador</option>
                <option value="counter">Contador</option><option value="calculated">Calculado</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Magnitud</label>
              <select value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-surface cursor-pointer">
                <option value="energy">Energía</option><option value="power">Potencia</option>
                <option value="flow">Flujo</option><option value="volume">Volumen</option>
                <option value="mass">Masa</option><option value="pressure">Presión</option>
                <option value="temperature">Temperatura</option><option value="level">Nivel</option>
                <option value="current">Corriente</option><option value="voltage">Voltaje</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unidad</label>
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue/20" placeholder="kWh, m3, kg..." />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Utility</label>
              <select value={form.utility} onChange={(e) => setForm({ ...form, utility: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-surface cursor-pointer">
                <option value="electricity">Electricidad</option><option value="natural_gas">Gas natural</option>
                <option value="steam">Vapor</option><option value="compressed_air">Aire comprimido</option>
                <option value="chilled_water">Agua helada</option><option value="hot_water">Agua caliente</option>
                <option value="industrial_water">Agua industrial</option><option value="diesel">Diésel</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vinculación</label>
              <select value={form.target_type} onChange={(e) => setForm({ ...form, target_type: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-surface cursor-pointer">
                <option value="node">Nodo</option><option value="edge">Edge / Línea</option>
                <option value="system">Sistema</option><option value="area">Área</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fuente</label>
              <select value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-surface cursor-pointer">
                <option value="manual">Manual</option><option value="iot">IoT</option>
                <option value="calculated">Calculada</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Source Config (JSON)</label>
            <textarea value={form.source_config} onChange={(e) => setForm({ ...form, source_config: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue/20" rows={3} placeholder='{"kind":"manual","frequency":"monthly"}' />
          </div>

          {form.measurement_type === 'accumulator' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Accumulator Config (JSON)</label>
              <textarea value={form.accumulator_config} onChange={(e) => setForm({ ...form, accumulator_config: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue/20" rows={3} placeholder='{"multiplier":1,"offset":0}' />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)} rightIcon={<X size={14} />}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} loading={saving} rightIcon={<Save size={14} />}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
