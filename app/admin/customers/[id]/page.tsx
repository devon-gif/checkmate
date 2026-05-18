/**
 * app/admin/customers/[id]/page.tsx — Customer detail page
 *
 * Shows: user info, billing, recent cases, risk reports, support notes (read + add)
 */
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { GlassCard } from '@/components/checkmate/GlassCard'
import { AddNoteForm } from './AddNoteForm'
import { cookies } from 'next/headers'
import { auth } from '@/auth'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function AdminCustomerDetailPage({
  params
}: {
  params: { id: string }
}) {
  const userId = params.id
  const sb = adminClient()

  // Fetch auth user
  const { data: { user: authUser }, error: userError } =
    await sb.auth.admin.getUserById(userId)

  if (userError || !authUser) return notFound()

  // Parallel fetches
  const [
    { data: billing },
    { data: cases },
    { data: notes },
    { data: tickets }
  ] = await Promise.all([
    (sb as any)
      .from('user_billing')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    sb
      .from('cases')
      .select('id, title, created_at, category')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    (sb as any)
      .from('support_notes')
      .select('id, note, created_at, admin_user_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    (sb as any)
      .from('support_tickets')
      .select('id, subject, status, category, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
  ])

  // Current admin email for note attribution
  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  const adminEmail = session?.user?.email ?? 'unknown'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs text-white/30">
          <a href="/admin/customers" className="hover:text-white">
            ← Customers
          </a>
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">
          {authUser.email ?? userId}
        </h1>
        <p className="text-xs text-white/30">ID: {userId}</p>
      </div>

      {/* Info + Billing row */}
      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard className="p-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-white/40">
            Account
          </p>
          <dl className="space-y-2 text-sm">
            <Row label="Email" value={authUser.email ?? '—'} />
            <Row
              label="Joined"
              value={new Date(authUser.created_at).toLocaleString()}
            />
            <Row
              label="Last sign-in"
              value={
                authUser.last_sign_in_at
                  ? new Date(authUser.last_sign_in_at).toLocaleString()
                  : 'never'
              }
            />
            <Row
              label="Email confirmed"
              value={authUser.email_confirmed_at ? '✅ Yes' : '⚠️ No'}
            />
          </dl>
        </GlassCard>

        <GlassCard className="p-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-white/40">
            Billing
          </p>
          {billing ? (
            <dl className="space-y-2 text-sm">
              <Row label="Plan" value={billing.plan ?? '—'} />
              <Row
                label="Subscription status"
                value={billing.subscription_status ?? '—'}
              />
              <Row
                label="Trial ends"
                value={
                  billing.trial_ends_at
                    ? new Date(billing.trial_ends_at).toLocaleDateString()
                    : '—'
                }
              />
              <Row
                label="Stripe customer"
                value={billing.stripe_customer_id ?? '—'}
              />
              <Row
                label="Cancels at"
                value={
                  billing.cancel_at
                    ? new Date(billing.cancel_at).toLocaleDateString()
                    : '—'
                }
              />
            </dl>
          ) : (
            <p className="text-sm text-white/30">No billing row found.</p>
          )}
        </GlassCard>
      </div>

      {/* Recent cases */}
      <GlassCard className="p-6">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/40">
          Recent cases ({cases?.length ?? 0})
        </p>
        {!cases?.length ? (
          <p className="text-sm text-white/30">No cases yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-white/20">
                <th className="pb-2">Title</th>
                <th className="pb-2">Category</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c: any) => (
                <tr key={c.id} className="border-t border-white/5">
                  <td className="py-2 text-white/80">{c.title ?? c.id}</td>
                  <td className="py-2 text-white/40">{c.category ?? '—'}</td>
                  <td className="py-2 text-white/30">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassCard>

      {/* Support tickets */}
      <GlassCard className="p-6">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/40">
          Support tickets ({tickets?.length ?? 0})
        </p>
        {!tickets?.length ? (
          <p className="text-sm text-white/30">No tickets.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-white/20">
                <th className="pb-2">Subject</th>
                <th className="pb-2">Category</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t: any) => (
                <tr key={t.id} className="border-t border-white/5">
                  <td className="py-2 text-white/80">{t.subject}</td>
                  <td className="py-2 text-white/40">{t.category}</td>
                  <td className="py-2">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="py-2 text-white/30">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassCard>

      {/* Support notes */}
      <GlassCard className="p-6">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/40">
          Internal notes
        </p>
        <div className="mb-6 space-y-3">
          {!notes?.length ? (
            <p className="text-sm text-white/30">No notes yet.</p>
          ) : (
            notes.map((n: any) => (
              <div
                key={n.id}
                className="rounded-lg border border-white/10 bg-white/5 p-4"
              >
                <p className="text-sm text-white/80">{n.note}</p>
                <p className="mt-1 text-xs text-white/30">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
        <AddNoteForm userId={userId} adminEmail={adminEmail} />
      </GlassCard>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-white/40">{label}</dt>
      <dd className="truncate text-right text-white/80">{value}</dd>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-yellow-500/20 text-yellow-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    resolved: 'bg-cm-green/20 text-cm-green',
    closed: 'bg-white/10 text-white/30'
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-white/10 text-white/40'}`}
    >
      {status}
    </span>
  )
}
