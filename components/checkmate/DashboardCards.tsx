import { cn } from '@/lib/utils'

interface DashboardCardsProps {
  total: number
  highRisk: number
  averageScore: number
  /** Checks the user has run this calendar month. */
  checksUsed: number
  /**
   * Monthly check limit for the user's current plan.
   * `null` means unlimited fair-use (e.g. Family plan or active trial).
   */
  checksLimit: number | null
}

interface StatCardProps {
  label: string
  value: number | string
  sub?: string
  accent?: boolean
  warn?: boolean
}

function StatCard({ label, value, sub, accent, warn }: StatCardProps) {
  return (
    <div
      className={cn(
        'cm-glass flex min-h-[7rem] flex-col justify-between rounded-2xl p-5 transition-all duration-200',
        accent && 'border-red-500/25 shadow-[0_0_24px_rgba(239,68,68,0.07)]',
        warn && 'border-amber-500/25 shadow-[0_0_24px_rgba(245,158,11,0.07)]',
        !accent && !warn && 'hover:border-white/15'
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
        {label}
      </p>
      <div>
        <p
          className={cn(
            'mt-2 text-4xl font-semibold leading-none tracking-tight',
            accent && 'text-red-400',
            warn && 'text-amber-400',
            !accent && !warn && 'text-white'
          )}
        >
          {value}
        </p>
        {sub && (
          <p
            className={cn(
              'mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
              warn
                ? 'border border-amber-500/20 bg-amber-500/8 text-amber-400'
                : accent
                  ? 'border border-red-500/20 bg-red-500/8 text-red-400'
                  : 'border border-white/8 bg-white/4 text-white/35'
            )}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

export function DashboardCards({
  total,
  highRisk,
  averageScore,
  checksUsed,
  checksLimit
}: DashboardCardsProps) {
  // Unlimited plans (Family, open trial) come through as checksLimit === null.
  // For those we skip the fraction display and just show the running count.
  const isUnlimited = checksLimit === null
  const remaining = isUnlimited
    ? null
    : Math.max((checksLimit as number) - checksUsed, 0)
  const nearLimit =
    !isUnlimited && checksUsed >= (checksLimit as number) * 0.8

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total cases" value={total} sub={total === 1 ? '1 report saved' : total > 0 ? `${total} reports saved` : 'No checks yet'} />
      <StatCard label="High risk" value={highRisk} accent={highRisk > 0} sub={highRisk > 0 ? 'Needs attention' : 'All clear'} />
      <StatCard label="Average risk score" value={averageScore > 0 ? averageScore : '—'} sub={averageScore > 0 ? (averageScore >= 70 ? 'Elevated' : averageScore >= 40 ? 'Moderate' : 'Low') : 'Run a check to see'} />
      <StatCard
        label="Checks this month"
        value={isUnlimited ? `${checksUsed}` : `${checksUsed} / ${checksLimit}`}
        sub={
          isUnlimited
            ? 'Unlimited fair-use'
            : remaining! > 0
              ? `${remaining} remaining`
              : 'Monthly limit reached'
        }
        warn={nearLimit}
      />
    </div>
  )
}
