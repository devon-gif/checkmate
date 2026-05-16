import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'

import { auth } from '@/auth'
import { UserMenu } from '@/components/user-menu'
import { cookies } from 'next/headers'
import { SiteNavLink } from '@/components/site/SiteNavLink'

const PUBLIC_NAV = [
  { title: 'How it works', href: '/#how-it-works' },
  { title: 'What Ray checks', href: '/#features' },
  { title: 'Ways to use', href: '/#ways-to-use' },
  { title: 'Pricing', href: '/#pricing' }
]

export async function Header() {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  const isLoggedIn = !!session?.user

  return (
    <header className="sticky top-0 left-0 right-0 z-50 bg-deep/70 backdrop-blur-xl border-b border-white/5">
      <div className="center flex items-center h-14.5 max-md:h-14">
        {/* Logo */}
        <Link
          href="/"
          aria-label="CheckRay home"
          className="mr-15 flex items-center max-lg:mr-10"
        >
          <Image
            src="/checkraylogo.png"
            alt="CheckRay"
            width={1200}
            height={300}
            priority
            className="h-7 w-auto select-none max-md:h-6"
          />
        </Link>

        {/* Nav — public links for marketing audience */}
        <nav className="flex grow items-center gap-10 max-lg:gap-8 max-md:hidden">
          {(isLoggedIn
            ? [
                { title: 'Dashboard', href: '/dashboard' },
                { title: 'New case', href: '/cases/new' },
                { title: 'How it works', href: '/#how-it-works' },
                { title: 'Pricing', href: '/#pricing' }
              ]
            : PUBLIC_NAV
          ).map(item => (
            <SiteNavLink key={item.href} title={item.title} href={item.href} />
          ))}
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-2.5 ml-auto max-md:ml-auto">
          {isLoggedIn ? (
            <>
              <Link
                href="/cases/new"
                className="hidden sm:inline-flex relative justify-center items-center h-8.5 px-3.5 rounded-lg bg-green text-title-5 text-deep transition-all hover:bg-green/90"
              >
                New case
              </Link>
              <UserMenu user={session.user} />
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="relative inline-flex justify-center items-center h-8.5 px-3.5 rounded-lg text-title-5 text-white transition-all after:absolute after:inset-0 after:border after:border-line after:rounded-lg after:pointer-events-none hover:after:border-white/40"
                style={{
                  boxShadow:
                    '0.0625rem 0.0625rem 0.0625rem 0 rgba(255,255,255,0.10) inset'
                }}
              >
                Sign in
              </Link>
              <Link
                href="/try"
                className="relative inline-flex justify-center items-center h-8.5 px-3.5 rounded-lg bg-white text-title-5 text-deep transition-all hover:bg-white/90"
              >
                Try a free check
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
