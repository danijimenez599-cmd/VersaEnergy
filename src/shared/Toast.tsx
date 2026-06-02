import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastPayload {
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastProps extends ToastPayload {
  onClose: () => void
}

const CONFIG: Record<ToastType, { icon: ReactNode; containerClass: string; iconClass: string }> = {
  success: {
    icon: <CheckCircle2 size={18} />,
    containerClass: 'bg-white border-[--color-ok-border] shadow-floating',
    iconClass: 'text-[--color-ok] bg-[--color-ok-bg]',
  },
  error: {
    icon: <XCircle size={18} />,
    containerClass: 'bg-white border-[--color-danger-border] shadow-floating',
    iconClass: 'text-[--color-danger] bg-[--color-danger-bg]',
  },
  warning: {
    icon: <AlertTriangle size={18} />,
    containerClass: 'bg-white border-[--color-warn-border] shadow-floating',
    iconClass: 'text-[--color-warn] bg-[--color-warn-bg]',
  },
  info: {
    icon: <Info size={18} />,
    containerClass: 'bg-white border-[--color-info-border] shadow-floating',
    iconClass: 'text-[--color-info] bg-[--color-info-bg]',
  },
}

export function Toast({ type, title, message, duration = 4000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const { icon, containerClass, iconClass } = CONFIG[type]

  return createPortal(
    <div className={[
      'fixed bottom-6 right-6 z-[9998] flex items-start gap-3 max-w-sm w-full',
      'rounded-[--radius-xl] border p-4 animate-slide-up',
      containerClass,
    ].join(' ')}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {message && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{message}</p>}
      </div>
      <button
        onClick={onClose}
        className="shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer mt-0.5"
      >
        <X size={14} />
      </button>
    </div>,
    document.body,
  )
}

/** Hook para gestionar un toast simple en un componente */
export function useToastState() {
  return { toast: null as ToastPayload | null }
}
