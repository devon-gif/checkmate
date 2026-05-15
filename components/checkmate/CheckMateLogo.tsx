import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface CheckMateLogoProps {
  className?: string
  href?: string
}

export function CheckMateLogo({ className, href = '/' }: CheckMateLogoProps) {
  return (
    <Link
      href={href}
      aria-label="CheckRay home"
      className={cn(
        'group inline-flex items-center transition-[filter] duration-200 hover:drop-shadow-[0_0_12px_rgba(122,226,207,0.5)]',
        className
      )}
    >
      <Image
        src="/checkraylogo.png"
        alt="CheckRay"
        width={1200}
        height={300}
        priority
        className="h-8 w-auto select-none"
      />
    </Link>
  )
}
