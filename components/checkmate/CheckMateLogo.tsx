import Link from 'next/link'
import { cn } from '@/lib/utils'

interface CheckMateLogoProps {
  className?: string
  href?: string
}

export function CheckMateLogo({ className, href = '/' }: CheckMateLogoProps) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2 group', className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cm-green shadow-[0_0_16px_rgba(122,226,207,0.4)] transition-shadow duration-200 group-hover:shadow-[0_0_24px_rgba(122,226,207,0.6)]">
        <svg
          className="h-4 w-4 text-cm-bg"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="2.5 8.5 6.5 12.5 13.5 4.5" />
        </svg>
      </div>
      <span className="text-base font-semibold tracking-tight text-white">
        CheckMate
      </span>
    </Link>
  )
}
