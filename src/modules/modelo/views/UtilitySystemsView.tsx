import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/shared/Card'
import { Button } from '@/shared/Button'
import { Badge } from '@/shared/Badge'
import { EmptyState } from '@/shared/EmptyState'
import { Modal } from '@/shared/Modal'
import { supabase } from '@/services/supabase'
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react'

interface System {
  id: string
  name: string
  description: string | null
  utility_type: string
  is_active: boolean
}

interface Props {
  siteId: string
  utilityType: string | null
}

export function UtilitySystemsView({ siteId, utilityType }: Props) {
  const [systems, setSystems] = useState<System[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<System | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', utility_type: utilityType || 'electricity' })

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('utility_systems').select('*').eq('site_id', siteId).order('name')
    if (utilityType) q = q.eq('utility_type', utilityType)
    const { data, error: err } = await q
    if (err) setError(err.message)
    else setSystems(data || [])
    setLoading(false)
  }, [siteId, utilityType])

  useEffect(() => { load() }, [load])

  function openCreate() { setForm({ name: '', description: '', utility_type: utilityType || 'electricity' }); setEditing(null); setShowForm(true) }
  function openEdit(sys: System) { setForm({ name: sys.name, description: sys.description || '', utility_type: sys.utility_type }); setEditing(sys); setShowForm(true) }

  async function handleSave() {
    setSaving(true)
    if (editing) {
      await supabase.from('utility_systems').update({ name: form.name, description: form.description || null, utility_type: form.utility_type, updated_at: new Date().toISOString() }).eq('id', editing.id)
    } else {
      await supabase.from('utility_systems').insert({ site_id: siteId, name: form.name, description: form.description || null, utility_type: form.utility_type })
    }
    setSaving(false); setShowForm(false); load()
  }

  async function handleDelete(id: string) { await supabase.from('utility_systems').delete().eq('id', id); load() }

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Cargando sistemas...</div>
  if (error) return <div className="py-12 text-center text-sm text-red-500">{error}</div>

  const utilityColors: Record<string, 'blue' | 'teal' | 'orange' | 'purple' | 'cyan' | 'red' | 'green' | 'gray'> = {
    electricity: 'blue', natural_gas: 'orange', steam: 'purple', compressed_air: 'teal',
    chilled_water: 'cyan', hot_water: 'cyan', industrial_water: 'cyan', diesel: 'orange',
    lpg: 'orange', condensate: 'purple', refrigeration: 'cyan', industrial_gas: 'gray',
    potable_water: 'cyan', process_water: 'cyan', solar_generation: 'green', battery_storage: 'green',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{systems.length} sistemas</p>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>Nuevo sistema</Button>
      </div>
      {systems.length === 0 ? (
        <Card><EmptyState title="Sin sistemas" description="Crea tu primer sistema de utility." /></Card>
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50/50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Utility</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Descripción</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 w-24">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {systems.map((sys) => (
                <tr key={sys.id} className="border-b border-border/50 hover:bg-gray-50/30">
                  <td className="px-4 py-3 font-medium text-gray-800">{sys.name}</td>
                  <td className="px-4 py-3"><Badge color={utilityColors[sys.utility_type] || 'gray'} size="sm">{sys.utility_type}</Badge></td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{sys.description || '—'}</td>
                  <td className="px-4 py-3"><Badge color={sys.is_active ? 'green' : 'gray'} size="sm">{sys.is_active ? 'Activo' : 'Inactivo'}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(sys)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(sys.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar sistema' : 'Nuevo sistema'} size="sm">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" placeholder="Ej: Sistema de Vapor Planta A" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Utility</label>
            <select value={form.utility_type} onChange={(e) => setForm({ ...form, utility_type: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-surface cursor-pointer">
              <option value="electricity">Electricidad</option>
              <option value="natural_gas">Gas natural</option>
              <option value="steam">Vapor</option>
              <option value="compressed_air">Aire comprimido</option>
              <option value="chilled_water">Agua helada</option>
              <option value="hot_water">Agua caliente</option>
              <option value="industrial_water">Agua industrial</option>
              <option value="diesel">Diésel</option>
              <option value="refrigeration">Refrigeración</option>
            </select>
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
