import 'server-only'

import { NextResponse } from 'next/server'

import { getAdminAccess } from '@/lib/admin/access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const access = await getAdminAccess()

  if (access.ok) {
    return NextResponse.json({ ok: true, email: access.email })
  }

  if (access.reason === 'disabled') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (access.reason === 'unauthenticated') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ error: 'forbidden' }, { status: 403 })
}
