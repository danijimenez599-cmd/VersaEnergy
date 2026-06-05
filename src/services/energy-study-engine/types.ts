import type { BalanceSide, EnPITrendPoint, NumeratorType } from '@/services/enpi-engine'

export type StudyType =
  | 'area_process_intensity'
  | 'equipment_efficiency'
  | 'multi_utility_normalization'
  | 'utility_choice'
  | 'peak_detective'
  | 'loss_hunt'
  | 'baseline_model'
  | 'mv_guardian'

export type StudyScopeType = 'site' | 'area' | 'system' | 'equipment'

export type StudyCoverageTone = 'neutral' | 'ok' | 'warn' | 'danger'

export interface StudyCandidateConfig {
  studyType: StudyType
  scopeType: StudyScopeType
  scopeId: string | null
  scopeLabel: string
  utility: string | null
  numeratorType: Exclude<NumeratorType, 'formula'>
  numeratorRefId: string | null
  numeratorSide: BalanceSide | null
  numeratorLabel: string
  numeratorUnit: string
  denominatorRefId: string | null
  denominatorLabel: string
  denominatorUnit: string
}

export interface StudyCandidatePoint {
  period: string
  periodStart: string
  periodEnd: string
  numeratorValue: number | null
  denominatorValue: number | null
  value: number | null
}

export interface StudyFinding {
  id: string
  ok: boolean
  text: string
}

export interface StudyDecision {
  id: 'promote_enpi' | 'request_measurement' | 'create_quick_action' | 'create_project' | 'create_sgen_evidence'
  enabled: boolean
  label: string
  detail: string
}

export type StudyModelType = 'ratio' | 'stability_band' | 'best_period' | 'regression_simple' | 'cusum_watch' | 'mv_guardian'

export interface StudyModelComparison {
  id: StudyModelType
  label: string
  description: string
  outputUnit: string
  latestValue: number | null
  referenceValue: number | null
  deltaPercent: number | null
  qualityScore: number
  recommended: boolean
  assumptions: string[]
}

export interface StudyVariableCandidate {
  variableRefId: string | null
  label: string
  unit: string
  variableType: 'relevant_variable' | 'operational' | 'weather' | 'quality' | 'manual'
  physicalRationale: string
  coveragePercent: number
  correlationScore: number | null
  stabilityScore: number
  relevanceScore: number
  selected: boolean
  recommendation: 'primary_driver' | 'secondary_driver' | 'monitor_only' | 'reject' | 'needs_data'
  statistics: {
    validPointCount: number
    numeratorPointCount: number
    denominatorPointCount: number
    ratioCvPercent: number | null
  }
}

export interface StudyPlaybookStep {
  id: string
  label: string
  detail: string
  decision?: StudyDecision['id']
}

export interface StudyPlaybook {
  title: string
  intent: string
  steps: StudyPlaybookStep[]
}

export interface PersistedEnergyStudy {
  id: string
  site_id: string
  title: string
  study_type: StudyType
  scope_type: StudyScopeType | 'meter' | 'custom'
  scope_id: string | null
  scope_label: string | null
  utility: string | null
  period_start: string
  period_end: string
  hypothesis: string | null
  status: 'draft' | 'analyzing' | 'decided' | 'promoted' | 'archived'
  confidence_score: number | null
  created_at: string
  updated_at: string
}

export interface SaveStudyCandidateParams {
  siteId: string
  title?: string
  hypothesis?: string
  candidate: StudyCandidateResult
  decisionType?: 'promote_enpi' | 'create_improvement' | 'create_quick_action' | 'create_project' | 'request_meter' | 'request_measurement' | 'update_baseline' | 'create_sgen_evidence' | 'archive'
  decisionTargetId?: string
  decisionNotes?: string
}

export interface StudyActionResult {
  study: PersistedEnergyStudy
  targetId: string
}

export interface StudyCandidateResult {
  config: StudyCandidateConfig
  unit: string
  points: StudyCandidatePoint[]
  validPointCount: number
  numeratorPointCount: number
  denominatorPointCount: number
  coverage: number
  coverageTone: StudyCoverageTone
  latestValue: number | null
  previousValue: number | null
  deltaPercent: number | null
  confidenceScore: number
  canPromote: boolean
  findings: StudyFinding[]
  decisions: StudyDecision[]
  modelComparisons: StudyModelComparison[]
  variableCandidates: StudyVariableCandidate[]
  playbook: StudyPlaybook
  warnings: string[]
}

export interface ResolveStudyCandidateParams {
  config: StudyCandidateConfig
  variableCandidates?: Array<{
    id: string
    name: string
    unit: string
  }>
  months?: number
}

export type TrendResolver = (
  config: {
    numerator_type: Exclude<NumeratorType, 'formula'>
    numerator_ref_id: string | null
    numerator_side: BalanceSide | null
    denominator_type: 'relevant_variable'
    denominator_ref_id: string | null
  },
  months?: number,
) => Promise<EnPITrendPoint[]>
