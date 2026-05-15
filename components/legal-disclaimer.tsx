'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { DISCLAIMER_COPY, type DisclaimerVariant } from '@/lib/legalCopy'

// Minimal inline SVG icons – no external icon-library dependency required.
function IconInfo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

function IconShieldAlert({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function IconAlertTriangle({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconBriefcase({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
    </svg>
  )
}

function IconLink({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  )
}

interface LegalDisclaimerProps {
  variant?: DisclaimerVariant
  className?: string
}

const variantConfig: Record<
  DisclaimerVariant,
  {
    icon: React.FC<{ className?: string }>
    containerClass: string
    iconClass: string
    textClass: string
  }
> = {
  default: {
    icon: IconInfo,
    containerClass: 'border border-border/50 bg-muted/40 text-muted-foreground',
    iconClass: 'text-muted-foreground shrink-0',
    textClass: 'text-muted-foreground'
  },
  compact: {
    icon: IconInfo,
    containerClass: 'border border-border/40 bg-muted/20 text-muted-foreground',
    iconClass: 'text-muted-foreground shrink-0',
    textClass: 'text-muted-foreground'
  },
  highRisk: {
    icon: IconShieldAlert,
    containerClass:
      'border border-destructive/40 bg-destructive/10 text-destructive',
    iconClass: 'text-destructive shrink-0',
    textClass: 'text-destructive/90'
  },
  bill: {
    icon: IconAlertTriangle,
    containerClass:
      'border border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    iconClass: 'text-yellow-600 dark:text-yellow-400 shrink-0',
    textClass: 'text-yellow-700 dark:text-yellow-400'
  },
  job: {
    icon: IconBriefcase,
    containerClass:
      'border border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400',
    iconClass: 'text-blue-600 dark:text-blue-400 shrink-0',
    textClass: 'text-blue-700 dark:text-blue-400'
  },
  phishing: {
    icon: IconLink,
    containerClass:
      'border border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400',
    iconClass: 'text-orange-600 dark:text-orange-400 shrink-0',
    textClass: 'text-orange-700 dark:text-orange-400'
  }
}

export function LegalDisclaimer({
  variant = 'default',
  className
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
        className={cn(
          'mt-0.5',
          isCompact ? 'h-3 w-3' : 'h-4 w-4',
          config.iconClass
        )}
        aria-hidden
      />
      <p className={cn('leading-snug', config.textClass)}>
        {DISCLAIMER_COPY[variant]}
      </p>
    </div>
  )
}
