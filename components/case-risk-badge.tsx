import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const riskStyles: Record<string, string> = {
  needs_more_info:
    'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300',
  low: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  medium:
    'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  high: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  very_high: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
}

const riskLabels: Record<string, string> = {
  needs_more_info: 'Needs more info',
  low: 'Low risk',
  medium: 'Medium risk',
  high: 'High risk',
  very_high: 'Critical risk'
}

export function CaseRiskBadge({
  level,
  className
}: {
  level: string
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn('capitalize shadow-none', riskStyles[level], className)}
    >
      {riskLabels[level] ?? level.replace('_', ' ')}
    </Badge>
  )
}
