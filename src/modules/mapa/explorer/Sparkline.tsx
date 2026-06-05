// Minimal SVG sparkline — no external deps, renders in ~40px height.
// data: array of numbers, left-to-right chronological.

interface SparklineProps {
  data: number[]
  color: string
  softColor: string
  width?: number
  height?: number
}

export function Sparkline({ data, color, softColor, width = 88, height = 28 }: SparklineProps) {
  if (data.length < 2) {
    // Not enough data: show a flat dashed line
    return (
      <svg width={width} height={height}>
        <line x1={0} y1={height / 2} x2={width} y2={height / 2}
          stroke={color} strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
      </svg>
    )
  }
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pad = 3

  const xs = data.map((_, i) => (i / (data.length - 1)) * width)
  const ys = data.map((v) => height - pad - ((v - min) / range) * (height - 2 * pad))

  const linePts = xs.map((x, i) => `${x},${ys[i]}`).join(' ')
  // Closed fill path: start bottom-left → points → end bottom-right
  const fillPts = `0,${height} ` + linePts + ` ${width},${height}`

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Filled area under the line */}
      <polygon points={fillPts} fill={softColor} opacity={0.6} />
      {/* The line */}
      <polyline
        points={linePts}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot on the last (most recent) point */}
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={2.5} fill={color} />
    </svg>
  )
}
