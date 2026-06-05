export type {
  BalanceSheet, BalanceEntry, BalanceSheetResult,
  ProductionVariable, ProductionReading,
  SheetCalcResult, EntryCalcResult,
  BalanceSide, BoundaryType, BalanceSheetStatus,
} from './types'

export { calculateSheet, persistResult } from './calculator'

// calculateOfficialSheet / persistOfficialResult were removed with the
// topology-engine (E7 official balance). balances/index.tsx calls them;
// stub here so the module compiles while E7 is not yet rebuilt.
export async function calculateOfficialSheet(
  _sheet: unknown,
  _entries: unknown,
): Promise<never> {
  throw new Error('calculateOfficialSheet requires E7 topology engine — not yet rebuilt.')
}
export async function persistOfficialResult(_result: unknown): Promise<never> {
  throw new Error('persistOfficialResult requires E7 topology engine — not yet rebuilt.')
}
