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

export type StubAnalysis = {
  category: CaseCategory
  risk_score: number
  risk_level: RiskLevel
  summary: string
  red_flags: string[]
  recommended_actions: string[]
  safe_reply: string
  disclaimer: string
  sources: Array<{ type: 'text' | 'url'; value: string }>
}

const disclaimer =
  'CheckMate provides general risk guidance, not legal, financial, or security advice. Verify important decisions with the relevant institution or a qualified professional.'

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 85) return 'very_high'
  if (score >= 65) return 'high'
  if (score >= 35) return 'medium'
  return 'low'
}

export function analyzeCaseStub({
  text,
  url
}: {
  text?: string
  url?: string
}): StubAnalysis {
  const normalized = `${text ?? ''} ${url ?? ''}`.toLowerCase()
  const redFlags: string[] = []
  const recommendedActions = [
    'Do not send money, credentials, gift cards, crypto, or identity documents until you verify the request independently.',
    'Contact the organization through an official website, known phone number, or existing account portal.',
    'Save screenshots, URLs, emails, phone numbers, and payment instructions in case you need to report it.'
  ]

  let category: CaseCategory = 'unknown'
  let score = 22

  if (url) {
    category = 'phishing_url'
    score += 28
    redFlags.push(
      'A link was included and should be verified before opening or entering information.'
    )
  }

  if (
    /(gift card|crypto|bitcoin|wire transfer|zelle|cash app|venmo)/.test(
      normalized
    )
  ) {
    category = category === 'unknown' ? 'scam_text' : category
    score += 24
    redFlags.push(
      'The message references payment methods commonly used in irreversible scams.'
    )
  }

  if (
    /(urgent|immediately|final notice|act now|account.*locked|suspend)/.test(
      normalized
    )
  ) {
    score += 18
    redFlags.push('The wording creates urgency or pressure to act quickly.')
  }

  if (
    /(job|hiring|recruiter|interview|onboarding|equipment|remote role)/.test(
      normalized
    )
  ) {
    category = 'job_scam_or_ghost_job'
    score += 14
    redFlags.push(
      'The message appears job-related; fake recruiters often ask for personal data or upfront payments.'
    )
  }

  if (
    /(invoice|bill|fee|fine|toll|tax|irs|utility|past due)/.test(normalized)
  ) {
    category = 'bill_or_fee'
    score += 14
    redFlags.push(
      'The message mentions a bill, fee, fine, or account charge that should be verified directly.'
    )
  }

  if (
    /(rent|rental|apartment|landlord|marketplace|facebook marketplace|deposit)/.test(
      normalized
    )
  ) {
    category = 'rental_or_marketplace'
    score += 14
    redFlags.push(
      'Rental and marketplace messages can be risky when they ask for deposits before verification.'
    )
  }

  if (redFlags.length === 0) {
    redFlags.push(
      'No obvious high-risk indicators were found in the stub analysis.'
    )
  }

  const risk_score = Math.min(100, score)
  const risk_level = getRiskLevel(risk_score)

  return {
    category,
    risk_score,
    risk_level,
    summary:
      risk_level === 'low'
        ? 'This looks lower risk based on the stub checks, but it still needs basic verification.'
        : 'This case has signals that deserve caution before you reply, click, pay, or share information.',
    red_flags: redFlags,
    recommended_actions: recommendedActions,
    safe_reply:
      'I need to verify this through an official channel first. Please send your full name, organization, and a callback number I can confirm independently.',
    disclaimer,
    sources: [
      ...(text ? [{ type: 'text' as const, value: text }] : []),
      ...(url ? [{ type: 'url' as const, value: url }] : [])
    ]
  }
}

export function humanizeCategory(category: string) {
  return category.replace(/_/g, ' ')
}
