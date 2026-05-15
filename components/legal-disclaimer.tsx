'use client'

import * as React from 'react'
import { AlertTriangle, Info, ShieldAlert, Briefcase, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DISCLAIMER_COPY, type DisclaimerVariant } from '@/lib/legalCopy'

interface LegalDisclaimerProps {
  variant?: DisclaimerVariant
  className?: string
}

const variantConfig: Record<
  DisclaimerVariant,
  {
    icon: React.ElementType
    containerClass: string
    iconClass: string
    textClass: string
  }
> = {
  default: {
    icon: Info,
    containerClass:
      'border border-border/50 bg-muted/40 text-muted-foreground',
    iconClass: 'text-muted-foreground shrink-0',
    textClass: 'text-muted-foreground',
  },
  compact: {
    icon: Info,
    containerClass: 'border border-border/40 bg-muted/20 text-muted-foreground',
    iconClass: 'text-muted-foreground shrink-0',
    textClass: 'text-muted-foreground',
  },
  highRisk: {
    icon: ShieldAlert,
    containerClass:
      'border border-destructive/40 bg-destructive/10 text-destructive',
    iconClass: 'text-destructive shrink-0',
    textClass: 'text-destructive/90',
  },
  bill: {
    icon: AlertTriangle,
    containerClass:
      'border border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    iconClass: 'text-yellow-600 dark:text-yellow-400 shrink-0',
    textClass: 'text-yellow-700 dark:text-yellow-400',
  },
  job: {
    icon: Briefcase,
    containerClass:
      'border border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400',
    iconClass: 'text-blue-600 dark:text-blue-400 shrink-0',
    textClass: 'text-blue-700 dark:text-blue-400',
  },
  phishing: {
    icon: Link2,
    containerClass:
      'border border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400',
    iconClass: 'text-orange-600 dark:text-orange-400 shrink-0',
    textClass: 'text-orange-700 dark:text-orange-400',
  },
}

export function LegalDisclaimer({
  variant = 'default',
  className,
}: LegalDisclaimerProps) {
  const config = variantConfig[variant]
  const Icon = config.icon
  const isCompact = variant === 'compact'

  return (
    <div
      role="note"
      aria-label="Legal disclaimer"
      className={cn(
        'flex items-start gap-2 rounded-md px-3 py-2',
        isCompact ? 'text-xs' : 'text-xs sm:text-sm',
        config.containerClass,
        className
      )}
    >
      <Icon
        className={cn('mt-0.5', isCompact ? 'h-3 w-3' : 'h-4 w-4', config.iconClass)}
        aria-hidden
      />
      <p className={cn('leading-snug', config.textClass)}>
        {DISCLAIMER_COPY[variant]}
      </p>
    </div>
  )
}
