import type { EnergyImprovement, EnergyProjectPhase, EnergyProjectTask } from '@/modules/acciones/types'

export interface ProjectHealth {
  overallProgress: number
  onSchedule: boolean
  onBudget: boolean
  riskLevel: 'low' | 'medium' | 'high'
}

export interface EarnedValueMetrics {
  BAC: number
  PV: number
  EV: number
  AC: number
  CPI: number
  SPI: number
  EAC?: number
  CV: number
  SV: number
}

export function calculatePayback(investment: number, annualSavings: number): number | null {
  if (investment <= 0 || annualSavings <= 0) return null
  return Math.round((investment / annualSavings) * 12 * 10) / 10
}

export function calculateProgress(phases: EnergyProjectPhase[]): number {
  if (phases.length === 0) return 0
  const total = phases.reduce((s, p) => s + (p.progress || 0), 0)
  return Math.round((total / phases.length) * 10) / 10
}

export function calculatePhaseProgress(tasks: EnergyProjectTask[]): number {
  if (tasks.length === 0) return 0
  const completed = tasks.filter((t) => t.status === 'completed').length
  return Math.round((completed / tasks.length) * 100)
}

export function calculateEarnedValue(
  improvement: EnergyImprovement,
  phases: EnergyProjectPhase[],
  actualCost: number,
): EarnedValueMetrics | null {
  const BAC = improvement.estimated_investment || 0
  if (BAC <= 0) return null

  const completedPhases = phases.filter((p) => p.status === 'completed')
  const inProgressPhases = phases.filter((p) => p.status === 'in_progress')

  let PV = 0
  for (const p of phases) {
    if (p.planned_start && new Date(p.planned_start) <= new Date()) {
      PV += p.budget || 0
    }
  }

  let EV = 0
  for (const p of completedPhases) {
    EV += p.budget || 0
  }
  for (const p of inProgressPhases) {
    EV += (p.budget || 0) * (p.progress / 100)
  }

  const AC = actualCost || 0
  const CPI = AC > 0 ? EV / AC : 1
  const SPI = PV > 0 ? EV / PV : 1
  const CV = EV - AC
  const SV = EV - PV
  const EAC = CPI > 0 ? BAC / CPI : BAC

  return { BAC, PV, EV, AC, CPI: Math.round(CPI * 100) / 100, SPI: Math.round(SPI * 100) / 100, EAC: Math.round(EAC * 100) / 100, CV: Math.round(CV * 100) / 100, SV: Math.round(SV * 100) / 100 }
}

export function calculateSavingsDelta(
  estimated: number,
  actual: number,
): { delta: number; deltaPercent: number; isFavorable: boolean } {
  const delta = actual - estimated
  const deltaPercent = estimated > 0 ? (delta / estimated) * 100 : 0
  return { delta, deltaPercent: Math.round(deltaPercent * 10) / 10, isFavorable: delta >= 0 }
}

export function getProjectHealth(
  improvement: EnergyImprovement,
  phases: EnergyProjectPhase[],
  actualCost: number,
): ProjectHealth {
  const progress = calculateProgress(phases)
  const evm = calculateEarnedValue(improvement, phases, actualCost)

  const expectedProgress = improvement.planned_start && improvement.planned_finish
    ? Math.min(100, Math.max(0,
        ((Date.now() - new Date(improvement.planned_start).getTime()) /
         (new Date(improvement.planned_finish).getTime() - new Date(improvement.planned_start).getTime())) * 100
      ))
    : 0

  const onSchedule = progress >= expectedProgress * 0.9
  const onBudget = evm ? evm.CPI >= 0.9 : true

  let riskLevel: ProjectHealth['riskLevel'] = 'low'
  if (!onSchedule && !onBudget) riskLevel = 'high'
  else if (!onSchedule || !onBudget) riskLevel = 'medium'

  return { overallProgress: progress, onSchedule, onBudget, riskLevel }
}
