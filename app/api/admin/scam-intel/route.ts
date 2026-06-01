/**
 * /api/admin/scam-intel
 *
 *   GET  — list every scam_intel row (newest-updated first)
 *   POST — create a new scam_intel pattern
 *
 * Admin-gated identically to the other /api/admin/* routes:
 *   1. ENABLE_ADMIN_TOOLS=true (server env)  → 404 otherwise
 *   2. authenticated session                  → 401 otherwise
 *   3. email in ADMIN_EMAILS                  → 403 otherwise
 *
 * IMPORTANT: editing scam_intel rows here updates the admin catalog only. The
 * analyzer scores against the in-code catalog (lib/analyzer/scam-intel-catalog.ts),
 * so admin edits never silently change live risk scoring.
 *
 * Reached only via the service-role client (scam_intel has a no-public-access
 * RLS policy). No private email bodies are logged — only PG error code+message.
 */
import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { getAdminAccess } from '@/lib/admin/access'
import { type Database } from '@/lib/db_types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
const CONFIDENCES = ['low', 'medium', 'high'] as const
const STATUSES = ['active', 'inactive', 'archived'] as const

function adminErrorResponse(reason: 'disabled' | 'unauthenticated' | 'forbidden') {
  if (reason === 'disabled') return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (reason === 'unauthenticated') return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return NextResponse.json({ error: 'forbidden' }, { status: 403 })
}

function serviceClient() {
  return createClient<Database, 'public', any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** Coerce a free-text or array signals value into a clean string[]. */
function normalizeSignals(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map(s => String(s).trim()).filter(Boolean)
  }
  if (typeof input === 'string') {
    return input
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
  }
  return []
}

export async function GET() {
  const access = await getAdminAccess()
  if (!access.ok) return adminErrorResponse(access.reason)

  const sb = serviceClient()
  const { data, error } = await sb
    .from('scam_intel')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error(`[admin/scam-intel] list failed code=${error.code ?? 'none'} message=${error.message}`)
    return NextResponse.json({ error: 'list_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, patterns: data ?? [] })
}

export async function POST(req: NextRequest) {
  const access = await getAdminAccess()
  if (!access.ok) return adminErrorResponse(access.reason)

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const category = typeof body.category === 'string' ? body.category.trim() : ''
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 })
  if (!category) return NextResponse.json({ error: 'category_required' }, { status: 400 })

  const severity = SEVERITIES.includes(body.severity as any) ? (body.severity as string) : 'medium'
  const confidence = CONFIDENCES.includes(body.confidence as any) ? (body.confidence as string) : 'medium'
  const status = STATUSES.includes(body.status as any) ? (body.status as string) : 'active'

  const insert = {
    name,
    category,
    severity,
    confidence,
    status,
    description: typeof body.description === 'string' ? body.description : '',
    recommended_action: typeof body.recommended_action === 'string' ? body.recommended_action : '',
    source_type: typeof body.source_type === 'string' && body.source_type.trim() ? body.source_type.trim() : 'curated',
    source_url: typeof body.source_url === 'string' && body.source_url.trim() ? body.source_url.trim() : null,
    signals: normalizeSignals(body.signals)
  }

  const sb = serviceClient()
  const { data, error } = await sb.from('scam_intel').insert(insert).select('*').single()

  if (error) {
    console.error(`[admin/scam-intel] create failed code=${error.code ?? 'none'} message=${error.message}`)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'duplicate_name' }, { status: 409 })
    }
    return NextResponse.json({ error: 'create_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, pattern: data })
}
