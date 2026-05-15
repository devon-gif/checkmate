import { cn } from '@/lib/utils'

interface DashboardCardsProps {
  total: number
  highRisk: number
  averageScore: number
}

interface StatCardProps {
  label: string
  value: number | string
  accent?: boolean
}

function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-6 transition-all duration-200',
        accent ? 'border-red-500/20 bg-red-500/5' : 'border-white/8 bg-white/3'
      )}
    >
      <p className="text-xs font-medium uppercase tracking-widest text-white/40">
        {label}
      </p>
      <p
        className={cn(
          'mt-3 text-4xl font-semibold tracking-tight',
          accent ? 'text-red-400' : 'text-white'
        )}
      >
        {value}
      </p>
    </div>
  )
}

export function DashboardCards({
  total,
  highRisk,
  averageScore
}: DashboardCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label="Total cases" value={total} />
      <StatCard label="High risk" value={highRisk} accent={highRisk > 0} />
      <StatCard label="Average risk score" value={averageScore} />
    </div>
  )
}
