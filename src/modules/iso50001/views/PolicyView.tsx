import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { supabase } from '@/services/supabase'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { Card } from '@/shared/Card'
import { EmptyState } from '@/shared/EmptyState'
import { Modal } from '@/shared/Modal'
import { CheckCircle2, FileText, History, Pencil, Plus, ShieldCheck, Zap } from 'lucide-react'

interface PolicyDocument {
  id: string
  title: string
  version: string | null
  effective_date: string | null
  review_due_date: string | null
  content: string | null
  communication_evidence: string | null
  status: string
  created_at: string
}

interface Props { siteId: string }

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

function Field({ label, children, required, className = '' }: { label: string; children: ReactNode; required?: boolean; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] font-bold text-slate-500">{label}{required && <span className="text-rose-500"> *</span>}</span>
      {children}
    </label>
  )
}

const statusLabel: Record<string, string> = {
  draft: 'Borrador', active: 'Vigente', superseded: 'Reemplazada',
}
const statusVariant: Record<string, 'neutral' | 'ok' | 'warn'> = {
  draft: 'neutral', active: 'ok', superseded: 'warn',
}

export function PolicyView({ siteId }: Props) {
  const [policies, setPolicies] = useState<PolicyDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PolicyDocument | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: 'Política Energética',
    version: '1.0',
    effective_date: '',
    review_due_date: '',
    content: '',
    communication_evidence: '',
  })

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('sgen_policy_documents')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
    setPolicies((data || []) as PolicyDocument[])
    setLoading(false)
  }, [siteId])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm({ title: 'Política Energética', version: '1.0', effective_date: '', review_due_date: '', content: '', communication_evidence: '' })
    setShowForm(true)
  }

  function openEdit(policy: PolicyDocument) {
    setEditing(policy)
    setForm({
      title: policy.title,
      version: policy.version || '',
      effective_date: policy.effective_date || '',
      review_due_date: policy.review_due_date || '',
      content: policy.content || '',
      communication_evidence: policy.communication_evidence || '',
    })
    setShowForm(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      site_id: siteId,
      title: form.title,
      version: form.version || null,
      effective_date: form.effective_date || null,
      review_due_date: form.review_due_date || null,
      content: form.content,
      communication_evidence: form.communication_evidence || null,
      content_origin: 'user_original' as const,
      updated_at: new Date().toISOString(),
    }
    if (editing) {
      await supabase.from('sgen_policy_documents').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('sgen_policy_documents').insert({ ...payload, status: 'draft' })
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function handleActivate(policy: PolicyDocument) {
    const currentActive = policies.find((p) => p.status === 'active')
    if (currentActive) {
      await supabase.from('sgen_policy_documents').update({ status: 'superseded' }).eq('id', currentActive.id)
    }
    await supabase.from('sgen_policy_documents').update({
      status: 'active',
      effective_date: policy.effective_date || new Date().toISOString().split('T')[0],
    }).eq('id', policy.id)
    load()
  }

  async function handleSupersede(policy: PolicyDocument) {
    await supabase.from('sgen_policy_documents').update({ status: 'superseded' }).eq('id', policy.id)
    load()
  }

  if (loading) return <div className="py-12 text-center text-sm text-slate-400">Cargando política energética...</div>

  const active = policies.find((p) => p.status === 'active')
  const drafts = policies.filter((p) => p.status === 'draft')
  const history = policies.filter((p) => p.status === 'superseded')

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Liderazgo energético</p>
          <h2 className="text-lg font-black text-slate-950">Política Energética</h2>
        </div>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>Nueva versión</Button>
      </div>

      {policies.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={44} strokeWidth={1.5} />}
          title="Sin política definida"
          description="Documenta los compromisos de la organización con la gestión de energía. La política es la base del sistema de gestión."
          action={<Button size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>Crear política</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            {active && (
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Política vigente</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {active.version && <Badge variant="ok" size="sm">v{active.version}</Badge>}
                    <button onClick={() => openEdit(active)} className="rounded-lg border border-emerald-200 bg-white p-1.5 text-slate-500 hover:text-slate-700">
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>
                <h3 className="text-base font-black text-slate-950">{active.title}</h3>
                {active.content && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{active.content}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                  {active.effective_date && <span>Vigente desde: <strong className="text-slate-700">{fmt(active.effective_date)}</strong></span>}
                  {active.review_due_date && <span>Revisar antes de: <strong className={new Date(active.review_due_date) < new Date() ? 'text-rose-600' : 'text-slate-700'}>{fmt(active.review_due_date)}</strong></span>}
                </div>
                {active.communication_evidence && (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3 text-xs text-slate-600">
                    <span className="font-bold text-slate-500">Evidencia de comunicación: </span>{active.communication_evidence}
                  </div>
                )}
                <div className="mt-3">
                  <button onClick={() => handleSupersede(active)} className="text-xs text-slate-400 underline hover:text-slate-600">
                    Marcar como reemplazada
                  </button>
                </div>
              </div>
            )}

            {drafts.map((draft) => (
              <Card key={draft.id} padding="md" className="rounded-2xl border-slate-200">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-slate-400" />
                    <Badge variant="neutral" size="sm">{statusLabel[draft.status]}</Badge>
                    {draft.version && <span className="text-xs text-slate-400">v{draft.version}</span>}
                  </div>
                  <button onClick={() => openEdit(draft)} className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-slate-700">
                    <Pencil size={13} />
                  </button>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{draft.title}</h3>
                {draft.content && <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-500">{draft.content}</p>}
                <div className="mt-3">
                  <Button size="sm" leftIcon={<Zap size={13} />} onClick={() => handleActivate(draft)}>
                    Activar como vigente
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <Card padding="md" className="rounded-2xl border-slate-200">
              <div className="mb-3 flex items-center gap-2">
                <History size={14} className="text-slate-400" />
                <h3 className="text-sm font-black text-slate-950">Historial de versiones</h3>
              </div>
              {history.length === 0 ? (
                <p className="text-xs text-slate-400">No hay versiones anteriores.</p>
              ) : (
                <div className="space-y-2">
                  {history.map((doc) => (
                    <div key={doc.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-600">{doc.title}</p>
                          <p className="text-[11px] text-slate-400">
                            {doc.version && `v${doc.version} · `}{doc.effective_date ? fmt(doc.effective_date) : fmt(doc.created_at)}
                          </p>
                        </div>
                        <Badge variant={statusVariant[doc.status] || 'neutral'} size="sm">{statusLabel[doc.status] || doc.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card padding="md" className="rounded-2xl border-slate-200">
              <h3 className="mb-3 text-sm font-black text-slate-950">Guía de compromisos</h3>
              <ul className="space-y-2 text-xs leading-5 text-slate-500">
                {[
                  'Compromiso de mejorar el desempeño energético de forma continua.',
                  'Apoyo para proveer los recursos necesarios.',
                  'Cumplimiento de requisitos legales y otros requisitos aplicables.',
                  'Soporte a la adquisición de productos y servicios energéticamente eficientes.',
                  'Comunicación a toda la organización.',
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[10px] text-slate-400">Redacta la política con el lenguaje de tu organización. No copies texto de normas.</p>
            </Card>
          </div>
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar política' : 'Nueva versión de política'} size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Título" required className="sm:col-span-2">
              <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Versión">
              <input className={inputClass} value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="1.0" />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Fecha de vigencia">
              <input className={inputClass} type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} />
            </Field>
            <Field label="Fecha de revisión programada">
              <input className={inputClass} type="date" value={form.review_due_date} onChange={(e) => setForm({ ...form, review_due_date: e.target.value })} />
            </Field>
          </div>
          <Field label="Contenido de la política" required>
            <textarea
              className={`${inputClass} min-h-[180px] resize-none`}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Escribe los compromisos energéticos de tu organización con tus propias palabras: mejora continua del desempeño, provisión de recursos, cumplimiento legal, compras eficientes, etc."
            />
          </Field>
          <Field label="Evidencia de comunicación">
            <textarea
              className={`${inputClass} min-h-[72px] resize-none`}
              value={form.communication_evidence}
              onChange={(e) => setForm({ ...form, communication_evidence: e.target.value })}
              placeholder="Ej: Publicada en intranet, presentada en reunión general del 15 ene, colocada en tableros de producción y utilidades."
            />
          </Field>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.title || !form.content} leftIcon={<CheckCircle2 size={14} />}>
              {editing ? 'Guardar' : 'Crear borrador'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function fmt(val: string) {
  return new Date(val).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}
