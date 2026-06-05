// ── EnPI Engine — Types ────────────────────────────────────────────────────────

export type NumeratorType = 'formula' | 'balance_sheet' | 'measurement_point'
export type DenominatorType = 'formula' | 'relevant_variable'
export type BalanceSide = 'input' | 'output' | 'net'

export interface EnPIRefConfig {
  numerator_type: NumeratorType
  numerator_ref_id: string | null
  numerator_side: BalanceSide | null
  denominator_type: DenominatorType
  denominator_ref_id: string | null
}

export interface EnPITrendPoint {
  period: string
  period_start: string
  period_end: string
  numerator_value: number | null
  denominator_value: number | null
  enpi_value: number | null
}
