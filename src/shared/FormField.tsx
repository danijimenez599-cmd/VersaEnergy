import type { ReactNode, LabelHTMLAttributes } from 'react'
import { AlertTriangle } from 'lucide-react'

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
    <div className={`space-y-1 w-full ${className}`}>
      <label className="block text-[10px] uppercase tracking-wide font-bold text-slate-500 ml-0.5" {...props}>
        {label}
        {required && <span className="text-brand ml-1">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[10px] text-slate-400 mt-1">{hint}</p>
      )}
      {error && (
        <p className="text-[10px] text-brand font-medium flex items-center gap-1 mt-1">
          <AlertTriangle size={10} />
          {error}
        </p>
      )}
    </div>
  )
}

/** Estilos de input estándar — usar como className en <input>, <textarea> */
export const inputClass = [
  'flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 focus:border-brand focus:ring-[3px] focus:ring-brand/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
].join(' ')

export const selectClass = [
  'flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-150 focus:border-brand focus:ring-[3px] focus:ring-brand/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
  'select-custom cursor-pointer pr-8',
].join(' ')
