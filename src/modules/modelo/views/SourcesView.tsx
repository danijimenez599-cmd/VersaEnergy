import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/shared/Card'
import { Button } from '@/shared/Button'
import { EmptyState } from '@/shared/EmptyState'
import { Modal } from '@/shared/Modal'
import { supabase } from '@/services/supabase'
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react'

interface Source {
  id: string
  name: string
  source_type: string
  utility_type: string
  description: string | null
  is_active: boolean
}

interface Props { siteId: string; utilityType: string | null }

export function SourcesView({ siteId, utilityType }: Props) {
  const [items, setItems] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Source | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', source_type: 'utility_grid', utility_type: utilityType || 'electricity', description: '' })

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('energy_sources').select('*').eq('site_id', siteId).order('name')
    if (utilityType) q = q.eq('utility_type', utilityType)
    const { data, error: err } = await q
    if (err) setError(err.message)
    else setItems(data || [])
    setLoading(false)
  }, [siteId, utilityType])

  useEffect(() => { load() }, [load])

  function openCreate() { setForm({ name: '', source_type: 'utility_grid', utility_type: utilityType || 'electricity', description: '' }); setEditing(null); setShowForm(true) }
  function openEdit(src: Source) { setForm({ name: src.name, source_type: src.source_type, utility_type: src.utility_type, description: src.description || '' }); setEditing(src); setShowForm(true) }

  async function handleSave() {
    setSaving(true)
    const payload = { name: form.name, source_type: form.source_type, utility_type: form.utility_type, description: form.description || null, updated_at: new Date().toISOString() }
    if (editing) {
      await supabase.from('energy_sources').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('energy_sources').insert({ ...payload, site_id: siteId })
    }
    setSaving(false); setShowForm(false); load()
  }

  async function handleDelete(id: string) { await supabase.from('energy_sources').delete().eq('id', id); load() }

  const sourceLabels: Record<string, string> = { utility_grid: 'Red pública', renewable: 'Renovable', generator: 'Generador', storage: 'Almacenamiento', fuel_delivery: 'Suministro combustible', water_main: 'Acometida agua', custom: 'Personalizada' }

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Cargando fuentes...</div>
  if (error) return <div className="py-12 text-center text-sm text-red-500">{error}</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{items.length} fuentes</p>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>Nueva fuente</Button>
      </div>
      {items.length === 0 ? (
        <Card><EmptyState title="Sin fuentes" description="Crea tu primera fuente de utility." /></Card>
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50/50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Utility</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Descripción</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 w-24">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((src) => (
                <tr key={src.id} className="border-b border-border/50 hover:bg-gray-50/30">
                  <td className="px-4 py-3 font-medium text-gray-800">{src.name}</td>
                  <td className="px-4 py-3 text-gray-500">{sourceLabels[src.source_type] || src.source_type}</td>
                  <td className="px-4 py-3 text-gray-500">{src.utility_type}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{src.description || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(src)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(src.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar fuente' : 'Nueva fuente'} size="sm">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" placeholder="Ej: Red eléctrica CFE" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <select value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-surface cursor-pointer">
                <option value="utility_grid">Red pública</option><option value="renewable">Renovable</option>
                <option value="generator">Generador</option><option value="storage">Almacenamiento</option>
                <option value="fuel_delivery">Suministro combustible</option><option value="water_main">Acometida agua</option>
                <option value="custom">Personalizada</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Utility</label>
              <select value={form.utility_type} onChange={(e) => setForm({ ...form, utility_type: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-surface cursor-pointer">
                <option value="electricity">Electricidad</option><option value="natural_gas">Gas natural</option>
                <option value="steam">Vapor</option><option value="compressed_air">Aire comprimido</option>
                <option value="diesel">Diésel</option><option value="industrial_water">Agua industrial</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)} rightIcon={<X size={14} />}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} loading={saving} rightIcon={<Save size={14} />}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
