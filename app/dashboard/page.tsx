import Link from 'next/link'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

import { auth } from '@/auth'
import { CaseRiskBadge } from '@/components/case-risk-badge'
import { LegalDisclaimer } from '@/components/legal-disclaimer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IconArrowRight, IconPlus } from '@/components/ui/icons'
import { humanizeCategory } from '@/lib/checkmate'
import { type Database, type Json } from '@/lib/db_types'

type CaseRow = Database['public']['Tables']['cases']['Row']
type ReportRow = Database['public']['Tables']['risk_reports']['Row']

function asStringArray(value: Json) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

export default async function DashboardPage() {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })

  if (!session?.user?.id) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center px-6 py-16">
        <section className="w-full rounded-lg border bg-background p-8 shadow-sm md:p-10">
          <Badge variant="outline" className="mb-5 shadow-none">
            Personal risk assistant
          </Badge>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
            Check messages, links, bills, and offers before they cost you.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Paste suspicious text or a URL and get a plain-English risk readout,
            red flags, recommended actions, and a safer reply.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
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

  const supabase = createServerComponentClient<Database, 'public', any>({
    cookies: () => cookieStore
  })

  const { data: cases } = await supabase
    .from('cases')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .throwOnError()

  const caseRows = (cases ?? []) as CaseRow[]
  const caseIds = caseRows.map(item => item.id)
  const { data: reports } = caseIds.length
    ? await supabase
        .from('risk_reports')
        .select('*')
        .in('case_id', caseIds)
        .order('created_at', { ascending: false })
        .throwOnError()
    : { data: [] }

  const reportByCase = new Map<string, ReportRow>()
  ;((reports ?? []) as ReportRow[]).forEach(report => {
    if (!reportByCase.has(report.case_id))
      reportByCase.set(report.case_id, report)
  })

  const total = caseRows.length
  const highRisk = caseRows.filter(item =>
    ['high', 'very_high'].includes(item.risk_level)
  ).length
  const averageScore = total
    ? Math.round(
        caseRows.reduce((sum, item) => sum + item.risk_score, 0) / total
      )
    : 0

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-5 rounded-lg border bg-background p-6 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <Badge variant="outline" className="mb-4 shadow-none">
            CheckMate dashboard
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight">
            Your risk checks
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Review active cases, risk levels, and the next safe action before
            replying, clicking, paying, or sharing information.
          </p>
        </div>
        <Button asChild>
          <Link href="/cases/new">
            <IconPlus className="mr-2" />
            New case
          </Link>
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ['Total cases', total],
          ['High risk', highRisk],
          ['Average score', averageScore]
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border bg-background p-5 shadow-sm"
          >
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {value}
            </p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-lg border bg-background shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="font-medium">Recent cases</h2>
        </div>
        {caseRows.length ? (
          <div className="divide-y">
            {caseRows.map(item => {
              const report = reportByCase.get(item.id)
              const flags = report ? asStringArray(report.red_flags) : []
              return (
                <article
                  key={item.id}
                  className="grid gap-4 px-5 py-5 transition-colors hover:bg-muted/40 lg:grid-cols-[1fr_180px_120px_32px]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-medium">{item.title}</h3>
                      <Badge
                        variant="secondary"
                        className="capitalize shadow-none"
                      >
                        {humanizeCategory(item.category)}
                      </Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {report?.summary ?? 'No report summary yet.'}
                    </p>
                    {flags[0] ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        First red flag: {flags[0]}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Risk
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <CaseRiskBadge level={item.risk_level} />
                      <span className="font-mono text-sm">
                        {item.risk_score}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Status
                    </p>
                    <p className="mt-2 text-sm capitalize">{item.status}</p>
                  </div>
                  <Link
                    href="/cases/new"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Create another case"
                  >
                    <IconArrowRight />
                  </Link>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <h3 className="text-lg font-medium">No cases yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Start with a suspicious text, invoice, job message, rental
              listing, marketplace note, or URL.
            </p>
            <Button asChild className="mt-6">
              <Link href="/cases/new">Create your first case</Link>
            </Button>
          </div>
        )}
      </section>

      <LegalDisclaimer variant="default" className="mb-4" />
    </div>
  )
}
