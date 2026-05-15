import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
}

export function GlassCard({ children, className, glow }: GlassCardProps) {
  return (
    <div
      className={cn(
        'cm-glass relative rounded-2xl transition-all duration-300',
        glow && 'hover:cm-glow-green hover:border-cm-green/20',
        className
      )}
    >
      {children}
    </div>
  )
}
