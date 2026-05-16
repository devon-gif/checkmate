import Link from 'next/link'
import { cn } from '@/lib/utils'

interface GradientButtonProps {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  className?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

export function GradientButton({
  children,
  href,
  onClick,
  variant = 'primary',
  className,
  type = 'button',
  disabled = false
}: GradientButtonProps) {
  const baseClasses = cn(
    'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all duration-200 cursor-pointer',
    variant === 'primary' &&
      'bg-cm-green text-cm-bg hover:bg-cm-green/90 shadow-[0_0_24px_rgba(122,226,207,0.3)] hover:shadow-[0_0_36px_rgba(122,226,207,0.45)]',
    variant === 'secondary' &&
      'border border-white/20 text-white hover:border-white/40 hover:bg-white/5',
    disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
    className
  )

  if (href) {
    return (
      <Link href={href} className={baseClasses}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={baseClasses}>
      {children}
    </button>
  )
}
