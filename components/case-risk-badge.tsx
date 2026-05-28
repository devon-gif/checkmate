import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { riskTw, riskLabel } from '@/lib/risk-colors'

export function CaseRiskBadge({
  level,
  className
}: {
  level: string
  className?: string
}) {
  const tw = riskTw(level)
  return (
    <Badge
      variant="outline"
      className={cn('capitalize shadow-none', tw.pill, className)}
    >
      {riskLabel(level)}
    </Badge>
  )
}
