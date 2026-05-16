import 'server-only'

import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

import { auth } from '@/auth'
import { ANALYSIS_DISCLAIMER } from '@/lib/checkmate-shared'
import { type Database } from '@/lib/db_types'

const bodySchema = z.object({
  question: z.string().min(1).max(1000).trim()
})

const FOLLOW_UP_SYSTEM = [
  'You are Ray, the risk-check assistant inside CheckRay.',
  'A user is asking a follow-up question about a specific suspicious case they already submitted.',
  'You have been given the original input, the risk summary, and identified red flags.',
  'Answer in plain English, 2–4 sentences. Be specific to the case context provided.',
  '',
  '## Mandatory tone rules',
  '- NEVER claim certainty. Use language like "may", "appears to", "possible", "worth verifying".',
  '- NEVER say something is "definitely safe" or "definitely a scam".',
  '- Do not provide legal, medical, or financial advice.',
  '- End every response with: "Ray can be wrong — verify important decisions through official sources."'
].join('\n')

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 422 })
  }

  const { question } = parsed.data
  const caseId = params.id

  // Fetch the case (RLS ensures ownership)
  const supabase = createRouteHandlerClient<Database, 'public', any>({
    cookies: () => cookieStore
  })

  const { data: caseRow } = await supabase
    .from('cases')
    .select('id, title, category, risk_level, risk_score, input_text, user_id')
    .eq('id', caseId)
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!caseRow) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  // Fetch the most recent report for context
  const { data: reportRow } = await supabase
    .from('risk_reports')
    .select('summary, red_flags, recommended_actions')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Build context prompt
  const contextLines = [
    `Case title: ${caseRow.title}`,
    `Category: ${caseRow.category}`,
    `Risk level: ${caseRow.risk_level} (score: ${caseRow.risk_score}/100)`,
    '',
    'Original input:',
    caseRow.input_text ? caseRow.input_text.slice(0, 2000) : '(not available)',
    ''
  ]

  if (reportRow) {
    const redFlags = Array.isArray(reportRow.red_flags)
      ? (reportRow.red_flags as string[]).join(', ')
      : ''
    if (reportRow.summary) {
      contextLines.push(`Ray's summary: ${reportRow.summary}`)
    }
    if (redFlags) {
      contextLines.push(`Red flags found: ${redFlags}`)
    }
    contextLines.push('')
  }

  contextLines.push(`User's follow-up question: ${question}`)

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      answer: 'Ray is not currently available. Please check back soon.\n\nRay can be wrong — verify important decisions through official sources.',
      disclaimer: ANALYSIS_DISCLAIMER
    })
  }

  try {
    const { text } = await generateText({
      model: openai(process.env.CHECKMATE_ANALYZER_MODEL ?? 'gpt-4o-mini'),
      system: FOLLOW_UP_SYSTEM,
      prompt: contextLines.join('\n'),
      maxTokens: 300
    })

    // Ensure disclaimer is always present
    const answer = text.includes('Ray can be wrong')
      ? text
      : `${text}\n\nRay can be wrong — verify important decisions through official sources.`

    return NextResponse.json({ answer, disclaimer: ANALYSIS_DISCLAIMER })
  } catch (err) {
    console.error('[follow-up] AI error:', err)
    return NextResponse.json(
      { error: 'Ray is temporarily unavailable. Please try again shortly.' },
      { status: 503 }
    )
  }
}
