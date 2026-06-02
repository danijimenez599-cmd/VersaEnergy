import type { ReactNode, HTMLAttributes } from 'react'

type BadgeVariant =
  // Semánticos (igual que VersaMaint)
  | 'brand' | 'ok' | 'warn' | 'danger' | 'info' | 'neutral'
  // Utilities Energy
  | 'electricity' | 'steam' | 'compressed_air' | 'chilled_water'
  | 'natural_gas' | 'hot_water' | 'industrial_water' | 'solar' | 'diesel'
  // Legacy (retrocompatibilidad)
  | 'blue' | 'teal' | 'orange' | 'purple' | 'cyan' | 'red' | 'gray' | 'green'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  variant?: BadgeVariant
  /** @deprecated usa variant en lugar de color */
  color?: string
  dot?: boolean
  size?: 'sm' | 'md'
}

const variantStyles: Record<BadgeVariant, string> = {
  // ── Semánticos ──────────────────────────────────────────────────────
  brand:       'bg-brand/10 text-brand border-brand/20',
  ok:          'bg-[--color-ok-bg] text-[--color-ok] border-[--color-ok-border]',
  warn:        'bg-[--color-warn-bg] text-[--color-warn] border-[--color-warn-border]',
  danger:      'bg-[--color-danger-bg] text-[--color-danger] border-[--color-danger-border]',
  info:        'bg-[--color-info-bg] text-[--color-info] border-[--color-info-border]',
  neutral:     'bg-gray-100 text-gray-600 border-gray-200',
  // ── Utilities ───────────────────────────────────────────────────────
  electricity: 'bg-blue-50 text-blue-700 border-blue-200',
  steam:       'bg-purple-50 text-purple-700 border-purple-200',
  compressed_air: 'bg-teal-50 text-teal-700 border-teal-200',
  chilled_water:  'bg-cyan-50 text-cyan-700 border-cyan-200',
  natural_gas:    'bg-orange-50 text-orange-700 border-orange-200',
  hot_water:      'bg-red-50 text-red-700 border-red-200',
  industrial_water: 'bg-sky-50 text-sky-700 border-sky-200',
  solar:       'bg-amber-50 text-amber-700 border-amber-200',
  diesel:      'bg-stone-100 text-stone-700 border-stone-200',
  // ── Legacy aliases ───────────────────────────────────────────────────
  blue:        'bg-blue-50 text-blue-700 border-blue-200',
  teal:        'bg-teal-50 text-teal-700 border-teal-200',
  orange:      'bg-orange-50 text-orange-700 border-orange-200',
  purple:      'bg-purple-50 text-purple-700 border-purple-200',
  cyan:        'bg-cyan-50 text-cyan-700 border-cyan-200',
  red:         'bg-red-50 text-red-700 border-red-200',
  gray:        'bg-gray-100 text-gray-600 border-gray-200',
  green:       'bg-emerald-50 text-emerald-700 border-emerald-200',
}

const sizeStyles = {
  sm: 'px-1.5 py-0.5 text-[10px] gap-1',
  md: 'px-2 py-0.5 text-[11px] gap-1.5',
}

/** Resuelve color legacy (prop antigua) → variante nueva */
function resolveVariant(variant?: BadgeVariant, color?: string): BadgeVariant {
  if (variant) return variant
  if (color && color in variantStyles) return color as BadgeVariant
  return 'neutral'
}

export function Badge({
  children,
  variant,
  color,
  dot,
  size = 'md',
  className = '',
  ...rest
}: BadgeProps) {
  const resolved = resolveVariant(variant, color)
  return (
    <span
      className={[
        'inline-flex items-center font-semibold rounded-full border',
        variantStyles[resolved],
        sizeStyles[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />
      )}
      {children}
    </span>
  )
}

/** Mapea utility_type string → BadgeVariant */
export function utilityBadgeVariant(utilityType: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    electricity:      'electricity',
    natural_gas:      'natural_gas',
    steam:            'steam',
    compressed_air:   'compressed_air',
    chilled_water:    'chilled_water',
    hot_water:        'hot_water',
    industrial_water: 'industrial_water',
    solar_generation: 'solar',
    diesel:           'diesel',
    lpg:              'orange',
  }
  return map[utilityType] ?? 'neutral'
}
