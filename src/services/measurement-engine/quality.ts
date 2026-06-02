export interface DataQualityIssue {
  field: string
  severity: 'error' | 'warning'
  message: string
  value?: unknown
}

export interface RawReading {
  measurement_point_id: string
  timestamp: string
  value: number
  unit: string
}

export function validateReading(
  reading: RawReading,
  pointUnit: string,
  historicalMean?: number,
  historicalStdDev?: number,
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = []

  if (reading.value === null || reading.value === undefined) {
    issues.push({ field: 'value', severity: 'error', message: 'Valor nulo' })
    return issues
  }

  if (typeof reading.value !== 'number' || isNaN(reading.value)) {
    issues.push({ field: 'value', severity: 'error', message: 'Valor no num\u00e9rico', value: reading.value })
  }

  if (reading.value < 0) {
    issues.push({ field: 'value', severity: 'error', message: 'Valor negativo', value: reading.value })
  }

  if (!reading.timestamp) {
    issues.push({ field: 'timestamp', severity: 'error', message: 'Timestamp requerido' })
  }

  if (reading.unit !== pointUnit) {
    issues.push({
      field: 'unit',
      severity: 'error',
      message: 'Unidad incompatible: ' + reading.unit + ' (esperado: ' + pointUnit + ')',
      value: reading.unit,
    })
  }

  if (historicalMean !== undefined && historicalStdDev !== undefined && historicalStdDev > 0) {
    const zScore = Math.abs(reading.value - historicalMean) / historicalStdDev
    if (zScore > 3) {
      issues.push({
        field: 'value',
        severity: 'warning',
        message: 'Valor at\u00edpico: ' + reading.value + ' (' + zScore.toFixed(1) + '\u03c3 de la media)',
        value: reading.value,
      })
    }
  }

  return issues
}

export function validateReadingsBatch(
  readings: RawReading[],
  pointUnit: string,
  historicalMean?: number,
  historicalStdDev?: number,
): { valid: RawReading[]; issues: { row: number; issues: DataQualityIssue[] }[] } {
  const valid: RawReading[] = []
  const issues: { row: number; issues: DataQualityIssue[] }[] = []

  readings.forEach((r, i) => {
    const rIssues = validateReading(r, pointUnit, historicalMean, historicalStdDev)
    if (rIssues.length === 0) {
      valid.push(r)
    } else {
      issues.push({ row: i + 1, issues: rIssues })
    }
  })

  return { valid, issues }
}

export function detectDuplicateReadings(
  readings: { timestamp: string; value: number }[],
): Set<number> {
  const seen = new Map<string, number>()
  const duplicates = new Set<number>()

  readings.forEach((r, i) => {
    const key = r.timestamp + '::' + r.value
    const prevIdx = seen.get(key)
    if (prevIdx !== undefined) {
      duplicates.add(i)
      duplicates.add(prevIdx)
    } else {
      seen.set(key, i)
    }
  })

  return duplicates
}

export function detectGaps(
  readings: { timestamp: string; value: number }[],
  expectedIntervalHours: number,
): { from: string; to: string }[] {
  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )

  const gaps: { from: string; to: string }[] = []
  const toleranceMs = expectedIntervalHours * 3600000 * 1.5

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].timestamp).getTime()
    const curr = new Date(sorted[i].timestamp).getTime()
    if (curr - prev > toleranceMs) {
      gaps.push({ from: sorted[i - 1].timestamp, to: sorted[i].timestamp })
    }
  }

  return gaps
}
