import React from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'

const CURRENT_YEAR = 2026

const LEGAL_LINKS = [
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/disclaimer', label: 'Disclaimer' },
  { href: '/ai-disclosure', label: 'AI Disclosure' },
  { href: '/acceptable-use', label: 'Acceptable Use' },
  { href: '/contact', label: 'Contact' }
]

export function FooterText({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'px-2 text-center text-xs leading-normal text-muted-foreground',
        className
      )}
      {...props}
    >
      CheckRay provides informational risk analysis only — not legal,
      financial, or medical advice. Results may be wrong. Verify before acting.
    </p>
  )
}

export function FooterLegal({ className }: { className?: string }) {
  return (
    <nav
      className={cn(
        'flex flex-wrap justify-center gap-x-4 gap-y-1 px-2 text-center text-xs text-muted-foreground',
        className
      )}
      aria-label="Legal links"
    >
      {LEGAL_LINKS.map(link => (
        <Link
          key={link.href}
          href={link.href}
          className="hover:text-foreground hover:underline"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}

export function Footer({ className }: { className?: string }) {
  return (
    <footer
      className={cn('border-t border-border bg-background py-4', className)}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4">
        <FooterText />
        <FooterLegal />
        <p className="text-center text-xs text-muted-foreground/60">
          &copy; {CURRENT_YEAR} CheckRay. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
