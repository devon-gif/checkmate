import { cn } from '@/lib/utils'
import { GlassCard } from './GlassCard'

interface ChannelCardProps {
  icon: string
  label: string
  description: string
  badge?: string
  className?: string
}

export function ChannelCard({
  icon,
  label,
  description,
  badge,
  className
}: ChannelCardProps) {
  return (
    <GlassCard
      className={cn('relative flex flex-col gap-3 p-5', className)}
      glow
    >
      {badge && (
        <span className="bg-cm-green/15 absolute right-4 top-4 rounded-full px-2 py-0.5 text-[10px] font-medium text-cm-green">
          {badge}
        </span>
      )}
      <span className="text-2xl" role="img" aria-label={label}>
        {icon}
      </span>
      <div>
        <h3 className="mb-1 text-sm font-medium text-white">{label}</h3>
        <p className="text-xs leading-relaxed text-white/50">{description}</p>
      </div>
    </GlassCard>
  )
}
