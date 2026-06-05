import { computeEnPITrend } from '@/services/enpi-engine'
import { calculateRatioStudy } from './studyCalculator'
import type { ResolveStudyCandidateParams, StudyCandidateResult, TrendResolver } from './types'
import { buildVariableCandidates } from './variableRelevance'

export async function resolveStudyCandidate(
  params: ResolveStudyCandidateParams,
  trendResolver: TrendResolver = computeEnPITrend,
): Promise<StudyCandidateResult> {
  const trend = await trendResolver({
    numerator_type: params.config.numeratorType,
    numerator_ref_id: params.config.numeratorRefId,
    numerator_side: params.config.numeratorType === 'balance_sheet' ? params.config.numeratorSide : null,
    denominator_type: 'relevant_variable',
    denominator_ref_id: params.config.denominatorRefId,
  }, params.months ?? 18)

  const variableCandidates = params.variableCandidates && params.variableCandidates.length > 0
    ? buildVariableCandidates(await Promise.all(params.variableCandidates.map(async (variable) => ({
        id: variable.id,
        name: variable.name,
        unit: variable.unit,
        selected: variable.id === params.config.denominatorRefId,
        trend: variable.id === params.config.denominatorRefId
          ? trend
          : await trendResolver({
              numerator_type: params.config.numeratorType,
              numerator_ref_id: params.config.numeratorRefId,
              numerator_side: params.config.numeratorType === 'balance_sheet' ? params.config.numeratorSide : null,
              denominator_type: 'relevant_variable',
              denominator_ref_id: variable.id,
            }, params.months ?? 18),
      }))))
    : []

  return calculateRatioStudy(params.config, trend, variableCandidates)
}
