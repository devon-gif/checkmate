/**
 * app/admin/scam-intel/sources/page.tsx — Scam Intel v2 source intake + review
 *
 * Admins paste raw scam sources (links / notes) here for later review and
 * promotion into the curated scam_intel catalog.
 *
 * NOTE: nothing on this page affects live analyzer scoring. Pending sources are
 * a review staging area only. Promotion writes to the scam_intel TABLE, which
 * the admin UI reads — production scoring still uses the in-code catalog. See
 * docs/SCAM_INTEL.md.
 */
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'

import { GlassCard } from '@/components/checkmate/GlassCard'
import { requireAdmin } from '@/lib/admin/access'
import { type Database } from '@/lib/db_types'
import { ScamIntelTabs } from '../ScamIntelTabs'
import { SourcesManager, type PendingSourceRow } from './SourcesManager'

export const metadata = {
  title: 'Scam Intel Sources | CheckRay Admin',
  robots: { index: false, follow: false }
}

function adminClient() {
  return createClient<Database, 'public', any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function AdminScamIntelSourcesPage() {
  await requireAdmin()

  const sb = adminClient()
  const { data, error } = await sb
    .from('scam_intel_pending')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(`[admin/scam-intel/sources] list failed code=${error.code ?? 'none'} message=${error.message}`)
  }

  const sources = (data ?? []) as PendingSourceRow[]
  const pending = sources.filter(s => s.review_status === 'pending').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Scam Intelligence</h1>
        <p className="mt-1 text-sm text-white/50">
          {sources.length} sources · {pending} pending review
        </p>
      </div>

      <ScamIntelTabs active="sources" />

      <GlassCard className="px-5 py-4">
        <p className="text-xs text-white/40">
          Paste evolving scam sources (FTC/IC3/CISA advisories, PhishTank/OpenPhish
          entries, LinkedIn/Reddit threads, user reports). These are stored for
          review only and <strong>never affect risk scoring</strong>. To make a
          source count, review it, then <em>Promote</em> it into the catalog and
          mirror it into the in-code catalog by hand.
        </p>
      </GlassCard>

      <SourcesManager initialSources={sources} />
    </div>
  )
}
