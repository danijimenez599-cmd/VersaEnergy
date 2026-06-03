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
