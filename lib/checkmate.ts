import 'server-only'

import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'

export const caseCategories = [
  'scam_text',
  'job_scam_or_ghost_job',
  'bill_or_fee',
  'phishing_url',
  'rental_or_marketplace',
  'unknown'
] as const

export const riskLevels = ['low', 'medium', 'high', 'very_high'] as const

export type CaseCategory = (typeof caseCategories)[number]
export type RiskLevel = (typeof riskLevels)[number]

export const riskAnalysisSchema = z.object({
  category: z.enum(caseCategories),
  risk_score: z.number().int().min(0).max(100),
  risk_level: z.enum(riskLevels),
  summary: z.string().min(1),
  red_flags: z.array(z.string()).default([]),
  recommended_actions: z.array(z.string()).default([]),
  safe_reply: z.string().min(1),
  disclaimer: z.string().min(1)
})

export type RiskAnalysis = z.infer<typeof riskAnalysisSchema>

const urlPattern =
  /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"')\]]*)?/gi

export function detectUrls(input: string) {
  const matches = input.match(urlPattern) ?? []
  return Array.from(
    new Set(matches.map(match => match.replace(/[.,;:!?]+$/, '')))
  )
}

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 85) return 'very_high'
  if (score >= 65) return 'high'
  if (score >= 35) return 'medium'
  return 'low'
}

export function humanizeCategory(category: string) {
  return category.replace(/_/g, ' ')
}

export async function analyzeCase({
  text,
  url
}: {
  text?: string
  url?: string
}) {
  const submittedText = text ?? ''
  const submittedUrl = url ?? ''
  const detectedUrls = Array.from(
    new Set([...detectUrls(submittedText), ...detectUrls(submittedUrl)])
  )

  const { object } = await generateObject({
    model: openai(process.env.CHECKMATE_ANALYZER_MODEL ?? 'gpt-4o-mini'),
    schema: riskAnalysisSchema,
    system: [
      'You are CheckMate, a conservative personal risk router for suspicious texts, emails, bills, links, job messages, rental listings, and marketplace conversations.',
      'Return only the requested structured JSON.',
      'Do not claim certainty. Use cautious language such as "may", "could", "appears", and "needs verification".',
      'Do not provide legal, medical, or financial advice.',
      'Do not tell the user to click suspicious links or call phone numbers supplied only by the suspicious message.',
      'When risk is high or very_high, tell users not to send money, SSN, bank information, identity documents, passwords, or 2FA codes.',
      'For job checks, flag upfront equipment purchases, text-only recruiters, non-company email domains, unrealistic salary, vague duties, and requests for personal data.',
      'For bills or fees, suggest requesting itemization, receipts, written policy, dates, and documentation.',
      'Safe replies should be short, non-accusatory, and should avoid sharing sensitive information.'
    ].join('\n'),
    prompt: [
      'Analyze this submitted case.',
      '',
      'Allowed categories:',
      caseCategories.join(', '),
      '',
      'Risk level mapping:',
      'low: 0-34, medium: 35-64, high: 65-84, very_high: 85-100.',
      '',
      `Detected URLs: ${detectedUrls.length ? detectedUrls.join(', ') : 'none'}`,
      '',
      'Submitted URL field:',
      submittedUrl || 'none',
      '',
      'Submitted text:',
      submittedText || 'none',
      '',
      'Output requirements:',
      '- Pick exactly one category.',
      '- Score risk from 0 to 100.',
      '- Make risk_level consistent with risk_score.',
      '- Include concise plain-English summary.',
      '- Include concrete red flags and recommended actions.',
      '- Include a safe_reply the user can send if a reply is appropriate.',
      '- Include a disclaimer that this is general risk guidance, not legal, medical, or financial advice.'
    ].join('\n')
  })

  return {
    ...object,
    detected_urls: detectedUrls
  }
}
