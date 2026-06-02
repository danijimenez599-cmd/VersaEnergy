import type { ReactNode, LabelHTMLAttributes } from 'react'

interface FormFieldProps extends LabelHTMLAttributes<HTMLLabelElement> {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
}

export function FormField({
  label,
  required,
  hint,
  error,
  children,
  className = '',
  ...props
}: FormFieldProps) {
  return (
    <label className={`block ${className}`} {...props}>
      <span className="mb-1 block text-xs font-semibold text-gray-700">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </span>
      {children}
      {hint && !error && (
        <span className="mt-1 block text-[11px] text-gray-400">{hint}</span>
      )}
      {error && (
        <span className="mt-1 block text-[11px] text-danger font-medium">{error}</span>
      )}
    </label>
  )
}

/** Estilos de input estándar — usar como className en <input>, <select>, <textarea> */
export const inputClass = [
  'w-full rounded-[--radius-md] border border-[--color-border-strong] bg-white',
  'px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400',
  'focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand/40',
  'disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed',
  'transition-colors duration-150',
].join(' ')

export const selectClass = inputClass + ' cursor-pointer'
