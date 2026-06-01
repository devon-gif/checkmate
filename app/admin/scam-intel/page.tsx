/**
 * app/admin/scam-intel/page.tsx — Admin scam-intelligence catalog manager
 *
 * Lists scam_intel rows and supports create / edit / status-toggle via the
 * admin-gated API routes (/api/admin/scam-intel[/id]).
 *
 * NOTE: this table is the admin-editable catalog. The analyzer scores against
 * the in-code catalog (lib/analyzer/scam-intel-catalog.ts), so edits here do
 * NOT change live risk scoring — they are for review, curation, and future
 * crawler ingestion.
 */
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'

import { GlassCard } from '@/components/checkmate/GlassCard'
import { requireAdmin } from '@/lib/admin/access'
import { type Database } from '@/lib/db_types'
import { ScamIntelManager, type ScamIntelRow } from './ScamIntelManager'
import { ScamIntelTabs } from './ScamIntelTabs'

export const metadata = {
  title: 'Scam Intelligence | CheckRay Admin',
  robots: { index: false, follow: false }
}

function adminClient() {
  return createClient<Database, 'public', any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function AdminScamIntelPage() {
  await requireAdmin()

  const sb = adminClient()
  const { data, error } = await sb
    .from('scam_intel')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error(`[admin/scam-intel] page list failed code=${error.code ?? 'none'} message=${error.message}`)
  }

  const patterns = (data ?? []) as ScamIntelRow[]
  const active = patterns.filter(p => p.status === 'active').length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Scam Intelligence</h1>
          <p className="mt-1 text-sm text-white/50">
            {patterns.length} patterns · {active} active
          </p>
        </div>
      </div>

      <ScamIntelTabs active="patterns" />

      <GlassCard className="px-5 py-4">
        <p className="text-xs text-white/40">
          This catalog is for curation and review. Live analyzer scoring uses the
          in-code catalog (<code className="text-white/60">lib/analyzer/scam-intel-catalog.ts</code>),
          so edits here do not change risk scores. Keep the two in sync when you
          promote a reviewed pattern into scoring.
        </p>
      </GlassCard>

      <ScamIntelManager initialPatterns={patterns} />
    </div>
  )
}
