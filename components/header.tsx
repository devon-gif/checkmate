import * as React from 'react'
import Link from 'next/link'

import { auth } from '@/auth'
import { Button } from '@/components/ui/button'
import { IconPlus } from '@/components/ui/icons'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/components/user-menu'
import { cookies } from 'next/headers'
import { CheckMateLogo } from '@/components/checkmate/CheckMateLogo'

export async function Header() {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  const isLoggedIn = !!session?.user
  return (
    <header className="sticky top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between border-b border-white/8 bg-cm-bg/90 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-6">
        <CheckMateLogo href="/" />
        {isLoggedIn && (
          <nav className="hidden items-center gap-1 md:flex">
            <Button asChild variant="ghost" className="text-white/70 hover:text-white">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button asChild variant="ghost" className="text-white/70 hover:text-white">
              <Link href="/cases/new">New case</Link>
            </Button>
          </nav>
        )}
      </div>
      <div className="flex items-center justify-end gap-2">
        <ThemeToggle />
        {isLoggedIn ? (
          <>
            <Button
              asChild
              className="hidden bg-cm-green text-cm-bg hover:bg-cm-green/90 sm:inline-flex"
            >
              <Link href="/cases/new">
                <IconPlus className="mr-2" />
                New case
              </Link>
            </Button>
            <UserMenu user={session.user} />
          </>
        ) : (
          <>
            <Button variant="ghost" asChild className="text-white/70 hover:text-white">
              <Link href="/sign-in">Login</Link>
            </Button>
            <Button
              asChild
              className="bg-cm-green text-cm-bg hover:bg-cm-green/90"
            >
              <Link href="/sign-up">Sign up</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
