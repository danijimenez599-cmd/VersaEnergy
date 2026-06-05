import { supabase } from '@/services/supabase'
import type { PersistedEnergyStudy, SaveStudyCandidateParams, StudyActionResult, StudyCandidateResult, StudyModelType } from './types'

function currentStudyPeriod(candidate: SaveStudyCandidateParams['candidate']) {
  const first = candidate.points[0]
  const last = candidate.points[candidate.points.length - 1]
  return {
    start: first?.periodStart ?? new Date().toISOString().slice(0, 10),
    end: last?.periodEnd ?? new Date().toISOString().slice(0, 10),
  }
}

function defaultTitle(candidate: SaveStudyCandidateParams['candidate']) {
  return `${candidate.config.scopeLabel}: ${candidate.config.numeratorLabel} / ${candidate.config.denominatorLabel}`
}

function severityFromFinding(ok: boolean) {
  return ok ? 'low' : 'medium'
}

function dbModelType(modelType: StudyModelType) {
  const map: Record<StudyModelType, 'ratio' | 'regression' | 'regression_simple' | 'efficiency' | 'cusum' | 'mv'> = {
    ratio: 'ratio',
    stability_band: 'regression',
    best_period: 'efficiency',
    regression_simple: 'regression_simple',
    cusum_watch: 'cusum',
    mv_guardian: 'mv',
  }
  return map[modelType]
}

function actionPriority(candidate: StudyCandidateResult) {
  if (candidate.deltaPercent != null && candidate.deltaPercent > 10) return 'high'
  if (candidate.confidenceScore < 45) return 'low'
  return 'medium'
}

function actionCategory(candidate: StudyCandidateResult) {
  if (candidate.coverage < 70) return 'measurement'
  if (candidate.config.studyType === 'loss_hunt') return 'leakage'
  if (candidate.config.studyType === 'peak_detective') return 'controls'
  return 'efficiency'
}

function sourceMeasurementPointIds(candidate: StudyCandidateResult) {
  if (candidate.config.numeratorType !== 'measurement_point' || !candidate.config.numeratorRefId) return null
  return [candidate.config.numeratorRefId]
}

export async function saveStudyCandidate(params: SaveStudyCandidateParams): Promise<PersistedEnergyStudy> {
  const { candidate } = params
  const period = currentStudyPeriod(candidate)
  const userId = (await supabase.auth.getUser()).data.user?.id ?? null

  const { data: study, error: studyError } = await supabase
    .from('energy_studies')
    .insert({
      site_id: params.siteId,
      title: params.title?.trim() || defaultTitle(candidate),
      study_type: candidate.config.studyType,
      scope_type: candidate.config.scopeType,
      scope_id: candidate.config.scopeId,
      scope_label: candidate.config.scopeLabel,
      utility: candidate.config.utility,
      period_start: period.start,
      period_end: period.end,
      hypothesis: params.hypothesis?.trim() || null,
      status: params.decisionType === 'promote_enpi' ? 'promoted' : params.decisionType ? 'decided' : 'analyzing',
      confidence_score: candidate.confidenceScore,
      created_by: userId,
    })
    .select('*')
    .single()

  if (studyError) throw studyError

  const studyId = study.id as string
  const selectedVariable = candidate.variableCandidates.find((variable) => variable.selected)
  const sourceRows = [
    {
      study_id: studyId,
      source_type: candidate.config.numeratorType,
      source_id: candidate.config.numeratorRefId,
      label: candidate.config.numeratorLabel,
      utility: candidate.config.utility,
      quantity: 'energy',
      unit: candidate.config.numeratorUnit,
      aggregation_method: candidate.config.numeratorType === 'measurement_point' ? 'sum' : null,
      data_role: 'numerator',
      expected_impact: 'unknown',
      sort_order: 0,
    },
    {
      study_id: studyId,
      source_type: 'relevant_variable',
      source_id: candidate.config.denominatorRefId,
      label: candidate.config.denominatorLabel,
      utility: null,
      quantity: 'relevant_variable',
      unit: candidate.config.denominatorUnit,
      aggregation_method: 'sum',
      data_role: 'denominator',
      expected_impact: 'neutral',
      quality_notes: selectedVariable
        ? `Relevancia ${selectedVariable.relevanceScore}/100; cobertura ${selectedVariable.coveragePercent}%; correlacion ${selectedVariable.correlationScore == null ? 'n/a' : selectedVariable.correlationScore.toFixed(2)}.`
        : null,
      sort_order: 1,
    },
  ]

  const modelRows = candidate.modelComparisons.map((model) => ({
    study_id: studyId,
    model_type: dbModelType(model.id),
    formula: {
      modelId: model.id,
      modelLabel: model.label,
      numerator: candidate.config.numeratorLabel,
      denominator: candidate.config.denominatorLabel,
      unit: candidate.unit,
      points: candidate.points,
    },
    statistics: {
      coverage: candidate.coverage,
      validPointCount: candidate.validPointCount,
      numeratorPointCount: candidate.numeratorPointCount,
      denominatorPointCount: candidate.denominatorPointCount,
      latestValue: model.latestValue,
      referenceValue: model.referenceValue,
      deltaPercent: model.deltaPercent,
      warnings: candidate.warnings,
    },
    assumptions: {
      source: 'energy-study-engine',
      assumptions: model.assumptions,
    },
    output_unit: model.outputUnit,
    quality_score: model.qualityScore,
    is_selected: model.recommended,
  }))

  const findingRows = candidate.findings.map((finding) => ({
    study_id: studyId,
    finding_type: finding.ok ? 'insight' : 'data_gap',
    severity: severityFromFinding(finding.ok),
    confidence: candidate.confidenceScore >= 70 ? 'high' : candidate.confidenceScore >= 40 ? 'medium' : 'low',
    title: finding.text,
    description: finding.ok ? 'Criterio tecnico satisfecho.' : 'Criterio tecnico pendiente antes de gobernar la metrica.',
    evidence: { findingId: finding.id },
  }))

  const variableRows = candidate.variableCandidates.map((variable) => ({
    study_id: studyId,
    variable_type: variable.variableType,
    variable_id: variable.variableRefId,
    label: variable.label,
    unit: variable.unit,
    physical_rationale: variable.physicalRationale,
    coverage_percent: variable.coveragePercent,
    correlation_score: variable.correlationScore,
    stability_score: variable.stabilityScore,
    relevance_score: variable.relevanceScore,
    selected: variable.selected,
    recommendation: variable.recommendation,
    statistics: variable.statistics,
  }))

  const [{ error: sourcesError }, { error: modelError }, { error: findingsError }, { error: variablesError }] = await Promise.all([
    supabase.from('energy_study_sources').insert(sourceRows),
    supabase.from('energy_study_models').insert(modelRows),
    supabase.from('energy_study_findings').insert(findingRows),
    variableRows.length > 0
      ? supabase.from('energy_study_variable_candidates').insert(variableRows)
      : Promise.resolve({ error: null }),
  ])

  if (sourcesError) throw sourcesError
  if (modelError) throw modelError
  if (findingsError) throw findingsError
  if (variablesError) throw variablesError

  if (params.decisionType) {
    const { error: decisionError } = await supabase.from('energy_study_decisions').insert({
      study_id: studyId,
      decision_type: params.decisionType,
      target_id: params.decisionTargetId ?? null,
      notes: params.decisionNotes ?? null,
      work_type: params.decisionType === 'create_project' ? 'project'
        : params.decisionType === 'create_quick_action' ? 'quick_action'
        : null,
      decision_payload: {
        confidenceScore: candidate.confidenceScore,
        coverage: candidate.coverage,
        selectedVariable: selectedVariable ?? null,
        recommendedModel: candidate.modelComparisons.find((model) => model.recommended) ?? null,
      },
      decided_by: userId,
    })
    if (decisionError) throw decisionError
  }

  return study as PersistedEnergyStudy
}

export async function recordStudyDecision(
  studyId: string,
  decisionType: NonNullable<SaveStudyCandidateParams['decisionType']>,
  targetId: string | null,
  notes?: string,
) {
  const userId = (await supabase.auth.getUser()).data.user?.id ?? null
  const { error } = await supabase.from('energy_study_decisions').insert({
    study_id: studyId,
    decision_type: decisionType,
    target_id: targetId,
    notes: notes ?? null,
    work_type: decisionType === 'create_project' ? 'project'
      : decisionType === 'create_quick_action' ? 'quick_action'
      : null,
    decision_payload: {},
    decided_by: userId,
  })
  if (error) throw error

  const { error: statusError } = await supabase
    .from('energy_studies')
    .update({ status: decisionType === 'promote_enpi' ? 'promoted' : 'decided' })
    .eq('id', studyId)
  if (statusError) throw statusError
}

export async function createImprovementFromStudyCandidate(siteId: string, candidate: StudyCandidateResult): Promise<StudyActionResult> {
  return createWorkFromStudyCandidate(siteId, candidate, candidate.confidenceScore >= 70 ? 'project' : 'quick_action')
}

export async function createQuickActionFromStudyCandidate(siteId: string, candidate: StudyCandidateResult): Promise<StudyActionResult> {
  return createWorkFromStudyCandidate(siteId, candidate, 'quick_action')
}

export async function createProjectFromStudyCandidate(siteId: string, candidate: StudyCandidateResult): Promise<StudyActionResult> {
  return createWorkFromStudyCandidate(siteId, candidate, 'project')
}

async function createWorkFromStudyCandidate(
  siteId: string,
  candidate: StudyCandidateResult,
  workType: 'quick_action' | 'project',
): Promise<StudyActionResult> {
  const study = await saveStudyCandidate({
    siteId,
    candidate,
    decisionNotes: workType === 'project'
      ? 'Estudio guardado antes de crear proyecto de mejora.'
      : 'Estudio guardado antes de crear accion rapida.',
  })

  const { data: selectedModel } = await supabase
    .from('energy_study_models')
    .select('id')
    .eq('study_id', study.id)
    .eq('is_selected', true)
    .maybeSingle()

  const { data: improvement, error } = await supabase
    .from('energy_improvements')
    .insert({
      site_id: siteId,
      work_type: workType,
      title: workType === 'project'
        ? `Proyecto: ${candidate.config.scopeLabel} - ${candidate.config.numeratorLabel}`
        : `Accion rapida: ${candidate.config.scopeLabel} - ${candidate.config.numeratorLabel}`,
      description: [
        `Accion creada desde estudio energetico: ${study.title}.`,
        `Frontera: ${candidate.config.scopeLabel}.`,
        `Ultimo valor: ${candidate.latestValue == null ? 'sin dato' : candidate.latestValue.toFixed(4)} ${candidate.unit}.`,
        candidate.warnings.length > 0 ? `Advertencias: ${candidate.warnings.join(' ')}` : 'Sin advertencias criticas de datos.',
      ].join('\n'),
      status: 'identified',
      priority: actionPriority(candidate),
      category: actionCategory(candidate),
      utility: candidate.config.utility,
      source_measurement_point_ids: sourceMeasurementPointIds(candidate),
      source_study_id: study.id,
      source_study_model_id: selectedModel?.id ?? null,
      estimated_energy_savings: 0,
      savings_unit: candidate.config.numeratorUnit,
      estimated_cost_savings: 0,
      measurement_verification_method: candidate.config.studyType === 'mv_guardian' || candidate.config.studyType === 'baseline_model'
        ? 'baseline_model'
        : 'engineering_estimate',
    })
    .select('id')
    .single()

  if (error) throw error

  if (workType === 'project') {
    await supabase.from('energy_improvement_projects').insert({
      improvement_id: improvement.id,
      project_code: `PRJ-${String(improvement.id).slice(0, 8).toUpperCase()}`,
      scope: candidate.config.scopeLabel,
      business_case: `Proyecto originado en estudio con confianza ${candidate.confidenceScore}% y cobertura ${candidate.coverage}%.`,
      assumptions: candidate.modelComparisons.find((model) => model.recommended)?.assumptions.join('\n') ?? null,
      risk_notes: candidate.warnings.join('\n') || null,
    })

    const start = new Date().toISOString().slice(0, 10)
    const { data: phases } = await supabase
      .from('energy_project_phases')
      .insert([
        {
          improvement_id: improvement.id,
          order: 1,
          name: 'Ingenieria y alcance',
          description: 'Confirmar frontera, datos, presupuesto y solucion tecnica.',
          planned_start: start,
        },
        {
          improvement_id: improvement.id,
          order: 2,
          name: 'Implementacion',
          description: 'Ejecutar tareas de campo, compras o cambios de control.',
          planned_start: start,
        },
        {
          improvement_id: improvement.id,
          order: 3,
          name: 'M&V y cierre',
          description: 'Medir ahorro, capturar evidencia y cerrar lecciones aprendidas.',
          planned_start: start,
        },
      ])
      .select('id, order')

    const phaseByOrder = new Map((phases ?? []).map((phase) => [phase.order, phase.id]))
    await supabase.from('energy_project_tasks').insert([
      {
        improvement_id: improvement.id,
        phase_id: phaseByOrder.get(1) ?? null,
        title: 'Validar baseline, variables relevantes y criterios de exito',
        priority: 'high',
      },
      {
        improvement_id: improvement.id,
        phase_id: phaseByOrder.get(2) ?? null,
        title: 'Ejecutar intervencion tecnica aprobada',
        priority: 'high',
      },
      {
        improvement_id: improvement.id,
        phase_id: phaseByOrder.get(3) ?? null,
        title: 'Verificar ahorro y generar evidencia SGEn',
        priority: 'normal',
      },
    ])
  }

  await recordStudyDecision(
    study.id,
    workType === 'project' ? 'create_project' : 'create_quick_action',
    improvement.id,
    workType === 'project'
      ? 'Proyecto generado desde el Centro de Estudios Energeticos.'
      : 'Accion rapida generada desde el Centro de Estudios Energeticos.',
  )

  return { study, targetId: improvement.id }
}

export async function createSgenEvidenceFromStudyCandidate(siteId: string, candidate: StudyCandidateResult): Promise<StudyActionResult> {
  const study = await saveStudyCandidate({
    siteId,
    candidate,
    decisionNotes: 'Estudio guardado antes de crear evidencia SGEn.',
  })

  const userId = (await supabase.auth.getUser()).data.user?.id ?? null
  const { data: evidence, error } = await supabase
    .from('sgen_evidence')
    .insert({
      site_id: siteId,
      title: `Estudio energetico: ${study.title}`,
      description: [
        `Snapshot tecnico generado desde el Centro de Estudios Energeticos.`,
        `Tipo: ${candidate.config.studyType}. Confianza: ${candidate.confidenceScore}%.`,
        `Metrica: ${candidate.config.numeratorLabel} / ${candidate.config.denominatorLabel} (${candidate.unit}).`,
      ].join('\n'),
      domain: 'energy_review',
      linked_entity_type: 'energy_study',
      linked_entity_id: study.id,
      source_type: 'system_snapshot',
      content_origin: 'app_original',
      captured_by: userId,
      status: 'accepted',
    })
    .select('id')
    .single()

  if (error) throw error

  await recordStudyDecision(
    study.id,
    'create_sgen_evidence',
    evidence.id,
    'Evidencia SGEn generada desde el Centro de Estudios Energeticos.',
  )

  return { study, targetId: evidence.id }
}

export async function listRecentStudies(siteId: string, limit = 8): Promise<PersistedEnergyStudy[]> {
  const { data, error } = await supabase
    .from('energy_studies')
    .select('*')
    .eq('site_id', siteId)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as PersistedEnergyStudy[]
}
