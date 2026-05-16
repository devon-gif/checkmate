'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Props = {
  title: string
  href: string
}

export function SiteNavLink({ title, href }: Props) {
  const pathname = usePathname()

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (href.includes('#')) {
      const [path, anchor] = href.split('#')
      if (pathname === path || (path === '/' && pathname === '/')) {
        e.preventDefault()
        const el = document.getElementById(anchor)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const isActive =
    href === '/' ? pathname === '/' : pathname.startsWith(href.split('#')[0] || '/')

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`flex px-0.25 text-title-5 transition-colors hover:text-white ${
        isActive ? 'text-white' : 'text-description'
      }`}
    >
      {title}
    </Link>
  )
}
