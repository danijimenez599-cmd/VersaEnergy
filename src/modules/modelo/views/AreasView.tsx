import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/shared/Card'
import { Button } from '@/shared/Button'
import { Badge } from '@/shared/Badge'
import { EmptyState } from '@/shared/EmptyState'
import { Modal } from '@/shared/Modal'
import { supabase } from '@/services/supabase'
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react'

interface Area {
  id: string
  name: string
  code: string | null
  description: string | null
  parent_area_id: string | null
  is_active: boolean
}

interface AreasViewProps {
  siteId: string
  utilityType: string | null
}

export function AreasView({ siteId, utilityType: _utilityType }: AreasViewProps) {
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Area | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({ name: '', code: '', description: '', parent_area_id: '' })

  const loadAreas = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('energy_areas')
      .select('*')
      .eq('site_id', siteId)
      .order('name')
    if (err) setError(err.message)
    else setAreas(data || [])
    setLoading(false)
  }, [siteId])

  useEffect(() => { loadAreas() }, [loadAreas])

  function openCreate() {
    setForm({ name: '', code: '', description: '', parent_area_id: '' })
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(area: Area) {
    setForm({ name: area.name, code: area.code || '', description: area.description || '', parent_area_id: area.parent_area_id || '' })
    setEditing(area)
    setShowForm(true)
  }

  async function handleSave() {
    setSaving(true)
    if (editing) {
      await supabase.from('energy_areas').update({
        name: form.name,
        code: form.code || null,
        description: form.description || null,
        parent_area_id: form.parent_area_id || null,
        updated_at: new Date().toISOString(),
      }).eq('id', editing.id)
    } else {
      await supabase.from('energy_areas').insert({
        site_id: siteId,
        name: form.name,
        code: form.code || null,
        description: form.description || null,
        parent_area_id: form.parent_area_id || null,
      })
    }
    setSaving(false)
    setShowForm(false)
    loadAreas()
  }

  async function handleDelete(id: string) {
    await supabase.from('energy_areas').delete().eq('id', id)
    loadAreas()
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-400">Cargando áreas...</div>
  }

  if (error) {
    return <div className="py-12 text-center text-sm text-red-500">{error}</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{areas.length} áreas</p>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>
          Nueva área
        </Button>
      </div>

      {areas.length === 0 ? (
        <Card>
          <EmptyState title="Sin áreas" description="Crea tu primera área para este sitio." />
        </Card>
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50/50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Código</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Descripción</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 w-24">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((area) => (
                <tr key={area.id} className="border-b border-border/50 hover:bg-gray-50/30">
                  <td className="px-4 py-3 font-medium text-gray-800">{area.name}</td>
                  <td className="px-4 py-3 text-gray-500">{area.code || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{area.description || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge color={area.is_active ? 'green' : 'gray'} size="sm">
                      {area.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(area)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(area.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar área' : 'Nueva área'} size="sm">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" placeholder="Ej: Producción" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Código</label>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" placeholder="Ej: PROD-01" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20" rows={2} placeholder="Descripción del área" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)} rightIcon={<X size={14} />}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving} rightIcon={<Save size={14} />}>
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
