import type { ReactNode } from 'react'

type BadgeColor =
  | 'blue'
  | 'teal'
  | 'orange'
  | 'purple'
  | 'cyan'
  | 'red'
  | 'gray'
  | 'green'

interface BadgeProps {
  children: ReactNode
  color?: BadgeColor
  variant?: 'solid' | 'soft'
  size?: 'sm' | 'md'
  className?: string
}

const solidStyles: Record<BadgeColor, string> = {
  blue: 'bg-brand-blue text-white',
  teal: 'bg-brand-teal text-white',
  orange: 'bg-brand-orange text-white',
  purple: 'bg-brand-purple text-white',
  cyan: 'bg-brand-cyan text-white',
  red: 'bg-brand-red text-white',
  gray: 'bg-brand-gray text-white',
  green: 'bg-emerald-600 text-white',
}

const softStyles: Record<BadgeColor, string> = {
  blue: 'bg-blue-50 text-brand-blue border-brand-blue/20',
  teal: 'bg-teal-50 text-brand-teal border-brand-teal/20',
  orange: 'bg-orange-50 text-brand-orange border-brand-orange/20',
  purple: 'bg-purple-50 text-brand-purple border-brand-purple/20',
  cyan: 'bg-cyan-50 text-brand-cyan border-brand-cyan/20',
  red: 'bg-red-50 text-brand-red border-brand-red/20',
  gray: 'bg-gray-100 text-gray-600 border-gray-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
}

export function Badge({
  children,
  color = 'blue',
  variant = 'soft',
  size = 'md',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variant === 'solid' ? solidStyles[color] : softStyles[color]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  )
}
