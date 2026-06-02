import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Info, X } from 'lucide-react'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  /** Texto del botón de confirmación. Default: "Confirmar" */
  confirmLabel?: string
  /** Texto del botón de cancelación. Default: "Cancelar" */
  cancelLabel?: string
  /** Muestra el botón de confirmar en variante danger. Default: false */
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
  /** Elemento decorativo opcional arriba del título */
  icon?: ReactNode
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
  icon,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onConfirm()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onCancel, onConfirm])

  if (!open) return null

  const DefaultIcon = danger
    ? <AlertTriangle size={22} className="text-danger" />
    : <Info size={22} className="text-brand" />

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm bg-white rounded-[--radius-2xl] shadow-modal border border-[--color-border-strong] animate-slide-up">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X size={15} />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className={[
            'w-11 h-11 rounded-2xl flex items-center justify-center mb-4',
            danger ? 'bg-[--color-danger-bg]' : 'bg-brand/10',
          ].join(' ')}>
            {icon ?? DefaultIcon}
          </div>

          {/* Content */}
          <h3 className="text-base font-semibold text-gray-900 pr-6">{title}</h3>
          {description && (
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">{description}</p>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button
              variant={danger ? 'danger' : 'primary'}
              size="sm"
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
