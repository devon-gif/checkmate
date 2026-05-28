import { GlassCard } from './GlassCard'
import { cn } from '@/lib/utils'
import { riskTw, riskLabel as riskLabelHelper } from '@/lib/risk-colors'

type RiskLevel = 'low' | 'medium' | 'high' | 'very_high' | string

interface RiskPreviewCardProps {
  score: number
  level: RiskLevel
  summary?: string
  flags?: string[]
  className?: string
}

function humanizeLevel(level: RiskLevel) {
  return riskLabelHelper(level).toUpperCase()
}

export function RiskPreviewCard({
  score,
  level,
  summary,
  flags = [],
  className
}: RiskPreviewCardProps) {
  const tw = riskTw(level)
  return (
    <GlassCard className={cn('flex flex-col gap-4 p-5', className)}>
      {/* Score ring */}
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 text-xl font-bold',
            tw.text,
            tw.border
          )}
        >
          {score}
        </div>
        <div>
          <p className={cn('text-sm font-semibold', tw.text)}>
            {humanizeLevel(level)}
          </p>
          <p className="text-xs text-white/40">Ray’s read · {score}/100</p>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <p className="text-sm leading-relaxed text-white/60">{summary}</p>
      )}

      {/* Flags */}
      {flags.length > 0 && (
        <ul className="space-y-1.5">
          {flags.slice(0, 3).map(flag => (
            <li
              key={flag}
              className="flex items-start gap-2 text-xs text-white/50"
            >
              <span className="mt-0.5 text-red-400/70">⚑</span>
              {flag}
            </li>
          ))}
          {flags.length > 3 && (
            <li className="text-xs text-white/30">
              +{flags.length - 3} more red flags Ray noticed
            </li>
          )}
        </ul>
      )}
    </GlassCard>
  )
}
