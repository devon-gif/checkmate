'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ConsentCheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export function ConsentCheckbox({
  checked,
  onCheckedChange,
  disabled = false,
  className
}: ConsentCheckboxProps) {
  const id = React.useId()

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <div className="relative mt-0.5 flex shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={e => onCheckedChange(e.target.checked)}
          disabled={disabled}
          className="peer h-4 w-4 shrink-0 cursor-pointer appearance-none rounded border border-input bg-background checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-required
        />
        {/* Checkmark */}
        <svg
          className="pointer-events-none absolute hidden h-3 w-3 text-primary-foreground peer-checked:block"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M2 6l3 3 5-5"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <label
        htmlFor={id}
        className="cursor-pointer text-sm leading-snug text-muted-foreground"
      >
        I agree to the{' '}
        <Link
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          tabIndex={0}
        >
          Terms of Service
        </Link>
        ,{' '}
        <Link
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          tabIndex={0}
        >
          Privacy Policy
        </Link>
        , and{' '}
        <Link
          href="/ai-disclosure"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          tabIndex={0}
        >
          AI Disclosure
        </Link>
        .
      </label>
    </div>
  )
}
