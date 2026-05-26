/**
 * app/api/admin/tickets/route.ts
 *
 * GET  /api/admin/tickets          — list tickets (admin only)
 * PATCH /api/admin/tickets         — update ticket status (admin only)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminAccess } from '@/lib/admin/access'
import { safeStatus } from '@/lib/support/types'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: Request) {
  const access = await getAdminAccess()
  if (!access.ok && access.reason === 'disabled') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (!access.ok && access.reason === 'unauthenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!access.ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const status = url.searchParams.get('status')

  const sb = serviceClient()
  let query = (sb as any)
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const access = await getAdminAccess()
  if (!access.ok && access.reason === 'disabled') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (!access.ok && access.reason === 'unauthenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!access.ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { ticketId, status } = body as { ticketId?: string; status?: string }

  if (!ticketId || !status) {
    return NextResponse.json(
      { error: 'ticketId and status are required' },
      { status: 400 }
    )
  }

  const safe = safeStatus(status)
  if (!safe) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const sb = serviceClient()
  const { error } = await (sb as any)
    .from('support_tickets')
    .update({ status: safe })
    .eq('id', ticketId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
