import type { AccumulatorConfig } from '@/services/topology-engine/graphTypes'

export function calculateDelta(
  prev: number,
  curr: number,
  config: AccumulatorConfig,
): { value: number | null; status: 'ok' | 'reset_detected' | 'negative_delta' | 'rollover' } {
  const adjustedPrev = prev * config.multiplier + config.offset
  const adjustedCurr = curr * config.multiplier + config.offset

  if (adjustedCurr >= adjustedPrev) {
    return { value: adjustedCurr - adjustedPrev, status: 'ok' }
  }

  if (config.rollover?.enabled && config.rollover.maxValue > 0) {
    const delta = config.rollover.maxValue - adjustedPrev + adjustedCurr
    return { value: delta, status: 'rollover' }
  }

  if (config.resetDetection) {
    return { value: null, status: 'reset_detected' }
  }

  if (!config.allowNegativeDelta) {
    return { value: null, status: 'negative_delta' }
  }

  return { value: adjustedCurr - adjustedPrev, status: 'negative_delta' }
}

export function calculateDeltas(
  readings: { timestamp: string; value: number }[],
  config: AccumulatorConfig,
): { timestamp: string; value: number | null; consumption: number | null; status: string }[] {
  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )

  return sorted.map((reading, i) => {
    if (i === 0) {
      return { ...reading, consumption: null, status: 'first_reading' }
    }

    const delta = calculateDelta(sorted[i - 1].value, reading.value, config)
    return { ...reading, consumption: delta.value, status: delta.status }
  })
}

export const DEFAULT_ACCUMULATOR_CONFIG: AccumulatorConfig = {
  multiplier: 1,
  offset: 0,
  allowNegativeDelta: false,
  resetDetection: true,
}
