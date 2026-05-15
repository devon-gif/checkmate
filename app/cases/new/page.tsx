import Link from 'next/link'
import { cookies } from 'next/headers'

import { auth } from '@/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NewCaseForm } from './new-case-form'

export default async function NewCasePage() {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })

  if (!session?.user?.id) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 items-center px-6 py-16">
        <section className="w-full rounded-lg border bg-background p-8 shadow-sm">
          <Badge variant="outline" className="mb-5 shadow-none">
            Sign in required
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight">
            Create an account to analyze cases.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            CheckMate stores your cases privately with row-level security, so
            only your signed-in account can read them.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/sign-up">Create account</Link>
            </Button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-lg border bg-background p-6 shadow-sm">
        <Badge variant="outline" className="mb-4 shadow-none">
          New risk check
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight">
          Analyze a suspicious message or link
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Paste the exact wording and add a URL if one was included.
          Screenshots, PDFs, forwarded SMS, and inbound email will plug into the
          same case model later.
        </p>
      </section>

      <section className="rounded-lg border bg-background p-6 shadow-sm">
        <NewCaseForm />
      </section>
    </div>
  )
}
