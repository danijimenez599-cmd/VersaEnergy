import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  dismissOnBackdrop?: boolean
}

const sizeStyles = {
  sm: 'max-w-[95vw] sm:max-w-sm',     // 384px
  md: 'max-w-[95vw] sm:max-w-lg',     // 512px
  lg: 'max-w-[95vw] sm:max-w-2xl',    // 672px
  xl: 'max-w-[95vw] sm:max-w-4xl',    // 896px
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className = '',
  dismissOnBackdrop = false,
}: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[220] flex items-end justify-center p-0 sm:items-center sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismissOnBackdrop ? onClose : undefined}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={[
              'bg-white w-full flex flex-col relative z-10',
              'h-[100dvh] rounded-none shadow-floating border border-slate-100',
              'sm:h-auto sm:rounded-2xl',
              'max-h-[100dvh] sm:max-h-[90dvh]',
              sizeStyles[size],
              className,
            ].join(' ')}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            {(title || description) && (
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0 sm:px-6 sm:py-4">
                <div>
                  {title && (
                    <div className="font-display text-base font-bold text-slate-900 tracking-tight">
                      {title}
                    </div>
                  )}
                  {description && (
                    <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="p-4 overflow-y-auto flex-1 sm:p-6">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 shrink-0 bg-slate-50/50 sm:px-6 sm:py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
