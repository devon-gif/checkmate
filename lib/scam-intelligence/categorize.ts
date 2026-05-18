import type { ScamCategory } from './types'

/**
 * Keyword patterns used to bucket items into a single ScamCategory and to
 * surface "risk signals" (cautious labels — never claims of certainty).
 *
 * Order matters: the first category whose pattern matches wins. More specific
 * categories should be listed before generic ones.
 */

interface CategoryRule {
  category: ScamCategory
  /** Lowercased keywords / phrases. Match is a simple substring test. */
  keywords: string[]
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'ghost_jobs',
    keywords: ['ghost job', 'ghost hiring', 'fake job posting', 'never filled', 'phantom job']
  },
  {
    category: 'job_scams',
    keywords: [
      'job scam',
      'employment scam',
      'recruiter scam',
      'work-from-home scam',
      'work from home scam',
      'job offer scam',
      'hiring scam',
      'fake employer',
      'fake recruiter',
      'reshipping',
      'reshipper'
    ]
  },
  {
    category: 'delivery_toll_texts',
    keywords: [
      'toll',
      'unpaid toll',
      'e-zpass',
      'sunpass',
      'fastrak',
      'usps',
      'package delivery',
      'delivery notice',
      'final notice',
      'registration suspended',
      'smishing'
    ]
  },
  {
    category: 'phishing_links',
    keywords: [
      'phishing',
      'lookalike',
      'fake login',
      'fake site',
      'verification code',
      'one-time code',
      'one time code',
      'password reset',
      'mfa fatigue',
      'qr code scam',
      'quishing'
    ]
  },
  {
    category: 'imposter_scams',
    keywords: [
      'imposter',
      'impersonation',
      'tech support scam',
      'irs scam',
      'social security scam',
      'government imposter',
      'police imposter',
      'family emergency scam',
      'grandparent scam',
      'utility scam',
      'amazon imposter',
      'bank imposter'
    ]
  },
  {
    category: 'bill_or_fee_scams',
    keywords: [
      'unexpected charge',
      'refund scam',
      'fake invoice',
      'overpayment',
      'fake bill',
      'subscription scam'
    ]
  },
  {
    category: 'rental_marketplace',
    keywords: [
      'rental scam',
      'apartment scam',
      'marketplace scam',
      'craigslist',
      'fake listing',
      'security deposit scam'
    ]
  },
  {
    category: 'investment_crypto',
    keywords: [
      'investment scam',
      'crypto scam',
      'cryptocurrency',
      'pig butchering',
      'pig-butchering',
      'fake trading',
      'romance investment',
      'rug pull'
    ]
  },
  {
    category: 'romance_social',
    keywords: [
      'romance scam',
      'dating scam',
      'sextortion',
      'catfish',
      'online relationship scam'
    ]
  },
  {
    category: 'small_business_invoice',
    keywords: [
      'small business scam',
      'vendor impersonation',
      'business email compromise',
      'bec ',
      'ceo fraud',
      'invoice fraud'
    ]
  },
  {
    category: 'cybersecurity',
    keywords: [
      'ransomware',
      'vulnerability',
      'cve-',
      'exploit',
      'malware',
      'zero-day',
      'advisory',
      'threat actor',
      'apt'
    ]
  }
]

/**
 * Risk-signal patterns. These are surfaced verbatim into ScamIntelItem.risk_signals.
 * Phrasing is intentionally cautious — these are "signals", not verdicts.
 */
const RISK_SIGNAL_PATTERNS: { label: string; keywords: string[] }[] = [
  { label: 'job / hiring language', keywords: ['job', 'remote job', 'recruiter', 'hiring', 'employment', 'work from home', 'work-from-home'] },
  { label: 'equipment / deposit ask', keywords: ['equipment', 'deposit', 'starter kit'] },
  { label: 'money-movement ask', keywords: ['wire transfer', 'gift card', 'zelle', 'cash app', 'venmo', 'cryptocurrency', 'crypto', 'bitcoin'] },
  { label: 'check overpayment', keywords: ['check', 'cashier\u2019s check', 'cashiers check', 'overpayment'] },
  { label: 'delivery / toll smishing', keywords: ['toll', 'unpaid toll', 'usps', 'delivery', 'package', 'final notice', 'registration suspended'] },
  { label: 'unexpected bill / fee', keywords: ['invoice', 'bill', 'fee', 'refund', 'unexpected charge'] },
  { label: 'impersonation', keywords: ['impersonation', 'imposter', 'irs', 'social security', 'police', 'bank', 'government', 'tech support'] },
  { label: 'phishing / credential ask', keywords: ['phishing', 'verification code', 'one-time code', 'password', 'login', 'mfa', 'otp'] },
  { label: 'rental / marketplace', keywords: ['rent', 'rental', 'apartment', 'marketplace', 'listing'] },
  { label: 'cybersecurity advisory', keywords: ['ransomware', 'cve-', 'vulnerability', 'malware', 'exploit', 'advisory'] }
]

function lower(s: string | undefined): string {
  return (s ?? '').toLowerCase()
}

/**
 * Return the best-matching category for the given title + summary.
 * Falls back to 'other' when nothing matches.
 */
export function categorize(title: string, summary?: string): ScamCategory {
  const blob = `${lower(title)} ${lower(summary)}`
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => blob.includes(kw))) {
      return rule.category
    }
  }
  return 'other'
}

/**
 * Extract cautious "risk signal" labels from the title + summary.
 * Each label only appears once even if multiple keywords match it.
 */
export function extractRiskSignals(title: string, summary?: string): string[] {
  const blob = `${lower(title)} ${lower(summary)}`
  const out: string[] = []
  for (const sig of RISK_SIGNAL_PATTERNS) {
    if (sig.keywords.some(kw => blob.includes(kw))) {
      out.push(sig.label)
    }
  }
  return out
}
