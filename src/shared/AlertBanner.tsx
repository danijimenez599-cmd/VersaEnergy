import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from 'lucide-react'

type AlertVariant = 'info' | 'success' | 'warning' | 'danger'

interface AlertBannerProps {
  variant?: AlertVariant
  title?: string
  children?: ReactNode
  onClose?: () => void
  className?: string
}

const CONFIG: Record<AlertVariant, { icon: ReactNode; containerClass: string; iconClass: string }> = {
  info: {
    icon: <Info size={15} />,
    containerClass: 'bg-[--color-info-bg] border-[--color-info-border] text-[--color-info]',
    iconClass: 'text-[--color-info]',
  },
  success: {
    icon: <CheckCircle2 size={15} />,
    containerClass: 'bg-[--color-ok-bg] border-[--color-ok-border] text-[--color-ok]',
    iconClass: 'text-[--color-ok]',
  },
  warning: {
    icon: <AlertTriangle size={15} />,
    containerClass: 'bg-[--color-warn-bg] border-[--color-warn-border] text-[--color-warn]',
    iconClass: 'text-[--color-warn]',
  },
  danger: {
    icon: <XCircle size={15} />,
    containerClass: 'bg-[--color-danger-bg] border-[--color-danger-border] text-[--color-danger]',
    iconClass: 'text-[--color-danger]',
  },
}

export function AlertBanner({
  variant = 'info',
  title,
  children,
  onClose,
  className = '',
}: AlertBannerProps) {
  const { icon, containerClass, iconClass } = CONFIG[variant]
  return (
    <div className={[
      'flex items-start gap-3 rounded-[--radius-lg] border px-4 py-3',
      containerClass,
      className,
    ].join(' ')}>
      <span className={`shrink-0 mt-0.5 ${iconClass}`}>{icon}</span>
      <div className="flex-1 min-w-0 text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5 opacity-80 text-xs' : ''}>{children}</div>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 p-0.5 rounded-md opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
