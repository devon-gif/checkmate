import { cn } from '@/lib/utils'

interface DashboardCardsProps {
  total: number
  highRisk: number
  averageScore: number
  checksUsed: number
  checksLimit: number
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
        'rounded-2xl border p-6 transition-all duration-200',
        accent && 'border-red-500/20 bg-red-500/5',
        warn && 'border-amber-500/20 bg-amber-500/5',
        !accent && !warn && 'border-white/8 bg-white/3'
      )}
    >
      <p className="text-xs font-medium uppercase tracking-widest text-white/40">
        {label}
      </p>
      <p
        className={cn(
          'mt-3 text-4xl font-semibold tracking-tight',
          accent && 'text-red-400',
          warn && 'text-amber-400',
          !accent && !warn && 'text-white'
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-white/30">{sub}</p>}
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
  const remaining = Math.max(checksLimit - checksUsed, 0)
  const nearLimit = checksUsed >= checksLimit * 0.8
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total cases" value={total} />
      <StatCard label="High risk" value={highRisk} accent={highRisk > 0} />
      <StatCard label="Average risk score" value={averageScore} />
      <StatCard
        label="Free checks today"
        value={`${checksUsed} / ${checksLimit}`}
        sub={remaining > 0 ? `${remaining} remaining` : 'Limit reached today'}
        warn={nearLimit}
      />
    </div>
  )
}
