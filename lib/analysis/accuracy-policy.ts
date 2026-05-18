import {
  ANALYSIS_DISCLAIMER,
  caseCategories,
  type CaseCategory,
  type RiskLevel
} from '@/lib/checkmate-shared'

export const confidenceLevels = ['low', 'medium', 'high'] as const
export type ConfidenceLevel = (typeof confidenceLevels)[number]

export const SAFE_WORDING_RULES = {
  use: [
    'possible scam',
    'risk signals',
    'common red flags',
    'could be suspicious',
    'could not verify',
    'verify through official channels',
    'this deserves caution',
    'not enough information to confirm'
  ],
  avoid: [
    'definitely fake',
    'definitely real',
    'this is safe',
    'this is legal',
    'this is illegal',
    'you should definitely pay',
    'this company is scamming',
    'guaranteed scam detection'
  ]
} as const

export const CATEGORY_SPECIFIC_SIGNALS: Record<CaseCategory, string[]> = {
  scam_text: [
    'urgent request',
    'gift cards or money transfer',
    'secretive instructions',
    'sensitive information request'
  ],
  job_scam_or_ghost_job: [
    'equipment check',
    'deposit check',
    'wire difference back',
    'no interview',
    'unrealistic salary',
    'vague company',
    'personal email domain',
    'off-platform messaging',
    'old or reposted listing as a soft signal'
  ],
  phishing_url: [
    'urgency',
    'final notice',
    'account suspension',
    'unfamiliar or lookalike domain',
    'shortened URL',
    'payment link',
    'credential request'
  ],
  bill_or_fee: [
    'unexpected fee',
    'no itemization',
    'unofficial payment channel',
    'pressure to pay immediately',
    'missing written policy'
  ],
  rental_or_marketplace: [
    'deposit before viewing',
    'too-good-to-be-true price',
    'off-platform payment',
    'refusal to meet',
    'pressure to act quickly'
  ],
  email: [
    'sender domain mismatch',
    'reply-to mismatch',
    'attachment or link request',
    'password or code request',
    'payment change request',
    'executive or vendor impersonation'
  ],
  unknown: [
    'limited context',
    'unclear sender',
    'unclear official source',
    'missing link or domain context'
  ]
}

export function clampRiskScore(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function normalizeRiskLevel(score: number): RiskLevel {
  const clamped = clampRiskScore(score)
  if (clamped >= 75) return 'very_high'
  if (clamped >= 50) return 'high'
  if (clamped >= 25) return 'medium'
  return 'low'
}

export function normalizeCategory(category: string | undefined): CaseCategory {
  if (category === 'email_or_impersonation') return 'email'
  if (category && caseCategories.includes(category as CaseCategory)) {
    return category as CaseCategory
  }
  return 'unknown'
}

export function uniqueStrings(items: Array<string | undefined | null>): string[] {
  return Array.from(
    new Set(
      items
        .map(item => item?.trim())
        .filter((item): item is string => Boolean(item))
    )
  )
}

export function confidenceFromEvidence({
  score,
  redFlags,
  missingInformation,
  strongSignalCount
}: {
  score: number
  redFlags: string[]
  missingInformation: string[]
  strongSignalCount: number
}): ConfidenceLevel {
  if (strongSignalCount >= 2 || score >= 85) return 'high'
  if (redFlags.length >= 3 || score >= 50) return 'medium'
  if (missingInformation.length >= 2 || redFlags.length <= 1) return 'low'
  return 'medium'
}

export function evidenceFromFlags(redFlags: string[]): string[] {
  if (!redFlags.length) {
    return ['No major risk signals were found in the provided text.']
  }

  return redFlags.map(flag => `Observed risk signal: ${flag}`)
}

export function defaultMissingInformation(category: CaseCategory): string[] {
  const common = [
    'Official sender identity',
    'Official website or verified contact method'
  ]

  if (category === 'job_scam_or_ghost_job') {
    return uniqueStrings([
      ...common,
      'Official company careers-page listing',
      'Recruiter company email domain',
      'Interview and hiring timeline'
    ])
  }

  if (category === 'phishing_url') {
    return uniqueStrings([...common, 'Verified official portal URL'])
  }

  if (category === 'bill_or_fee') {
    return uniqueStrings([
      ...common,
      'Itemized bill',
      'Written policy or agreement supporting the charge'
    ])
  }

  if (category === 'rental_or_marketplace') {
    return uniqueStrings([
      ...common,
      'In-person viewing or verified listing page',
      'Proof of ownership or platform identity'
    ])
  }

  return common
}

export function defaultVerificationSteps(category: CaseCategory): string[] {
  const common = [
    'Do not use links or phone numbers from the suspicious message.',
    'Verify through official channels before sending money or personal information.'
  ]

  if (category === 'job_scam_or_ghost_job') {
    return [
      "Go directly to the company's official careers page.",
      'Contact the company using an email or phone number from its official website.',
      'Verify the recruiter uses the company email domain.',
      'Do not deposit checks, buy equipment, or send money as part of hiring.'
    ]
  }

  if (category === 'phishing_url') {
    return [
      'Type the official website address into your browser instead of clicking the link.',
      'Verify sender identity through the official portal or customer service number.',
      'Do not enter passwords, payment details, or verification codes from the message link.'
    ]
  }

  if (category === 'bill_or_fee') {
    return [
      'Ask for an itemized bill and written policy.',
      'Compare the charge against your lease, agreement, invoice, or account portal.',
      'Pay only through the official portal after verifying the charge.'
    ]
  }

  if (category === 'rental_or_marketplace') {
    return [
      'View the property or item through a verified channel before paying.',
      'Keep payment and messaging on the official platform when possible.',
      'Do not send deposits through Zelle, gift cards, crypto, or wire transfer.'
    ]
  }

  if (category === 'email') {
    return [
      'Check the sender domain and reply-to address carefully.',
      'Confirm payment or account changes through a known official contact.',
      'Do not open unexpected attachments or enter credentials from email links.'
    ]
  }

  return common
}

export function safeLowRiskSummary(): string {
  return 'No major red flags were found in the provided information, but that does not prove it is safe. Verify through official channels before sending money, credentials, or personal information.'
}

export function ensureDisclaimer(disclaimer?: string): string {
  return disclaimer?.trim() || ANALYSIS_DISCLAIMER
}
