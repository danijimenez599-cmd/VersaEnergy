import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Crosshair,
  ExternalLink,
  FileCheck2,
  FileSearch,
  FolderKanban,
  Gauge,
  Plus,
  Route,
  Scale,
  SearchCheck,
  ShieldCheck,
  Target,
  UserCheck,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/services/supabase'
import { Badge, utilityBadgeVariant } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { Card } from '@/shared/Card'
import { EmptyState } from '@/shared/EmptyState'
import { Modal } from '@/shared/Modal'
import { getUtilityLabel } from '@/shared/OperationalContext'
import { useUIStore } from '@/store/uiStore'
import { DirectionView } from './views/DirectionView'
import { LegalSettingsView } from './views/LegalSettingsView'
import { PolicyView } from './views/PolicyView'
import { RisksView } from './views/RisksView'
import { ScopeView } from './views/ScopeView'

type WorkspaceTab = 'cockpit' | 'planning' | 'policy' | 'audit' | 'corrective' | 'evidence' | 'risks' | 'direction' | 'scope' | 'legal'
type ModalMode = 'review' | 'seu' | 'objective' | 'audit' | 'nonconformity' | 'evidence' | null

interface EnergyReview {
  id: string
  period_start: string
  period_end: string
  summary: string | null
  data_quality_score: number | null
  total_cost: number | null
  key_findings: unknown
  linked_enpis: string[] | null
  status: string
}

interface SignificantUse {
  id: string
  name: string
  utility: string
  measurement_point_ids: string[] | null
  enpi_id: string | null
  consumption_value: number | null
  cost_value: number | null
  significance_score: number | null
  significance_rationale: string | null
  status: string
}

interface SgenObjective {
  id: string
  name: string
  description: string | null
  enpi_id: string | null
  target_id: string | null
  estimated_savings: number | null
  estimated_investment: number | null
  linked_improvement_id: string | null
  verification_method: string | null
  status: string
}

interface SgenEvidence {
  id: string
  title: string
  description: string | null
  domain: string
  linked_entity_type: string
  linked_entity_id: string
  source_type: string
  status: string
  captured_at: string
}

interface SgenAudit {
  id: string
  title: string
  scope: string | null
  planned_date: string | null
  actual_date: string | null
  questions: AuditQuestion[]
  status: string
}

interface AuditQuestion {
  topic: string
  question: string
  evidence: string
  owner?: string
  result?: 'ok' | 'gap' | 'na'
}

interface AuditFinding {
  id: string
  audit_id: string
  finding_text: string
  severity: string
  linked_nc_id: string | null
  status: string
}

interface Nonconformity {
  id: string
  source: string | null
  description: string
  severity: string
  probable_cause: string | null
  corrective_action: string | null
  due_date: string | null
  verification_of_effectiveness: string | null
  status: string
}

interface Improvement {
  id: string
  title: string
  status: string
  priority: string
  source_enpi_id: string | null
  estimated_energy_savings: number | null
  savings_unit: string | null
  estimated_cost_savings: number | null
}

interface Enpi {
  id: string
  name: string
  utility: string
  unit: string
}

interface MeasurementPoint {
  id: string
  tag: string
  name: string
  utility: string
  quantity: string
  unit: string
}

interface SgenData {
  reviews: EnergyReview[]
  seus: SignificantUse[]
  objectives: SgenObjective[]
  evidence: SgenEvidence[]
  audits: SgenAudit[]
  findings: AuditFinding[]
  nonconformities: Nonconformity[]
  improvements: Improvement[]
  enpis: Enpi[]
  measurementPoints: MeasurementPoint[]
  // counts for maturity (lightweight, no full record load)
  scopeApprovedCount: number
  policyActiveCount: number
  mgmtReviewCount: number
  riskCount: number
}

const emptyData: SgenData = {
  reviews: [],
  seus: [],
  objectives: [],
  evidence: [],
  audits: [],
  findings: [],
  nonconformities: [],
  improvements: [],
  enpis: [],
  measurementPoints: [],
  scopeApprovedCount: 0,
  policyActiveCount: 0,
  mgmtReviewCount: 0,
  riskCount: 0,
}

const tabs: Array<{ id: WorkspaceTab; label: string; icon: ReactNode }> = [
  { id: 'cockpit', label: 'Cockpit', icon: <ShieldCheck size={14} /> },
  { id: 'planning', label: 'Planificación', icon: <Route size={14} /> },
  { id: 'policy', label: 'Política', icon: <FileCheck2 size={14} /> },
  { id: 'risks', label: 'Riesgos', icon: <AlertTriangle size={14} /> },
  { id: 'audit', label: 'Auditoría', icon: <ClipboardCheck size={14} /> },
  { id: 'corrective', label: 'No conformidades', icon: <Wrench size={14} /> },
  { id: 'evidence', label: 'Evidencia', icon: <FileSearch size={14} /> },
  { id: 'direction', label: 'Dirección', icon: <UserCheck size={14} /> },
  { id: 'scope', label: 'Alcance', icon: <Crosshair size={14} /> },
  { id: 'legal', label: 'Legal', icon: <Scale size={14} /> },
]

/** Catálogo original de preguntas de auditoría interna del SGEn.
 *  No reproduce texto de ninguna norma. Preguntas propias orientadas a evidencia objetiva.
 */
const AUDIT_CATALOG: AuditQuestion[] = [
  // ── Contexto y sistema
  { topic: 'Contexto y sistema', question: '¿Los límites del sistema cubren todas las fuentes de energía significativas y se documentaron las exclusiones con justificación?', evidence: 'Documento de alcance aprobado, mapa de fronteras, lista de exclusiones.' },
  { topic: 'Contexto y sistema', question: '¿Los factores externos (tarifas, regulación, clima, mercado) que pueden afectar el desempeño energético están identificados y monitoreados?', evidence: 'Registro de riesgos y oportunidades con seguimiento activo.' },
  { topic: 'Contexto y sistema', question: '¿Las partes interesadas con influencia en el desempeño energético están identificadas y sus requisitos considerados?', evidence: 'Lista de partes interesadas, requisitos legales y contractuales documentados.' },
  // ── Liderazgo y política
  { topic: 'Liderazgo y política', question: '¿La dirección puede demostrar que asigna recursos humanos, técnicos y financieros para el sistema de gestión de energía?', evidence: 'Presupuesto aprobado, roles asignados, registros de capacitación.' },
  { topic: 'Liderazgo y política', question: '¿La política energética contiene compromisos verificables con datos del sistema (no solo declaraciones genéricas)?', evidence: 'Política vigente con versión y fecha, compromisos cuantificables.' },
  { topic: 'Liderazgo y política', question: '¿La política energética está comunicada y es accesible para todo el personal relevante?', evidence: 'Evidencia de comunicación: reuniones, intranet, tableros, correos.' },
  { topic: 'Liderazgo y política', question: '¿Existen roles y responsabilidades formalmente asignadas para la operación y mejora del sistema de gestión de energía?', evidence: 'Organigrama energético o matriz de responsabilidades.' },
  // ── Planificación y riesgos
  { topic: 'Planificación', question: '¿Los riesgos y oportunidades que pueden afectar el desempeño energético están registrados, priorizados y con tratamiento definido?', evidence: 'Registro de riesgos con probabilidad, impacto, plan de tratamiento y estado.' },
  { topic: 'Planificación', question: '¿Las oportunidades identificadas en la revisión energética se convierten en acciones con responsable, fecha y método de verificación?', evidence: 'Acciones/proyectos en el módulo Acciones con estimado de ahorro.' },
  // ── Revisión energética
  { topic: 'Revisión energética', question: '¿La revisión energética documenta consumo y costos por fuente de energía para el periodo evaluado con datos verificables?', evidence: 'Revisión documentada, balances del periodo, fuente de datos declarada.' },
  { topic: 'Revisión energética', question: '¿Las variables relevantes que explican las fluctuaciones de consumo están identificadas por uso (producción, clima, turnos, etc.)?', evidence: 'Lista de variables por SEU, análisis de correlación o tendencias.' },
  { topic: 'Revisión energética', question: '¿La calidad de los datos de medición es suficiente para respaldar las conclusiones de la revisión?', evidence: 'Score de calidad de datos, cobertura de medición, medidores activos.' },
  { topic: 'Revisión energética', question: '¿Las oportunidades de mejora identificadas en la revisión tienen dueño y seguimiento en el sistema?', evidence: 'Acciones derivadas de la revisión con estado actualizado.' },
  // ── Usos significativos (SEUs)
  { topic: 'SEUs', question: '¿Cada uso significativo tiene un criterio documentado que explica por qué fue seleccionado (consumo, costo, variabilidad, criticidad)?', evidence: 'Criterio de significancia por SEU, score justificado.' },
  { topic: 'SEUs', question: '¿Los SEUs tienen medidores o puntos de medición asignados y los datos de consumo son rastreables en el sistema?', evidence: 'Medidores vinculados, lecturas disponibles, calidad de datos por punto.' },
  { topic: 'SEUs', question: '¿Los SEUs tienen criterios operativos definidos: rangos normales, setpoints, condiciones de alarma y procedimientos de reacción?', evidence: 'Criterios de operación documentados en el SEU, procedimientos referenciados.' },
  { topic: 'SEUs', question: '¿Existe un responsable designado y con conocimiento suficiente para cada uso significativo?', evidence: 'Responsable asignado en el SEU, evidencia de capacitación si aplica.' },
  // ── EnPIs, Línea base y metas
  { topic: 'Indicadores y metas', question: '¿Los EnPIs tienen líneas base y metas que permiten cuantificar la mejora de desempeño en el tiempo?', evidence: 'EnPIs activos con baseline, target definido y periodo de referencia.' },
  { topic: 'Indicadores y metas', question: '¿Los resultados de desempeño muestran la tendencia del EnPI vs la línea base para el periodo revisado?', evidence: 'Gráfica o tabla de resultados por periodo, desviación documentada.' },
  { topic: 'Indicadores y metas', question: '¿Los objetivos energéticos están conectados a un EnPI, tienen fecha de cumplimiento y plan de acción vinculado?', evidence: 'Objetivos activos con EnPI, target y acción/proyecto referenciado.' },
  // ── Plan de acción
  { topic: 'Plan de acción', question: '¿Las acciones y proyectos de mejora tienen estimado de ahorro, inversión y método de verificación (M&V)?', evidence: 'Acciones en módulo Acciones con ahorro estimado, inversión y método M&V.' },
  { topic: 'Plan de acción', question: '¿Las acciones completadas documentan el ahorro real verificado vs el estimado?', evidence: 'Acciones cerradas con ahorro real capturado y periodo de monitoreo.' },
  // ── Medición y datos
  { topic: 'Medición y datos', question: '¿Los puntos de medición cubren los SEUs y las variables necesarias para calcular los EnPIs definidos?', evidence: 'Mapa de medición con cobertura de SEUs, lecturas continuas o periódicas.' },
  { topic: 'Medición y datos', question: '¿Los medidores críticos para el cálculo de EnPIs tienen programa de calibración o verificación periódica?', evidence: 'Registros de calibración, fechas, resultados y acción ante desviaciones.' },
  { topic: 'Medición y datos', question: '¿Las pérdidas no medidas en los balances son aceptables y se explican con base en la configuración del sistema?', evidence: 'Balances con unaccounted % documentado, justificación de pérdidas.' },
  // ── Control operacional
  { topic: 'Control operacional', question: '¿Existen criterios de operación para los SEUs y se comunican de manera efectiva a quienes los operan?', evidence: 'Procedimientos, instrucciones, setpoints disponibles para operadores.' },
  { topic: 'Control operacional', question: '¿Las desviaciones operativas significativas de los SEUs se registran y generan acciones correctivas trazables?', evidence: 'Registros de desviación, no conformidades derivadas, seguimiento.' },
  // ── Correcciones y mejora continua
  { topic: 'Correcciones', question: '¿Las no conformidades tienen análisis de causa, acción correctiva, responsable y fecha compromiso?', evidence: 'NCs registradas con causa probable, acción, dueño y fecha.' },
  { topic: 'Correcciones', question: '¿Se verifica la eficacia de las acciones correctivas antes de cerrar la no conformidad?', evidence: 'Verificación de eficacia documentada, evidencia adjunta o referenciada.' },
  // ── Evidencia e información documentada
  { topic: 'Evidencia', question: '¿La evidencia del sistema está organizada, es recuperable y demuestra que el sistema opera conforme a lo planificado?', evidence: 'Snapshots, notas, reportes y archivos clasificados por dominio.' },
  { topic: 'Evidencia', question: '¿Los registros clave (revisión energética, SEUs, auditorías, NCs, decisiones de dirección) están accesibles y actualizados?', evidence: 'Registros con fecha reciente, versionados donde aplica, sin vacíos.' },
  // ── Revisión por la dirección
  { topic: 'Revisión directiva', question: '¿La revisión por la dirección incluye información actualizada sobre desempeño, objetivos, auditorías, NCs y recursos?', evidence: 'Acta de revisión con todas las entradas requeridas y datos del sistema.' },
  { topic: 'Revisión directiva', question: '¿Las decisiones de la revisión directiva tienen responsable, fecha compromiso y mecanismo de seguimiento?', evidence: 'Decisiones registradas con dueño, fecha y estado de seguimiento.' },
]

// Alias para compatibilidad con el checklist (muestra el catálogo completo si un audit no tiene preguntas propias)
const auditTemplate = AUDIT_CATALOG

const domainFlow = [
  { id: 'review', title: 'Revisión energética', detail: 'Consolidar consumo, costos, variables, hallazgos y oportunidades.', icon: <SearchCheck size={18} /> },
  { id: 'seu', title: 'SEUs por medición', detail: 'Priorizar usos por consumo, costo, criticidad y capacidad de mejora.', icon: <Zap size={18} /> },
  { id: 'enpi', title: 'EnPIs y objetivos', detail: 'Conectar indicadores, baseline, targets y responsables.', icon: <Target size={18} /> },
  { id: 'actions', title: 'Acciones verificables', detail: 'Convertir oportunidades y correcciones en planes de mejora.', icon: <FolderKanban size={18} /> },
  { id: 'audit', title: 'Auditoría interna', detail: 'Recolectar evidencia, registrar hallazgos y disparar correcciones.', icon: <ClipboardCheck size={18} /> },
  { id: 'review-mgmt', title: 'Revisión directiva', detail: 'Cerrar decisiones, recursos, riesgos y próximos ciclos.', icon: <UserCheck size={18} /> },
]

export default function SgenPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('cockpit')
  const [modal, setModal] = useState<ModalMode>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SgenData>(emptyData)
  const { selectedSiteId } = useUIStore()

  const load = useCallback(async () => {
    if (!selectedSiteId) {
      setData(emptyData)
      setLoading(false)
      return
    }
    setLoading(true)
    const [
      { data: reviews },
      { data: seus },
      { data: objectives },
      { data: evidence },
      { data: audits },
      { data: nonconformities },
      { data: improvements },
      { data: enpis },
      { data: measurementPoints },
      { count: scopeApprovedCount },
      { count: policyActiveCount },
      { count: mgmtReviewCount },
      { count: riskCount },
    ] = await Promise.all([
      supabase.from('sgen_energy_reviews').select('*').eq('site_id', selectedSiteId).order('created_at', { ascending: false }),
      supabase.from('sgen_significant_uses').select('*').eq('site_id', selectedSiteId).order('significance_score', { ascending: false }),
      supabase.from('sgen_objectives').select('*').eq('site_id', selectedSiteId).order('created_at', { ascending: false }),
      supabase.from('sgen_evidence').select('*').eq('site_id', selectedSiteId).order('captured_at', { ascending: false }).limit(30),
      supabase.from('sgen_audits').select('*').eq('site_id', selectedSiteId).order('created_at', { ascending: false }),
      supabase.from('sgen_nonconformities').select('*').eq('site_id', selectedSiteId).order('created_at', { ascending: false }),
      supabase.from('energy_improvements').select('id,title,status,priority,source_enpi_id,estimated_energy_savings,savings_unit,estimated_cost_savings').eq('site_id', selectedSiteId).neq('status', 'cancelled').order('created_at', { ascending: false }),
      supabase.from('energy_enpis').select('id,name,utility,unit').eq('site_id', selectedSiteId).eq('is_active', true).order('name'),
      supabase.from('measurement_points').select('id,tag,name,utility,quantity,unit').eq('site_id', selectedSiteId).eq('is_active', true).order('tag'),
      supabase.from('sgen_scopes').select('id', { count: 'exact', head: true }).eq('site_id', selectedSiteId).eq('status', 'approved'),
      supabase.from('sgen_policy_documents').select('id', { count: 'exact', head: true }).eq('site_id', selectedSiteId).eq('status', 'active'),
      supabase.from('sgen_management_reviews').select('id', { count: 'exact', head: true }).eq('site_id', selectedSiteId),
      supabase.from('sgen_risks_opportunities').select('id', { count: 'exact', head: true }).eq('site_id', selectedSiteId).neq('status', 'closed'),
    ])

    const auditIds = (audits || []).map((audit) => audit.id)
    const { data: findings } = auditIds.length > 0
      ? await supabase.from('sgen_audit_findings').select('*').in('audit_id', auditIds).order('created_at', { ascending: false })
      : { data: [] }

    setData({
      reviews: (reviews || []) as EnergyReview[],
      seus: (seus || []) as SignificantUse[],
      objectives: (objectives || []) as SgenObjective[],
      evidence: (evidence || []) as SgenEvidence[],
      audits: ((audits || []) as SgenAudit[]).map((audit) => ({
        ...audit,
        questions: Array.isArray(audit.questions) ? audit.questions : [],
      })),
      findings: (findings || []) as AuditFinding[],
      nonconformities: (nonconformities || []) as Nonconformity[],
      improvements: (improvements || []) as Improvement[],
      enpis: (enpis || []) as Enpi[],
      measurementPoints: (measurementPoints || []) as MeasurementPoint[],
      scopeApprovedCount: scopeApprovedCount || 0,
      policyActiveCount: policyActiveCount || 0,
      mgmtReviewCount: mgmtReviewCount || 0,
      riskCount: riskCount || 0,
    })
    setLoading(false)
  }, [selectedSiteId])

  useEffect(() => { load() }, [load])

  const [ncPrefill, setNcPrefill] = useState<{ source?: string; description?: string } | null>(null)
  const maturity = useMemo(() => calculateMaturity(data), [data])
  const openNcCount = data.nonconformities.filter((item) => item.status !== 'closed').length
  const activeObjectiveCount = data.objectives.filter((item) => item.status === 'active').length

  async function handleUpdateAuditQuestion(auditId: string, questionIndex: number, result: 'ok' | 'gap' | 'na') {
    const audit = data.audits.find((a) => a.id === auditId)
    if (!audit) return
    const updatedQuestions = audit.questions.map((q, i) =>
      i === questionIndex ? { ...q, result } : q
    )
    const allAnswered = updatedQuestions.every((q) => q.result)
    await supabase.from('sgen_audits').update({
      questions: updatedQuestions,
      status: allAnswered ? 'completed' : 'in_progress',
      ...(allAnswered ? { actual_date: new Date().toISOString().split('T')[0] } : {}),
    }).eq('id', auditId)
    load()
  }

  function handleCreateNcFromAudit(auditTitle: string, questionText: string) {
    setNcPrefill({ source: `Auditoría: ${auditTitle}`, description: `GAP identificado: ${questionText}` })
    setModal('nonconformity')
  }

  async function handleAdvanceNc(id: string, status: string, verificationEvidence?: string) {
    await supabase.from('sgen_nonconformities').update({
      status,
      ...(verificationEvidence ? { verification_of_effectiveness: verificationEvidence } : {}),
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    load()
  }

  async function handleSnapshot() {
    if (!selectedSiteId) return
    await supabase.from('sgen_evidence').insert({
      site_id: selectedSiteId,
      title: `Snapshot SGEn ${new Date().toLocaleDateString('es')}`,
      description: `Estado: ${data.reviews.length} revisiones, ${data.seus.length} SEUs, ${data.objectives.length} objetivos, ${data.audits.length} auditorías, ${openNcCount} no conformidades abiertas.`,
      domain: 'cockpit',
      linked_entity_type: 'site',
      linked_entity_id: selectedSiteId,
      source_type: 'system_snapshot',
      content_origin: 'app_original',
    })
    load()
  }

  if (!selectedSiteId && activeTab !== 'legal') {
    return (
      <div className="space-y-5">
        <SgenHero onPrimary={() => setModal('review')} disabled />
        <EmptyState
          icon={<ShieldCheck size={48} strokeWidth={1.5} />}
          title="Selecciona una planta"
          description="El centro SGEn necesita una planta para administrar alcance, revisión energética, SEUs, objetivos, evidencias, auditorías y acciones correctivas."
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <SgenHero onPrimary={() => setModal('review')} disabled={!selectedSiteId} />

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] transition-colors',
              activeTab === tab.id ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-400 hover:text-slate-700',
            ].join(' ')}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {loading && activeTab !== 'legal' ? (
        <div className="py-16 text-center text-sm font-semibold text-slate-400">Cargando centro SGEn...</div>
      ) : (
        <>
          {activeTab === 'cockpit' && (
            <CockpitView
              data={data}
              maturity={maturity}
              activeObjectiveCount={activeObjectiveCount}
              openNcCount={openNcCount}
              onSnapshot={handleSnapshot}
              onOpen={setModal}
              onNavigate={setActiveTab}
            />
          )}
          {activeTab === 'planning' && <PlanningView data={data} onOpen={setModal} onNavigate={setActiveTab} onGoToModule={navigate} />}
          {activeTab === 'policy' && selectedSiteId && <PolicyView siteId={selectedSiteId} />}
          {activeTab === 'risks' && selectedSiteId && <RisksView siteId={selectedSiteId} />}
          {activeTab === 'audit' && (
            <AuditView
              data={data}
              onOpen={setModal}
              onUpdateQuestion={handleUpdateAuditQuestion}
              onCreateNcFromAudit={handleCreateNcFromAudit}
            />
          )}
          {activeTab === 'corrective' && <CorrectiveView data={data} onOpen={setModal} onAdvanceNc={handleAdvanceNc} />}
          {activeTab === 'evidence' && <EvidenceView data={data} onOpen={setModal} />}
          {activeTab === 'direction' && selectedSiteId && <DirectionView siteId={selectedSiteId} />}
          {activeTab === 'scope' && selectedSiteId && <ScopeView siteId={selectedSiteId} />}
          {activeTab === 'legal' && <LegalSettingsView />}
        </>
      )}

      <SgenModal
        mode={modal}
        siteId={selectedSiteId}
        data={data}
        ncPrefill={ncPrefill}
        onClose={() => { setModal(null); setNcPrefill(null) }}
        onSaved={() => { setModal(null); setNcPrefill(null); load() }}
      />
    </div>
  )
}

function SgenHero({ onPrimary, disabled }: { onPrimary: () => void; disabled?: boolean }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 px-6 py-5 text-white shadow-sm">
      <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_70%_30%,rgba(34,197,94,0.22),transparent_34%),radial-gradient(circle_at_42%_70%,rgba(14,165,233,0.18),transparent_30%)]" />
      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="info" className="border-sky-400/30 bg-sky-400/10 text-sky-100">SGEn</Badge>
            <Badge variant="neutral" className="border-white/15 bg-white/10 text-white">Mejora continua</Badge>
            <Badge variant="neutral" className="border-white/15 bg-white/10 text-white">Auditoría interna</Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Centro vivo del SGEn</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Conecta revisión energética, SEUs, EnPIs, objetivos, acciones, evidencia, auditorías y correcciones en un ciclo operativo trazable.
          </p>
        </div>
        <Button
          size="md"
          leftIcon={<SearchCheck size={16} />}
          onClick={onPrimary}
          disabled={disabled}
          className="bg-white text-slate-950 hover:bg-slate-100"
        >
          Iniciar revisión energética
        </Button>
      </div>
    </section>
  )
}

function CockpitView({
  data,
  maturity,
  activeObjectiveCount,
  openNcCount,
  onSnapshot,
  onOpen,
  onNavigate,
}: {
  data: SgenData
  maturity: ReturnType<typeof calculateMaturity>
  activeObjectiveCount: number
  openNcCount: number
  onSnapshot: () => void
  onOpen: (mode: ModalMode) => void
  onNavigate: (tab: WorkspaceTab) => void
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <MetricTile label="Madurez SGEn" value={`${maturity.percent}%`} icon={<Gauge size={15} />} tone={maturity.percent >= 70 ? 'ok' : 'warn'} />
        <MetricTile label="SEUs activos" value={data.seus.filter((item) => item.status !== 'retired').length} icon={<Zap size={15} />} />
        <MetricTile label="Objetivos activos" value={activeObjectiveCount} icon={<Target size={15} />} />
        <MetricTile label="Acciones abiertas" value={data.improvements.filter((item) => item.status !== 'closed').length} icon={<FolderKanban size={15} />} />
        <MetricTile label="NC abiertas" value={openNcCount} icon={<AlertTriangle size={15} />} tone={openNcCount > 0 ? 'danger' : 'ok'} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card padding="md" className="rounded-2xl border-slate-200">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mecanismo guiado</p>
              <h2 className="text-base font-black text-slate-950">Ciclo de trabajo SGEn</h2>
            </div>
            <Button size="sm" variant="secondary" leftIcon={<Camera size={14} />} onClick={onSnapshot}>Snapshot</Button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {domainFlow.map((step, index) => (
              <div key={step.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-950 text-white">{step.icon}</div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paso {index + 1}</p>
                    <p className="text-sm font-bold text-slate-900">{step.title}</p>
                  </div>
                </div>
                <p className="text-xs leading-5 text-slate-500">{step.detail}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="md" className="rounded-2xl border-slate-200">
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Próxima mejor acción</p>
            <h2 className="text-base font-black text-slate-950">Qué falta para que el sistema esté vivo</h2>
          </div>
          <div className="space-y-2">
            {maturity.items.map((item) => (
              <div
                key={item.label}
                className={[
                  'flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm',
                  item.done ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800',
                ].join(' ')}
              >
                <span className="flex items-center gap-2 font-semibold">
                  {item.done ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  {item.label}
                </span>
                <Button
                  size="xs"
                  variant={item.done ? 'ghost' : 'secondary'}
                  onClick={() => { if (item.action) onOpen(item.action); else if (item.tab) onNavigate(item.tab) }}
                >
                  Abrir
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function PlanningView({
  data,
  onOpen,
  onNavigate,
  onGoToModule,
}: {
  data: SgenData
  onOpen: (mode: ModalMode) => void
  onNavigate: (tab: WorkspaceTab) => void
  onGoToModule: (path: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_400px]">
      <div className="space-y-5">
        <PanelHeader
          eyebrow="Planificación energética"
          title="Revisión, SEUs, EnPIs y objetivos"
          action={<Button size="sm" leftIcon={<SearchCheck size={14} />} onClick={() => onOpen('review')}>Nueva revisión</Button>}
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard title="Revisiones energéticas" empty="No hay revisiones documentadas. Crea la primera con el botón superior." items={data.reviews.map((review) => ({
            id: review.id,
            title: `${formatDate(review.period_start)} – ${formatDate(review.period_end)}`,
            meta: `${review.status} · calidad ${review.data_quality_score ?? '-'}%`,
            detail: review.summary || 'Sin resumen',
            badge: `${review.linked_enpis?.length || 0} EnPI`,
          }))} />
          <SectionCard title="Usos significativos (SEUs)" empty="Sin SEUs. Usa 'Establecer SEU' para vincularlos a medidores existentes." items={data.seus.map((seu) => ({
            id: seu.id,
            title: seu.name,
            meta: `${getUtilityLabel(seu.utility)} · score ${seu.significance_score ?? '-'}`,
            detail: seu.significance_rationale || 'Sin criterio documentado',
            badge: seu.status,
            variant: utilityBadgeVariant(seu.utility),
          }))} />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard title="Objetivos SGEn" empty="Sin objetivos. Crea uno vinculado a un EnPI activo." items={data.objectives.map((objective) => ({
            id: objective.id,
            title: objective.name,
            meta: objective.status,
            detail: objective.description || objective.verification_method || 'Sin método de verificación',
            badge: objective.linked_improvement_id ? 'con acción' : 'sin acción',
            variant: objective.linked_improvement_id ? 'ok' : 'warn',
          }))} />
          <SectionCard
            title="Acciones / Proyectos vinculados"
            empty="Sin acciones vinculadas. Ve al módulo Acciones para crearlas."
            action={<button onClick={() => onGoToModule('/acciones')} className="flex items-center gap-1 text-[11px] font-bold text-brand-blue hover:underline"><ExternalLink size={11} /> Ir a Acciones</button>}
            items={data.improvements.slice(0, 8).map((action) => ({
              id: action.id,
              title: action.title,
              meta: `${action.status} · ${action.priority}`,
              detail: `${Number(action.estimated_energy_savings || 0).toLocaleString('es')} ${action.savings_unit || ''} estimados`,
              badge: action.source_enpi_id ? 'EnPI' : 'SGEn',
              variant: 'info',
            }))}
          />
        </div>
      </div>

      <div className="space-y-4">
        <Card padding="md" className="rounded-2xl border-slate-200">
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Acciones rápidas</p>
            <h3 className="text-base font-black text-slate-950">Registrar sin duplicar</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">Usa datos del sistema. No captures dos veces lo que ya existe.</p>
          </div>
          <div className="space-y-2">
            <ActionLauncher
              icon={<Zap size={16} />}
              title="Establecer SEU desde medición"
              detail={`${data.measurementPoints.length} medidores disponibles`}
              onClick={() => onOpen('seu')}
            />
            <ActionLauncher
              icon={<Target size={16} />}
              title="Objetivo vinculado a EnPI"
              detail={`${data.enpis.length} EnPIs activos`}
              onClick={() => onOpen('objective')}
            />
            <ActionLauncher
              icon={<FolderKanban size={16} />}
              title="Ir al módulo Acciones"
              detail="Crea o revisa proyectos y acciones de mejora"
              onClick={() => onGoToModule('/acciones')}
              external
            />
            <ActionLauncher
              icon={<Gauge size={16} />}
              title="Ver desempeño y EnPIs"
              detail="Indicadores, líneas base y metas"
              onClick={() => onGoToModule('/desempeno')}
              external
            />
            <ActionLauncher
              icon={<FileCheck2 size={16} />}
              title="Documentar evidencia"
              detail="Snapshot, nota o reporte del sistema"
              onClick={() => onOpen('evidence')}
            />
          </div>
        </Card>

        <Card padding="md" className="rounded-2xl border-slate-200">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Otras secciones SGEn</p>
          <div className="space-y-2">
            {[
              { label: 'Política energética', tab: 'policy' as WorkspaceTab },
              { label: 'Riesgos y oportunidades', tab: 'risks' as WorkspaceTab },
              { label: 'Auditoría interna', tab: 'audit' as WorkspaceTab },
              { label: 'Revisión por la dirección', tab: 'direction' as WorkspaceTab },
            ].map(({ label, tab }) => (
              <button
                key={tab}
                onClick={() => onNavigate(tab)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-brand-blue hover:text-brand-blue"
              >
                {label}
                <ArrowRight size={13} className="text-slate-300" />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function AuditView({
  data,
  onOpen,
  onUpdateQuestion,
  onCreateNcFromAudit,
}: {
  data: SgenData
  onOpen: (mode: ModalMode) => void
  onUpdateQuestion: (auditId: string, index: number, result: 'ok' | 'gap' | 'na') => Promise<void>
  onCreateNcFromAudit: (auditTitle: string, questionText: string) => void
}) {
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(data.audits[0]?.id || null)
  const selectedAudit = data.audits.find((a) => a.id === selectedAuditId) ?? data.audits[0] ?? null
  const questions = selectedAudit?.questions?.length ? selectedAudit.questions : auditTemplate
  const answered = questions.filter((q) => q.result).length
  const gaps = questions.filter((q) => q.result === 'gap').length
  const isLive = !!selectedAudit

  const resultStyles: Record<string, string> = {
    ok: 'bg-emerald-500 text-white border-emerald-500',
    gap: 'bg-rose-500 text-white border-rose-500',
    na: 'bg-slate-400 text-white border-slate-400',
  }
  const cardStyles: Record<string, string> = {
    ok: 'border-emerald-200 bg-emerald-50',
    gap: 'border-rose-200 bg-rose-50',
    na: 'border-slate-100 bg-slate-50 opacity-60',
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_1fr]">
      <Card padding="md" className="rounded-2xl border-slate-200">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Auditoría energética interna</p>
            <h2 className="text-base font-black text-slate-950">Programa y alcance</h2>
          </div>
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => onOpen('audit')}>Nueva</Button>
        </div>
        <div className="space-y-2">
          {data.audits.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Crea una auditoría y ejecuta el checklist marcando cada pregunta como OK, GAP o N/A.
            </div>
          ) : data.audits.map((audit) => {
            const qs = audit.questions?.length ? audit.questions : []
            const done = qs.filter((q) => q.result).length
            const gapCount = qs.filter((q) => q.result === 'gap').length
            const isSelected = audit.id === (selectedAudit?.id)
            return (
              <button
                key={audit.id}
                onClick={() => setSelectedAuditId(audit.id)}
                className={[
                  'w-full rounded-xl border p-3 text-left transition',
                  isSelected ? 'border-brand-blue bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">{audit.title}</p>
                  <Badge variant={audit.status === 'completed' ? 'ok' : audit.status === 'in_progress' ? 'info' : 'neutral'} size="sm">
                    {audit.status === 'planned' ? 'Planificada' : audit.status === 'in_progress' ? 'En progreso' : audit.status === 'completed' ? 'Completada' : audit.status}
                  </Badge>
                </div>
                {qs.length > 0 && (
                  <div className="mt-2">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{done}/{qs.length} respondidas{gapCount > 0 ? ` · ${gapCount} GAPs` : ''}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-200">
                      <div
                        className="h-1.5 rounded-full bg-brand-blue transition-all"
                        style={{ width: `${qs.length ? (done / qs.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Plan: {audit.planned_date ? formatDate(audit.planned_date) : 'sin fecha'}
                </p>
              </button>
            )
          })}
        </div>
      </Card>

      <Card padding="md" className="rounded-2xl border-slate-200">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {isLive ? 'Checklist ejecutable' : 'Plantilla de referencia'}
            </p>
            <h2 className="text-base font-black text-slate-950">{selectedAudit?.title || 'Plantilla sugerida'}</h2>
          </div>
          <div className="flex items-center gap-2">
            {isLive && gaps > 0 && (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<AlertTriangle size={13} />}
                onClick={() => onCreateNcFromAudit(selectedAudit!.title, `${gaps} gap(s) detectado(s) en auditoría`)}
              >
                {gaps} GAP{gaps > 1 ? 's' : ''} → NC
              </Button>
            )}
            {!isLive && (
              <Button size="sm" variant="secondary" leftIcon={<AlertTriangle size={13} />} onClick={() => onOpen('nonconformity')}>
                Registrar NC
              </Button>
            )}
          </div>
        </div>

        {isLive && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex-1">
              <div className="h-2 w-full rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-brand-blue transition-all"
                  style={{ width: `${questions.length ? (answered / questions.length) * 100 : 0}%` }}
                />
              </div>
            </div>
            <span className="shrink-0 text-xs font-bold text-slate-600">{answered}/{questions.length}</span>
            {gaps > 0 && <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-600">{gaps} GAP</span>}
            {answered === questions.length && <span className="shrink-0 text-[11px] font-bold text-emerald-600">✓ Completada</span>}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {questions.map((item, index) => (
            <div
              key={`${item.topic}-${index}`}
              className={[
                'rounded-xl border p-3 transition-colors',
                item.result ? cardStyles[item.result] : 'border-slate-200 bg-slate-50',
              ].join(' ')}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <Badge variant="neutral" size="sm">{item.topic}</Badge>
                {isLive ? (
                  <div className="flex gap-1">
                    {(['ok', 'gap', 'na'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => onUpdateQuestion(selectedAudit!.id, index, r)}
                        className={[
                          'rounded-md border px-2 py-0.5 text-[10px] font-black uppercase transition',
                          item.result === r ? resultStyles[r] : 'border-slate-200 bg-white text-slate-400 hover:border-slate-400',
                        ].join(' ')}
                      >
                        {r === 'ok' ? 'OK' : r === 'gap' ? 'GAP' : 'N/A'}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Badge variant="neutral" size="sm">plantilla</Badge>
                )}
              </div>
              <p className="text-sm font-bold leading-5 text-slate-900">{item.question}</p>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">{item.evidence}</p>
              {isLive && item.result === 'gap' && (
                <button
                  onClick={() => onCreateNcFromAudit(selectedAudit!.title, item.question)}
                  className="mt-2 flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800"
                >
                  <AlertTriangle size={11} /> Crear NC desde este GAP
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function CorrectiveView({ data, onOpen, onAdvanceNc }: { data: SgenData; onOpen: (mode: ModalMode) => void; onAdvanceNc: (id: string, status: string, evidence?: string) => Promise<void> }) {
  const [closingId, setClosingId] = useState<string | null>(null)
  const [closingEvidence, setClosingEvidence] = useState('')

  const ncStatusFlow: Record<string, { label: string; next: string; nextLabel: string; color: string }> = {
    open: { label: 'Abierta', next: 'in_progress', nextLabel: 'Iniciar análisis', color: 'border-amber-200 bg-amber-50' },
    in_progress: { label: 'En análisis', next: 'resolved', nextLabel: 'Registrar resolución', color: 'border-blue-200 bg-blue-50' },
    resolved: { label: 'Resuelta', next: 'closed', nextLabel: 'Verificar eficacia y cerrar', color: 'border-purple-200 bg-purple-50' },
    closed: { label: 'Cerrada', next: '', nextLabel: '', color: 'border-emerald-200 bg-emerald-50' },
  }

  const open = data.nonconformities.filter((nc) => nc.status !== 'closed')
  const closed = data.nonconformities.filter((nc) => nc.status === 'closed')

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <PanelHeader
          eyebrow="Correcciones y mejora"
          title="No conformidades activas"
          action={<Button size="sm" leftIcon={<Plus size={14} />} onClick={() => onOpen('nonconformity')}>Nueva NC</Button>}
        />

        {data.nonconformities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            Sin no conformidades registradas. Créalas desde auditorías (botón GAP → NC) o manualmente.
          </div>
        ) : (
          <>
            {open.map((nc) => {
              const flow = ncStatusFlow[nc.status] || ncStatusFlow.open
              const isOverdue = nc.due_date && new Date(nc.due_date) < new Date() && nc.status !== 'closed'
              const isClosing = closingId === nc.id
              return (
                <div key={nc.id} className={`rounded-2xl border p-4 ${flow.color}`}>
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={nc.severity === 'major' ? 'danger' : nc.severity === 'minor' ? 'warn' : 'neutral'} size="sm">
                          {nc.severity === 'observation' ? 'Observación' : nc.severity === 'minor' ? 'Menor' : 'Mayor'}
                        </Badge>
                        <Badge variant="neutral" size="sm">{flow.label}</Badge>
                        {nc.source && <span className="text-[11px] text-slate-500">{nc.source}</span>}
                        {isOverdue && <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-black text-rose-600">VENCIDA</span>}
                      </div>
                      <p className="mt-1.5 text-sm font-bold text-slate-900">{nc.description}</p>
                    </div>
                    {nc.due_date && (
                      <span className={`shrink-0 text-[11px] font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-400'}`}>
                        {formatDate(nc.due_date)}
                      </span>
                    )}
                  </div>

                  {nc.probable_cause && (
                    <p className="mb-2 text-xs text-slate-600"><span className="font-bold">Causa: </span>{nc.probable_cause}</p>
                  )}
                  {nc.corrective_action && (
                    <p className="mb-2 text-xs text-slate-600"><span className="font-bold">Acción: </span>{nc.corrective_action}</p>
                  )}

                  {/* Status transition */}
                  {nc.status !== 'closed' && !isClosing && (
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => nc.status === 'resolved' ? setClosingId(nc.id) : onAdvanceNc(nc.id, flow.next)}
                    >
                      {flow.nextLabel}
                    </Button>
                  )}

                  {/* Close with effectiveness evidence */}
                  {isClosing && (
                    <div className="mt-2 space-y-2">
                      <p className="text-[11px] font-bold text-slate-500">Evidencia de verificación de eficacia:</p>
                      <textarea
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-blue"
                        rows={3}
                        placeholder="Describe cómo se verificó que la causa fue eliminada, no solo corregida temporalmente."
                        value={closingEvidence}
                        onChange={(e) => setClosingEvidence(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button size="xs" disabled={!closingEvidence.trim()} onClick={() => { onAdvanceNc(nc.id, 'closed', closingEvidence); setClosingId(null); setClosingEvidence('') }}>
                          Cerrar NC
                        </Button>
                        <Button size="xs" variant="ghost" onClick={() => { setClosingId(null); setClosingEvidence('') }}>Cancelar</Button>
                      </div>
                    </div>
                  )}

                  {nc.verification_of_effectiveness && nc.status === 'closed' && (
                    <p className="mt-2 text-xs text-slate-500"><span className="font-bold">Verificación: </span>{nc.verification_of_effectiveness}</p>
                  )}
                </div>
              )
            })}

            {closed.length > 0 && (
              <details className="rounded-2xl border border-slate-100">
                <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-slate-500">
                  {closed.length} no conformidad(es) cerrada(s)
                </summary>
                <div className="space-y-2 border-t border-slate-100 p-4">
                  {closed.map((nc) => (
                    <div key={nc.id} className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                      <p className="text-xs font-bold text-slate-700">{nc.description}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{nc.source || '—'} · cerrada</p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>

      <Card padding="md" className="rounded-2xl border-slate-200">
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ciclo de corrección</p>
          <h3 className="text-sm font-black text-slate-950">De hallazgo a cierre verificado</h3>
        </div>
        <div className="space-y-2">
          {[
            { step: 1, label: 'Registrar desviación', sub: 'Fuente, severidad, descripción' },
            { step: 2, label: 'Analizar causa probable', sub: 'Raíz, no solo síntoma' },
            { step: 3, label: 'Definir acción correctiva', sub: 'Responsable y fecha compromiso' },
            { step: 4, label: 'Llevar a Acciones/Proyectos', sub: 'Trazable, no duplicada' },
            { step: 5, label: 'Verificar eficacia', sub: 'Evidencia de que la causa se eliminó' },
            { step: 6, label: 'Cerrar con evidencia', sub: 'Solo cuando la causa no puede repetirse' },
          ].map(({ step, label, sub }) => (
            <div key={step} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-950 text-xs font-black text-white">{step}</div>
              <div>
                <p className="text-sm font-semibold text-slate-700">{label}</p>
                <p className="text-[11px] text-slate-400">{sub}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          <strong>Cierre requiere evidencia.</strong> Documenta cómo verificaste que la causa no volverá a ocurrir antes de marcar la NC como cerrada.
        </div>
      </Card>
    </div>
  )
}

function EvidenceView({ data, onOpen }: { data: SgenData; onOpen: (mode: ModalMode) => void }) {
  return (
    <div className="space-y-5">
      <PanelHeader
        eyebrow="Información documentada"
        title="Evidencia trazable por dominio"
        action={<Button size="sm" leftIcon={<Plus size={14} />} onClick={() => onOpen('evidence')}>Evidencia</Button>}
      />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {data.evidence.length === 0 ? (
          <div className="lg:col-span-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Sin evidencia documentada. Crea snapshots del sistema, notas de auditoría o reportes generados.</div>
        ) : data.evidence.map((evidence) => (
          <div key={evidence.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <FileCheck2 size={16} className="mt-0.5 text-brand-blue" />
              <Badge variant={evidence.status === 'accepted' ? 'ok' : 'neutral'}>{evidence.status}</Badge>
            </div>
            <p className="text-sm font-bold text-slate-900">{evidence.title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{evidence.description || evidence.domain}</p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{evidence.domain} · {formatDate(evidence.captured_at)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SgenModal({
  mode,
  siteId,
  data,
  ncPrefill,
  onClose,
  onSaved,
}: {
  mode: ModalMode
  siteId: string | null
  data: SgenData
  ncPrefill: { source?: string; description?: string } | null
  onClose: () => void
  onSaved: () => void
}) {
  if (!mode || !siteId) return null
  const titles: Record<Exclude<ModalMode, null>, string> = {
    review: 'Nueva revisión energética',
    seu: 'Establecer SEU desde medición',
    objective: 'Objetivo SGEn desde EnPI',
    audit: 'Plan de auditoría interna',
    nonconformity: 'No conformidad y acción correctiva',
    evidence: 'Documentar evidencia',
  }

  return (
    <Modal open={Boolean(mode)} onClose={onClose} title={titles[mode]} size="xl">
      {mode === 'review' && <ReviewForm siteId={siteId} enpis={data.enpis} onSaved={onSaved} onCancel={onClose} />}
      {mode === 'seu' && <SeuForm siteId={siteId} enpis={data.enpis} measurementPoints={data.measurementPoints} onSaved={onSaved} onCancel={onClose} />}
      {mode === 'objective' && <ObjectiveForm siteId={siteId} enpis={data.enpis} objectives={data.objectives} onSaved={onSaved} onCancel={onClose} />}
      {mode === 'audit' && <AuditForm siteId={siteId} onSaved={onSaved} onCancel={onClose} />}
      {mode === 'nonconformity' && <NonconformityForm siteId={siteId} enpis={data.enpis} prefill={ncPrefill} onSaved={onSaved} onCancel={onClose} />}
      {mode === 'evidence' && <EvidenceForm siteId={siteId} data={data} onSaved={onSaved} onCancel={onClose} />}
    </Modal>
  )
}

function ReviewForm({ siteId, enpis, onSaved, onCancel }: { siteId: string; enpis: Enpi[]; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    period_start: '',
    period_end: '',
    summary: '',
    data_quality_score: '80',
    total_cost: '',
    linked_enpis: [] as string[],
  })
  const set = (partial: Partial<typeof form>) => setForm({ ...form, ...partial })

  async function save() {
    await supabase.from('sgen_energy_reviews').insert({
      site_id: siteId,
      period_start: form.period_start,
      period_end: form.period_end,
      summary: form.summary,
      data_quality_score: Number(form.data_quality_score || 0),
      total_cost: form.total_cost ? Number(form.total_cost) : null,
      linked_enpis: form.linked_enpis,
      key_findings: buildKeyFindings(form.summary),
      status: 'reviewed',
      content_origin: 'user_original',
    })
    onSaved()
  }

  return (
    <FormShell onCancel={onCancel} onSave={save} disabled={!form.period_start || !form.period_end} saveLabel="Guardar revisión">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Inicio periodo" required><input className={inputClass} type="date" value={form.period_start} onChange={(e) => set({ period_start: e.target.value })} /></Field>
        <Field label="Fin periodo" required><input className={inputClass} type="date" value={form.period_end} onChange={(e) => set({ period_end: e.target.value })} /></Field>
        <Field label="Calidad de datos (%)"><input className={inputClass} type="number" min="0" max="100" value={form.data_quality_score} onChange={(e) => set({ data_quality_score: e.target.value })} /></Field>
        <Field label="Costo total del periodo"><input className={inputClass} type="number" step="any" value={form.total_cost} onChange={(e) => set({ total_cost: e.target.value })} /></Field>
        <Field label="EnPIs vinculados" className="sm:col-span-2">
          <select className={inputClass} multiple value={form.linked_enpis} onChange={(e) => set({ linked_enpis: Array.from(e.target.selectedOptions).map((option) => option.value) })}>
            {enpis.map((enpi) => <option key={enpi.id} value={enpi.id}>{enpi.name} · {enpi.unit}</option>)}
          </select>
        </Field>
        <Field label="Hallazgos y resumen" className="sm:col-span-2">
          <textarea className={`${inputClass} min-h-[120px] resize-none`} value={form.summary} onChange={(e) => set({ summary: e.target.value })} placeholder="Describe usos relevantes, drivers, oportunidades, brechas de datos y decisiones del periodo." />
        </Field>
      </div>
    </FormShell>
  )
}

function SeuForm({ siteId, enpis, measurementPoints, onSaved, onCancel }: { siteId: string; enpis: Enpi[]; measurementPoints: MeasurementPoint[]; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: '',
    utility: enpis[0]?.utility || measurementPoints[0]?.utility || 'electricity',
    enpi_id: enpis[0]?.id || '',
    measurement_point_ids: [] as string[],
    consumption_value: '',
    cost_value: '',
    significance_score: '70',
    significance_rationale: '',
    operational_criteria: '',
    relevant_variables: '',
    maintenance_criteria: '',
    review_frequency: 'annual',
  })
  const set = (partial: Partial<typeof form>) => setForm({ ...form, ...partial })
  const filteredPoints = measurementPoints.filter((point) => point.utility === form.utility)

  async function save() {
    await supabase.from('sgen_significant_uses').insert({
      site_id: siteId,
      name: form.name,
      utility: form.utility,
      enpi_id: form.enpi_id || null,
      measurement_point_ids: form.measurement_point_ids,
      consumption_value: form.consumption_value ? Number(form.consumption_value) : null,
      cost_value: form.cost_value ? Number(form.cost_value) : null,
      significance_score: Number(form.significance_score || 0),
      significance_rationale: form.significance_rationale,
      operational_criteria: form.operational_criteria || null,
      relevant_variables: form.relevant_variables
        ? form.relevant_variables.split(',').map((v) => v.trim()).filter(Boolean)
        : [],
      maintenance_criteria: form.maintenance_criteria || null,
      review_frequency: form.review_frequency,
      status: 'active',
      content_origin: 'user_original',
    })
    onSaved()
  }

  return (
    <FormShell onCancel={onCancel} onSave={save} disabled={!form.name} saveLabel="Guardar SEU">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nombre del uso significativo" required className="sm:col-span-2"><input className={inputClass} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ej. Sistema de vapor de proceso" /></Field>
        <Field label="Utility"><select className={inputClass} value={form.utility} onChange={(e) => set({ utility: e.target.value, measurement_point_ids: [] })}>{unique([...enpis.map((item) => item.utility), ...measurementPoints.map((item) => item.utility)]).map((utility) => <option key={utility} value={utility}>{getUtilityLabel(utility)}</option>)}</select></Field>
        <Field label="EnPI principal"><select className={inputClass} value={form.enpi_id} onChange={(e) => set({ enpi_id: e.target.value })}><option value="">Sin EnPI</option>{enpis.filter((enpi) => enpi.utility === form.utility).map((enpi) => <option key={enpi.id} value={enpi.id}>{enpi.name} · {enpi.unit}</option>)}</select></Field>
        <Field label="Medidores vinculados" className="sm:col-span-2"><select className={inputClass} multiple value={form.measurement_point_ids} onChange={(e) => set({ measurement_point_ids: Array.from(e.target.selectedOptions).map((option) => option.value) })}>{filteredPoints.map((point) => <option key={point.id} value={point.id}>{point.tag} · {point.name} · {point.unit}</option>)}</select></Field>
        <Field label="Consumo del periodo"><input className={inputClass} type="number" step="any" value={form.consumption_value} onChange={(e) => set({ consumption_value: e.target.value })} /></Field>
        <Field label="Costo del periodo"><input className={inputClass} type="number" step="any" value={form.cost_value} onChange={(e) => set({ cost_value: e.target.value })} /></Field>
        <Field label="Score de significancia (0–100)"><input className={inputClass} type="number" min="0" max="100" value={form.significance_score} onChange={(e) => set({ significance_score: e.target.value })} /></Field>
        <Field label="Frecuencia de revisión">
          <select className={inputClass} value={form.review_frequency} onChange={(e) => set({ review_frequency: e.target.value })}>
            <option value="monthly">Mensual</option>
            <option value="quarterly">Trimestral</option>
            <option value="semiannual">Semestral</option>
            <option value="annual">Anual</option>
          </select>
        </Field>
        <Field label="Criterio de significancia" className="sm:col-span-2"><textarea className={`${inputClass} min-h-[80px] resize-none`} value={form.significance_rationale} onChange={(e) => set({ significance_rationale: e.target.value })} placeholder="Explica consumo, costo, variabilidad, oportunidad de mejora, criticidad operacional y datos disponibles." /></Field>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Control operacional</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Criterios de operación" className="sm:col-span-2">
            <textarea
              className={`${inputClass} min-h-[80px] resize-none`}
              value={form.operational_criteria}
              onChange={(e) => set({ operational_criteria: e.target.value })}
              placeholder="Setpoints, rangos normales de operación, límites de alarma y condiciones de parada. Ej: Presión vapor 8–10 bar, temperatura 180–200 °C, factor de potencia > 0.92."
            />
          </Field>
          <Field label="Variables relevantes (separadas por coma)">
            <input
              className={inputClass}
              value={form.relevant_variables}
              onChange={(e) => set({ relevant_variables: e.target.value })}
              placeholder="Tasa de producción, temperatura exterior, turno, % carga..."
            />
          </Field>
          <Field label="Criterios de mantenimiento">
            <textarea
              className={`${inputClass} min-h-[72px] resize-none`}
              value={form.maintenance_criteria}
              onChange={(e) => set({ maintenance_criteria: e.target.value })}
              placeholder="Frecuencia de mantenimiento preventivo, calibración, limpieza e inspección que afectan el desempeño energético."
            />
          </Field>
        </div>
      </div>
    </FormShell>
  )
}

function ObjectiveForm({ siteId, enpis, objectives, onSaved, onCancel }: { siteId: string; enpis: Enpi[]; objectives: SgenObjective[]; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    enpi_id: enpis[0]?.id || '',
    estimated_savings: '',
    estimated_investment: '',
    verification_method: 'Comparar EnPI contra baseline y validar ahorro con medición del periodo.',
    create_action: true,
  })
  const set = (partial: Partial<typeof form>) => setForm({ ...form, ...partial })
  const selectedEnpi = enpis.find((item) => item.id === form.enpi_id)

  async function save() {
    let linkedImprovementId: string | null = null
    if (form.create_action) {
      const { data: improvement } = await supabase.from('energy_improvements').insert({
        site_id: siteId,
        work_type: 'project',
        title: form.name,
        description: form.description || `Acción creada desde objetivo SGEn${selectedEnpi ? ` vinculado a ${selectedEnpi.name}` : ''}.`,
        status: 'identified',
        priority: 'medium',
        category: 'efficiency',
        utility: selectedEnpi?.utility || null,
        source_enpi_id: form.enpi_id || null,
        estimated_energy_savings: form.estimated_savings ? Number(form.estimated_savings) : 0,
        savings_unit: selectedEnpi?.unit,
        estimated_investment: form.estimated_investment ? Number(form.estimated_investment) : 0,
        measurement_verification_method: 'baseline_model',
      }).select('id').single()
      linkedImprovementId = improvement?.id || null
    }

    await supabase.from('sgen_objectives').insert({
      site_id: siteId,
      name: form.name,
      description: form.description,
      enpi_id: form.enpi_id || null,
      estimated_savings: form.estimated_savings ? Number(form.estimated_savings) : null,
      estimated_investment: form.estimated_investment ? Number(form.estimated_investment) : null,
      linked_improvement_id: linkedImprovementId,
      verification_method: form.verification_method,
      status: 'active',
      content_origin: 'user_original',
    })
    onSaved()
  }

  return (
    <FormShell onCancel={onCancel} onSave={save} disabled={!form.name} saveLabel="Crear objetivo">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nombre del objetivo" required className="sm:col-span-2"><input className={inputClass} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ej. Reducir 8% el EnPI de vapor por tonelada" /></Field>
        <Field label="EnPI vinculado"><select className={inputClass} value={form.enpi_id} onChange={(e) => set({ enpi_id: e.target.value })}><option value="">Sin EnPI</option>{enpis.map((enpi) => <option key={enpi.id} value={enpi.id}>{enpi.name} · {enpi.unit}</option>)}</select></Field>
        <Field label="Ahorro estimado"><input className={inputClass} type="number" step="any" value={form.estimated_savings} onChange={(e) => set({ estimated_savings: e.target.value })} /></Field>
        <Field label="Inversión estimada"><input className={inputClass} type="number" step="any" value={form.estimated_investment} onChange={(e) => set({ estimated_investment: e.target.value })} /></Field>
        <Field label="Método de verificación" className="sm:col-span-2"><textarea className={`${inputClass} min-h-[82px] resize-none`} value={form.verification_method} onChange={(e) => set({ verification_method: e.target.value })} /></Field>
        <Field label="Descripción" className="sm:col-span-2"><textarea className={`${inputClass} min-h-[82px] resize-none`} value={form.description} onChange={(e) => set({ description: e.target.value })} /></Field>
        <label className="sm:col-span-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={form.create_action} onChange={(e) => set({ create_action: e.target.checked })} />
          Crear también un plan en Acciones / Proyectos
        </label>
        {objectives.length > 0 && <p className="sm:col-span-2 text-xs text-slate-400">Ya existen {objectives.length} objetivos; este quedará trazado al EnPI seleccionado y opcionalmente al plan de mejora.</p>}
      </div>
    </FormShell>
  )
}

function AuditForm({ siteId, onSaved, onCancel }: { siteId: string; onSaved: () => void; onCancel: () => void }) {
  const topics = [...new Set(AUDIT_CATALOG.map((q) => q.topic))]
  const [form, setForm] = useState({
    title: `Auditoría interna SGEn ${new Date().getFullYear()}`,
    scope: '',
    planned_date: '',
    lead_auditor: '',
  })
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(
    new Set(AUDIT_CATALOG.map((_, i) => i))
  )
  const [customQuestions, setCustomQuestions] = useState<AuditQuestion[]>([])
  const [showCatalog, setShowCatalog] = useState(false)

  function toggleQuestion(index: number) {
    const next = new Set(selectedIndexes)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setSelectedIndexes(next)
  }

  function toggleTopic(topic: string) {
    const topicIndexes = AUDIT_CATALOG.map((q, i) => ({ q, i })).filter(({ q }) => q.topic === topic).map(({ i }) => i)
    const allSelected = topicIndexes.every((i) => selectedIndexes.has(i))
    const next = new Set(selectedIndexes)
    topicIndexes.forEach((i) => allSelected ? next.delete(i) : next.add(i))
    setSelectedIndexes(next)
  }

  function addCustom() {
    setCustomQuestions([...customQuestions, { topic: 'Personalizada', question: '', evidence: '' }])
  }

  function updateCustom(index: number, field: keyof AuditQuestion, value: string) {
    setCustomQuestions(customQuestions.map((q, i) => i === index ? { ...q, [field]: value } : q))
  }

  const selectedCount = selectedIndexes.size + customQuestions.filter((q) => q.question.trim()).length

  async function save() {
    const fromCatalog = AUDIT_CATALOG.filter((_, i) => selectedIndexes.has(i))
    const custom = customQuestions.filter((q) => q.question.trim())
    await supabase.from('sgen_audits').insert({
      site_id: siteId,
      title: form.title,
      scope: form.scope || null,
      planned_date: form.planned_date || null,
      questions: [...fromCatalog, ...custom],
      status: 'planned',
      content_origin: 'app_original',
    })
    onSaved()
  }

  return (
    <FormShell onCancel={onCancel} onSave={save} disabled={!form.title} saveLabel={`Crear auditoría (${selectedCount} preguntas)`}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Título" required className="sm:col-span-2">
            <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Fecha planificada">
            <input className={inputClass} type="date" value={form.planned_date} onChange={(e) => setForm({ ...form, planned_date: e.target.value })} />
          </Field>
          <Field label="Auditor líder">
            <input className={inputClass} value={form.lead_auditor} onChange={(e) => setForm({ ...form, lead_auditor: e.target.value })} placeholder="Nombre del auditor responsable" />
          </Field>
          <Field label="Alcance de la auditoría" className="sm:col-span-2">
            <textarea className={`${inputClass} min-h-[70px] resize-none`} value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} placeholder="Áreas, sistemas, procesos y periodos incluidos en esta auditoría." />
          </Field>
        </div>

        {/* Catalog selector */}
        <div className="rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setShowCatalog(!showCatalog)}
            className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left"
          >
            <div>
              <span className="text-sm font-bold text-slate-900">Catálogo de preguntas</span>
              <span className="ml-2 rounded-full bg-brand-blue/10 px-2 py-0.5 text-[11px] font-black text-brand-blue">{selectedIndexes.size} seleccionadas</span>
            </div>
            {showCatalog ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
          </button>

          {showCatalog && (
            <div className="border-t border-slate-200 p-4 space-y-5 max-h-[400px] overflow-y-auto">
              {topics.map((topic) => {
                const topicIndexes = AUDIT_CATALOG.map((q, i) => ({ q, i })).filter(({ q }) => q.topic === topic).map(({ i }) => i)
                const allSelected = topicIndexes.every((i) => selectedIndexes.has(i))
                return (
                  <div key={topic}>
                    <div className="mb-2 flex items-center gap-2">
                      <input type="checkbox" checked={allSelected} onChange={() => toggleTopic(topic)} className="rounded" />
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">{topic}</span>
                    </div>
                    <div className="space-y-2 pl-5">
                      {AUDIT_CATALOG.map((q, i) => q.topic !== topic ? null : (
                        <label key={i} className={`flex items-start gap-2 rounded-lg p-2 cursor-pointer ${selectedIndexes.has(i) ? 'bg-slate-50' : 'opacity-50'}`}>
                          <input type="checkbox" checked={selectedIndexes.has(i)} onChange={() => toggleQuestion(i)} className="mt-0.5 shrink-0 rounded" />
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{q.question}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{q.evidence}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Custom questions */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Preguntas personalizadas</span>
            <Button size="xs" variant="secondary" leftIcon={<Plus size={12} />} onClick={addCustom}>Agregar</Button>
          </div>
          {customQuestions.length === 0 && (
            <p className="text-xs text-slate-400">Agrega preguntas específicas para este proceso o área.</p>
          )}
          <div className="space-y-2">
            {customQuestions.map((q, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="grid grid-cols-[1fr_auto] gap-2 mb-2">
                  <input
                    className={inputClass}
                    placeholder="Tema (ej: Compresor de aire, Turno nocturno...)"
                    value={q.topic}
                    onChange={(e) => updateCustom(i, 'topic', e.target.value)}
                  />
                  <button onClick={() => setCustomQuestions(customQuestions.filter((_, idx) => idx !== i))} className="grid place-items-center rounded-lg border border-slate-200 p-2 text-slate-400 hover:text-rose-500">
                    <X size={13} />
                  </button>
                </div>
                <input
                  className={`${inputClass} mb-2`}
                  placeholder="¿Qué se quiere verificar?"
                  value={q.question}
                  onChange={(e) => updateCustom(i, 'question', e.target.value)}
                />
                <input
                  className={inputClass}
                  placeholder="¿Qué evidencia lo demuestra?"
                  value={q.evidence}
                  onChange={(e) => updateCustom(i, 'evidence', e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </FormShell>
  )
}

function NonconformityForm({
  siteId,
  enpis,
  prefill,
  onSaved,
  onCancel,
}: {
  siteId: string
  enpis: Enpi[]
  prefill?: { source?: string; description?: string } | null
  onSaved: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    source: prefill?.source || 'auditoría interna',
    description: prefill?.description || '',
    severity: 'minor',
    probable_cause: '',
    corrective_action: '',
    due_date: '',
    verification_of_effectiveness: '',
    create_action: true,
    enpi_id: '',
  })
  const set = (partial: Partial<typeof form>) => setForm({ ...form, ...partial })
  const selectedEnpi = enpis.find((item) => item.id === form.enpi_id)

  async function save() {
    await supabase.from('sgen_nonconformities').insert({
      site_id: siteId,
      source: form.source,
      description: form.description,
      severity: form.severity,
      probable_cause: form.probable_cause,
      corrective_action: form.corrective_action,
      due_date: form.due_date || null,
      verification_of_effectiveness: form.verification_of_effectiveness,
      status: 'open',
      content_origin: 'user_original',
    })

    if (form.create_action) {
      await supabase.from('energy_improvements').insert({
        site_id: siteId,
        work_type: form.severity === 'major' ? 'project' : 'quick_action',
        title: `Corrección SGEn: ${form.description.slice(0, 80)}`,
        description: `${form.corrective_action}\n\nCausa probable: ${form.probable_cause || 'por analizar'}`,
        status: 'identified',
        priority: form.severity === 'major' ? 'high' : 'medium',
        category: 'efficiency',
        utility: selectedEnpi?.utility || null,
        source_enpi_id: form.enpi_id || null,
        savings_unit: selectedEnpi?.unit || null,
        measurement_verification_method: 'before_after',
      })
    }
    onSaved()
  }

  return (
    <FormShell onCancel={onCancel} onSave={save} disabled={!form.description} saveLabel="Registrar corrección">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Fuente"><input className={inputClass} value={form.source} onChange={(e) => set({ source: e.target.value })} /></Field>
        <Field label="Severidad"><select className={inputClass} value={form.severity} onChange={(e) => set({ severity: e.target.value })}><option value="observation">Observación</option><option value="minor">Menor</option><option value="major">Mayor</option></select></Field>
        <Field label="Descripción" required className="sm:col-span-2"><textarea className={`${inputClass} min-h-[88px] resize-none`} value={form.description} onChange={(e) => set({ description: e.target.value })} /></Field>
        <Field label="Causa probable" className="sm:col-span-2"><textarea className={`${inputClass} min-h-[70px] resize-none`} value={form.probable_cause} onChange={(e) => set({ probable_cause: e.target.value })} /></Field>
        <Field label="Acción correctiva" className="sm:col-span-2"><textarea className={`${inputClass} min-h-[82px] resize-none`} value={form.corrective_action} onChange={(e) => set({ corrective_action: e.target.value })} /></Field>
        <Field label="Fecha compromiso"><input className={inputClass} type="date" value={form.due_date} onChange={(e) => set({ due_date: e.target.value })} /></Field>
        <Field label="EnPI afectado"><select className={inputClass} value={form.enpi_id} onChange={(e) => set({ enpi_id: e.target.value })}><option value="">Sin EnPI</option>{enpis.map((enpi) => <option key={enpi.id} value={enpi.id}>{enpi.name}</option>)}</select></Field>
        <Field label="Verificación de eficacia" className="sm:col-span-2"><textarea className={`${inputClass} min-h-[70px] resize-none`} value={form.verification_of_effectiveness} onChange={(e) => set({ verification_of_effectiveness: e.target.value })} placeholder="Qué evidencia demostrará que la causa fue eliminada y no solo corregida temporalmente." /></Field>
        <label className="sm:col-span-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={form.create_action} onChange={(e) => set({ create_action: e.target.checked })} />
          Crear acción correctiva en Acciones / Proyectos
        </label>
      </div>
    </FormShell>
  )
}

function EvidenceForm({ siteId, data, onSaved, onCancel }: { siteId: string; data: SgenData; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    domain: 'auditoria',
    linked_entity_type: 'site',
    linked_entity_id: siteId,
    source_type: 'manual_note',
  })
  const set = (partial: Partial<typeof form>) => setForm({ ...form, ...partial })
  const linkOptions = [
    { type: 'site', id: siteId, label: 'Planta / sistema completo' },
    ...data.reviews.map((item) => ({ type: 'review', id: item.id, label: `Revisión ${formatDate(item.period_start)}` })),
    ...data.seus.map((item) => ({ type: 'seu', id: item.id, label: `SEU · ${item.name}` })),
    ...data.objectives.map((item) => ({ type: 'objective', id: item.id, label: `Objetivo · ${item.name}` })),
    ...data.audits.map((item) => ({ type: 'audit', id: item.id, label: `Auditoría · ${item.title}` })),
  ]

  async function save() {
    await supabase.from('sgen_evidence').insert({
      site_id: siteId,
      title: form.title,
      description: form.description,
      domain: form.domain,
      linked_entity_type: form.linked_entity_type,
      linked_entity_id: form.linked_entity_id,
      source_type: form.source_type,
      content_origin: form.source_type === 'system_snapshot' ? 'app_original' : 'user_original',
    })
    onSaved()
  }

  return (
    <FormShell onCancel={onCancel} onSave={save} disabled={!form.title} saveLabel="Guardar evidencia">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Título" required className="sm:col-span-2"><input className={inputClass} value={form.title} onChange={(e) => set({ title: e.target.value })} /></Field>
        <Field label="Dominio"><select className={inputClass} value={form.domain} onChange={(e) => set({ domain: e.target.value })}><option value="revision">Revisión energética</option><option value="seu">SEUs</option><option value="objetivos">Objetivos</option><option value="auditoria">Auditoría</option><option value="correccion">Corrección</option><option value="direccion">Revisión directiva</option></select></Field>
        <Field label="Tipo de fuente"><select className={inputClass} value={form.source_type} onChange={(e) => set({ source_type: e.target.value })}><option value="manual_note">Nota documentada</option><option value="system_snapshot">Snapshot del sistema</option><option value="generated_report">Reporte generado</option><option value="uploaded_file">Archivo</option></select></Field>
        <Field label="Vincular con" className="sm:col-span-2"><select className={inputClass} value={`${form.linked_entity_type}:${form.linked_entity_id}`} onChange={(e) => { const [type, id] = e.target.value.split(':'); set({ linked_entity_type: type, linked_entity_id: id }) }}>{linkOptions.map((option) => <option key={`${option.type}:${option.id}`} value={`${option.type}:${option.id}`}>{option.label}</option>)}</select></Field>
        <Field label="Descripción" className="sm:col-span-2"><textarea className={`${inputClass} min-h-[100px] resize-none`} value={form.description} onChange={(e) => set({ description: e.target.value })} /></Field>
      </div>
    </FormShell>
  )
}

function SectionCard({ title, empty, items, action }: { title: string; empty: string; items: Array<{ id: string; title: string; meta: string; detail: string; badge: string; variant?: Parameters<typeof Badge>[0]['variant'] }>; action?: ReactNode }) {
  return (
    <Card padding="md" className="rounded-2xl border-slate-200">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-black text-slate-950">{title}</h3>
        {action}
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{empty}</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{item.meta}</p>
                </div>
                <Badge variant={item.variant || 'neutral'} size="sm">{item.badge}</Badge>
              </div>
              <p className="line-clamp-3 text-xs leading-5 text-slate-500">{item.detail}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function PanelHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{eyebrow}</p>
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
      </div>
      {action}
    </div>
  )
}

function ActionLauncher({ icon, title, detail, onClick, external = false }: { icon: ReactNode; title: string; detail: string; onClick: () => void; external?: boolean }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand-blue hover:bg-blue-50">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-950 text-white">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
      {external ? <ExternalLink size={13} className="shrink-0 text-slate-400" /> : <ArrowRight size={14} className="shrink-0 text-slate-400" />}
    </button>
  )
}

function MetricTile({ label, value, icon, tone = 'neutral' }: { label: string; value: string | number; icon: ReactNode; tone?: 'neutral' | 'ok' | 'warn' | 'danger' }) {
  const color = tone === 'ok' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'danger' ? 'text-rose-600' : 'text-slate-950'
  return (
    <Card padding="md" className="rounded-2xl border-slate-200">
      <div className="mb-3 flex items-center gap-2 text-slate-400">{icon}<p className="text-[10px] font-black uppercase tracking-widest">{label}</p></div>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
    </Card>
  )
}

function FormShell({ children, onCancel, onSave, disabled, saveLabel }: { children: ReactNode; onCancel: () => void; onSave: () => void; disabled?: boolean; saveLabel: string }) {
  return (
    <div className="space-y-5">
      {children}
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button onClick={onSave} disabled={disabled} leftIcon={<CheckCircle2 size={14} />}>{saveLabel}</Button>
      </div>
    </div>
  )
}

function Field({ label, children, required, className = '' }: { label: string; children: ReactNode; required?: boolean; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] font-bold text-slate-500">{label}{required && <span className="text-rose-500"> *</span>}</span>
      {children}
    </label>
  )
}

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15'

function calculateMaturity(data: SgenData) {
  const items: Array<{ label: string; done: boolean; action: ModalMode; tab?: WorkspaceTab }> = [
    { label: 'Alcance aprobado y vigente', done: data.scopeApprovedCount > 0, action: null, tab: 'scope' },
    { label: 'Política energética vigente', done: data.policyActiveCount > 0, action: null, tab: 'policy' },
    { label: 'Riesgos y oportunidades registrados', done: data.riskCount > 0, action: null, tab: 'risks' },
    { label: 'Revisión energética documentada', done: data.reviews.length > 0, action: 'review' },
    { label: 'SEUs definidos con medición', done: data.seus.length > 0, action: 'seu' },
    { label: 'Objetivos vinculados a EnPIs', done: data.objectives.some((item) => item.enpi_id), action: 'objective' },
    { label: 'Acciones/proyectos trazables', done: data.improvements.length > 0, action: 'objective' },
    { label: 'Auditoría interna planificada', done: data.audits.length > 0, action: 'audit' },
    { label: 'Evidencia documentada', done: data.evidence.length > 0, action: 'evidence' },
    { label: 'Correcciones gestionadas', done: data.nonconformities.length === 0 || data.nonconformities.some((item) => item.corrective_action), action: 'nonconformity' },
    { label: 'Revisión directiva documentada', done: data.mgmtReviewCount > 0, action: null, tab: 'direction' },
  ]
  return {
    items,
    percent: Math.round((items.filter((item) => item.done).length / items.length) * 100),
  }
}

function buildKeyFindings(summary: string) {
  return summary
    .split(/\n|\. /)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8)
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es')
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}
