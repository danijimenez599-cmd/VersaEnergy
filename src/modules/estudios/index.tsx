import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  Archive,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FilePlus2,
  FlaskConical,
  FolderKanban,
  History,
  Link2,
  ListChecks,
  Paperclip,
  Plus,
  RefreshCw,
  SearchCheck,
  Send,
  Target,
} from 'lucide-react'
import { StudyLauncher } from '@/modules/desempeno/views/StudyLauncher'
import type { StudyCandidateResult } from '@/services/energy-study-engine'
import { supabase } from '@/services/supabase'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { EmptyState } from '@/shared/EmptyState'
import { useUIStore } from '@/store/uiStore'

interface MeasurementPointOption {
  id: string
  tag: string
  name: string
  utility: string
  measurement_type: string
  quantity: string
  unit: string
  source_type: string
}

interface BalanceSheetOption {
  id: string
  name: string
  period_start: string
  utility: string | null
}

interface RelevantVariableOption {
  id: string
  name: string
  unit: string
}

interface ScopeOption {
  id: string
  name: string
  code: string | null
  node_type: string
  node_role: string
}

type CaseType =
  | 'energy_study'
  | 'performance_review'
  | 'measurement_gap'
  | 'balance_investigation'
  | 'mv_review'
  | 'internal_audit'
  | 'seu_review'

type StudyStatus =
  | 'draft'
  | 'scoping'
  | 'data_collection'
  | 'data_gap'
  | 'ready_for_analysis'
  | 'analyzing'
  | 'findings_review'
  | 'decision_pending'
  | 'decided'
  | 'promoted'
  | 'closed'
  | 'archived'

type WorkflowStage =
  | 'intake'
  | 'scope'
  | 'data'
  | 'activities'
  | 'analysis'
  | 'findings'
  | 'decision'
  | 'closure'

type DecisionType =
  | 'promote_enpi'
  | 'create_quick_action'
  | 'create_project'
  | 'request_measurement'
  | 'cmms_handoff'
  | 'create_sgen_evidence'
  | 'close_no_action'
  | 'follow_up'

interface StudyCase {
  id: string
  site_id: string
  title: string
  study_type: string
  case_type: CaseType
  scope_type: string
  scope_id: string | null
  scope_label: string | null
  utility: string | null
  period_start: string
  period_end: string
  hypothesis: string | null
  status: StudyStatus
  workflow_stage: WorkflowStage | string
  priority: 'low' | 'medium' | 'high' | 'critical'
  due_date: string | null
  data_sufficiency_status: 'preliminary' | 'usable' | 'defensible' | 'blocked'
  confidence_score: number | null
  final_decision_type: DecisionType | null
  final_decision_target_id: string | null
  closure_summary: string | null
  created_at: string
  updated_at: string
}

interface StudyActivity {
  id: string
  study_id: string
  title: string
  description: string | null
  activity_type: string
  status: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled'
  due_date: string | null
  completed_at: string | null
  notes: string | null
  sort_order: number
}

interface StudyEvidence {
  id: string
  study_id: string
  activity_id: string | null
  evidence_type: string
  title: string
  description: string | null
  url: string | null
  created_at: string
}

interface StudyFinding {
  id: string
  study_id: string
  finding_type: string
  severity: string | null
  confidence: string | null
  title: string
  description: string | null
  created_at: string
}

interface StudyEvent {
  id: string
  study_id: string
  event_type: string
  title: string
  description: string | null
  created_at: string
}

const workflowSteps: Array<{ id: WorkflowStage; label: string; description: string; icon: typeof ClipboardCheck }> = [
  { id: 'intake', label: 'Intake', description: 'Pregunta, prioridad y responsable.', icon: ClipboardCheck },
  { id: 'scope', label: 'Alcance', description: 'Zona, equipo, utility y periodo.', icon: Target },
  { id: 'data', label: 'Datos', description: 'Fuentes, suficiencia y brechas.', icon: BarChart3 },
  { id: 'activities', label: 'Actividades', description: 'Trabajo tecnico tipo OT.', icon: ListChecks },
  { id: 'analysis', label: 'Analisis', description: 'Modelos y laboratorio tecnico.', icon: FlaskConical },
  { id: 'findings', label: 'Hallazgos', description: 'Conclusiones con evidencia.', icon: AlertTriangle },
  { id: 'decision', label: 'Decision', description: 'Transformar en accion real.', icon: Send },
  { id: 'closure', label: 'Cierre', description: 'Resumen e historico.', icon: Archive },
]

const caseTypeLabels: Record<CaseType, string> = {
  energy_study: 'Estudio tecnico',
  performance_review: 'Revision de desempeno',
  measurement_gap: 'Brecha de medicion',
  balance_investigation: 'Investigacion de balance',
  mv_review: 'Revision M&V',
  internal_audit: 'Auditoria interna',
  seu_review: 'Revision SEU',
}

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  scoping: 'Alcance',
  data_collection: 'Recolectando datos',
  data_gap: 'Brecha de datos',
  ready_for_analysis: 'Listo para analisis',
  analyzing: 'Analizando',
  findings_review: 'Revisando hallazgos',
  decision_pending: 'Decision pendiente',
  decided: 'Decidido',
  promoted: 'Promovido',
  closed: 'Cerrado',
  archived: 'Archivado',
}

const decisionLabels: Record<DecisionType, string> = {
  promote_enpi: 'Crear EnPI',
  create_quick_action: 'Crear accion rapida',
  create_project: 'Crear proyecto',
  request_measurement: 'Solicitar medicion',
  cmms_handoff: 'Solicitar Maint/CMMS',
  create_sgen_evidence: 'Crear evidencia SGEn',
  close_no_action: 'Cerrar sin accion',
  follow_up: 'Programar seguimiento',
}

const activityLabels: Record<string, string> = {
  data_validation: 'Validar datos',
  inspection: 'Inspeccion',
  analysis: 'Analisis',
  measurement: 'Medicion',
  operations_review: 'Operacion',
  maintenance_review: 'Mantenimiento',
  documentation: 'Documentacion',
  decision: 'Decision',
}

const initialCaseForm = {
  title: '',
  case_type: 'energy_study' as CaseType,
  priority: 'medium' as StudyCase['priority'],
  utility: 'electricity',
  period_start: '2026-01-01',
  period_end: '2026-06-30',
  due_date: '2026-07-31',
  hypothesis: '',
  scope_type: 'site',
  scope_id: '',
}

const initialActivityForm = {
  title: '',
  description: '',
  activity_type: 'analysis',
  due_date: '',
}

const initialEvidenceForm = {
  title: '',
  description: '',
  evidence_type: 'note',
  url: '',
}

const initialFindingForm = {
  title: '',
  description: '',
  finding_type: 'insight',
  severity: 'medium',
  confidence: 'medium',
}

export default function EstudiosPage() {
  const { selectedSiteId, selectedUtilityType } = useUIStore()
  const [measurementPoints, setMeasurementPoints] = useState<MeasurementPointOption[]>([])
  const [balanceSheets, setBalanceSheets] = useState<BalanceSheetOption[]>([])
  const [relevantVars, setRelevantVars] = useState<RelevantVariableOption[]>([])
  const [scopeOptions, setScopeOptions] = useState<ScopeOption[]>([])
  const [cases, setCases] = useState<StudyCase[]>([])
  const [activities, setActivities] = useState<StudyActivity[]>([])
  const [evidence, setEvidence] = useState<StudyEvidence[]>([])
  const [findings, setFindings] = useState<StudyFinding[]>([])
  const [events, setEvents] = useState<StudyEvent[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState<WorkflowStage>('intake')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [showNewCase, setShowNewCase] = useState(false)
  const [caseForm, setCaseForm] = useState(initialCaseForm)
  const [activityForm, setActivityForm] = useState(initialActivityForm)
  const [evidenceForm, setEvidenceForm] = useState(initialEvidenceForm)
  const [findingForm, setFindingForm] = useState(initialFindingForm)
  const [decisionType, setDecisionType] = useState<DecisionType>('create_quick_action')
  const [decisionNotes, setDecisionNotes] = useState('')

  const selectedCase = useMemo(
    () => cases.find((item) => item.id === selectedCaseId) ?? cases[0] ?? null,
    [cases, selectedCaseId],
  )

  const selectedActivities = useMemo(
    () => activities.filter((item) => item.study_id === selectedCase?.id),
    [activities, selectedCase?.id],
  )

  const selectedEvidence = useMemo(
    () => evidence.filter((item) => item.study_id === selectedCase?.id),
    [evidence, selectedCase?.id],
  )

  const selectedFindings = useMemo(
    () => findings.filter((item) => item.study_id === selectedCase?.id),
    [findings, selectedCase?.id],
  )

  const selectedEvents = useMemo(
    () => events.filter((item) => item.study_id === selectedCase?.id),
    [events, selectedCase?.id],
  )

  const loadStudyInputs = useCallback(async () => {
    if (!selectedSiteId) {
      setMeasurementPoints([])
      setBalanceSheets([])
      setRelevantVars([])
      setScopeOptions([])
      return
    }

    let pointsQuery = supabase
      .from('measurement_points')
      .select('id,tag,name,utility,measurement_type,quantity,unit,source_type')
      .eq('site_id', selectedSiteId)
      .eq('is_active', true)
      .order('tag')

    if (selectedUtilityType) pointsQuery = pointsQuery.eq('utility', selectedUtilityType)

    const [{ data: pointRows }, { data: sheetRows }, { data: variableRows }, { data: assetRows }] = await Promise.all([
      pointsQuery,
      supabase
        .from('energy_balance_sheets')
        .select('id,name,period_start,utility')
        .eq('site_id', selectedSiteId)
        .order('period_start', { ascending: false }),
      supabase
        .from('relevant_variables')
        .select('id,name,unit')
        .eq('site_id', selectedSiteId)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('assets')
        .select('id,name,code,node_type,node_role')
        .eq('site_id', selectedSiteId)
        .order('node_role')
        .order('name'),
    ])

    setMeasurementPoints((pointRows ?? []) as MeasurementPointOption[])
    setBalanceSheets((sheetRows ?? []) as BalanceSheetOption[])
    setRelevantVars((variableRows ?? []) as RelevantVariableOption[])
    setScopeOptions((assetRows ?? []) as ScopeOption[])
  }, [selectedSiteId, selectedUtilityType])

  const loadCases = useCallback(async () => {
    if (!selectedSiteId) {
      setCases([])
      setActivities([])
      setEvidence([])
      setFindings([])
      setEvents([])
      return
    }

    setLoading(true)
    const { data: caseRows, error } = await supabase
      .from('energy_studies')
      .select('id,site_id,title,study_type,case_type,scope_type,scope_id,scope_label,utility,period_start,period_end,hypothesis,status,workflow_stage,priority,due_date,data_sufficiency_status,confidence_score,final_decision_type,final_decision_target_id,closure_summary,created_at,updated_at')
      .eq('site_id', selectedSiteId)
      .order('updated_at', { ascending: false })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    const rows = (caseRows ?? []) as StudyCase[]
    setCases(rows)
    if (!selectedCaseId && rows[0]) setSelectedCaseId(rows[0].id)

    const ids = rows.map((item) => item.id)
    if (!ids.length) {
      setActivities([])
      setEvidence([])
      setFindings([])
      setEvents([])
      setLoading(false)
      return
    }

    const [activityRows, evidenceRows, findingRows, eventRows] = await Promise.all([
      supabase.from('energy_study_activities').select('*').in('study_id', ids).order('sort_order').order('created_at'),
      supabase.from('energy_study_evidence').select('*').in('study_id', ids).order('created_at', { ascending: false }),
      supabase.from('energy_study_findings').select('*').in('study_id', ids).order('created_at', { ascending: false }),
      supabase.from('energy_study_events').select('*').in('study_id', ids).order('created_at', { ascending: false }),
    ])

    setActivities((activityRows.data ?? []) as StudyActivity[])
    setEvidence((evidenceRows.data ?? []) as StudyEvidence[])
    setFindings((findingRows.data ?? []) as StudyFinding[])
    setEvents((eventRows.data ?? []) as StudyEvent[])
    setLoading(false)
  }, [selectedCaseId, selectedSiteId])

  useEffect(() => {
    loadStudyInputs()
    loadCases()
  }, [loadCases, loadStudyInputs])

  useEffect(() => {
    if (selectedCase?.workflow_stage && workflowSteps.some((step) => step.id === selectedCase.workflow_stage)) {
      setActiveStep(selectedCase.workflow_stage as WorkflowStage)
    }
  }, [selectedCase?.id, selectedCase?.workflow_stage])

  async function addEvent(studyId: string, eventType: string, title: string, description?: string, newState: Record<string, unknown> = {}) {
    await supabase.from('energy_study_events').insert({
      study_id: studyId,
      event_type: eventType,
      title,
      description: description || null,
      new_state: newState,
    })
  }

  async function handleCreateCase() {
    if (!selectedSiteId || !caseForm.title.trim()) return
    setSaving(true)
    const scope = scopeOptions.find((item) => item.id === caseForm.scope_id)
    const scopeLabel = caseForm.scope_type === 'site'
      ? 'Sitio completo'
      : scope
        ? `${scope.node_role === 'grouping' ? 'Agrupador' : 'Equipo'} - ${scope.name}`
        : 'Alcance por definir'

    const { data, error } = await supabase
      .from('energy_studies')
      .insert({
        site_id: selectedSiteId,
        title: caseForm.title,
        case_type: caseForm.case_type,
        study_type: mapCaseTypeToStudyType(caseForm.case_type),
        scope_type: caseForm.scope_type,
        scope_id: caseForm.scope_id || null,
        scope_label: scopeLabel,
        utility: caseForm.utility || selectedUtilityType || null,
        period_start: caseForm.period_start,
        period_end: caseForm.period_end,
        due_date: caseForm.due_date || null,
        hypothesis: caseForm.hypothesis || 'Pendiente de formular pregunta tecnica.',
        status: 'scoping',
        workflow_stage: 'intake',
        priority: caseForm.priority,
        data_sufficiency_status: 'preliminary',
        methodology: 'engineering_workbench',
      })
      .select('id')
      .single()

    if (error || !data) {
      setMessage(error?.message ?? 'No se pudo crear el expediente.')
      setSaving(false)
      return
    }

    await Promise.all([
      addEvent(data.id, 'created', 'Expediente creado', caseForm.hypothesis),
      seedDefaultActivities(data.id, caseForm.case_type),
    ])
    setSelectedCaseId(data.id)
    setShowNewCase(false)
    setCaseForm(initialCaseForm)
    setMessage('Expediente creado con actividades base.')
    setSaving(false)
    await loadCases()
  }

  async function seedDefaultActivities(studyId: string, caseType: CaseType) {
    const templates = getActivityTemplates(caseType)
    await supabase.from('energy_study_activities').insert(
      templates.map((item, index) => ({
        study_id: studyId,
        title: item.title,
        description: item.description,
        activity_type: item.activity_type,
        sort_order: index,
      })),
    )
  }

  async function handleSetStep(step: WorkflowStage) {
    if (!selectedCase) return
    setActiveStep(step)
    await supabase
      .from('energy_studies')
      .update({
        workflow_stage: step,
        status: statusForStep(step, selectedCase.status),
      })
      .eq('id', selectedCase.id)
    await addEvent(selectedCase.id, 'scope_changed', `Paso activo: ${workflowSteps.find((item) => item.id === step)?.label ?? step}`)
    await loadCases()
  }

  async function handleUpdateSufficiency(status: StudyCase['data_sufficiency_status']) {
    if (!selectedCase) return
    await supabase
      .from('energy_studies')
      .update({
        data_sufficiency_status: status,
        status: status === 'blocked' ? 'data_gap' : status === 'defensible' ? 'ready_for_analysis' : selectedCase.status,
        workflow_stage: 'data',
      })
      .eq('id', selectedCase.id)
    await addEvent(selectedCase.id, 'sufficiency_updated', `Suficiencia marcada como ${status}`)
    await loadCases()
  }

  async function handleAddActivity() {
    if (!selectedCase || !activityForm.title.trim()) return
    await supabase.from('energy_study_activities').insert({
      study_id: selectedCase.id,
      title: activityForm.title,
      description: activityForm.description || null,
      activity_type: activityForm.activity_type,
      due_date: activityForm.due_date || null,
      sort_order: selectedActivities.length + 1,
    })
    await addEvent(selectedCase.id, 'activity_added', `Actividad agregada: ${activityForm.title}`)
    setActivityForm(initialActivityForm)
    await loadCases()
  }

  async function handleActivityStatus(activity: StudyActivity, status: StudyActivity['status']) {
    await supabase
      .from('energy_study_activities')
      .update({
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', activity.id)
    await addEvent(activity.study_id, 'activity_updated', `Actividad ${statusLabelsForActivity(status)}: ${activity.title}`)
    await loadCases()
  }

  async function handleAddEvidence() {
    if (!selectedCase || !evidenceForm.title.trim()) return
    await supabase.from('energy_study_evidence').insert({
      study_id: selectedCase.id,
      evidence_type: evidenceForm.evidence_type,
      title: evidenceForm.title,
      description: evidenceForm.description || null,
      url: evidenceForm.url || null,
      metadata: { source: 'manual_case_management' },
    })
    await addEvent(selectedCase.id, 'evidence_added', `Evidencia agregada: ${evidenceForm.title}`)
    setEvidenceForm(initialEvidenceForm)
    await loadCases()
  }

  async function handleAddFinding() {
    if (!selectedCase || !findingForm.title.trim()) return
    await supabase.from('energy_study_findings').insert({
      study_id: selectedCase.id,
      finding_type: findingForm.finding_type,
      severity: findingForm.severity,
      confidence: findingForm.confidence,
      title: findingForm.title,
      description: findingForm.description || null,
      evidence: { evidence_count: selectedEvidence.length, source: 'E13 case management' },
    })
    await addEvent(selectedCase.id, 'finding_added', `Hallazgo agregado: ${findingForm.title}`)
    setFindingForm(initialFindingForm)
    await loadCases()
  }

  async function handleFinalDecision() {
    if (!selectedCase) return
    setSaving(true)
    let targetId: string | null = null

    if (decisionType === 'create_quick_action' || decisionType === 'create_project') {
      const { data, error } = await supabase
        .from('energy_improvements')
        .insert({
          site_id: selectedCase.site_id,
          work_type: decisionType === 'create_project' ? 'project' : 'quick_action',
          title: `${decisionType === 'create_project' ? 'Proyecto' : 'Accion'} desde ${selectedCase.title}`,
          description: decisionNotes || selectedCase.hypothesis || 'Derivado desde expediente de Estudios energeticos.',
          status: decisionType === 'create_project' ? 'planned' : 'identified',
          priority: selectedCase.priority,
          category: decisionType === 'create_project' ? 'investment' : 'efficiency',
          utility: selectedCase.utility,
          savings_unit: selectedCase.utility === 'electricity' ? 'kWh' : undefined,
          source_study_id: selectedCase.id,
        })
        .select('id')
        .single()
      if (error) {
        setMessage(error.message)
        setSaving(false)
        return
      }
      targetId = data.id
      if (decisionType === 'create_project') {
        await supabase.from('energy_improvement_projects').insert({
          improvement_id: targetId,
          project_code: `EST-${selectedCase.id.slice(0, 8)}`,
          scope: selectedCase.scope_label,
          business_case: decisionNotes || selectedCase.hypothesis,
          assumptions: 'Proyecto generado desde expediente tecnico de Estudios.',
        })
      }
    }

    if (decisionType === 'promote_enpi') {
      const { data, error } = await supabase
        .from('energy_enpis')
        .insert({
          site_id: selectedCase.site_id,
          name: `EnPI desde ${selectedCase.title}`,
          utility: selectedCase.utility || selectedUtilityType || 'electricity',
          unit: selectedCase.utility === 'electricity' ? 'kWh/unidad relevante' : 'unidad energetica/unidad relevante',
          scope: selectedCase.scope_type === 'system' ? 'utility_system' : selectedCase.scope_type,
          frequency: 'monthly',
          description: decisionNotes || `Promovido desde expediente ${selectedCase.title}.`,
          denominator_type: 'relevant_variable',
          formula: {
            method: 'referential_from_study_case',
            study_id: selectedCase.id,
            scope_label: selectedCase.scope_label,
            notes: decisionNotes,
          },
        })
        .select('id')
        .single()
      if (error) {
        setMessage(error.message)
        setSaving(false)
        return
      }
      targetId = data.id
    }

    await supabase.from('energy_study_decisions').insert({
      study_id: selectedCase.id,
      decision_type: decisionType === 'cmms_handoff' ? 'request_measurement' : decisionType === 'close_no_action' ? 'archive' : decisionType,
      target_id: targetId,
      notes: decisionNotes || decisionLabels[decisionType],
      work_type: decisionType === 'create_project' ? 'project' : decisionType === 'create_quick_action' ? 'quick_action' : null,
      decision_payload: {
        e13DecisionType: decisionType,
        targetId,
        activityCount: selectedActivities.length,
        evidenceCount: selectedEvidence.length,
        findingCount: selectedFindings.length,
      },
    })

    await supabase
      .from('energy_studies')
      .update({
        final_decision_type: decisionType,
        final_decision_target_id: targetId,
        closure_summary: decisionNotes || decisionLabels[decisionType],
        status: decisionType === 'close_no_action' ? 'closed' : 'decided',
        workflow_stage: 'closure',
        closed_at: decisionType === 'close_no_action' ? new Date().toISOString() : null,
      })
      .eq('id', selectedCase.id)

    await addEvent(selectedCase.id, 'decision_recorded', `Decision final: ${decisionLabels[decisionType]}`, decisionNotes, { targetId, decisionType })
    setDecisionNotes('')
    setMessage(targetId ? `Decision registrada y entidad creada: ${targetId.slice(0, 8)}` : 'Decision registrada en el expediente.')
    setSaving(false)
    await loadCases()
  }

  async function handlePromoteCandidate(candidate: StudyCandidateResult) {
    if (!selectedSiteId) return
    const unit = `${candidate.config.numeratorUnit || 'energia'}/${candidate.config.denominatorUnit || 'variable'}`
    const { error } = await supabase.from('energy_enpis').insert({
      site_id: selectedSiteId,
      name: `${candidate.config.numeratorLabel} / ${candidate.config.denominatorLabel}`,
      utility: candidate.config.utility || selectedUtilityType || 'electricity',
      unit,
      scope: candidate.config.scopeType === 'system' ? 'utility_system' : candidate.config.scopeType,
      frequency: 'monthly',
      description: `Promovido desde analisis tecnico de Estudios. Frontera: ${candidate.config.scopeLabel}. Confianza inicial: ${candidate.confidenceScore}%.`,
      numerator_type: candidate.config.numeratorType,
      numerator_ref_id: candidate.config.numeratorRefId || null,
      numerator_side: candidate.config.numeratorSide,
      denominator_type: candidate.config.denominatorRefId ? 'relevant_variable' : 'formula',
      denominator_ref_id: candidate.config.denominatorRefId || null,
      formula: {
        method: 'ratio',
        numerator: { label: candidate.config.numeratorLabel, unit: candidate.config.numeratorUnit },
        denominator: { label: candidate.config.denominatorLabel, unit: candidate.config.denominatorUnit },
        notes: `Creado desde estudio con cobertura ${candidate.coverage}% y confianza ${candidate.confidenceScore}%.`,
      },
    })

    setMessage(error ? error.message : 'EnPI creado desde el analisis tecnico y listo para revisar en Desempeño.')
  }

  const completedCount = selectedActivities.filter((item) => item.status === 'completed').length
  const progress = selectedActivities.length ? Math.round((completedCount / selectedActivities.length) * 100) : 0

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50">
      <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ingenieria energetica</p>
            <h1 className="text-xl font-black tracking-tight text-slate-950">Estudios y auditoria Energetica</h1>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
              Expedientes tecnicos para investigar una zona, ejecutar actividades, adjuntar evidencia, registrar hallazgos y convertir la decision final en EnPI, accion o proyecto.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" icon={<RefreshCw size={13} />} onClick={loadCases} />
            <Button size="sm" leftIcon={<Plus size={13} />} onClick={() => setShowNewCase(true)}>Nuevo expediente</Button>
          </div>
        </div>
        {message && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            {message}
          </div>
        )}
      </div>

      {!selectedSiteId ? (
        <div className="grid min-h-0 flex-1 place-items-center">
          <EmptyState
            icon={<FlaskConical size={48} strokeWidth={1.5} />}
            title="Selecciona una planta"
            description="Estudios y auditoria Energetica necesita una planta para cargar expedientes, medidores, balances y variables relevantes."
          />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden xl:grid-cols-[320px_minmax(0,1fr)_340px]">
          <aside className="min-h-0 overflow-y-auto border-r border-slate-200 bg-white">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inbox de expedientes</p>
              <div className="mt-1 flex items-center justify-between">
                <strong className="text-sm text-slate-900">{cases.length} activos</strong>
                {loading && <span className="text-[11px] font-semibold text-slate-400">Cargando...</span>}
              </div>
            </div>
            <div className="space-y-2 p-3">
              {cases.map((study) => (
                <button
                  key={study.id}
                  onClick={() => setSelectedCaseId(study.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    selectedCase?.id === study.id
                      ? 'border-blue-300 bg-blue-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900">{study.title}</p>
                      <p className="mt-1 truncate text-[11px] font-semibold text-slate-500">{study.scope_label || 'Sin alcance'}</p>
                    </div>
                    <PriorityDot priority={study.priority} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Badge size="sm" variant="neutral">{caseTypeLabels[study.case_type]}</Badge>
                    <Badge size="sm" variant={study.status === 'closed' ? 'ok' : study.status === 'data_gap' ? 'warn' : 'info'}>
                      {statusLabels[study.status] || study.status}
                    </Badge>
                  </div>
                </button>
              ))}
              {!cases.length && (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center">
                  <SearchCheck className="mx-auto text-slate-300" size={30} />
                  <p className="mt-2 text-sm font-bold text-slate-700">Sin expedientes</p>
                  <p className="mt-1 text-xs text-slate-500">Crea el primero para investigar una desviacion o preparar una auditoria.</p>
                </div>
              )}
            </div>
          </aside>

          <main className="min-h-0 overflow-y-auto p-4">
            {selectedCase ? (
              <div className="space-y-4">
                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="info"><SearchCheck size={12} /> {caseTypeLabels[selectedCase.case_type]}</Badge>
                        <Badge variant="neutral"><CalendarDays size={12} /> {selectedCase.period_start} a {selectedCase.period_end}</Badge>
                        {selectedCase.utility && <Badge variant="neutral">{selectedCase.utility}</Badge>}
                      </div>
                      <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950">{selectedCase.title}</h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{selectedCase.hypothesis || 'Pregunta tecnica pendiente.'}</p>
                    </div>
                    <div className="min-w-[180px] rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                        <span>Actividades</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="mt-2 text-[11px] font-semibold text-slate-500">{completedCount} de {selectedActivities.length} completadas</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
                    {workflowSteps.map((step, index) => {
                      const Icon = step.icon
                      const active = activeStep === step.id
                      return (
                        <button
                          key={step.id}
                          onClick={() => handleSetStep(step.id)}
                          className={`rounded-lg border p-3 text-left transition ${
                            active ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`grid h-7 w-7 place-items-center rounded-lg ${active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                              <Icon size={14} />
                            </span>
                            <span className="text-[10px] font-black text-slate-400">{index + 1}</span>
                          </div>
                          <p className="mt-2 text-xs font-black text-slate-900">{step.label}</p>
                          <p className="mt-1 text-[11px] leading-4 text-slate-500">{step.description}</p>
                        </button>
                      )
                    })}
                  </div>
                </section>

                <StepPanel
                  activeStep={activeStep}
                  selectedCase={selectedCase}
                  selectedActivities={selectedActivities}
                  selectedEvidence={selectedEvidence}
                  selectedFindings={selectedFindings}
                  selectedEvents={selectedEvents}
                  measurementPoints={measurementPoints}
                  balanceSheets={balanceSheets}
                  relevantVars={relevantVars}
                  activityForm={activityForm}
                  evidenceForm={evidenceForm}
                  findingForm={findingForm}
                  decisionType={decisionType}
                  decisionNotes={decisionNotes}
                  saving={saving}
                  onActivityForm={setActivityForm}
                  onEvidenceForm={setEvidenceForm}
                  onFindingForm={setFindingForm}
                  onDecisionType={setDecisionType}
                  onDecisionNotes={setDecisionNotes}
                  onAddActivity={handleAddActivity}
                  onActivityStatus={handleActivityStatus}
                  onAddEvidence={handleAddEvidence}
                  onAddFinding={handleAddFinding}
                  onSufficiency={handleUpdateSufficiency}
                  onFinalDecision={handleFinalDecision}
                  studyLauncher={
                    <StudyLauncher
                      siteId={selectedSiteId}
                      selectedUtilityType={selectedUtilityType}
                      measurementPoints={measurementPoints}
                      balanceSheets={balanceSheets}
                      relevantVars={relevantVars}
                      onPromoteCandidate={handlePromoteCandidate}
                    />
                  }
                />
              </div>
            ) : (
              <EmptyState
                icon={<FolderKanban size={48} strokeWidth={1.5} />}
                title="Crea un expediente"
                description="El modulo ahora se organiza como un flujo tecnico con actividades, evidencia, hallazgos y decision final."
                action={<Button leftIcon={<Plus size={14} />} onClick={() => setShowNewCase(true)}>Nuevo expediente</Button>}
              />
            )}
          </main>

          <aside className="min-h-0 overflow-y-auto border-l border-slate-200 bg-white">
            <LiveCasePanel
              selectedCase={selectedCase}
              activities={selectedActivities}
              evidence={selectedEvidence}
              findings={selectedFindings}
              events={selectedEvents}
            />
          </aside>
        </div>
      )}

      {showNewCase && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nuevo expediente</p>
                <h3 className="text-lg font-black text-slate-950">Estudio tipo OT energetica</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowNewCase(false)}>Cerrar</Button>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Titulo" className="md:col-span-2">
                <input value={caseForm.title} onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })} className="input" placeholder="Ej. Investigar consumo base Nave A" />
              </Field>
              <Field label="Tipo">
                <select value={caseForm.case_type} onChange={(e) => setCaseForm({ ...caseForm, case_type: e.target.value as CaseType })} className="input">
                  {Object.entries(caseTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="Prioridad">
                <select value={caseForm.priority} onChange={(e) => setCaseForm({ ...caseForm, priority: e.target.value as StudyCase['priority'] })} className="input">
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="critical">Critica</option>
                </select>
              </Field>
              <Field label="Utility">
                <input value={caseForm.utility} onChange={(e) => setCaseForm({ ...caseForm, utility: e.target.value })} className="input" />
              </Field>
              <Field label="Vence">
                <input type="date" value={caseForm.due_date} onChange={(e) => setCaseForm({ ...caseForm, due_date: e.target.value })} className="input" />
              </Field>
              <Field label="Inicio periodo">
                <input type="date" value={caseForm.period_start} onChange={(e) => setCaseForm({ ...caseForm, period_start: e.target.value })} className="input" />
              </Field>
              <Field label="Fin periodo">
                <input type="date" value={caseForm.period_end} onChange={(e) => setCaseForm({ ...caseForm, period_end: e.target.value })} className="input" />
              </Field>
              <Field label="Alcance">
                <select value={caseForm.scope_type} onChange={(e) => setCaseForm({ ...caseForm, scope_type: e.target.value, scope_id: '' })} className="input">
                  <option value="site">Sitio completo</option>
                  <option value="area">Agrupador / area</option>
                  <option value="equipment">Equipo</option>
                  <option value="custom">Custom</option>
                </select>
              </Field>
              <Field label="Zona / equipo">
                <select value={caseForm.scope_id} onChange={(e) => setCaseForm({ ...caseForm, scope_id: e.target.value })} className="input" disabled={caseForm.scope_type === 'site'}>
                  <option value="">Por definir</option>
                  {scopeOptions
                    .filter((option) => caseForm.scope_type === 'area' ? option.node_role === 'grouping' : caseForm.scope_type === 'equipment' ? option.node_role === 'maintainable' : true)
                    .map((option) => <option key={option.id} value={option.id}>{option.name}{option.code ? ` (${option.code})` : ''}</option>)}
                </select>
              </Field>
              <Field label="Pregunta tecnica / hipotesis" className="md:col-span-2">
                <textarea value={caseForm.hypothesis} onChange={(e) => setCaseForm({ ...caseForm, hypothesis: e.target.value })} className="input min-h-24" placeholder="Que se quiere investigar y por que..." />
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowNewCase(false)}>Cancelar</Button>
              <Button leftIcon={<CheckCircle2 size={14} />} loading={saving} disabled={!caseForm.title.trim()} onClick={handleCreateCase}>Crear expediente</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StepPanel(props: {
  activeStep: WorkflowStage
  selectedCase: StudyCase
  selectedActivities: StudyActivity[]
  selectedEvidence: StudyEvidence[]
  selectedFindings: StudyFinding[]
  selectedEvents: StudyEvent[]
  measurementPoints: MeasurementPointOption[]
  balanceSheets: BalanceSheetOption[]
  relevantVars: RelevantVariableOption[]
  activityForm: typeof initialActivityForm
  evidenceForm: typeof initialEvidenceForm
  findingForm: typeof initialFindingForm
  decisionType: DecisionType
  decisionNotes: string
  saving: boolean
  onActivityForm: (form: typeof initialActivityForm) => void
  onEvidenceForm: (form: typeof initialEvidenceForm) => void
  onFindingForm: (form: typeof initialFindingForm) => void
  onDecisionType: (value: DecisionType) => void
  onDecisionNotes: (value: string) => void
  onAddActivity: () => void
  onActivityStatus: (activity: StudyActivity, status: StudyActivity['status']) => void
  onAddEvidence: () => void
  onAddFinding: () => void
  onSufficiency: (status: StudyCase['data_sufficiency_status']) => void
  onFinalDecision: () => void
  studyLauncher: ReactNode
}) {
  const { activeStep, selectedCase } = props
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {activeStep === 'intake' && (
        <div>
          <SectionTitle icon={<ClipboardCheck size={18} />} title="Intake del expediente" subtitle="Aqui se entiende por que existe el estudio y que resultado espera el ingeniero." />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <InfoTile label="Tipo" value={caseTypeLabels[selectedCase.case_type]} />
            <InfoTile label="Prioridad" value={selectedCase.priority} />
            <InfoTile label="Vencimiento" value={selectedCase.due_date || 'Sin fecha'} />
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Pregunta tecnica</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{selectedCase.hypothesis || 'Pendiente de documentar.'}</p>
          </div>
        </div>
      )}

      {activeStep === 'scope' && (
        <div>
          <SectionTitle icon={<Target size={18} />} title="Alcance y frontera" subtitle="El expediente debe decir donde aplica antes de analizar datos." />
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <InfoTile label="Scope" value={selectedCase.scope_label || selectedCase.scope_type} />
            <InfoTile label="Utility" value={selectedCase.utility || 'Multi-utility'} />
            <InfoTile label="Periodo" value={`${selectedCase.period_start} a ${selectedCase.period_end}`} />
            <InfoTile label="Suficiencia" value={selectedCase.data_sufficiency_status} />
          </div>
        </div>
      )}

      {activeStep === 'data' && (
        <div>
          <SectionTitle icon={<BarChart3 size={18} />} title="Datos y suficiencia" subtitle="No se decide nada importante sin saber si los datos sostienen la conclusion." />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <DataCard title="MeasurementPoints" count={props.measurementPoints.length} detail="Fuentes energeticas activas" />
            <DataCard title="Balances" count={props.balanceSheets.length} detail="Balances disponibles" />
            <DataCard title="Variables relevantes" count={props.relevantVars.length} detail="Drivers disponibles" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(['preliminary', 'usable', 'defensible', 'blocked'] as StudyCase['data_sufficiency_status'][]).map((status) => (
              <Button key={status} size="sm" variant={selectedCase.data_sufficiency_status === status ? 'primary' : 'secondary'} onClick={() => props.onSufficiency(status)}>
                {status}
              </Button>
            ))}
          </div>
        </div>
      )}

      {activeStep === 'activities' && (
        <div>
          <SectionTitle icon={<ListChecks size={18} />} title="Actividades tecnicas" subtitle="Tareas tipo OT energetica: validar, inspeccionar, analizar, documentar y decidir." />
          <div className="mt-4 space-y-2">
            {props.selectedActivities.map((activity) => (
              <div key={activity.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge size="sm" variant={activity.status === 'completed' ? 'ok' : activity.status === 'blocked' ? 'warn' : 'neutral'}>
                      {statusLabelsForActivity(activity.status)}
                    </Badge>
                    <span className="text-[11px] font-bold text-slate-400">{activityLabels[activity.activity_type] || activity.activity_type}</span>
                  </div>
                  <p className="mt-1 text-sm font-black text-slate-900">{activity.title}</p>
                  {activity.description && <p className="mt-1 text-xs leading-5 text-slate-500">{activity.description}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="xs" variant="secondary" onClick={() => props.onActivityStatus(activity, 'in_progress')}>Iniciar</Button>
                  <Button size="xs" leftIcon={<CheckCircle2 size={12} />} onClick={() => props.onActivityStatus(activity, 'completed')}>Completar</Button>
                </div>
              </div>
            ))}
          </div>
          <InlineForm title="Agregar actividad">
            <input value={props.activityForm.title} onChange={(e) => props.onActivityForm({ ...props.activityForm, title: e.target.value })} className="input" placeholder="Titulo de actividad" />
            <select value={props.activityForm.activity_type} onChange={(e) => props.onActivityForm({ ...props.activityForm, activity_type: e.target.value })} className="input">
              {Object.entries(activityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <Button size="sm" leftIcon={<Plus size={13} />} onClick={props.onAddActivity} disabled={!props.activityForm.title.trim()}>Agregar</Button>
          </InlineForm>
        </div>
      )}

      {activeStep === 'analysis' && (
        <div>
          <SectionTitle icon={<FlaskConical size={18} />} title="Analisis tecnico" subtitle="El laboratorio existe, pero ahora vive dentro del expediente." />
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            {props.studyLauncher}
          </div>
        </div>
      )}

      {activeStep === 'findings' && (
        <div>
          <SectionTitle icon={<AlertTriangle size={18} />} title="Hallazgos y evidencia" subtitle="Conclusiones concretas, con severidad, confianza y evidencia asociada." />
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              {props.selectedFindings.map((finding) => (
                <div key={finding.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge size="sm" variant={finding.severity === 'high' || finding.severity === 'critical' ? 'warn' : 'neutral'}>{finding.severity || 'sin severidad'}</Badge>
                    <Badge size="sm" variant="info">{finding.confidence || 'confianza'}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-black text-slate-900">{finding.title}</p>
                  {finding.description && <p className="mt-1 text-xs leading-5 text-slate-500">{finding.description}</p>}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {props.selectedEvidence.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center gap-2">
                    <Paperclip size={13} className="text-slate-400" />
                    <p className="text-sm font-black text-slate-900">{item.title}</p>
                  </div>
                  {item.description && <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>}
                  {item.url && <p className="mt-1 truncate text-xs font-semibold text-blue-600">{item.url}</p>}
                </div>
              ))}
            </div>
          </div>
          <InlineForm title="Agregar evidencia">
            <input value={props.evidenceForm.title} onChange={(e) => props.onEvidenceForm({ ...props.evidenceForm, title: e.target.value })} className="input" placeholder="Titulo evidencia" />
            <input value={props.evidenceForm.url} onChange={(e) => props.onEvidenceForm({ ...props.evidenceForm, url: e.target.value })} className="input" placeholder="URL o referencia" />
            <Button size="sm" leftIcon={<FilePlus2 size={13} />} onClick={props.onAddEvidence} disabled={!props.evidenceForm.title.trim()}>Adjuntar</Button>
          </InlineForm>
          <InlineForm title="Agregar hallazgo">
            <input value={props.findingForm.title} onChange={(e) => props.onFindingForm({ ...props.findingForm, title: e.target.value })} className="input" placeholder="Titulo hallazgo" />
            <select value={props.findingForm.severity} onChange={(e) => props.onFindingForm({ ...props.findingForm, severity: e.target.value })} className="input">
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Critica</option>
            </select>
            <Button size="sm" leftIcon={<Plus size={13} />} onClick={props.onAddFinding} disabled={!props.findingForm.title.trim()}>Agregar</Button>
          </InlineForm>
        </div>
      )}

      {activeStep === 'decision' && (
        <div>
          <SectionTitle icon={<Send size={18} />} title="Decision final" subtitle="El estudio debe convertirse en algo: EnPI, accion, proyecto, medicion, handoff o cierre." />
          <div className="mt-4 grid gap-2 md:grid-cols-4">
            {(Object.keys(decisionLabels) as DecisionType[]).map((value) => (
              <button
                key={value}
                onClick={() => props.onDecisionType(value)}
                className={`rounded-lg border p-3 text-left text-xs font-black transition ${
                  props.decisionType === value ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {decisionLabels[value]}
              </button>
            ))}
          </div>
          <textarea value={props.decisionNotes} onChange={(e) => props.onDecisionNotes(e.target.value)} className="input mt-4 min-h-28" placeholder="Razon tecnica de la decision final..." />
          <div className="mt-3 flex justify-end">
            <Button leftIcon={<Send size={14} />} loading={props.saving} onClick={props.onFinalDecision}>
              Registrar decision
            </Button>
          </div>
        </div>
      )}

      {activeStep === 'closure' && (
        <div>
          <SectionTitle icon={<History size={18} />} title="Cierre e historico" subtitle="Todo movimiento importante queda como bitacora append-only." />
          <div className="mt-4 space-y-2">
            {props.selectedEvents.map((event) => (
              <div key={event.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-black text-slate-900">{event.title}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">{new Date(event.created_at).toLocaleString()}</p>
                {event.description && <p className="mt-1 text-xs leading-5 text-slate-500">{event.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function LiveCasePanel({ selectedCase, activities, evidence, findings, events }: {
  selectedCase: StudyCase | null
  activities: StudyActivity[]
  evidence: StudyEvidence[]
  findings: StudyFinding[]
  events: StudyEvent[]
}) {
  if (!selectedCase) {
    return <div className="p-4 text-sm text-slate-500">Sin expediente seleccionado.</div>
  }
  return (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expediente vivo</p>
        <h3 className="mt-1 text-base font-black text-slate-950">{selectedCase.title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InfoTile label="Estado" value={statusLabels[selectedCase.status] || selectedCase.status} />
        <InfoTile label="Suficiencia" value={selectedCase.data_sufficiency_status} />
        <InfoTile label="Actividades" value={`${activities.filter((a) => a.status === 'completed').length}/${activities.length}`} />
        <InfoTile label="Evidencias" value={String(evidence.length)} />
        <InfoTile label="Hallazgos" value={String(findings.length)} />
        <InfoTile label="Decision" value={selectedCase.final_decision_type ? decisionLabels[selectedCase.final_decision_type] : 'Pendiente'} />
      </div>
      <div className="rounded-lg border border-slate-200 p-3">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Salida final</p>
        {selectedCase.final_decision_type ? (
          <div className="mt-2 space-y-2">
            <Badge variant="ok"><CheckCircle2 size={12} /> {decisionLabels[selectedCase.final_decision_type]}</Badge>
            {selectedCase.final_decision_target_id && (
              <p className="flex items-center gap-2 text-xs font-semibold text-blue-600">
                <Link2 size={12} /> {selectedCase.final_decision_target_id}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-xs leading-5 text-slate-500">El expediente aun no se ha transformado en EnPI, accion, proyecto o cierre.</p>
        )}
      </div>
      <div className="rounded-lg border border-slate-200 p-3">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Ultimos eventos</p>
        <div className="mt-3 space-y-3">
          {events.slice(0, 5).map((event) => (
            <div key={event.id} className="border-l-2 border-slate-200 pl-3">
              <p className="text-xs font-black text-slate-800">{event.title}</p>
              <p className="text-[11px] text-slate-400">{new Date(event.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">{icon}</div>
      <div>
        <h3 className="text-base font-black text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p>
      </div>
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-900">{value}</p>
    </div>
  )
}

function DataCard({ title, count, detail }: { title: string; count: number; detail: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-2xl font-black text-slate-950">{count}</p>
      <p className="mt-1 text-sm font-black text-slate-800">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  )
}

function Field({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">{label}</span>
      {children}
    </label>
  )
}

function InlineForm({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
      <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">{title}</p>
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_220px_auto]">{children}</div>
    </div>
  )
}

function PriorityDot({ priority }: { priority: StudyCase['priority'] }) {
  const color = priority === 'critical' ? 'bg-red-500' : priority === 'high' ? 'bg-amber-500' : priority === 'medium' ? 'bg-blue-500' : 'bg-slate-300'
  return <span className={`mt-1 h-2.5 w-2.5 rounded-full ${color}`} />
}

function mapCaseTypeToStudyType(caseType: CaseType) {
  if (caseType === 'measurement_gap') return 'loss_hunt'
  if (caseType === 'balance_investigation') return 'area_process_intensity'
  if (caseType === 'mv_review') return 'mv_guardian'
  if (caseType === 'performance_review') return 'baseline_model'
  return 'area_process_intensity'
}

function statusForStep(step: WorkflowStage, current: StudyStatus): StudyStatus {
  if (current === 'closed' || current === 'archived' || current === 'decided') return current
  const map: Record<WorkflowStage, StudyStatus> = {
    intake: 'scoping',
    scope: 'scoping',
    data: 'data_collection',
    activities: 'data_collection',
    analysis: 'analyzing',
    findings: 'findings_review',
    decision: 'decision_pending',
    closure: 'closed',
  }
  return map[step]
}

function statusLabelsForActivity(status: StudyActivity['status']) {
  const map: Record<StudyActivity['status'], string> = {
    pending: 'Pendiente',
    in_progress: 'En progreso',
    blocked: 'Bloqueada',
    completed: 'Completada',
    cancelled: 'Cancelada',
  }
  return map[status]
}

function getActivityTemplates(caseType: CaseType) {
  const common = [
    { title: 'Confirmar alcance con operacion', description: 'Validar zona, equipos incluidos, periodo y utility.', activity_type: 'operations_review' },
    { title: 'Validar fuentes de medicion', description: 'Revisar MeasurementPoints, medidores embebidos, acumuladores y calidad.', activity_type: 'data_validation' },
    { title: 'Comparar energia contra variable relevante', description: 'Usar balance, medidor o EnPI segun aplique.', activity_type: 'analysis' },
    { title: 'Documentar evidencia', description: 'Adjuntar tendencia, foto, CSV, reporte o referencia CMMS.', activity_type: 'documentation' },
    { title: 'Registrar decision final', description: 'Convertir el expediente en EnPI, accion, proyecto, solicitud o cierre.', activity_type: 'decision' },
  ]
  if (caseType === 'measurement_gap') {
    return [
      { title: 'Identificar frontera no cubierta', description: 'Ubicar que equipo, agrupador o utility no tiene medicion suficiente.', activity_type: 'measurement' },
      ...common,
    ]
  }
  if (caseType === 'internal_audit') {
    return [
      { title: 'Preparar paquete de evidencia', description: 'Reunir EnPIs, balances, acciones, M&V y revisiones previas.', activity_type: 'documentation' },
      ...common,
    ]
  }
  return common
}
