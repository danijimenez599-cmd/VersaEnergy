import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { supabase } from '@/services/supabase'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { Card } from '@/shared/Card'
import { EmptyState } from '@/shared/EmptyState'
import { Modal } from '@/shared/Modal'
import {
  CheckCircle2, ChevronDown, ChevronUp, Package,
  Plus, UserCheck, X, Zap,
} from 'lucide-react'

interface Decision {
  decision: string
  owner: string
  due_date: string
}

interface ManagementReview {
  id: string
  title: string
  period_start: string | null
  period_end: string | null
  meeting_date: string | null
  attendees: string[] | null
  energy_performance_summary: string | null
  objectives_status: string | null
  actions_projects_status: string | null
  audit_results: string | null
  risks_opportunities_status: string | null
  resource_needs: string | null
  decisions: Decision[]
  follow_up_deadline: string | null
  status: string
  created_at: string
}

interface Props { siteId: string }

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

function Field({
  label, children, hint, className = '', fromSystem = false,
}: {
  label: string; children: ReactNode; hint?: string; className?: string; fromSystem?: boolean
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 flex items-center gap-2 text-[11px] font-bold text-slate-500">
        {label}
        {fromSystem && (
          <span className="rounded-full bg-brand-blue/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-brand-blue">
            Sistema
          </span>
        )}
      </span>
      {hint && <span className="mb-1 block text-[10px] text-slate-400">{hint}</span>}
      {children}
    </label>
  )
}

const statusLabel: Record<string, string> = { draft: 'Borrador', completed: 'Completada', approved: 'Aprobada' }
const statusVariant: Record<string, 'neutral' | 'ok'> = { draft: 'neutral', completed: 'ok', approved: 'ok' }

export function DirectionView({ siteId }: Props) {
  const [reviews, setReviews] = useState<ManagementReview[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [building, setBuilding] = useState(false)
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set())

  const emptyForm = () => ({
    title: `Revisión de dirección ${new Date().getFullYear()} — T${Math.ceil((new Date().getMonth() + 1) / 3)}`,
    period_start: '', period_end: '', meeting_date: '',
    attendees: '',
    energy_performance_summary: '',
    objectives_status: '',
    actions_projects_status: '',
    audit_results: '',
    risks_opportunities_status: '',
    resource_needs: '',
    follow_up_deadline: '',
    status: 'draft' as const,
  })

  const [form, setForm] = useState(emptyForm())
  const [decisions, setDecisions] = useState<Decision[]>([{ decision: '', owner: '', due_date: '' }])

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('sgen_management_reviews')
      .select('*')
      .eq('site_id', siteId)
      .order('meeting_date', { ascending: false })
    setReviews(((data || []) as ManagementReview[]).map((r) => ({
      ...r,
      decisions: Array.isArray(r.decisions) ? r.decisions : [],
    })))
    setLoading(false)
  }, [siteId])

  useEffect(() => { load() }, [load])

  // ── Auto-package builder ─────────────────────────────────────────────────────
  async function handleBuildPackage() {
    setBuilding(true)
    try {
      const [
        { data: enpis },
        { data: objectives },
        { data: improvements },
        { data: ncs },
        { data: audits },
        { data: risks },
        { data: latestReviews },
        { data: evidence },
      ] = await Promise.all([
        supabase.from('energy_enpis').select('name,unit').eq('site_id', siteId).eq('is_active', true),
        supabase.from('sgen_objectives').select('name,status').eq('site_id', siteId),
        supabase.from('energy_improvements').select('title,status,actual_energy_savings,savings_unit,priority').eq('site_id', siteId).neq('status', 'cancelled').order('updated_at', { ascending: false }).limit(20),
        supabase.from('sgen_nonconformities').select('description,severity,status,due_date').eq('site_id', siteId),
        supabase.from('sgen_audits').select('title,status,actual_date,questions').eq('site_id', siteId).order('created_at', { ascending: false }).limit(4),
        supabase.from('sgen_risks_opportunities').select('type,title,status,probability,impact').eq('site_id', siteId).neq('status', 'closed'),
        supabase.from('sgen_energy_reviews').select('period_start,period_end,summary,data_quality_score').eq('site_id', siteId).order('created_at', { ascending: false }).limit(1),
        supabase.from('sgen_evidence').select('title,domain,captured_at').eq('site_id', siteId).order('captured_at', { ascending: false }).limit(8),
      ])

      const rev = latestReviews?.[0]
      const filledFields = new Set<string>()

      // ── Energy performance summary
      const perfLines: string[] = []
      if (rev) {
        perfLines.push(`Revisión energética más reciente: ${fmt(rev.period_start || '')} – ${fmt(rev.period_end || '')}`)
        if (rev.data_quality_score != null) perfLines.push(`Calidad de datos: ${rev.data_quality_score}%`)
        if (rev.summary) perfLines.push(`\nHallazgos del periodo:\n${rev.summary}`)
      } else {
        perfLines.push('Sin revisión energética documentada en el periodo.')
      }
      if (enpis?.length) perfLines.push(`\nEnPIs activos: ${enpis.map((e) => `${e.name} (${e.unit})`).join(', ')}`)
      filledFields.add('energy_performance_summary')

      // ── Objectives status
      const objLines: string[] = []
      if (objectives?.length) {
        const active = objectives.filter((o) => o.status === 'active')
        const achieved = objectives.filter((o) => o.status === 'achieved')
        const cancelled = objectives.filter((o) => o.status === 'cancelled')
        objLines.push(`Total objetivos energéticos: ${objectives.length}`)
        if (active.length) objLines.push(`  · Activos: ${active.map((o) => o.name).join(', ')}`)
        if (achieved.length) objLines.push(`  · Alcanzados: ${achieved.map((o) => o.name).join(', ')}`)
        if (cancelled.length) objLines.push(`  · Cancelados: ${cancelled.length}`)
      } else {
        objLines.push('Sin objetivos energéticos registrados.')
      }
      filledFields.add('objectives_status')

      // ── Actions / projects status
      const actLines: string[] = []
      if (improvements?.length) {
        const closed = improvements.filter((i) => i.status === 'closed')
        const open = improvements.filter((i) => i.status !== 'closed')
        const highOpen = open.filter((i) => i.priority === 'high')
        actLines.push(`Acciones de mejora: ${improvements.length} total (${closed.length} cerradas, ${open.length} en progreso)`)
        const withSavings = closed.filter((i) => i.actual_energy_savings)
        if (withSavings.length) {
          actLines.push(`\nAhorros verificados:`)
          withSavings.forEach((i) => actLines.push(`  · ${i.title}: ${i.actual_energy_savings} ${i.savings_unit || ''}`))
        }
        if (highOpen.length) actLines.push(`\nAcciones de alta prioridad pendientes: ${highOpen.map((i) => i.title).join(', ')}`)
      } else {
        actLines.push('Sin acciones de mejora registradas.')
      }
      filledFields.add('actions_projects_status')

      // ── Audit results
      const auditLines: string[] = []
      if (audits?.length) {
        auditLines.push(`Auditorías internas (últimas ${audits.length}):`)
        audits.forEach((a) => {
          const qs = Array.isArray(a.questions) ? a.questions : []
          const done = qs.filter((q: { result?: string }) => q.result).length
          const gaps = qs.filter((q: { result?: string }) => q.result === 'gap').length
          auditLines.push(`  · ${a.title}: ${a.status}${a.actual_date ? ` — ${fmt(a.actual_date)}` : ''} | ${done}/${qs.length} preguntas respondidas${gaps > 0 ? `, ${gaps} GAP(s)` : ''}`)
        })
      } else {
        auditLines.push('Sin auditorías internas registradas.')
      }
      if (ncs?.length) {
        const openNcs = ncs.filter((nc) => nc.status !== 'closed')
        const closedNcs = ncs.filter((nc) => nc.status === 'closed')
        auditLines.push(`\nNo conformidades: ${ncs.length} total (${openNcs.length} abiertas, ${closedNcs.length} cerradas)`)
        const overdue = openNcs.filter((nc) => nc.due_date && new Date(nc.due_date) < new Date())
        if (overdue.length) auditLines.push(`  ⚠ Vencidas: ${overdue.map((nc) => nc.description.slice(0, 60)).join('; ')}`)
      }
      filledFields.add('audit_results')

      // ── Risks & opportunities status
      const riskLines: string[] = []
      if (risks?.length) {
        const riskItems = risks.filter((r) => r.type === 'risk')
        const oppItems = risks.filter((r) => r.type === 'opportunity')
        riskLines.push(`Riesgos activos: ${riskItems.length} | Oportunidades activas: ${oppItems.length}`)
        const critRisks = riskItems.filter((r) => r.probability === 'high' && r.impact === 'high')
        if (critRisks.length) riskLines.push(`  ⚠ Riesgos de nivel alto: ${critRisks.map((r) => r.title).join(', ')}`)
        if (oppItems.length) riskLines.push(`  Oportunidades pendientes de capitalizar: ${oppItems.map((r) => r.title).join(', ')}`)
      } else {
        riskLines.push('Sin riesgos u oportunidades activos registrados.')
      }
      if (evidence?.length) {
        riskLines.push(`\nEvidencia reciente documentada: ${evidence.map((e) => e.title).slice(0, 4).join(', ')}`)
      }
      filledFields.add('risks_opportunities_status')

      setAutoFilledFields(filledFields)
      setForm((f) => ({
        ...f,
        period_start: rev?.period_start || '',
        period_end: rev?.period_end || '',
        meeting_date: new Date().toISOString().split('T')[0],
        energy_performance_summary: perfLines.join('\n'),
        objectives_status: objLines.join('\n'),
        actions_projects_status: actLines.join('\n'),
        audit_results: auditLines.join('\n'),
        risks_opportunities_status: riskLines.join('\n'),
      }))
      setShowForm(true)
    } finally {
      setBuilding(false)
    }
  }

  function addDecision() {
    setDecisions([...decisions, { decision: '', owner: '', due_date: '' }])
  }

  function updateDecision(index: number, field: keyof Decision, value: string) {
    setDecisions(decisions.map((d, i) => (i === index ? { ...d, [field]: value } : d)))
  }

  function removeDecision(index: number) {
    setDecisions(decisions.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true)
    const validDecisions = decisions.filter((d) => d.decision.trim())
    await supabase.from('sgen_management_reviews').insert({
      site_id: siteId,
      title: form.title,
      period_start: form.period_start || null,
      period_end: form.period_end || null,
      meeting_date: form.meeting_date || null,
      attendees: form.attendees ? form.attendees.split(',').map((s) => s.trim()).filter(Boolean) : [],
      energy_performance_summary: form.energy_performance_summary || null,
      objectives_status: form.objectives_status || null,
      actions_projects_status: form.actions_projects_status || null,
      audit_results: form.audit_results || null,
      risks_opportunities_status: form.risks_opportunities_status || null,
      resource_needs: form.resource_needs || null,
      decisions: validDecisions,
      follow_up_deadline: form.follow_up_deadline || null,
      status: form.status,
      content_origin: 'user_original',
    })
    setSaving(false)
    setShowForm(false)
    setAutoFilledFields(new Set())
    setDecisions([{ decision: '', owner: '', due_date: '' }])
    setForm(emptyForm())
    load()
  }

  async function handleComplete(review: ManagementReview) {
    await supabase.from('sgen_management_reviews').update({ status: 'completed' }).eq('id', review.id)
    load()
  }

  if (loading) return <div className="py-12 text-center text-sm text-slate-400">Cargando revisiones de dirección...</div>

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Liderazgo energético</p>
          <h2 className="text-lg font-black text-slate-950">Revisión por la Dirección</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Package size={14} />}
            onClick={handleBuildPackage}
            loading={building}
          >
            Preparar paquete automático
          </Button>
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => { setForm(emptyForm()); setAutoFilledFields(new Set()); setShowForm(true) }}>
            Nueva revisión
          </Button>
        </div>
      </div>

      {/* Auto-package explainer */}
      <div className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 px-4 py-3 text-sm text-brand-blue">
        <span className="font-bold">Paquete automático:</span> el sistema consolida la última revisión energética, estado de objetivos, proyectos, auditorías, no conformidades y riesgos en borrador listo para que la dirección revise. Solo ajusta y añade las decisiones.
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          icon={<UserCheck size={44} strokeWidth={1.5} />}
          title="Sin revisiones de dirección"
          description="Usa 'Preparar paquete automático' para generar el primer borrador con toda la información del sistema consolidada."
          action={<Button size="sm" leftIcon={<Zap size={14} />} loading={building} onClick={handleBuildPackage}>Preparar paquete</Button>}
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} padding="md" className="rounded-2xl border-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant[review.status] || 'neutral'} size="sm">
                      {statusLabel[review.status] || review.status}
                    </Badge>
                    {review.meeting_date && <span className="text-xs text-slate-400">Reunión: {fmt(review.meeting_date)}</span>}
                    {review.period_start && review.period_end && (
                      <span className="text-xs text-slate-400">Periodo: {fmt(review.period_start)} – {fmt(review.period_end)}</span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{review.title}</h3>
                  {review.attendees?.length ? (
                    <p className="mt-1 text-xs text-slate-500">Asistentes: {review.attendees.join(', ')}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-400">
                    {review.decisions.filter((d) => d.decision).length} decisiones ·{' '}
                    {review.follow_up_deadline ? `Seguimiento: ${fmt(review.follow_up_deadline)}` : 'Sin fecha de seguimiento'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {review.status === 'draft' && (
                    <Button size="xs" variant="secondary" onClick={() => handleComplete(review)}>Completar</Button>
                  )}
                  <button
                    onClick={() => setExpanded(expanded === review.id ? null : review.id)}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-slate-700"
                  >
                    {expanded === review.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {expanded === review.id && (
                <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {review.energy_performance_summary && <SectionBlock label="Desempeño energético" text={review.energy_performance_summary} />}
                    {review.objectives_status && <SectionBlock label="Estado de objetivos" text={review.objectives_status} />}
                    {review.actions_projects_status && <SectionBlock label="Proyectos y acciones" text={review.actions_projects_status} />}
                    {review.audit_results && <SectionBlock label="Resultados de auditoría y NCs" text={review.audit_results} />}
                    {review.risks_opportunities_status && <SectionBlock label="Riesgos y oportunidades" text={review.risks_opportunities_status} />}
                    {review.resource_needs && <SectionBlock label="Necesidades de recursos" text={review.resource_needs} />}
                  </div>
                  {review.decisions.filter((d) => d.decision).length > 0 && (
                    <div>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Decisiones tomadas</p>
                      <div className="space-y-2">
                        {review.decisions.filter((d) => d.decision).map((dec, i) => (
                          <div key={i} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="text-sm font-semibold text-slate-700">{dec.decision}</p>
                            <div className="flex shrink-0 flex-col items-end gap-0.5 text-[11px] text-slate-400">
                              {dec.owner && <span>{dec.owner}</span>}
                              {dec.due_date && <span>{fmt(dec.due_date)}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setAutoFilledFields(new Set()) }}
        title={autoFilledFields.size > 0 ? 'Paquete de revisión directiva — revisa y ajusta' : 'Nueva revisión de dirección'}
        size="xl"
      >
        <div className="space-y-5">
          {autoFilledFields.size > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <span className="font-bold">✓ Datos tomados del sistema.</span> Las secciones marcadas con <span className="rounded-full bg-brand-blue/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-brand-blue">Sistema</span> se llenaron automáticamente. Revisa, complementa y agrega las decisiones.
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Título" className="sm:col-span-2">
              <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Inicio del periodo evaluado">
              <input className={inputClass} type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
            </Field>
            <Field label="Fin del periodo evaluado">
              <input className={inputClass} type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
            </Field>
            <Field label="Fecha de la reunión">
              <input className={inputClass} type="date" value={form.meeting_date} onChange={(e) => setForm({ ...form, meeting_date: e.target.value })} />
            </Field>
            <Field label="Asistentes (separados por coma)">
              <input className={inputClass} value={form.attendees} onChange={(e) => setForm({ ...form, attendees: e.target.value })} placeholder="Gerente General, Ing. Energía, Jefe de Producción" />
            </Field>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Entradas revisadas en la reunión</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Desempeño energético" fromSystem={autoFilledFields.has('energy_performance_summary')} hint="Tendencias de EnPIs, logros vs metas, consumo y costos del periodo">
                <textarea className={`${inputClass} min-h-[100px] resize-none`} value={form.energy_performance_summary} onChange={(e) => setForm({ ...form, energy_performance_summary: e.target.value })} />
              </Field>
              <Field label="Estado de objetivos" fromSystem={autoFilledFields.has('objectives_status')} hint="Avance hacia metas y objetivos energéticos comprometidos">
                <textarea className={`${inputClass} min-h-[100px] resize-none`} value={form.objectives_status} onChange={(e) => setForm({ ...form, objectives_status: e.target.value })} />
              </Field>
              <Field label="Proyectos y acciones de mejora" fromSystem={autoFilledFields.has('actions_projects_status')} hint="Estado de implementación y ahorros verificados">
                <textarea className={`${inputClass} min-h-[100px] resize-none`} value={form.actions_projects_status} onChange={(e) => setForm({ ...form, actions_projects_status: e.target.value })} />
              </Field>
              <Field label="Auditorías y no conformidades" fromSystem={autoFilledFields.has('audit_results')} hint="Hallazgos, brechas, NCs abiertas/cerradas">
                <textarea className={`${inputClass} min-h-[100px] resize-none`} value={form.audit_results} onChange={(e) => setForm({ ...form, audit_results: e.target.value })} />
              </Field>
              <Field label="Riesgos y oportunidades" fromSystem={autoFilledFields.has('risks_opportunities_status')} hint="Cambios en contexto, riesgos activos, oportunidades">
                <textarea className={`${inputClass} min-h-[100px] resize-none`} value={form.risks_opportunities_status} onChange={(e) => setForm({ ...form, risks_opportunities_status: e.target.value })} />
              </Field>
              <Field label="Necesidades de recursos" hint="Personal, equipos, software, medidores, capacitación">
                <textarea className={`${inputClass} min-h-[100px] resize-none`} value={form.resource_needs} onChange={(e) => setForm({ ...form, resource_needs: e.target.value })} placeholder="Qué recursos se necesitan para mantener o mejorar el desempeño." />
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Decisiones y compromisos</p>
              <Button size="xs" variant="secondary" leftIcon={<Plus size={12} />} onClick={addDecision}>Agregar</Button>
            </div>
            <div className="space-y-2">
              {decisions.map((dec, i) => (
                <div key={i} className="grid grid-cols-[1fr_160px_120px_32px] gap-2">
                  <input className={inputClass} placeholder="Decisión o acción comprometida" value={dec.decision} onChange={(e) => updateDecision(i, 'decision', e.target.value)} />
                  <input className={inputClass} placeholder="Responsable" value={dec.owner} onChange={(e) => updateDecision(i, 'owner', e.target.value)} />
                  <input className={inputClass} type="date" value={dec.due_date} onChange={(e) => updateDecision(i, 'due_date', e.target.value)} />
                  {decisions.length > 1 && (
                    <button onClick={() => removeDecision(i)} className="grid place-items-center rounded-lg border border-slate-200 text-slate-400 hover:text-rose-500">
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Fecha límite de seguimiento">
              <input className={inputClass} type="date" value={form.follow_up_deadline} onChange={(e) => setForm({ ...form, follow_up_deadline: e.target.value })} />
            </Field>
            <Field label="Estado">
              <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}>
                <option value="draft">Borrador</option>
                <option value="completed">Completada</option>
                <option value="approved">Aprobada</option>
              </select>
            </Field>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button variant="secondary" onClick={() => { setShowForm(false); setAutoFilledFields(new Set()) }}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.title} leftIcon={<CheckCircle2 size={14} />}>
              Guardar revisión
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function SectionBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="whitespace-pre-line text-xs leading-5 text-slate-600">{text}</p>
    </div>
  )
}

function fmt(val: string) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}
