// ── Balance Sheet Engine — Types ──────────────────────────────────────────────

export type BalanceSheetStatus = 'draft' | 'closed' | 'approved'
export type BalanceSide = 'input' | 'output'
export type BoundaryType = 'area' | 'equipment' | 'system' | 'site'
export type BalanceCalculationMode = 'manual' | 'topology_official'
export type BalanceResultStatus = 'current' | 'superseded'
export type BalanceScopeType = BoundaryType | 'energy_group'

export interface BalanceSheet {
  id: string
  site_id: string
  name: string
  description: string | null
  boundary_type: BoundaryType | null
  boundary_id: string | null
  boundary_label?: string       // resuelto en runtime (nombre del área/equipo)
  period_start: string          // ISO date "2026-01-01"
  period_end: string
  utility: string | null        // null = multi-utility → kWh-eq
  status: BalanceSheetStatus
  calculation_mode?: BalanceCalculationMode
  scope_type?: BalanceScopeType | null
  scope_id?: string | null
  diagram_id?: string | null
  diagram_version_id?: string | null
  topology_required?: boolean
  topology_notes?: Record<string, unknown> | null
  created_at: string
  updated_at: string
  // joined
  entries?: BalanceEntry[]
  last_result?: BalanceSheetResult | null
}

export interface BalanceEntry {
  id: string
  sheet_id: string
  side: BalanceSide
  equipment_id: string | null
  measurement_point_id: string | null
  label: string | null
  order_index: number
  // calculados
  value: number | null
  unit: string | null
  value_kwh_eq: number | null
  notes: string | null
  // joined en runtime
  equipment?: EntryEquipment | null
  measurement_point?: EntryMP | null
}

export interface EntryEquipment {
  id: string
  tag: string
  name: string
  equipment_type: string
  utility_type: string
  area_id: string | null
}

export interface EntryMP {
  id: string
  tag: string
  name: string
  utility: string
  measurement_type: string
  quantity: string
  unit: string
  source_type: string
}

export interface BalanceSheetResult {
  id: string
  sheet_id: string
  calculated_at: string
  total_input: number | null
  total_output: number | null
  unit: string | null
  total_input_kwh_eq: number | null
  total_output_kwh_eq: number | null
  unaccounted_for: number | null
  unaccounted_for_kwh_eq: number | null
  unaccounted_for_pct: number | null
  measurement_coverage: number | null
  by_utility: Record<string, { input_kwh: number; output_kwh: number }>
  calculation_mode?: BalanceCalculationMode
  is_official?: boolean
  result_status?: BalanceResultStatus
  scope_type?: BalanceScopeType | null
  scope_id?: string | null
  utility?: string | null
  diagram_id?: string | null
  diagram_version_id?: string | null
  child_diagram_version_ids?: string[]
  coverage_breakdown?: E7CoverageBreakdown | Record<string, unknown>
  topology_snapshot?: E7TopologySnapshot | Record<string, unknown>
  findings?: E7BalanceFinding[]
  confidence_score?: number | null
}

export interface ProductionVariable {
  id: string
  site_id: string
  name: string
  description: string | null
  unit: string
  source_type: string
  is_active: boolean
  // joined
  readings?: ProductionReading[]
}

export interface ProductionReading {
  id: string
  variable_id: string
  period_start: string
  period_end: string
  value: number
  notes: string | null
  recorded_at: string
}

// ── Resultado de cálculo en memoria (antes de persistir) ─────────────────────

export interface EntryCalcResult {
  entry_id: string
  side: BalanceSide
  measurement_point_id: string | null
  label: string
  utility: string
  value: number
  unit: string
  value_kwh_eq: number | null
  coverage: 'measured' | 'estimated' | 'manual' | 'no_data'
}

export interface SheetCalcResult {
  sheet_id: string
  period: { from: Date; to: Date }
  entries: EntryCalcResult[]
  // Totales en unidad nativa (solo disponible si utility es única)
  total_input: number | null
  total_output: number | null
  unit: string | null
  // Totales kWh-eq (siempre)
  total_input_kwh_eq: number
  total_output_kwh_eq: number
  unaccounted_for_kwh_eq: number
  unaccounted_for_pct: number
  measurement_coverage: number
  by_utility: Record<string, { input_kwh: number; output_kwh: number; label: string }>
  official?: E7OfficialMetadata
}

export type E7FindingSeverity = 'info' | 'warning' | 'critical'
export type E7FindingKind = 'data_gap' | 'unexplained_loss' | 'measurement_recommendation' | 'topology' | 'study_handoff'

export interface E7BalanceFinding {
  id: string
  kind: E7FindingKind
  severity: E7FindingSeverity
  title: string
  detail: string
  target_type?: 'balance_sheet' | 'balance_entry' | 'measurement_point' | 'diagram' | 'energy_group'
  target_id?: string | null
}

export interface E7CoverageBreakdown {
  entry_count: number
  measured_count: number
  estimated_count: number
  manual_count: number
  no_data_count: number
  measured_input_kwh: number
  estimated_input_kwh: number
  no_data_input_count: number
  coverage_percent: number
  entries: Array<{
    entry_id: string
    side: BalanceSide
    measurement_point_id: string | null
    label: string
    utility: string
    value: number
    unit: string
    value_kwh_eq: number | null
    coverage: EntryCalcResult['coverage']
  }>
}

export interface E7TopologySnapshot {
  diagram_id: string
  diagram_name: string
  diagram_status: 'published'
  diagram_version_id: string
  diagram_version_number: number
  scope_type: BalanceScopeType
  scope_id: string
  utility: string | null
  child_diagram_version_ids: string[]
}

export interface E7OfficialMetadata {
  calculation_mode: 'topology_official'
  is_official: true
  result_status: 'current'
  scope_type: BalanceScopeType
  scope_id: string
  utility: string | null
  diagram_id: string
  diagram_version_id: string
  child_diagram_version_ids: string[]
  coverage_breakdown: E7CoverageBreakdown
  topology_snapshot: E7TopologySnapshot
  findings: E7BalanceFinding[]
  confidence_score: number
}
