/**
 * app/admin/billing-test/page.tsx
 *
 * Admin-only billing state override panel. Lets a whitelisted admin
 * flip their own `user_billing` row through every plan / status combo
 * so we can exercise dashboard UI, access-gate behaviour, and copy
 * without going through Stripe Checkout every time.
 *
 * The page is wrapped in three gates:
 *   - ENABLE_ADMIN_TOOLS=true               → notFound() otherwise
 *   - authenticated user                    → redirect to /admin/login
 *   - email in ADMIN_EMAILS                 → notFound() otherwise
 *
 * Real Stripe billing is NEVER touched from here — see the warning
 * banner when the user has real stripe_customer_id / subscription_id.
 */
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

import { requireAdmin } from '@/lib/admin/access'
import { PLAN_MONTHLY_LIMIT } from '@/lib/billing/plans'
import { type Database } from '@/lib/db_types'
import { GlassCard } from '@/components/checkmate/GlassCard'
import { BillingTestPanel } from './billing-test-panel'

export const metadata = {
  title: 'Admin · Billing Test | CheckRay',
  robots: { index: false, follow: false }
}

export const dynamic = 'force-dynamic'

export default async function BillingTestPage() {
  const cookieStore = cookies()
  const admin = await requireAdmin()

  // Read current billing state + monthly usage. Same source the
  // dashboard reads, so the panel never reports drift.
  const supabase = createServerComponentClient<Database, 'public', any>({
    cookies: () => cookieStore
  })

  const { data: billingRowRaw, error: billingErr } = await supabase
    .from('user_billing' as any)
    .select('*')
    .eq('user_id', admin.userId)
    .maybeSingle()
  const billingRow = billingRowRaw as any

  // Surface the most common deployment bug: the `user_billing` table was
  // never created on the live Supabase project (migration in repo but
  // never applied via supabase db push / SQL editor). When that happens
  // every set-plan click fails with "Could not find the table 'public.user_billing'
  // in the schema cache". Telling the admin once, here, is much friendlier
  // than letting them learn it from each individual button error.
  const userBillingMissing = Boolean(
    billingErr?.message &&
      /user_billing/i.test(billingErr.message) &&
      /(schema cache|relation .* does not exist|does not exist in the schema)/i.test(
        billingErr.message
      )
  )

  // Detect if billing_source column exists; if not, suggest the optional
  // follow-up migration. Best-effort: a missing column in select() does
  // not throw, but we can probe by trying to read it directly.
  const hasBillingSourceColumn = Boolean(
    billingRow && Object.prototype.hasOwnProperty.call(billingRow, 'billing_source')
  )

  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  ).toISOString()
  const { count: checksUsedThisMonth } = await supabase
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', admin.userId)
    .eq('event_type', 'check_created')
    .gte('created_at', monthStart)

  const planKey = (billingRow?.plan ?? 'free') as keyof typeof PLAN_MONTHLY_LIMIT
  const monthlyLimit = PLAN_MONTHLY_LIMIT[planKey] ?? null
  const hasRealStripeData = Boolean(
    billingRow?.stripe_customer_id || billingRow?.stripe_subscription_id
  )

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      {/* Header */}
      <header>
        <span className="mb-3 inline-block rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-300">
          Admin · billing test
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Billing test panel
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
          Override your own <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">user_billing</code>{' '}
          row to any plan / status combination so you can verify dashboard
          UI, access-gate behaviour, and copy without going through Stripe
          Checkout. Real Stripe billing is never touched from here.
        </p>
      </header>

      {/* Schema-cache / missing-table banner — the #1 reason set-plan fails. */}
      {userBillingMissing && (
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-4 text-sm leading-relaxed text-red-100">
          <p className="font-semibold text-red-50">
            The <code className="rounded bg-black/30 px-1.5 py-0.5">user_billing</code>{' '}
            table is missing on this Supabase project.
          </p>
          <p className="mt-2 text-red-200/85">
            CheckRay&apos;s dashboard, the access gate, the Stripe webhook,
            and this admin override all read/write this table. Until it
            exists, plan-override buttons will fail with
            <em> &ldquo;Could not find the table &apos;public.user_billing&apos;
            in the schema cache.&rdquo;</em>
          </p>
          <p className="mt-3 text-red-200/85">
            Apply the migration in your Supabase SQL editor:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-red-400/20 bg-black/40 p-3 text-[11px] leading-snug text-red-100/90">{`-- supabase/migrations/20260516140000_add_user_billing_table.sql
-- (paste exact contents from the repo into Supabase SQL editor, run once)`}</pre>
          <p className="mt-2 text-xs text-red-200/70">
            Optional follow-up: also run
            <code className="ml-1 rounded bg-black/30 px-1.5 py-0.5">
              20260526120000_user_billing_billing_source.sql
            </code>{' '}
            to enable the <code>billing_source=&apos;admin_override&apos;</code> column
            this panel writes. The override still works without it.
          </p>
        </div>
      )}

      {/* Warning when the user has real Stripe data */}
      {hasRealStripeData && (
        <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/5 px-4 py-3 text-sm leading-6 text-yellow-200">
          <p className="font-medium text-yellow-100">
            This account has a real Stripe subscription. Admin override changes
            CheckRay app state only and does not change Stripe billing.
          </p>
        </div>
      )}

      {/* Current state summary */}
      <GlassCard className="p-5">
        <h2 className="text-sm font-medium text-white">Current state</h2>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Field label="Admin email" value={admin.email} />
          <Field label="user_id" value={admin.userId} mono />
          <Field label="plan" value={billingRow?.plan ?? '— (treated as free)'} mono />
          <Field label="status" value={billingRow?.status ?? '— (treated as free)'} mono />
          <Field
            label="Monthly limit"
            value={monthlyLimit === null ? 'unlimited fair-use' : String(monthlyLimit)}
          />
          <Field
            label="Checks this month"
            value={`${checksUsedThisMonth ?? 0}${
              monthlyLimit === null ? '' : ` / ${monthlyLimit}`
            }`}
          />
          <Field
            label="stripe_customer_id"
            value={billingRow?.stripe_customer_id ?? '—'}
            mono
          />
          <Field
            label="stripe_subscription_id"
            value={billingRow?.stripe_subscription_id ?? '—'}
            mono
          />
          <Field
            label="trial_ends_at"
            value={formatDate(billingRow?.trial_ends_at ?? null)}
          />
          <Field
            label="current_period_end"
            value={formatDate(billingRow?.current_period_end ?? null)}
          />
          <Field
            label="billing source"
            value={
              hasBillingSourceColumn
                ? billingRow?.billing_source ?? '(none — stripe/default)'
                : '(column not present)'
            }
            mono
          />
          <Field
            label="billing table"
            value="public.user_billing"
            mono
          />
        </dl>
      </GlassCard>

      {/* Buttons — interactive client island */}
      <BillingTestPanel />

      {/* Quick nav */}
      <GlassCard className="p-5">
        <h2 className="text-sm font-medium text-white">Quick navigation</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <NavPill href="/dashboard">Go to Dashboard</NavPill>
          <NavPill href="/cases/new">Go to New case</NavPill>
          <NavPill href="/pricing">Go to Pricing</NavPill>
          <NavPill href="/api/billing/customer-portal" method="POST">
            Open Manage billing (POST)
          </NavPill>
        </div>
        <p className="mt-3 text-xs text-white/35">
          The Manage billing link only works if the account has a real
          Stripe customer ID. For admin-override-only accounts it returns
          a clean 404 &quot;no billing account found&quot;.
        </p>
      </GlassCard>
    </div>
  )
}

function Field({
  label,
  value,
  mono
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
      <dt className="text-[10px] uppercase tracking-widest text-white/35">
        {label}
      </dt>
      <dd
        className={`break-all text-white/80 ${
          mono ? 'font-mono text-xs' : 'text-sm'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

function NavPill({
  href,
  method,
  children
}: {
  href: string
  method?: 'GET' | 'POST'
  children: React.ReactNode
}) {
  if (method === 'POST') {
    // Render as a form so the POST is a real navigation, not a fetch.
    return (
      <form action={href} method="POST">
        <button
          type="submit"
          className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/30 hover:text-white"
        >
          {children}
        </button>
      </form>
    )
  }
  return (
    <a
      href={href}
      className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/30 hover:text-white"
    >
      {children}
    </a>
  )
}
