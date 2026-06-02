/**
 * ISA-5.1 / IEC 60617 technical SVG symbols for ControlNode types.
 * All symbols use `currentColor` for easy styling.
 */

import type { SVGProps } from 'react'

type SvgProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 32, children, ...props }: SvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  )
}

/** ISA-5.1 Gate valve — two opposing triangles meeting at a point */
export function ValveSymbol({ size = 28 }: { size?: number }) {
  return (
    <Svg size={size}>
      <polygon points="2,4 14,16 2,28" stroke="currentColor" strokeWidth="2" fill="none" />
      <polygon points="30,4 18,16 30,28" stroke="currentColor" strokeWidth="2" fill="none" />
    </Svg>
  )
}

/** ISA-5.1 Control valve — gate valve + circle on stem */
export function ControlValveSymbol({ size = 28 }: { size?: number }) {
  return (
    <Svg size={size}>
      <polygon points="2,6 12,16 2,26" stroke="currentColor" strokeWidth="2" fill="none" />
      <polygon points="30,6 20,16 30,26" stroke="currentColor" strokeWidth="2" fill="none" />
      {/* Actuator circle */}
      <circle cx="16" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line x1="16" y1="13" x2="16" y2="16" stroke="currentColor" strokeWidth="1.5" />
    </Svg>
  )
}

/** Check valve — triangle with bar */
export function CheckValveSymbol({ size = 28 }: { size?: number }) {
  return (
    <Svg size={size}>
      <polygon points="6,6 6,26 24,16" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="24" y1="6" x2="24" y2="26" stroke="currentColor" strokeWidth="2" />
    </Svg>
  )
}

/** Circuit breaker (IEC 60617) — interrupted line with contact symbol */
export function BreakerSymbol({ size = 28 }: { size?: number }) {
  return (
    <Svg size={size}>
      <line x1="2"  y1="16" x2="10" y2="16" stroke="currentColor" strokeWidth="2.5" />
      {/* Open contact arc */}
      <line x1="10" y1="16" x2="22" y2="6"  stroke="currentColor" strokeWidth="2" />
      <circle cx="22" cy="16" r="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" />
      <line x1="22"  y1="16" x2="30" y2="16" stroke="currentColor" strokeWidth="2.5" />
    </Svg>
  )
}

/** Disconnect switch — simple open contact */
export function DisconnectSymbol({ size = 28 }: { size?: number }) {
  return (
    <Svg size={size}>
      <line x1="2"  y1="16" x2="11" y2="16" stroke="currentColor" strokeWidth="2.5" />
      <line x1="11" y1="16" x2="21" y2="8"  stroke="currentColor" strokeWidth="2" />
      <line x1="21" y1="16" x2="30" y2="16" stroke="currentColor" strokeWidth="2.5" />
    </Svg>
  )
}

/** Pressure regulator — rectangle with arrow */
export function RegulatorSymbol({ size = 28 }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="8" y="8" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="2"  y1="16" x2="8"  y2="16" stroke="currentColor" strokeWidth="2" />
      <line x1="24" y1="16" x2="30" y2="16" stroke="currentColor" strokeWidth="2" />
      {/* Arrow down (pressure-sensing) */}
      <line x1="16" y1="2"  x2="16" y2="8"  stroke="currentColor" strokeWidth="1.5" />
      <polyline points="13,6 16,10 19,6" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </Svg>
  )
}

/** Damper — rectangle with diagonal cross */
export function DamperSymbol({ size = 28 }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="6" y="6" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="6" y1="6" x2="26" y2="26" stroke="currentColor" strokeWidth="1.5" />
      <line x1="26" y1="6" x2="6" y2="26" stroke="currentColor" strokeWidth="1.5" />
    </Svg>
  )
}

/** Get symbol component for a control node type */
export function getControlSymbol(nodeType: string): React.FC<{ size?: number }> {
  const map: Record<string, React.FC<{ size?: number }>> = {
    valve:         ValveSymbol,
    control_valve: ControlValveSymbol,
    check_valve:   CheckValveSymbol,
    breaker:       BreakerSymbol,
    disconnect:    DisconnectSymbol,
    regulator:     RegulatorSymbol,
    damper:        DamperSymbol,
  }
  return map[nodeType] || ValveSymbol
}
