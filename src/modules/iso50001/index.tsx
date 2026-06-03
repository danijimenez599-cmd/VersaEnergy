import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Crosshair,
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
  Zap,
} from 'lucide-react'
import { supabase } from '@/services/supabase'
import { Badge, utilityBadgeVariant } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { Card } from '@/shared/Card'
import { EmptyState } from '@/shared/EmptyState'
import { Modal } from '@/shared/Modal'
import { getUtilityLabel } from '@/shared/OperationalContext'
import { useUIStore } from '@/store/uiStore'
import { LegalSettingsView } from './views/LegalSettingsView'
import { ScopeView } from './views/ScopeView'

type WorkspaceTab = 'cockpit' | 'planning' | 'audit' | 'corrective' | 'evidence' | 'scope' | 'legal'
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
}

const tabs: Array<{ id: WorkspaceTab; label: string; icon: ReactNode }> = [
  { id: 'cockpit', label: 'Cockpit', icon: <ShieldCheck size={14} /> },
  { id: 'planning', label: 'Planificación', icon: <Route size={14} /> },
  { id: 'audit', label: 'Auditoría', icon: <ClipboardCheck size={14} /> },
  { id: 'corrective', label: 'No conformidades', icon: <Wrench size={14} /> },
  { id: 'evidence', label: 'Evidencia', icon: <FileSearch size={14} /> },
  { id: 'scope', label: 'Alcance', icon: <Crosshair size={14} /> },
  { id: 'legal', label: 'Legal', icon: <Scale size={14} /> },
]

const auditTemplate: AuditQuestion[] = [
  { topic: 'Alcance', question: '¿El alcance describe límites físicos, organizacionales y energéticos?', evidence: 'Alcance aprobado, exclusiones justificadas y mapa de fronteras.' },
  { topic: 'Revisión energética', question: '¿La revisión identifica usos, consumo, costos, variables y oportunidades?', evidence: 'Revisión vigente con datos del periodo, hallazgos y fuentes.' },
  { topic: 'SEUs', question: '¿Los usos significativos tienen criterio de significancia, medición, responsable y EnPI?', evidence: 'Matriz SEU, medidores vinculados, score y responsable.' },
  { topic: 'Objetivos', question: '¿Los objetivos están conectados con EnPIs, metas, baseline y plan de acción?', evidence: 'Objetivo activo, target, ahorro estimado y acción/proyecto vinculado.' },
  { topic: 'Control operacional', question: '¿Los SEUs tienen criterios de operación/mantenimiento y reacción ante desviaciones?', evidence: 'Procedimientos, setpoints, rutinas, límites y registros operativos.' },
  { topic: 'Medición', question: '¿El plan de medición cubre EnPIs, SEUs y variables significativas?', evidence: 'Medidores, frecuencia, calidad de datos y método de cálculo.' },
  { topic: 'Mejora', question: '¿Las oportunidades se convierten en acciones con verificación de resultados?', evidence: 'Acciones en módulo Acciones, M&V, ahorros estimados/reales.' },
  { topic: 'Corrección', question: '¿Las desviaciones generan causa raíz, acción correctiva y verificación de eficacia?', evidence: 'No conformidades, responsable, fecha compromiso y verificación.' },
  { topic: 'Revisión directiva', question: '¿La dirección revisa desempeño, auditorías, acciones, recursos y decisiones?', evidence: 'Acta, decisiones, recursos y seguimiento.' },
]

const domainFlow = [
  { id: 'review', title: 'Revisión energética', detail: 'Consolidar consumo, costos, variables, hallazgos y oportunidades.', icon: <SearchCheck size={18} /> },
  { id: 'seu', title: 'SEUs por medición', detail: 'Priorizar usos por consumo, costo, criticidad y capacidad de mejora.', icon: <Zap size={18} /> },
  { id: 'enpi', title: 'EnPIs y objetivos', detail: 'Conectar indicadores, baseline, targets y responsables.', icon: <Target size={18} /> },
  { id: 'actions', title: 'Acciones verificables', detail: 'Convertir oportunidades y correcciones en planes de mejora.', icon: <FolderKanban size={18} /> },
  { id: 'audit', title: 'Auditoría interna', detail: 'Recolectar evidencia, registrar hallazgos y disparar correcciones.', icon: <ClipboardCheck size={18} /> },
  { id: 'review-mgmt', title: 'Revisión directiva', detail: 'Cerrar decisiones, recursos, riesgos y próximos ciclos.', icon: <UserCheck size={18} /> },
]

export default function Iso50001Page() {
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
    })
    setLoading(false)
  }, [selectedSiteId])

  useEffect(() => { load() }, [load])

  const maturity = useMemo(() => calculateMaturity(data), [data])
  const openNcCount = data.nonconformities.filter((item) => item.status !== 'closed').length
  const activeObjectiveCount = data.objectives.filter((item) => item.status === 'active').length

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
            />
          )}
          {activeTab === 'planning' && <PlanningView data={data} onOpen={setModal} />}
          {activeTab === 'audit' && <AuditView data={data} onOpen={setModal} />}
          {activeTab === 'corrective' && <CorrectiveView data={data} onOpen={setModal} />}
          {activeTab === 'evidence' && <EvidenceView data={data} onOpen={setModal} />}
          {activeTab === 'scope' && selectedSiteId && <ScopeView siteId={selectedSiteId} />}
          {activeTab === 'legal' && <LegalSettingsView />}
        </>
      )}

      <SgenModal
        mode={modal}
        siteId={selectedSiteId}
        data={data}
        onClose={() => setModal(null)}
        onSaved={() => { setModal(null); load() }}
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
}: {
  data: SgenData
  maturity: ReturnType<typeof calculateMaturity>
  activeObjectiveCount: number
  openNcCount: number
  onSnapshot: () => void
  onOpen: (mode: ModalMode) => void
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
                <Button size="xs" variant={item.done ? 'ghost' : 'secondary'} onClick={() => onOpen(item.action)}>
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

function PlanningView({ data, onOpen }: { data: SgenData; onOpen: (mode: ModalMode) => void }) {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_420px]">
      <div className="space-y-5">
        <PanelHeader
          eyebrow="Planificación energética"
          title="Revisión, SEUs, EnPIs y objetivos"
          action={<Button size="sm" leftIcon={<SearchCheck size={14} />} onClick={() => onOpen('review')}>Nueva revisión</Button>}
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard title="Revisiones energéticas" empty="No hay revisiones documentadas." items={data.reviews.map((review) => ({
            id: review.id,
            title: `${formatDate(review.period_start)} - ${formatDate(review.period_end)}`,
            meta: `${review.status} · calidad ${review.data_quality_score ?? '-'}%`,
            detail: review.summary || 'Sin resumen',
            badge: `${review.linked_enpis?.length || 0} EnPI`,
          }))} />
          <SectionCard title="Usos significativos" empty="No hay SEUs definidos." items={data.seus.map((seu) => ({
            id: seu.id,
            title: seu.name,
            meta: `${getUtilityLabel(seu.utility)} · score ${seu.significance_score ?? '-'}`,
            detail: seu.significance_rationale || 'Sin criterio documentado',
            badge: seu.status,
            variant: utilityBadgeVariant(seu.utility),
          }))} />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard title="Objetivos SGEn" empty="No hay objetivos conectados." items={data.objectives.map((objective) => ({
            id: objective.id,
            title: objective.name,
            meta: objective.status,
            detail: objective.description || objective.verification_method || 'Sin método de verificación',
            badge: objective.linked_improvement_id ? 'con acción' : 'sin acción',
            variant: objective.linked_improvement_id ? 'ok' : 'warn',
          }))} />
          <SectionCard title="Acciones conectadas" empty="No hay acciones de mejora." items={data.improvements.slice(0, 8).map((action) => ({
            id: action.id,
            title: action.title,
            meta: `${action.status} · ${action.priority}`,
            detail: `${Number(action.estimated_energy_savings || 0).toLocaleString('es')} ${action.savings_unit || ''} estimados`,
            badge: action.source_enpi_id ? 'EnPI' : 'SGEn',
            variant: 'info',
          }))} />
        </div>
      </div>

      <Card padding="md" className="rounded-2xl border-slate-200">
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mandar a llamar</p>
          <h3 className="text-base font-black text-slate-950">Crear desde datos existentes</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">Usa EnPIs y medición para levantar SEUs, objetivos y acciones sin capturar dos veces.</p>
        </div>
        <div className="space-y-3">
          <ActionLauncher icon={<Zap size={16} />} title="Establecer SEU desde medición" detail={`${data.measurementPoints.length} medidores disponibles`} onClick={() => onOpen('seu')} />
          <ActionLauncher icon={<Target size={16} />} title="Objetivo desde EnPI" detail={`${data.enpis.length} EnPIs activos`} onClick={() => onOpen('objective')} />
          <ActionLauncher icon={<FolderKanban size={16} />} title="Crear acción de mejora" detail="Desde objetivo o no conformidad" onClick={() => onOpen('objective')} />
          <ActionLauncher icon={<FileCheck2 size={16} />} title="Documentar evidencia" detail="Snapshot, nota o reporte generado" onClick={() => onOpen('evidence')} />
        </div>
      </Card>
    </div>
  )
}

function AuditView({ data, onOpen }: { data: SgenData; onOpen: (mode: ModalMode) => void }) {
  const latestAudit = data.audits[0]
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_1fr]">
      <Card padding="md" className="rounded-2xl border-slate-200">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Auditoría energética interna</p>
            <h2 className="text-base font-black text-slate-950">Programa y alcance</h2>
          </div>
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => onOpen('audit')}>Auditoría</Button>
        </div>
        <div className="space-y-3">
          {data.audits.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Crea una auditoría con checklist flexible por alcance, SEUs, medición, objetivos y acciones.</div>
          ) : data.audits.map((audit) => (
            <div key={audit.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">{audit.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{audit.scope || 'Sin alcance detallado'}</p>
                </div>
                <Badge variant={audit.status === 'completed' ? 'ok' : audit.status === 'in_progress' ? 'info' : 'neutral'}>{audit.status}</Badge>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">{audit.questions.length} preguntas · plan {audit.planned_date ? formatDate(audit.planned_date) : 'sin fecha'}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card padding="md" className="rounded-2xl border-slate-200">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Checklist auditable</p>
            <h2 className="text-base font-black text-slate-950">{latestAudit?.title || 'Plantilla sugerida'}</h2>
          </div>
          <Button size="sm" variant="secondary" leftIcon={<AlertTriangle size={14} />} onClick={() => onOpen('nonconformity')}>Registrar NC</Button>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {(latestAudit?.questions.length ? latestAudit.questions : auditTemplate).map((item, index) => (
            <div key={`${item.topic}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Badge variant="neutral">{item.topic}</Badge>
                <Badge variant={item.result === 'gap' ? 'warn' : item.result === 'ok' ? 'ok' : 'neutral'}>{item.result || 'pendiente'}</Badge>
              </div>
              <p className="text-sm font-bold leading-5 text-slate-900">{item.question}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{item.evidence}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function CorrectiveView({ data, onOpen }: { data: SgenData; onOpen: (mode: ModalMode) => void }) {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
      <SectionCard title="No conformidades y acciones correctivas" empty="No hay no conformidades registradas." items={data.nonconformities.map((nc) => ({
        id: nc.id,
        title: nc.description,
        meta: `${nc.severity} · ${nc.status}`,
        detail: nc.corrective_action || nc.probable_cause || 'Sin acción correctiva documentada',
        badge: nc.due_date ? formatDate(nc.due_date) : 'sin fecha',
        variant: nc.status === 'closed' ? 'ok' : 'warn',
      }))} />
      <Card padding="md" className="rounded-2xl border-slate-200">
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mecanismo de corrección</p>
          <h3 className="text-base font-black text-slate-950">De hallazgo a eficacia</h3>
        </div>
        <div className="space-y-3">
          {['Registrar desviación o hallazgo', 'Analizar causa probable', 'Definir acción correctiva con responsable', 'Llevarla a Acciones / Proyectos', 'Verificar eficacia con evidencia'].map((step, index) => (
            <div key={step} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-slate-950 text-xs font-black text-white">{index + 1}</div>
              <p className="text-sm font-semibold text-slate-700">{step}</p>
            </div>
          ))}
        </div>
        <Button className="mt-4 w-full" leftIcon={<AlertTriangle size={14} />} onClick={() => onOpen('nonconformity')}>Nueva no conformidad</Button>
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
  onClose,
  onSaved,
}: {
  mode: ModalMode
  siteId: string | null
  data: SgenData
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
      {mode === 'nonconformity' && <NonconformityForm siteId={siteId} enpis={data.enpis} onSaved={onSaved} onCancel={onClose} />}
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
        <Field label="Score de significancia"><input className={inputClass} type="number" min="0" max="100" value={form.significance_score} onChange={(e) => set({ significance_score: e.target.value })} /></Field>
        <Field label="Criterio de significancia" className="sm:col-span-2"><textarea className={`${inputClass} min-h-[96px] resize-none`} value={form.significance_rationale} onChange={(e) => set({ significance_rationale: e.target.value })} placeholder="Explica consumo, costo, variabilidad, oportunidad de mejora, criticidad operacional y datos disponibles." /></Field>
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
  const [form, setForm] = useState({
    title: `Auditoría interna SGEn ${new Date().getFullYear()}`,
    scope: 'Revisión de alcance, revisión energética, SEUs, EnPIs, objetivos, medición, acciones, evidencias y correcciones.',
    planned_date: '',
  })
  const set = (partial: Partial<typeof form>) => setForm({ ...form, ...partial })

  async function save() {
    await supabase.from('sgen_audits').insert({
      site_id: siteId,
      title: form.title,
      scope: form.scope,
      planned_date: form.planned_date || null,
      questions: auditTemplate,
      status: 'planned',
      content_origin: 'app_original',
    })
    onSaved()
  }

  return (
    <FormShell onCancel={onCancel} onSave={save} disabled={!form.title} saveLabel="Crear auditoría">
      <div className="space-y-3">
        <Field label="Título" required><input className={inputClass} value={form.title} onChange={(e) => set({ title: e.target.value })} /></Field>
        <Field label="Alcance de auditoría"><textarea className={`${inputClass} min-h-[92px] resize-none`} value={form.scope} onChange={(e) => set({ scope: e.target.value })} /></Field>
        <Field label="Fecha planificada"><input className={inputClass} type="date" value={form.planned_date} onChange={(e) => set({ planned_date: e.target.value })} /></Field>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">Se cargará una plantilla original y editable de {auditTemplate.length} preguntas, orientada a evidencia objetiva y mecanismos del SGEn.</div>
      </div>
    </FormShell>
  )
}

function NonconformityForm({ siteId, enpis, onSaved, onCancel }: { siteId: string; enpis: Enpi[]; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    source: 'auditoría interna',
    description: '',
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

function SectionCard({ title, empty, items }: { title: string; empty: string; items: Array<{ id: string; title: string; meta: string; detail: string; badge: string; variant?: Parameters<typeof Badge>[0]['variant'] }> }) {
  return (
    <Card padding="md" className="rounded-2xl border-slate-200">
      <h3 className="mb-4 text-sm font-black text-slate-950">{title}</h3>
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

function ActionLauncher({ icon, title, detail, onClick }: { icon: ReactNode; title: string; detail: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand-blue hover:bg-blue-50">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-950 text-white">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
      <ArrowRight size={14} className="text-slate-400" />
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
  const items: Array<{ label: string; done: boolean; action: ModalMode }> = [
    { label: 'Alcance aprobado y vigente', done: true, action: 'review' },
    { label: 'Revisión energética documentada', done: data.reviews.length > 0, action: 'review' },
    { label: 'SEUs definidos con medición', done: data.seus.length > 0, action: 'seu' },
    { label: 'Objetivos vinculados a EnPIs', done: data.objectives.some((item) => item.enpi_id), action: 'objective' },
    { label: 'Acciones/proyectos trazables', done: data.improvements.length > 0, action: 'objective' },
    { label: 'Auditoría interna planificada', done: data.audits.length > 0, action: 'audit' },
    { label: 'Evidencia documentada', done: data.evidence.length > 0, action: 'evidence' },
    { label: 'Correcciones gestionadas', done: data.nonconformities.length === 0 || data.nonconformities.some((item) => item.corrective_action), action: 'nonconformity' },
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
