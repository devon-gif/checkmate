import { cn } from '@/lib/utils'

interface LegalDisclaimerProps {
  variant?: 'default' | 'compact'
  className?: string
}

export function LegalDisclaimerBanner({ variant = 'default', className }: LegalDisclaimerProps) {
  if (variant === 'compact') {
    return (
      <p className={cn('text-center text-xs text-white/30', className)}>
        CheckMate may be wrong. Results are informational only — not legal,
        financial, or medical advice. Verify through official channels before
        acting.
      </p>
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/60',
        className
      )}
    >
      <p className="mb-1 font-medium text-amber-200/80">
        ⚠ Important — please read
      </p>
      <p className="leading-relaxed">
        CheckMate identifies possible risk signals and common red flags based on
        patterns. It <strong>can be wrong</strong> and is not a guarantee that
        any message is safe or a scam. Results are for informational purposes
        only and do not constitute legal, financial, or professional advice.
        Always verify through official channels before sharing information,
        clicking links, or making payments.
      </p>
    </div>
  )
}
