import { supabase } from '@/services/supabase'
import type {
  CmmsHandoffStatus,
  EnergyCmmsHandoffRequest,
  EnergyImprovement,
  EnergyImprovementEvent,
  EnergyMvPlan,
  MvPlanStatus,
} from '@/modules/acciones/types'

export interface CreateMvPlanInput {
  improvement: EnergyImprovement
  method?: EnergyMvPlan['method']
  baselineSourceType?: EnergyMvPlan['baseline_source_type']
  baselineSourceId?: string
  acceptanceCriteria?: string
  calculationNotes?: string
}

export interface CreateCmmsHandoffInput {
  improvement: EnergyImprovement
  requestType?: EnergyCmmsHandoffRequest['request_type']
  title?: string
  description?: string
  energyRationale?: string
}

export async function loadExecutionLedger(improvementId: string) {
  const [mvPlans, handoffs, events] = await Promise.all([
    listMvPlans(improvementId),
    listCmmsHandoffs(improvementId),
    listImprovementEvents(improvementId),
  ])

  return { mvPlans, handoffs, events }
}

export async function listMvPlans(improvementId: string): Promise<EnergyMvPlan[]> {
  const { data, error } = await supabase
    .from('energy_mv_plans')
    .select('*')
    .eq('improvement_id', improvementId)
    .order('version', { ascending: false })

  if (error) throw error
  return (data || []) as EnergyMvPlan[]
}

export async function createMvPlan(input: CreateMvPlanInput): Promise<EnergyMvPlan> {
  const { improvement } = input
  const existing = await listMvPlans(improvement.id)
  const version = existing.length > 0 ? Math.max(...existing.map((plan) => plan.version || 1)) + 1 : 1
  const method = input.method || normalizeMvMethod(improvement.measurement_verification_method)

  const payload = {
    improvement_id: improvement.id,
    version,
    status: 'approved',
    method,
    baseline_source_type: input.baselineSourceType || inferBaselineSourceType(improvement),
    baseline_source_id: input.baselineSourceId || improvement.source_balance_id || improvement.source_enpi_id || improvement.source_study_id || null,
    baseline_period_start: improvement.planned_start || null,
    baseline_period_end: improvement.planned_finish || null,
    verification_period_start: improvement.monitoring_start || improvement.planned_finish || null,
    verification_period_end: improvement.monitoring_end || null,
    expected_savings: Number(improvement.estimated_energy_savings || 0),
    expected_savings_unit: improvement.savings_unit || null,
    acceptance_criteria: input.acceptanceCriteria || defaultAcceptanceCriteria(improvement),
    calculation_notes: input.calculationNotes || defaultCalculationNotes(improvement),
    evidence_ref: {
      source_study_id: improvement.source_study_id || null,
      source_study_model_id: improvement.source_study_model_id || null,
      source_balance_id: improvement.source_balance_id || null,
      source_enpi_id: improvement.source_enpi_id || null,
    },
  }

  const { data, error } = await supabase
    .from('energy_mv_plans')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error

  await supabase
    .from('energy_improvements')
    .update({
      mv_plan_status: 'approved' satisfies MvPlanStatus,
      measurement_verification_method: method,
      updated_at: new Date().toISOString(),
    })
    .eq('id', improvement.id)

  await recordImprovementEvent({
    improvement_id: improvement.id,
    site_id: improvement.site_id,
    event_type: 'mv_plan_defined',
    source_type: 'mv_plan',
    source_id: data.id,
    new_state: { version, status: 'approved', method },
    notes: 'Plan M&V E9 creado desde Acciones.',
  })

  return data as EnergyMvPlan
}

export async function listCmmsHandoffs(improvementId: string): Promise<EnergyCmmsHandoffRequest[]> {
  const { data, error } = await supabase
    .from('energy_cmms_handoff_requests')
    .select('*')
    .eq('improvement_id', improvementId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as EnergyCmmsHandoffRequest[]
}

export async function createCmmsHandoffRequest(input: CreateCmmsHandoffInput): Promise<EnergyCmmsHandoffRequest> {
  const { improvement } = input
  const title = input.title || `Solicitud Maint/CMMS — ${improvement.title}`

  const payload = {
    site_id: improvement.site_id,
    improvement_id: improvement.id,
    request_direction: 'energy_to_cmms',
    request_type: input.requestType || 'efficiency_work_request',
    status: 'requested',
    target_equipment_id: improvement.equipment_id || null,
    title,
    description: input.description || improvement.description || title,
    energy_rationale: input.energyRationale || defaultMaintenanceRationale(improvement),
    estimated_savings: Number(improvement.estimated_energy_savings || 0),
    savings_unit: improvement.savings_unit || null,
    maintenance_priority: improvement.priority || 'medium',
    requested_at: new Date().toISOString(),
    cmms_response: {
      stewardship: 'Maint/CMMS owns WO creation when both apps are active.',
      energy_role: 'requestor_and_mv_owner',
    },
  }

  const { data, error } = await supabase
    .from('energy_cmms_handoff_requests')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error

  await supabase
    .from('energy_improvements')
    .update({
      cmms_handoff_status: 'requested' satisfies CmmsHandoffStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', improvement.id)

  await recordImprovementEvent({
    improvement_id: improvement.id,
    site_id: improvement.site_id,
    event_type: 'sent_to_cmms',
    source_type: 'handoff',
    source_id: data.id,
    new_state: { request_type: payload.request_type, status: 'requested' },
    notes: 'Solicitud enviada a Maint/CMMS. Energy no crea OT directa.',
  })

  return data as EnergyCmmsHandoffRequest
}

export async function recordImprovementEvent(
  event: Omit<EnergyImprovementEvent, 'id' | 'created_at'>,
): Promise<EnergyImprovementEvent> {
  const { data, error } = await supabase
    .from('energy_improvement_events')
    .insert({
      improvement_id: event.improvement_id || null,
      site_id: event.site_id || null,
      event_type: event.event_type,
      actor_profile_id: event.actor_profile_id || null,
      source_type: event.source_type || null,
      source_id: event.source_id || null,
      previous_state: event.previous_state || {},
      new_state: event.new_state || {},
      notes: event.notes || null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as EnergyImprovementEvent
}

export async function listImprovementEvents(improvementId: string): Promise<EnergyImprovementEvent[]> {
  const { data, error } = await supabase
    .from('energy_improvement_events')
    .select('*')
    .eq('improvement_id', improvementId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as EnergyImprovementEvent[]
}

function normalizeMvMethod(value?: string): EnergyMvPlan['method'] {
  if (value === 'before_after' || value === 'baseline_model' || value === 'metered' || value === 'engineering_estimate') {
    return value
  }
  return 'baseline_model'
}

function inferBaselineSourceType(improvement: EnergyImprovement): EnergyMvPlan['baseline_source_type'] {
  if (improvement.source_balance_id) return 'balance_result'
  if (improvement.source_enpi_id) return 'enpi'
  if (improvement.source_study_id) return 'study'
  return 'manual'
}

function defaultAcceptanceCriteria(improvement: EnergyImprovement) {
  const savings = Number(improvement.estimated_energy_savings || 0).toLocaleString()
  const unit = improvement.savings_unit || 'unidad energetica'
  return `Aceptar si el ahorro verificado sostiene al menos 80% del ahorro esperado (${savings} ${unit}) durante la ventana de verificacion.`
}

function defaultCalculationNotes(improvement: EnergyImprovement) {
  const source = improvement.source_study_id ? 'estudio energetico origen' : improvement.source_balance_id ? 'balance oficial' : 'linea base manual'
  return `M&V inicial generado desde ${source}. Ajustar variables relevantes y periodo antes de cerrar la mejora.`
}

function defaultMaintenanceRationale(improvement: EnergyImprovement) {
  const savings = Number(improvement.estimated_energy_savings || 0).toLocaleString()
  const unit = improvement.savings_unit || ''
  return `Trabajo solicitado por impacto energetico esperado de ${savings} ${unit}. Maint/CMMS debe evaluar activo mantenible, prioridad y OT; Energy conserva M&V y evidencia de ahorro.`
}
