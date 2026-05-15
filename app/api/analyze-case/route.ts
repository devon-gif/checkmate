import 'server-only'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { analyzeCaseStub } from '@/lib/checkmate'
import { type Database } from '@/lib/db_types'

export async function POST(req: Request) {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as {
    text?: string
    url?: string
  }
  const text = body.text?.trim()
  const url = body.url?.trim()

  if (!text && !url) {
    return NextResponse.json(
      { error: 'Add pasted text, a URL, or both.' },
      { status: 400 }
    )
  }

  const supabase = createRouteHandlerClient<Database, 'public', any>({
    cookies: () => cookieStore
  })

  await supabase
    .from('users')
    .upsert({
      id: session.user.id,
      email: session.user.email ?? null,
      full_name: session.user.user_metadata?.full_name ?? null,
      avatar_url: session.user.user_metadata?.avatar_url ?? null
    })
    .throwOnError()

  const analysis = analyzeCaseStub({ text, url })
  const titleSource =
    text || url?.replace(/^https?:\/\//, '') || 'New risk check'
  const title = titleSource.slice(0, 72)

  const { data: createdCase } = await supabase
    .from('cases')
    .insert({
      user_id: session.user.id,
      category: analysis.category,
      status: 'open',
      title,
      risk_level: analysis.risk_level,
      risk_score: analysis.risk_score
    })
    .select('*')
    .single()
    .throwOnError()

  const messageContent = [text, url].filter(Boolean).join('\n\nURL: ')

  await supabase
    .from('case_messages')
    .insert({
      case_id: createdCase.id,
      user_id: session.user.id,
      sender_role: 'user',
      content: messageContent
    })
    .throwOnError()

  const { data: report } = await supabase
    .from('risk_reports')
    .insert({
      case_id: createdCase.id,
      summary: analysis.summary,
      risk_score: analysis.risk_score,
      risk_level: analysis.risk_level,
      red_flags: analysis.red_flags,
      recommended_actions: analysis.recommended_actions,
      safe_reply: analysis.safe_reply,
      disclaimer: analysis.disclaimer,
      sources: analysis.sources
    })
    .select('*')
    .single()
    .throwOnError()

  await supabase
    .from('usage_events')
    .insert({
      user_id: session.user.id,
      event_type: 'check_created',
      cost_estimate: 0
    })
    .throwOnError()

  return NextResponse.json({
    case: createdCase,
    report
  })
}
