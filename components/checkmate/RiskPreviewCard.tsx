import { GlassCard } from './GlassCard'
import { cn } from '@/lib/utils'

type RiskLevel = 'low' | 'medium' | 'high' | 'very_high' | string

interface RiskPreviewCardProps {
  score: number
  level: RiskLevel
  summary?: string
  flags?: string[]
  className?: string
}

function levelColor(level: RiskLevel) {
  switch (level) {
    case 'very_high':
    case 'high':
      return 'text-red-400'
    case 'medium':
      return 'text-amber-400'
    default:
      return 'text-emerald-400'
  }
}

function levelBorderColor(level: RiskLevel) {
  switch (level) {
    case 'very_high':
    case 'high':
      return 'border-red-500/30'
    case 'medium':
      return 'border-amber-500/30'
    default:
      return 'border-emerald-500/30'
  }
}

function humanizeLevel(level: RiskLevel) {
  return level.replace('_', ' ').toUpperCase()
}

export function RiskPreviewCard({
  score,
  level,
  summary,
  flags = [],
  className
}: RiskPreviewCardProps) {
  return (
    <GlassCard className={cn('flex flex-col gap-4 p-5', className)}>
      {/* Score ring */}
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 text-xl font-bold',
            levelColor(level),
            levelBorderColor(level)
          )}
        >
          {score}
        </div>
        <div>
          <p className={cn('text-sm font-semibold', levelColor(level))}>
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
