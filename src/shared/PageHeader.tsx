import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

interface Breadcrumb {
  label: string
  href?: string
  onClick?: () => void
}

interface PageHeaderProps {
  title: string
  description?: string
  /** Slot principal de acciones (botones a la derecha) */
  actions?: ReactNode
  /** Acciones secundarias (van después de las principales, separadas) */
  secondaryActions?: ReactNode
  breadcrumbs?: Breadcrumb[]
  /** Badge o chip junto al título */
  badge?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  secondaryActions,
  breadcrumbs,
  badge,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`mb-6 ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-xs text-gray-400 mb-2 flex-wrap">
          {breadcrumbs.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={11} className="text-gray-300 shrink-0" />}
              {crumb.href || crumb.onClick ? (
                <a
                  href={crumb.href}
                  onClick={crumb.onClick ? (e) => { e.preventDefault(); crumb.onClick!() } : undefined}
                  className="hover:text-gray-600 transition-colors cursor-pointer"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="text-gray-600 font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className="text-xl font-bold text-gray-900 leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>

        {/* Actions */}
        {(actions || secondaryActions) && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {secondaryActions}
            {secondaryActions && actions && (
              <span className="w-px h-5 bg-gray-200" />
            )}
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
