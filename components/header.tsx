import * as React from 'react'
import Link from 'next/link'

import { auth } from '@/auth'
import { Button } from '@/components/ui/button'
import { IconNextChat, IconPlus } from '@/components/ui/icons'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/components/user-menu'
import { cookies } from 'next/headers'

export async function Header() {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  return (
    <header className="sticky top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <IconNextChat className="h-6 w-6 dark:hidden" inverted />
          <IconNextChat className="hidden h-6 w-6 dark:block" />
          <span className="font-semibold tracking-tight">CheckMate</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <Button asChild variant="ghost">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/cases/new">New case</Link>
          </Button>
        </nav>
      </div>
      <div className="flex items-center justify-end gap-2">
        <ThemeToggle />
        {session?.user ? (
          <>
            <Button asChild className="hidden sm:inline-flex">
              <Link href="/cases/new">
                <IconPlus className="mr-2" />
                New case
              </Link>
            </Button>
            <UserMenu user={session.user} />
          </>
        ) : (
          <>
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Sign up</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
