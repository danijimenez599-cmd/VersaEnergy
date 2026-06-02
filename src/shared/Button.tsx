import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'outline' | 'ghost'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  icon?: ReactNode
  loading?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:   'bg-brand text-white hover:bg-brand-dark shadow-sm border border-brand/20',
  secondary: 'bg-white border border-[--color-border-strong] text-gray-900 hover:bg-gray-50',
  danger:    'bg-danger text-white hover:opacity-90 border border-danger/20 shadow-sm',
  success:   'bg-ok text-white hover:opacity-90 border border-ok/20 shadow-sm',
  warning:   'bg-warn text-white hover:opacity-90 border border-warn/20 shadow-sm',
  outline:   'bg-transparent border border-[--color-border-strong] text-gray-700 hover:bg-gray-50',
  ghost:     'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent',
}

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-[11px] rounded-md gap-1',
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-11 px-5 text-sm rounded-xl gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  icon,
  loading,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}, ref) => {
  const resolvedIcon = icon ?? leftIcon
  return (
    <button
      ref={ref}
      type={type}
      disabled={loading || disabled}
      className={[
        'inline-flex items-center justify-center font-semibold whitespace-nowrap select-none cursor-pointer',
        'transition-all duration-150',
        'active:scale-[0.97]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30',
        'disabled:opacity-50 disabled:pointer-events-none',
        variantStyles[variant],
        sizeStyles[size],
        className,
      ].join(' ')}
      {...props}
    >
      {loading
        ? <Loader2 size={14} className="animate-spin shrink-0" />
        : resolvedIcon && <span className="shrink-0">{resolvedIcon}</span>
      }
      {children && <span>{children}</span>}
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  )
})
Button.displayName = 'Button'
