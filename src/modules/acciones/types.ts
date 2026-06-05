export type ImprovementWorkType = 'quick_action' | 'project'

export type ImprovementStatus =
  | 'identified' | 'triage' | 'approved' | 'planned'
  | 'in_progress' | 'verification' | 'closed' | 'cancelled'

export type ImprovementCategory =
  | 'leakage' | 'efficiency' | 'behavioral' | 'maintenance'
  | 'controls' | 'measurement' | 'investment' | 'iso'

export type ImprovementPriority = 'low' | 'medium' | 'high' | 'critical'

export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'paused'
export type TaskStatus = 'pending' | 'in_progress' | 'completed'
export type TaskPriority = 'normal' | 'high' | 'urgent'
export type MvPlanStatus = 'not_defined' | 'draft' | 'approved' | 'in_progress' | 'verified' | 'failed'
export type CmmsHandoffStatus = 'not_required' | 'draft' | 'requested' | 'accepted' | 'rejected' | 'work_order_created' | 'completed' | 'cancelled'
export type AuditStatus = 'open' | 'ready_for_review' | 'reviewed' | 'locked'

export interface EnergyImprovement {
  id: string
  site_id: string
  work_type: ImprovementWorkType
  title: string
  description: string
  status: ImprovementStatus
  priority: ImprovementPriority
  category: ImprovementCategory

  utility: string
  area_id?: string
  equipment_id?: string
  utility_system_id?: string
  source_node_ids?: string[]
  source_edge_ids?: string[]
  source_measurement_point_ids?: string[]
  source_balance_id?: string
  source_enpi_id?: string
  source_study_id?: string
  source_study_model_id?: string

  owner_id: string
  sponsor_id?: string
  department?: string

  estimated_energy_savings: number
  savings_unit: string
  estimated_cost_savings: number
  estimated_co2e_savings?: number
  estimated_investment: number
  currency: string
  payback_months?: number

  actual_energy_savings?: number
  actual_cost_savings?: number
  actual_co2e_savings?: number
  measurement_verification_method?: string
  mv_plan_status?: MvPlanStatus
  cmms_handoff_status?: CmmsHandoffStatus
  audit_status?: AuditStatus
  monitoring_start?: string
  monitoring_end?: string
  monitoring_status?: 'not_started' | 'in_progress' | 'passed' | 'failed'
  monitoring_notes?: string

  identified_at: string
  approved_at?: string
  planned_start?: string
  planned_finish?: string
  actual_start?: string
  actual_finish?: string

  external_project_ref?: string
  created_at: string
  updated_at: string

  project?: EnergyImprovementProject
  phases?: EnergyProjectPhase[]
  tasks?: EnergyProjectTask[]
  evidence?: EnergyImprovementEvidence[]
  comments?: EnergyImprovementComment[]
  mv_plans?: EnergyMvPlan[]
  cmms_handoffs?: EnergyCmmsHandoffRequest[]
  events?: EnergyImprovementEvent[]
}

export interface EnergyImprovementProject {
  id: string
  improvement_id: string
  project_code?: string
  scope?: string
  business_case?: string
  constraints?: string
  assumptions?: string
  risk_notes?: string
}

export interface EnergyProjectPhase {
  id: string
  improvement_id: string
  order: number
  name: string
  description?: string
  status: PhaseStatus
  budget: number
  progress: number
  planned_start?: string
  planned_finish?: string
  actual_start?: string
  actual_finish?: string
}

export interface EnergyProjectTask {
  id: string
  improvement_id: string
  phase_id?: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  owner_id?: string
  planned_date?: string
  actual_date?: string
  estimated_hours?: number
  actual_hours?: number
  checklist?: { text: string; done: boolean }[]
}

export interface EnergyImprovementEvidence {
  id: string
  improvement_id: string
  file_name: string
  file_url?: string
  file_type?: string
  description?: string
  uploaded_by?: string
  uploaded_at: string
}

export interface EnergyImprovementComment {
  id: string
  improvement_id: string
  author_id?: string
  content: string
  created_at: string
}

export interface EnergyMvPlan {
  id: string
  improvement_id: string
  version: number
  status: Exclude<MvPlanStatus, 'not_defined'>
  method: 'before_after' | 'baseline_model' | 'metered' | 'engineering_estimate'
  baseline_source_type?: 'measurement_point' | 'balance_result' | 'enpi' | 'study' | 'manual'
  baseline_source_id?: string
  baseline_period_start?: string
  baseline_period_end?: string
  verification_period_start?: string
  verification_period_end?: string
  expected_savings?: number
  expected_savings_unit?: string
  actual_savings?: number
  actual_savings_unit?: string
  confidence_score?: number
  acceptance_criteria?: string
  calculation_notes?: string
  evidence_ref?: Record<string, unknown>
  created_by?: string
  approved_by?: string
  created_at: string
  updated_at: string
}

export interface EnergyCmmsHandoffRequest {
  id: string
  site_id: string
  improvement_id?: string
  request_direction: 'energy_to_cmms' | 'cmms_to_energy'
  request_type:
    | 'repair_request'
    | 'inspection_request'
    | 'calibration_request'
    | 'pm_suggestion'
    | 'asset_change_request'
    | 'operational_adjustment'
    | 'efficiency_work_request'
    | 'energy_improvement_feedback'
  status: Exclude<CmmsHandoffStatus, 'not_required'>
  target_asset_id?: string
  target_equipment_id?: string
  title: string
  description?: string
  energy_rationale?: string
  estimated_savings?: number
  savings_unit?: string
  maintenance_priority: ImprovementPriority
  cmms_external_request_id?: string
  cmms_work_order_id?: string
  cmms_response?: Record<string, unknown>
  requested_by?: string
  requested_at?: string
  decided_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface EnergyImprovementEvent {
  id: string
  improvement_id?: string
  site_id?: string
  event_type:
    | 'created_from_study'
    | 'created_manually'
    | 'status_changed'
    | 'mv_plan_defined'
    | 'mv_plan_approved'
    | 'mv_started'
    | 'mv_result_recorded'
    | 'sent_to_cmms'
    | 'cmms_request_accepted'
    | 'cmms_request_rejected'
    | 'cmms_work_order_created'
    | 'cmms_work_order_closed'
    | 'cmms_feedback_received'
    | 'energy_followup_required'
    | 'evidence_added'
    | 'closed_with_savings'
    | 'closed_without_savings'
    | 'audit_reviewed'
  actor_profile_id?: string
  source_type?: 'study' | 'balance' | 'enpi' | 'manual' | 'cmms' | 'system' | 'mv_plan' | 'handoff'
  source_id?: string
  previous_state?: Record<string, unknown>
  new_state?: Record<string, unknown>
  notes?: string
  created_at: string
}

export const STATUS_LABELS: Record<ImprovementStatus, string> = {
  identified: 'Identificado',
  triage: 'En clasificación',
  approved: 'Aprobado',
  planned: 'Planificado',
  in_progress: 'En progreso',
  verification: 'Verificación',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
}

export const STATUS_COLORS: Record<ImprovementStatus, string> = {
  identified: 'gray',
  triage: 'orange',
  approved: 'blue',
  planned: 'purple',
  in_progress: 'teal',
  verification: 'cyan',
  closed: 'green',
  cancelled: 'red',
}

export const KANBAN_COLUMNS: ImprovementStatus[] = [
  'identified', 'triage', 'approved', 'in_progress', 'verification', 'closed',
]
