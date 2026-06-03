/**
 * statistics.ts — VersaEnergy Statistical Analysis Library
 *
 * Pure TypeScript implementation of OLS regression, Pearson correlation,
 * VIF multicollinearity check, and t-test significance for EnPI analysis.
 *
 * No external dependencies. All formulas are standard closed-form statistics.
 * References: Montgomery & Peck "Introduction to Linear Regression Analysis",
 *             Walpole et al. "Probability & Statistics for Engineers".
 */

// ─────────────────────────────────────────────────────────────────────────────
// Descriptive statistics
// ─────────────────────────────────────────────────────────────────────────────

export function mean(v: number[]): number {
  if (v.length === 0) return NaN
  return v.reduce((a, b) => a + b, 0) / v.length
}

/** Sample variance (n-1 denominator) */
export function variance(v: number[]): number {
  if (v.length < 2) return NaN
  const m = mean(v)
  return v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1)
}

export function stddev(v: number[]): number {
  return Math.sqrt(variance(v))
}

export function minVal(v: number[]): number { return Math.min(...v) }
export function maxVal(v: number[]): number { return Math.max(...v) }

// ─────────────────────────────────────────────────────────────────────────────
// Pearson correlation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pearson product-moment correlation coefficient between x and y.
 * Returns NaN if constant variable or insufficient data.
 */
export function pearsonR(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return NaN
  const mx = mean(x)
  const my = mean(y)
  let num = 0
  let denX = 0
  let denY = 0
  for (let i = 0; i < x.length; i++) {
    num += (x[i] - mx) * (y[i] - my)
    denX += (x[i] - mx) ** 2
    denY += (y[i] - my) ** 2
  }
  const den = Math.sqrt(denX * denY)
  return den < 1e-14 ? 0 : num / den
}

/** Correlation matrix for a list of equal-length series (same-order indexing) */
export function correlationMatrix(series: number[][]): number[][] {
  const n = series.length
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => i === j ? 1 : pearsonR(series[i], series[j]))
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// t-statistic significance thresholds (two-tailed)
// Derived from t-distribution quantiles — conservative for small n.
// ─────────────────────────────────────────────────────────────────────────────

type Significance = 'very_high' | 'high' | 'marginal' | 'none'

const T95_TABLE: [number, number][] = [
  // [df, t critical at alpha=0.05 two-tailed]
  [2, 4.303], [3, 3.182], [4, 2.776], [5, 2.571], [6, 2.447],
  [7, 2.365], [8, 2.306], [9, 2.262], [10, 2.228], [12, 2.179],
  [15, 2.131], [20, 2.086], [25, 2.060], [30, 2.042], [999, 1.960],
]

const T99_TABLE: [number, number][] = [
  [2, 9.925], [3, 5.841], [4, 4.604], [5, 4.032], [6, 3.707],
  [7, 3.499], [8, 3.355], [9, 3.250], [10, 3.169], [12, 3.055],
  [15, 2.947], [20, 2.845], [25, 2.787], [30, 2.750], [999, 2.576],
]

function lookupT(table: [number, number][], df: number): number {
  for (const [d, t] of table) if (df <= d) return t
  return table[table.length - 1][1]
}

function getSignificance(absT: number, df: number): Significance {
  if (df < 1) return 'none'
  const t99 = lookupT(T99_TABLE, df)
  const t95 = lookupT(T95_TABLE, df)
  if (absT >= t99 * 1.2) return 'very_high'   // p < 0.001 approx
  if (absT >= t99)        return 'high'          // p < 0.01
  if (absT >= t95)        return 'high'          // p < 0.05
  if (absT >= t95 * 0.85) return 'marginal'     // p < 0.10 approx
  return 'none'
}

// ─────────────────────────────────────────────────────────────────────────────
// Simple OLS: y = α + β·x
// ─────────────────────────────────────────────────────────────────────────────

export interface SimpleRegressionResult {
  slope: number
  intercept: number
  r: number
  r2: number
  adjR2: number
  residualSE: number   // σ̂ — standard error of the regression
  slopeTE: number      // t-statistic for slope
  significance: Significance
  predicted: number[]
  residuals: number[]
  n: number
}

export function simpleOLS(x: number[], y: number[]): SimpleRegressionResult {
  const n = x.length
  const mx = mean(x)
  const my = mean(y)
  let ssXY = 0
  let ssXX = 0
  for (let i = 0; i < n; i++) {
    ssXY += (x[i] - mx) * (y[i] - my)
    ssXX += (x[i] - mx) ** 2
  }
  const slope = ssXX > 1e-14 ? ssXY / ssXX : 0
  const intercept = my - slope * mx
  const predicted = x.map((xi) => slope * xi + intercept)
  const residuals = y.map((yi, i) => yi - predicted[i])
  const ssTot = y.reduce((s, yi) => s + (yi - my) ** 2, 0)
  const ssRes = residuals.reduce((s, r) => s + r ** 2, 0)
  const r2 = ssTot > 1e-14 ? 1 - ssRes / ssTot : 0
  const adjR2 = n > 2 ? 1 - (1 - r2) * (n - 1) / (n - 2) : r2
  const r = Math.sqrt(Math.abs(r2)) * Math.sign(slope)
  const mse = n > 2 ? ssRes / (n - 2) : ssRes
  const residualSE = Math.sqrt(mse)
  const seBeta = ssXX > 1e-14 ? Math.sqrt(mse / ssXX) : 0
  const slopeTE = seBeta > 0 ? slope / seBeta : 0
  const significance = getSignificance(Math.abs(slopeTE), n - 2)
  return { slope, intercept, r, r2, adjR2, residualSE, slopeTE, significance, predicted, residuals, n }
}

// ─────────────────────────────────────────────────────────────────────────────
// Multiple OLS via Normal Equations: β = (X'X)⁻¹ X'y
// ─────────────────────────────────────────────────────────────────────────────

export interface MultipleRegressionResult {
  /** Coefficients: [intercept, β1, β2, ...βk] */
  beta: number[]
  r2: number
  adjR2: number
  residualSE: number
  /** t-statistics for each coefficient (index 0 = intercept) */
  tStats: number[]
  significance: Significance[]
  /** Variance Inflation Factor for each predictor (length = k) */
  vif: number[]
  predicted: number[]
  residuals: number[]
  n: number
  k: number
}

/**
 * Multiple OLS.
 * X: n × k matrix of predictors (NO intercept column — added internally).
 * Returns null if the system is singular (perfect multicollinearity).
 */
export function multipleOLS(X: number[][], y: number[]): MultipleRegressionResult | null {
  if (X.length < 3 || X[0].length === 0) return null
  const k = X[0].length
  const n = X.length

  // Design matrix with intercept
  const Xd = X.map((row) => [1, ...row])
  const p = k + 1

  const XtX = matMul(transpose(Xd), Xd)
  const Xty = matVec(transpose(Xd), y)
  const beta = gaussElim(XtX, Xty)
  if (!beta) return null

  const predicted = Xd.map((row) => row.reduce((s, xi, j) => s + xi * beta[j], 0))
  const residuals = y.map((yi, i) => yi - predicted[i])
  const my = mean(y)
  const ssTot = y.reduce((s, yi) => s + (yi - my) ** 2, 0)
  const ssRes = residuals.reduce((s, r) => s + r ** 2, 0)
  const r2 = ssTot > 1e-14 ? 1 - ssRes / ssTot : 0
  const adjR2 = n > p ? 1 - (1 - r2) * (n - 1) / (n - p) : r2
  const mse = n > p ? ssRes / (n - p) : ssRes
  const residualSE = Math.sqrt(mse)

  // Standard errors: diagonal of (X'X)⁻¹ · MSE
  const XtXInv = invertMatrix(XtX)
  const seBeta = XtXInv
    ? beta.map((_, j) => Math.sqrt(Math.max(0, XtXInv[j][j]) * mse))
    : beta.map(() => 0)

  const tStats = beta.map((b, j) => (seBeta[j] > 1e-14 ? b / seBeta[j] : 0))
  const significance = tStats.map((t, j) =>
    j === 0 ? getSignificance(Math.abs(t), n - p) : getSignificance(Math.abs(t), n - p)
  )

  // VIF for each predictor
  const vif: number[] = computeVIF(X)

  return { beta, r2, adjR2, residualSE, tStats, significance, vif, predicted, residuals, n, k }
}

// Compute VIF for each column of X (k predictors)
function computeVIF(X: number[][]): number[] {
  const k = X[0].length
  if (k <= 1) return new Array(k).fill(1)
  const vif: number[] = []
  for (let j = 0; j < k; j++) {
    const xj = X.map((row) => row[j])
    const others = X.map((row) => row.filter((_, idx) => idx !== j))
    let r2j: number
    if (others[0].length === 1) {
      r2j = simpleOLS(others.map((r) => r[0]), xj).r2
    } else {
      // One level of recursion — VIF computed without sub-VIF
      const res = _multipleOLSCore(others, xj)
      r2j = res ?? 0
    }
    vif.push(r2j < 0.9999 ? 1 / (1 - r2j) : 999)
  }
  return vif
}

// Core multiple regression returning only R² (used for VIF, no recursion)
function _multipleOLSCore(X: number[][], y: number[]): number | null {
  const Xd = X.map((row) => [1, ...row])
  const XtX = matMul(transpose(Xd), Xd)
  const Xty = matVec(transpose(Xd), y)
  const beta = gaussElim(XtX, Xty)
  if (!beta) return null
  const predicted = Xd.map((row) => row.reduce((s, xi, j) => s + xi * beta[j], 0))
  const my = mean(y)
  const ssTot = y.reduce((s, yi) => s + (yi - my) ** 2, 0)
  const ssRes = y.reduce((s, yi, i) => s + (yi - predicted[i]) ** 2, 0)
  return ssTot > 1e-14 ? 1 - ssRes / ssTot : 0
}

// ─────────────────────────────────────────────────────────────────────────────
// Interpretation helpers
// ─────────────────────────────────────────────────────────────────────────────

export function interpretR(r: number): { label: string; color: string; bg: string } {
  const a = Math.abs(r)
  if (isNaN(a))          return { label: 'Sin datos', color: 'text-slate-400', bg: 'bg-slate-100' }
  if (a >= 0.90) return { label: 'Muy fuerte', color: 'text-emerald-700', bg: 'bg-emerald-100' }
  if (a >= 0.70) return { label: 'Fuerte', color: 'text-emerald-600', bg: 'bg-emerald-50' }
  if (a >= 0.50) return { label: 'Moderada', color: 'text-amber-600', bg: 'bg-amber-50' }
  if (a >= 0.30) return { label: 'Débil', color: 'text-orange-600', bg: 'bg-orange-50' }
  return { label: 'Negligible', color: 'text-rose-600', bg: 'bg-rose-50' }
}

export interface R2Interpretation {
  label: string
  color: string
  advice: string
  canUseForNormalization: boolean
}

export function interpretR2(r2: number, n: number, k: number): R2Interpretation {
  const pct = (r2 * 100).toFixed(1)
  const dfWarning = n < 8
    ? ` ⚠ Con solo ${n} periodos, los resultados no son estadísticamente confiables (se recomiendan ≥12).`
    : ''

  if (dfWarning && r2 < 0.5) return {
    label: `R² = ${pct}% — Datos insuficientes`,
    color: 'text-slate-500',
    advice: `Con ${n} periodos los resultados no son confiables. Necesitas al menos 8–12 periodos para hacer inferencias útiles.${dfWarning}`,
    canUseForNormalization: false,
  }
  if (r2 >= 0.90) return {
    label: `R² = ${pct}% — Ajuste excelente`,
    color: 'text-emerald-600',
    advice: `El modelo explica el ${pct}% de la variabilidad histórica del EnPI con ${k} variable(s). Verifica que no haya sobreajuste — ¿los datos cubren todo el rango operativo real?${dfWarning}`,
    canUseForNormalization: true,
  }
  if (r2 >= 0.70) return {
    label: `R² = ${pct}% — Buen ajuste`,
    color: 'text-emerald-500',
    advice: `El modelo es útil para entender los drivers del EnPI. Puedes usarlo para ajustar comparaciones entre periodos con diferentes condiciones operativas.${dfWarning}`,
    canUseForNormalization: true,
  }
  if (r2 >= 0.50) return {
    label: `R² = ${pct}% — Ajuste moderado`,
    color: 'text-amber-500',
    advice: `El modelo captura parte del comportamiento. Considera si faltan variables relevantes o si algunos periodos tienen datos atípicos que distorsionan el ajuste.${dfWarning}`,
    canUseForNormalization: false,
  }
  if (r2 >= 0.30) return {
    label: `R² = ${pct}% — Ajuste bajo`,
    color: 'text-orange-500',
    advice: `El modelo explica poco. Preguntas a considerar: ¿Las variables capturadas son los verdaderos drivers? ¿Hay suficiente variabilidad en los datos? ¿Todos los datos son del mismo régimen operativo?${dfWarning}`,
    canUseForNormalization: false,
  }
  return {
    label: `R² = ${pct}% — Sin ajuste útil`,
    color: 'text-rose-600',
    advice: `Las variables seleccionadas no explican la variabilidad del EnPI. Revisa si los datos de variables y EnPI corresponden al mismo periodo, o considera otras variables.${dfWarning}`,
    canUseForNormalization: false,
  }
}

export function interpretVIF(vif: number): { label: string; color: string; ok: boolean } {
  if (vif > 10) return { label: `VIF ${vif.toFixed(1)} — Multicolinealidad severa`, color: 'text-rose-600', ok: false }
  if (vif > 5)  return { label: `VIF ${vif.toFixed(1)} — Multicolinealidad moderada`, color: 'text-amber-600', ok: false }
  return { label: `VIF ${vif.toFixed(1)} — Aceptable`, color: 'text-emerald-600', ok: true }
}

export function significanceLabel(s: Significance): { label: string; color: string } {
  switch (s) {
    case 'very_high': return { label: 'Muy significativo (p<0.01)', color: 'text-emerald-600' }
    case 'high':      return { label: 'Significativo (p<0.05)', color: 'text-emerald-500' }
    case 'marginal':  return { label: 'Marginal (p≈0.10)', color: 'text-amber-500' }
    case 'none':      return { label: 'No significativo', color: 'text-slate-400' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Matrix utilities (internal)
// ─────────────────────────────────────────────────────────────────────────────

function transpose(m: number[][]): number[][] {
  return m[0].map((_, j) => m.map((row) => row[j]))
}

function matMul(A: number[][], B: number[][]): number[][] {
  const n = A.length
  const p = A[0].length
  const q = B[0].length
  const C = Array.from({ length: n }, () => new Array(q).fill(0))
  for (let i = 0; i < n; i++)
    for (let j = 0; j < q; j++)
      for (let l = 0; l < p; l++)
        C[i][j] += A[i][l] * B[l][j]
  return C
}

function matVec(A: number[][], v: number[]): number[] {
  return A.map((row) => row.reduce((s, aij, j) => s + aij * v[j], 0))
}

/** Gaussian elimination with partial pivoting. Returns null if singular. */
function gaussElim(A: number[][], b: number[]): number[] | null {
  const n = A.length
  const M = A.map((row, i) => [...row, b[i]])

  for (let col = 0; col < n; col++) {
    let maxRow = col
    for (let row = col + 1; row < n; row++)
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row
    ;[M[col], M[maxRow]] = [M[maxRow], M[col]]
    if (Math.abs(M[col][col]) < 1e-12) return null
    const piv = M[col][col]
    for (let row = col + 1; row < n; row++) {
      const f = M[row][col] / piv
      for (let k = col; k <= n; k++) M[row][k] -= f * M[col][k]
    }
  }

  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n]
    for (let j = i + 1; j < n; j++) x[i] -= M[i][j] * x[j]
    x[i] /= M[i][i]
  }
  return x
}

/** Gauss-Jordan matrix inversion. Returns null if singular. */
function invertMatrix(A: number[][]): number[][] | null {
  const n = A.length
  const M = A.map((row, i) => [...row, ...new Array(n).fill(0).map((_, j) => (j === i ? 1 : 0))])

  for (let col = 0; col < n; col++) {
    let maxRow = col
    for (let row = col + 1; row < n; row++)
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row
    ;[M[col], M[maxRow]] = [M[maxRow], M[col]]
    if (Math.abs(M[col][col]) < 1e-12) return null
    const piv = M[col][col]
    for (let k = col; k < 2 * n; k++) M[col][k] /= piv
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const f = M[row][col]
      for (let k = col; k < 2 * n; k++) M[row][k] -= f * M[col][k]
    }
  }
  return M.map((row) => row.slice(n))
}
