import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { supabase } from '@/services/supabase'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { Card } from '@/shared/Card'
import { EmptyState } from '@/shared/EmptyState'
import { Modal } from '@/shared/Modal'
import { getUtilityLabel } from '@/shared/OperationalContext'
import { AlertTriangle, CheckCircle2, Lightbulb, Plus, TrendingDown, TrendingUp } from 'lucide-react'

interface RiskOpportunity {
  id: string
  type: 'risk' | 'opportunity'
  title: string
  description: string | null
  source: string | null
  utility: string | null
  probability: 'low' | 'medium' | 'high' | null
  impact: 'low' | 'medium' | 'high' | null
  priority: string | null
  climate_action_related: boolean
  treatment_plan: string | null
  residual_probability: 'low' | 'medium' | 'high' | null
  residual_impact: 'low' | 'medium' | 'high' | null
  review_date: string | null
  linked_improvement_id: string | null
  status: 'open' | 'in_progress' | 'closed'
  created_at: string
}

interface Improvement {
  id: string
  title: string
  status: string
  priority: string
}

interface Props { siteId: string }

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] font-bold text-slate-500">{label}</span>
      {children}
    </label>
  )
}

const levelLabel: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta' }

function riskLevel(prob: string | null, imp: string | null): 'low' | 'medium' | 'high' {
  const p = { low: 1, medium: 2, high: 3 }[prob || 'low'] || 1
  const i = { low: 1, medium: 2, high: 3 }[imp || 'low'] || 1
  const score = p * i
  if (score <= 2) return 'low'
  if (score <= 6) return 'medium'
  return 'high'
}

const levelColor: Record<string, string> = {
  low: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  medium: 'bg-amber-50 border-amber-200 text-amber-800',
  high: 'bg-rose-50 border-rose-200 text-rose-800',
}
const matrixColor: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-rose-100 text-rose-700',
}

const PROB_LEVELS = ['high', 'medium', 'low'] as const
const IMP_LEVELS = ['low', 'medium', 'high'] as const

export function RisksView({ siteId }: Props) {
  const [items, setItems] = useState<RiskOpportunity[]>([])
  const [improvements, setImprovements] = useState<Improvement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'risk' | 'opportunity'>('all')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    type: 'risk' as 'risk' | 'opportunity',
    title: '',
    description: '',
    source: '',
    utility: '',
    probability: 'medium' as 'low' | 'medium' | 'high',
    impact: 'medium' as 'low' | 'medium' | 'high',
    climate_action_related: false,
    treatment_plan: '',
    residual_probability: 'low' as 'low' | 'medium' | 'high',
    residual_impact: 'low' as 'low' | 'medium' | 'high',
    review_date: '',
    linked_improvement_id: '',
  })

  const load = useCallback(async () => {
    const [{ data: risks }, { data: imprs }] = await Promise.all([
      supabase.from('sgen_risks_opportunities').select('*').eq('site_id', siteId).order('created_at', { ascending: false }),
      supabase.from('energy_improvements').select('id,title,status,priority').eq('site_id', siteId).neq('status', 'cancelled').order('title'),
    ])
    setItems((risks || []) as RiskOpportunity[])
    setImprovements((imprs || []) as Improvement[])
    setLoading(false)
  }, [siteId])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    setSaving(true)
    await supabase.from('sgen_risks_opportunities').insert({
      site_id: siteId,
      type: form.type,
      title: form.title,
      description: form.description || null,
      source: form.source || null,
      utility: form.utility || null,
      probability: form.probability,
      impact: form.impact,
      climate_action_related: form.climate_action_related,
      treatment_plan: form.treatment_plan || null,
      residual_probability: form.treatment_plan ? form.residual_probability : null,
      residual_impact: form.treatment_plan ? form.residual_impact : null,
      review_date: form.review_date || null,
      linked_improvement_id: form.linked_improvement_id || null,
      status: 'open',
      content_origin: 'user_original',
    })
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function handleAdvanceStatus(id: string, newStatus: 'in_progress' | 'closed') {
    await supabase.from('sgen_risks_opportunities').update({ status: newStatus }).eq('id', id)
    load()
  }

  const filtered = items.filter((item) => filter === 'all' || item.type === filter)
  const risks = items.filter((i) => i.type === 'risk')
  const opportunities = items.filter((i) => i.type === 'opportunity')

  if (loading) return <div className="py-12 text-center text-sm text-slate-400">Cargando registro de riesgos...</div>

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contexto y planificación</p>
          <h2 className="text-lg font-black text-slate-950">Riesgos y Oportunidades</h2>
        </div>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowForm(true)}>Registrar</Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle size={44} strokeWidth={1.5} />}
          title="Sin registros"
          description="Identifica factores externos e internos que pueden afectar el desempeño energético o crear oportunidades de mejora."
          action={<Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowForm(true)}>Agregar primero</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[300px_1fr]">
          {/* Matrix */}
          <Card padding="md" className="rounded-2xl border-slate-200">
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Mapa probabilidad × impacto</p>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 text-center">Impacto →</div>
            <div className="grid grid-cols-[40px_1fr_1fr_1fr] gap-1">
              <div />
              {IMP_LEVELS.map((imp) => (
                <div key={imp} className="text-center text-[10px] font-bold uppercase text-slate-400">{levelLabel[imp]}</div>
              ))}
              {PROB_LEVELS.map((prob) => (
                <>
                  <div key={`label-${prob}`} className="flex items-center justify-center text-[10px] font-bold uppercase text-slate-400" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    {levelLabel[prob]}
                  </div>
                  {IMP_LEVELS.map((imp) => {
                    const level = riskLevel(prob, imp)
                    const count = risks.filter((r) => r.probability === prob && r.impact === imp && r.status !== 'closed').length
                    const oppCount = opportunities.filter((o) => o.probability === prob && o.impact === imp && o.status !== 'closed').length
                    return (
                      <div key={`${prob}-${imp}`} className={`rounded-lg ${matrixColor[level]} flex flex-col items-center justify-center py-3 text-center`}>
                        {count > 0 && <span className="text-xs font-black">{count}R</span>}
                        {oppCount > 0 && <span className="text-xs font-black text-emerald-600">{oppCount}O</span>}
                        {count === 0 && oppCount === 0 && <span className="text-[10px] opacity-40">—</span>}
                      </div>
                    )
                  })}
                </>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-slate-400 text-center">R = riesgo · O = oportunidad (abiertos)</p>

            <div className="mt-4 border-t border-slate-100 pt-3 space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <TrendingDown size={12} className="text-rose-400" />
                <span>{risks.filter((r) => r.status !== 'closed').length} riesgos abiertos</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <TrendingUp size={12} className="text-emerald-500" />
                <span>{opportunities.filter((o) => o.status !== 'closed').length} oportunidades abiertas</span>
              </div>
              {items.some((i) => i.climate_action_related) && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">Clima</span>
                  <span>{items.filter((i) => i.climate_action_related).length} relacionados con clima</span>
                </div>
              )}
            </div>
          </Card>

          {/* Register */}
          <div className="space-y-4">
            <div className="flex gap-1">
              {(['all', 'risk', 'opportunity'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={[
                    'rounded-lg border px-3 py-1.5 text-xs font-bold transition',
                    filter === f ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-200 bg-white text-slate-500 hover:text-slate-700',
                  ].join(' ')}
                >
                  {f === 'all' ? 'Todos' : f === 'risk' ? 'Riesgos' : 'Oportunidades'}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-slate-400">No hay registros con este filtro.</p>
            ) : (
              <div className="space-y-3">
                {filtered.map((item) => {
                  const level = riskLevel(item.probability, item.impact)
                  const isRisk = item.type === 'risk'
                  return (
                    <div key={item.id} className={`rounded-2xl border p-4 ${item.status === 'closed' ? 'border-slate-100 bg-slate-50 opacity-60' : 'border-slate-200 bg-white'}`}>
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {isRisk
                            ? <AlertTriangle size={15} className="text-rose-400" />
                            : <Lightbulb size={15} className="text-emerald-500" />
                          }
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${levelColor[level]}`}>
                            {isRisk ? 'Riesgo' : 'Oportunidad'} · {levelLabel[level]}
                          </span>
                          {item.climate_action_related && <Badge variant="info" size="sm">Clima</Badge>}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Badge variant={item.status === 'closed' ? 'neutral' : item.status === 'in_progress' ? 'info' : 'warn'} size="sm">
                            {item.status === 'open' ? 'Abierto' : item.status === 'in_progress' ? 'En tratamiento' : 'Cerrado'}
                          </Badge>
                          {item.status === 'open' && (
                            <Button size="xs" variant="secondary" onClick={() => handleAdvanceStatus(item.id, 'in_progress')}>Iniciar tratamiento</Button>
                          )}
                          {item.status === 'in_progress' && (
                            <Button size="xs" variant="secondary" onClick={() => handleAdvanceStatus(item.id, 'closed')}>Cerrar</Button>
                          )}
                        </div>
                      </div>

                      <p className="text-sm font-bold text-slate-900">{item.title}</p>
                      {item.description && <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>}

                      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-400">
                        {item.probability && <span>Prob: <strong className="text-slate-600">{levelLabel[item.probability]}</strong></span>}
                        {item.impact && <span>Impacto: <strong className="text-slate-600">{levelLabel[item.impact]}</strong></span>}
                        {item.utility && <span>Energético: <strong className="text-slate-600">{getUtilityLabel(item.utility)}</strong></span>}
                        {item.source && <span>Fuente: <strong className="text-slate-600">{item.source}</strong></span>}
                        {item.review_date && <span>Próx. revisión: <strong className={new Date(item.review_date) < new Date() ? 'text-rose-600' : 'text-slate-600'}>{fmt(item.review_date)}</strong></span>}
                      </div>

                      {item.treatment_plan && (
                        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs leading-5 text-slate-600">
                          <span className="font-bold text-slate-500">Plan de tratamiento: </span>{item.treatment_plan}
                          {(item.residual_probability || item.residual_impact) && (
                            <span className="ml-2 text-slate-400">
                              → Residual: prob {levelLabel[item.residual_probability || 'low']}, impacto {levelLabel[item.residual_impact || 'low']}
                            </span>
                          )}
                        </div>
                      )}

                      {item.linked_improvement_id && (() => {
                        const imp = improvements.find((i) => i.id === item.linked_improvement_id)
                        return imp ? (
                          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold">Acción vinculada:</span>
                            <span className="font-semibold text-slate-700">{imp.title}</span>
                            <Badge variant={imp.status === 'closed' ? 'ok' : 'info'} size="sm">{imp.status}</Badge>
                          </div>
                        ) : null
                      })()}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Registrar riesgo u oportunidad" size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Tipo">
              <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'risk' | 'opportunity' })}>
                <option value="risk">Riesgo</option>
                <option value="opportunity">Oportunidad</option>
              </select>
            </Field>
            <Field label="Energético afectado">
              <select className={inputClass} value={form.utility} onChange={(e) => setForm({ ...form, utility: e.target.value })}>
                <option value="">General / no específico</option>
                {['electricity', 'natural_gas', 'steam', 'compressed_air', 'chilled_water', 'diesel', 'water'].map((u) => (
                  <option key={u} value={u}>{getUtilityLabel(u)}</option>
                ))}
              </select>
            </Field>
            <Field label="Título" className="sm:col-span-2">
              <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={form.type === 'risk' ? 'Ej. Incremento de tarifa eléctrica en horario punta' : 'Ej. Sustitución de iluminación por LED en almacén'} />
            </Field>
            <Field label="Descripción" className="sm:col-span-2">
              <textarea className={`${inputClass} min-h-[80px] resize-none`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Explica el contexto, cómo se identificó y qué parte del sistema afecta." />
            </Field>
            <Field label="Fuente de identificación">
              <input className={inputClass} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Auditoría, revisión energética, cambio regulatorio..." />
            </Field>
            <Field label="Fecha de revisión programada">
              <input className={inputClass} type="date" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} />
            </Field>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Probabilidad × Impacto (inherente)</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Probabilidad de ocurrencia">
                <select className={inputClass} value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value as typeof form.probability })}>
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </Field>
              <Field label="Impacto en desempeño energético">
                <select className={inputClass} value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value as typeof form.impact })}>
                  <option value="low">Bajo</option>
                  <option value="medium">Medio</option>
                  <option value="high">Alto</option>
                </select>
              </Field>
            </div>
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${levelColor[riskLevel(form.probability, form.impact)]}`}>
                Nivel resultante: {['Bajo', 'Medio', 'Alto'][['low', 'medium', 'high'].indexOf(riskLevel(form.probability, form.impact))]}
              </span>
            </div>
          </div>

          <Field label="Plan de tratamiento">
            <textarea
              className={`${inputClass} min-h-[88px] resize-none`}
              value={form.treatment_plan}
              onChange={(e) => setForm({ ...form, treatment_plan: e.target.value })}
              placeholder={form.type === 'risk' ? 'Acciones para reducir probabilidad o impacto: contrato de precio fijo, capacitor bank, programa de respuesta a la demanda...' : 'Acciones para capitalizar la oportunidad: solicitud de presupuesto, estudio de factibilidad, piloto...'}
            />
          </Field>

          {form.treatment_plan && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Riesgo residual (después del tratamiento)</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Probabilidad residual">
                  <select className={inputClass} value={form.residual_probability} onChange={(e) => setForm({ ...form, residual_probability: e.target.value as typeof form.residual_probability })}>
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </Field>
                <Field label="Impacto residual">
                  <select className={inputClass} value={form.residual_impact} onChange={(e) => setForm({ ...form, residual_impact: e.target.value as typeof form.residual_impact })}>
                    <option value="low">Bajo</option>
                    <option value="medium">Medio</option>
                    <option value="high">Alto</option>
                  </select>
                </Field>
              </div>
            </div>
          )}

          <Field label="Acción de mejora vinculada (Acciones / Proyectos)">
            <select
              className={inputClass}
              value={form.linked_improvement_id}
              onChange={(e) => setForm({ ...form, linked_improvement_id: e.target.value })}
            >
              <option value="">Sin acción vinculada</option>
              {improvements.map((imp) => (
                <option key={imp.id} value={imp.id}>
                  {imp.title} [{imp.status}]
                </option>
              ))}
            </select>
          </Field>

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={form.climate_action_related} onChange={(e) => setForm({ ...form, climate_action_related: e.target.checked })} />
            Relacionado con acción climática / descarbonización
          </label>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.title} leftIcon={<CheckCircle2 size={14} />}>
              Registrar
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
