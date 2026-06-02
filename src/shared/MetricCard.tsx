import type { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  icon?: ReactNode
  trend?: {
    value: number
    isPositive: boolean
    label?: string
  }
  color?: 'blue' | 'teal' | 'orange' | 'purple' | 'cyan' | 'red' | 'gray'
  className?: string
}

const accentColors = {
  blue: 'bg-brand-blue',
  teal: 'bg-brand-teal',
  orange: 'bg-brand-orange',
  purple: 'bg-brand-purple',
  cyan: 'bg-brand-cyan',
  red: 'bg-brand-red',
  gray: 'bg-brand-gray',
}

export function MetricCard({
  label,
  value,
  unit,
  icon,
  trend,
  color = 'blue',
  className = '',
}: MetricCardProps) {
  return (
    <div
      className={`bg-surface border border-border rounded-(--radius-card) shadow-card p-5 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {label}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-gray-900">
              {value}
            </span>
            {unit && (
              <span className="text-sm text-gray-400">{unit}</span>
            )}
          </div>
          {trend && (
            <div className="flex items-center gap-1">
              <span
                className={`text-xs font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-red-500'}`}
              >
                {trend.isPositive ? '↓' : '↑'} {Math.abs(trend.value)}%
              </span>
              {trend.label && (
                <span className="text-xs text-gray-400">{trend.label}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div
            className={`w-10 h-10 rounded-lg ${accentColors[color]} flex items-center justify-center text-white`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
