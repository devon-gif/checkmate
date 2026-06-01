/**
 * lib/analyzer/scam-intel-catalog.ts
 *
 * Scam Intelligence v1 — in-code curated catalog of known scam patterns.
 *
 * WHY IN-CODE (not a per-request DB read):
 *   - The analyzer must work offline (so evals are deterministic) and must not
 *     add a network round-trip to every analysis.
 *   - Admin edits to the `scam_intel` table must NOT silently change scoring.
 *   The Supabase `scam_intel` table (migration 20260601141533_add_scam_intel.sql)
 *   MIRRORS this catalog for the admin UI. Keep the two in sync by hand.
 *
 * SAFETY — Critical is gated, not keyword-triggered:
 *   "Do not let weak matches force Critical. Critical requires concrete danger
 *    evidence." A keyword hit alone never produces very_high. Each pattern must
 *   accumulate enough independent signal groups, and a critical-severity pattern
 *   additionally requires at least one *danger* group (a real credential/login
 *   request, a domain mismatch, a suspicious redirect, or an irreversible
 *   money movement). Weak matches are downgraded to a Medium "needs
 *   verification" floor, never Critical.
 *
 * This module is pure data + matching. It imports only shared types, never
 * risk-floors.ts, to stay import-cycle-safe. The matcher receives PRE-STRIPPED
 * (negation-removed) text from the caller.
 */

import type { CaseCategory, RiskLevel } from '@/lib/checkmate-shared'

export type IntelSeverity = 'low' | 'medium' | 'high' | 'critical'
export type IntelConfidence = 'low' | 'medium' | 'high'

export interface ScamIntelPattern {
  /** Stable key — matches the `name` column in the scam_intel table. */
  name: string
  /** Intel taxonomy category (matches the seeded `category`). */
  category: string
  /** Mapped CheckMate case category used when this pattern raises a floor. */
  floorCategory: CaseCategory
  severity: IntelSeverity
  description: string
  /** Human-readable signals — mirrors the seeded `signals` jsonb. */
  signals: string[]
  recommendedAction: string
  confidence: IntelConfidence
}

/**
 * The curated catalog. Mirrors the seed rows in
 * supabase/migrations/20260601141533_add_scam_intel.sql.
 */
export const SCAM_INTEL_CATALOG: ScamIntelPattern[] = [
  {
    name: 'fake_scheduling_login_credential_theft',
    category: 'phishing',
    floorCategory: 'phishing_url',
    severity: 'critical',
    description:
      'Recruiter or contact-form message proposes a quick call or interview, sends a Calendly-like scheduling link, then prompts a Google/Microsoft/email login on a fake page to steal credentials.',
    signals: [
      'scheduling or interview link (calendly/booking)',
      'prompts google/microsoft/email login to view or confirm',
      'login page on a domain that is not the real provider',
      'urgent quick call / immediate interview pressure'
    ],
    recommendedAction:
      'Do not log in through links in the message. Navigate to the provider (Google/Microsoft) directly and verify the recruiter and company through official channels before sharing anything.',
    confidence: 'high'
  },
  {
    name: 'fake_equipment_check_scam',
    category: 'employment_scam',
    floorCategory: 'job_scam_or_ghost_job',
    severity: 'high',
    description:
      'Fake employer says they will mail equipment and asks you to deposit or forward a check to a vendor first. The check bounces after you have sent money.',
    signals: [
      'new job before any interview',
      'they mail you a check for equipment',
      'asked to deposit check then send part to a vendor',
      'buy equipment from a specified supplier'
    ],
    recommendedAction:
      'Never deposit a check from a new employer and forward funds. Legitimate employers do not ask you to pay or move money for equipment.',
    confidence: 'high'
  },
  {
    name: 'zelle_cashapp_equipment_deposit_scam',
    category: 'payment_fraud',
    floorCategory: 'bill_or_fee',
    severity: 'high',
    description:
      'Job or seller asks for an upfront deposit via Zelle/CashApp/Venmo/crypto/gift cards for equipment, training, or a "refundable" fee.',
    signals: [
      'upfront deposit or fee requested',
      'pay via zelle/cashapp/venmo/crypto/gift card',
      'promise it is refundable',
      'equipment or training fee'
    ],
    recommendedAction:
      'Stop. Legitimate employers never require upfront payment. Instant-payment apps and gift cards are unrecoverable once sent.',
    confidence: 'high'
  },
  {
    name: 'fake_recruiter_chat_migration',
    category: 'employment_scam',
    floorCategory: 'job_scam_or_ghost_job',
    severity: 'medium',
    description:
      'A recruiter quickly pushes the conversation off-platform to WhatsApp/Telegram/Signal to avoid oversight before any verification.',
    signals: [
      'move to whatsapp/telegram/signal immediately',
      'recruiter avoids company email',
      'hiring without an interview',
      'personal messaging app for a job'
    ],
    recommendedAction:
      'Keep hiring conversations on official company email or platforms. Verify the recruiter independently before continuing.',
    confidence: 'medium'
  },
  {
    name: 'fake_onboarding_portal_early_pii',
    category: 'phishing',
    floorCategory: 'phishing_url',
    severity: 'high',
    description:
      'A fake onboarding portal asks for SSN, bank account, or a photo of your ID very early — before an offer or any verification.',
    signals: [
      'onboarding portal link',
      'asks for ssn / bank details / id photo early',
      'before any offer or interview',
      'fill this to get started'
    ],
    recommendedAction:
      'Do not enter SSN, banking, or ID details into an unverified portal. Sensitive details belong only after a verified offer through official systems.',
    confidence: 'high'
  },
  {
    name: 'fake_invoice_payment_redirect',
    category: 'payment_fraud',
    floorCategory: 'bill_or_fee',
    severity: 'high',
    description:
      'An invoice or vendor email claims bank/payment details have changed and asks you to redirect payment to a new account (business email compromise).',
    signals: [
      'invoice with updated/changed bank details',
      'redirect payment to a new account',
      'urgent payment before deadline',
      'vendor banking change by email'
    ],
    recommendedAction:
      'Verify any banking-change request by calling a known contact at the vendor using a number you already have — never the one in the email.',
    confidence: 'high'
  },
  {
    name: 'executive_impersonation_gift_card',
    category: 'impersonation',
    floorCategory: 'email',
    severity: 'high',
    description:
      'Someone impersonating a boss/executive urgently asks you to buy gift cards and send the codes, often claiming they are busy or in a meeting.',
    signals: [
      'message claims to be a boss/executive/ceo',
      'urgent request to buy gift cards',
      'send gift card codes/photos',
      'keep it confidential / cannot talk now'
    ],
    recommendedAction:
      'Verify any gift-card request through a separate, known channel. Real executives do not ask staff to buy gift cards.',
    confidence: 'high'
  },
  {
    name: 'microsoft_google_login_phishing',
    category: 'phishing',
    floorCategory: 'phishing_url',
    severity: 'critical',
    description:
      'An email mimics Microsoft/Google/Apple and pushes you to a login page on a non-provider domain to "verify", "reactivate", or avoid account suspension — to steal credentials.',
    signals: [
      'claims to be microsoft/google/apple/office365',
      'verify or reactivate your account',
      'account will be suspended/closed',
      'login link on a non-provider domain'
    ],
    recommendedAction:
      'Do not log in via the link. Go to the provider directly and check account status. Enable MFA.',
    confidence: 'high'
  },
  {
    name: 'qr_code_phishing',
    category: 'phishing',
    floorCategory: 'phishing_url',
    severity: 'high',
    description:
      'A message or notice tells you to scan a QR code to log in, pay, or view a document — the QR points to a phishing or payment-redirect site (quishing).',
    signals: [
      'scan this qr code to log in / pay / view',
      'qr code in an unexpected email or notice',
      'qr leads to a login or payment page',
      'urgency to scan now'
    ],
    recommendedAction:
      'Do not scan unsolicited QR codes. Reach the service through its official app or a typed URL instead.',
    confidence: 'medium'
  },
  {
    name: 'fake_remote_job_task_scam',
    category: 'employment_scam',
    floorCategory: 'job_scam_or_ghost_job',
    severity: 'high',
    description:
      'A "remote job" pays you to complete simple tasks, then requires you to deposit your own money to "unlock" higher earnings — a task/money-laundering scam.',
    signals: [
      'paid to do simple tasks (rate apps/like videos/process orders)',
      'deposit your own money to unlock earnings',
      'commission grows then you must pay to withdraw',
      'recruited via text/whatsapp for easy daily pay'
    ],
    recommendedAction:
      'Stop. Legitimate jobs never require you to deposit your own funds to earn. This is a task/laundering scam.',
    confidence: 'high'
  }
]

// ── Match result ─────────────────────────────────────────────────────────────

export interface ScamIntelMatch {
  pattern: ScamIntelPattern
  minScore: number
  minRiskLevel: RiskLevel
  category: CaseCategory
  redFlag: string
  strongSignalCount: number
  /** True when a critical/high pattern was reduced to Medium for weak evidence. */
  downgraded: boolean
}

export interface ScamIntelMatchInput {
  /** Negation-stripped, lowercased text (caller supplies). */
  strippedText: string
  /** Original lowercased text (used only for provider-name mentions). */
  normalizedText: string
  urls: string[]
}

// ── Score bands ──────────────────────────────────────────────────────────────
const SCORE_CRITICAL = 90 // very_high band
const SCORE_HIGH = 75 // high band
const SCORE_MEDIUM = 40 // medium band ("needs verification")

// ── Provider hosts (for credential-phishing domain-mismatch detection) ───────
const PROVIDER_HOSTS = [
  'google.com',
  'accounts.google.com',
  'gmail.com',
  'microsoft.com',
  'microsoftonline.com',
  'live.com',
  'outlook.com',
  'office.com',
  'office365.com',
  'apple.com',
  'icloud.com'
]

const URL_SHORTENER_HOSTS = [
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'ow.ly',
  'rebrand.ly',
  'is.gd',
  'cutt.ly',
  'shorturl.at'
]

function hostsFromUrls(urls: string[]): string[] {
  const hosts: string[] = []
  for (const u of urls) {
    const m = u.match(/^(?:https?:\/\/)?([^/?#\s]+)/i)
    if (m && m[1]) hosts.push(m[1].toLowerCase().replace(/^www\./, ''))
  }
  return hosts
}

function isProviderHost(host: string): boolean {
  return PROVIDER_HOSTS.some(p => host === p || host.endsWith('.' + p))
}

interface SignalCounts {
  danger: number
  strong: number
  flags: string[]
}

/** Detectors per pattern. Each returns counts of danger / strong signal groups. */
type Detector = (ctx: {
  stripped: string
  normalized: string
  urls: string[]
  hosts: string[]
}) => SignalCounts

const SCHEDULING_LINK =
  /\b(calendly|cal\.com|calendar\s*link|booking\s*link|book\s*a\s*(?:time|call|slot|meeting)|schedule\s*(?:a\s*)?(?:call|interview|meeting|time))\b/i
const LOGIN_REQUEST =
  /\b(?:log\s*in|login|sign\s*in|sign\s*on)\b[^.?!]{0,40}\b(?:google|microsoft|outlook|office\s*365|email|account|inbox|mailbox)\b|\b(?:google|microsoft|outlook|office\s*365|email)\b[^.?!]{0,30}\b(?:log\s*in|login|sign\s*in|password|credentials)\b|\benter\s+your\s+(?:email\s+)?(?:password|credentials|google|microsoft)\b|\bverify\s+your\s+(?:identity|email|account)\s+to\s+(?:view|confirm|join|access)\b/i
const PROVIDER_MENTION = /\b(google|microsoft|outlook|office\s*365|office365|apple|icloud|gmail)\b/i

function detect(name: string): Detector {
  switch (name) {
    case 'fake_scheduling_login_credential_theft':
      return ({ stripped, urls, hosts }) => {
        const flags: string[] = []
        let danger = 0
        let strong = 0
        const hasSchedulingLink =
          SCHEDULING_LINK.test(stripped) ||
          hosts.some(h => h.includes('calendly') || h === 'cal.com' || h.includes('calendar'))

        // This pattern is specifically about a scheduling/interview link that
        // leads to a credential prompt. Without that link there is no pattern —
        // a generic "log in to your account" reminder must NOT trip it.
        if (!hasSchedulingLink) return { danger: 0, strong: 0, flags }

        // Danger groups — concrete credential-theft evidence.
        if (LOGIN_REQUEST.test(stripped)) {
          danger += 1
          flags.push('prompted to log in with Google/Microsoft/email to view or confirm')
        }
        const providerLogin =
          PROVIDER_MENTION.test(stripped) && /\b(log\s*in|login|sign\s*in|password|credentials)\b/i.test(stripped)
        if (providerLogin && hosts.length > 0 && hosts.every(h => !isProviderHost(h))) {
          danger += 1
          flags.push('login page is on a domain that is not the real provider')
        }
        if (hasSchedulingLink && hosts.some(h => URL_SHORTENER_HOSTS.includes(h))) {
          danger += 1
          flags.push('scheduling/login routed through a link shortener')
        }

        // A scheduling/interview link is only a SIGNAL when paired with a danger
        // group (→ Critical) or with a suspicion context (→ Medium "verify").
        // A scheduling link alone (a normal interview invite) is NOT flagged.
        const suspicion =
          /\b(do\s*not\s*recognize|don'?t\s*recognize|cannot\s*verify|can'?t\s*verify|unverif|out\s*of\s*the\s*blue|never\s*heard\s*of|book\s*(?:immediately|right\s*away)|immediately|asap|urgent|pushing\s*me|something\s*feels?\s*off|unsolicited|do\s*not\s*know\s*(?:the|this)\s*(?:company|recruiter))\b/i.test(
            stripped
          )
        if (hasSchedulingLink && (danger > 0 || suspicion)) {
          strong += 1
          flags.unshift('scheduling/interview link tied to a credential-theft scheduling pattern')
        }
        return { danger, strong, flags }
      }

    case 'microsoft_google_login_phishing':
      return ({ stripped, normalized, hosts }) => {
        const flags: string[] = []
        let danger = 0
        let strong = 0
        const providerMention = PROVIDER_MENTION.test(normalized)
        const accountThreat =
          /\b(verify|reactivate|re-?activate|confirm|unlock|restore)\b[^.?!]{0,30}\b(account|mailbox|email)\b|\baccount\s+(?:will\s+be\s+)?(?:suspend|suspended|closed|deactivated|locked|disabled)\b|\bunusual\s+(?:sign[-\s]?in|login|activity)\b/i.test(
            stripped
          )
        if (providerMention && accountThreat) {
          strong += 1
          flags.push('mimics a provider and pressures you to verify/reactivate the account')
        } else if (providerMention) {
          strong += 0 // provider mention alone is context, not a signal
        }
        const loginAsk = LOGIN_REQUEST.test(stripped) || /\b(log\s*in|login|sign\s*in)\b/i.test(stripped)
        // Danger: provider login implied AND link host is not the provider.
        if (providerMention && loginAsk && hosts.length > 0 && hosts.every(h => !isProviderHost(h))) {
          danger += 1
          flags.push('login link points to a non-provider domain (credential phishing)')
        }
        // Danger: explicit credential entry request.
        if (/\benter\s+your\s+(?:email\s+)?password\b|\bconfirm\s+your\s+password\b/i.test(stripped)) {
          danger += 1
          flags.push('asks you to enter your password directly')
        }
        return { danger, strong, flags }
      }

    case 'fake_equipment_check_scam':
      return ({ stripped }) => {
        const flags: string[] = []
        let danger = 0
        let strong = 0
        const check = /\b(?:mail|send|deposit|cash)\b[^.?!]{0,40}\b(check|cheque)\b|\bcheck\b[^.?!]{0,40}\b(deposit|mobile\s*deposit)\b/i.test(
          stripped
        )
        const equipment = /\b(equipment|laptop|computer|workstation|home\s*office\s*setup)\b/i.test(stripped)
        const forward = /\b(send|forward|transfer|wire|zelle|pay)\b[^.?!]{0,40}\b(vendor|supplier|remainder|difference|balance|rest)\b/i.test(
          stripped
        )
        if (check && equipment) {
          strong += 1
          flags.push('new employer mails a check to buy equipment')
        }
        if (forward || (check && /\b(vendor|supplier)\b/i.test(stripped))) {
          danger += 1
          flags.push('asked to deposit a check then forward money to a vendor (fake-check scam)')
        }
        return { danger, strong, flags }
      }

    case 'zelle_cashapp_equipment_deposit_scam':
      return ({ stripped }) => {
        const flags: string[] = []
        let danger = 0
        let strong = 0
        const method =
          /\b(zelle|cash\s*app|venmo|paypal|wire\s*transfer|bitcoin|ethereum|usdt|crypto(?:currency)?|gift\s*cards?)\b/i.test(
            stripped
          )
        const upfront =
          /\b(upfront|up\s*front|deposit|fee|advance|refundable|registration|activation|training)\b[^.?!]{0,30}\b(payment|fee|deposit|cost)?\b/i.test(
            stripped
          ) || /\b(deposit|pay|send)\b[^.?!]{0,30}\b(fee|deposit|upfront)\b/i.test(stripped)
        const payAction = /\b(pay|send|deposit|transfer)\b/i.test(stripped)
        if (method && payAction && upfront) {
          danger += 1
          flags.push('upfront deposit/fee requested via an irreversible payment method')
        } else if (method && upfront) {
          strong += 1
          flags.push('upfront fee/deposit mentioned with an instant-payment method')
        }
        return { danger, strong, flags }
      }

    case 'fake_recruiter_chat_migration':
      return ({ stripped }) => {
        const flags: string[] = []
        let strong = 0
        const offPlatform = /\b(whatsapp|telegram|signal\s*app|signal\b)\b/i.test(stripped)
        const jobContext = /\b(recruiter|hiring|interview|position|role|job|opportunity|onboarding)\b/i.test(stripped)
        if (offPlatform && jobContext) {
          strong += 1
          flags.push('recruiter pushes the conversation to WhatsApp/Telegram/Signal')
        }
        return { danger: 0, strong, flags }
      }

    case 'fake_onboarding_portal_early_pii':
      return ({ stripped }) => {
        const flags: string[] = []
        let danger = 0
        let strong = 0
        const pii =
          /\b(ssn|social\s*security(?:\s*number)?|bank\s*(?:account|routing)|routing\s*number|photo\s*of\s*your\s*id|driver'?s?\s*license|passport)\b/i.test(
            stripped
          )
        const earlyOnboarding =
          /\b(onboarding|portal|getting\s*started|new\s*hire|fill\s*(?:out|in)\s*(?:this|the)\s*(?:form|portal))\b/i.test(
            stripped
          )
        const beforeOffer =
          /\bbefore\s+(?:the\s+)?(?:offer|interview)\b|\bno\s+interview\b|\bhaven'?t\s+(?:had\s+an?\s+)?interview\b/i.test(
            stripped
          )
        if (pii && earlyOnboarding) {
          danger += 1
          flags.push('onboarding portal asks for SSN/banking/ID before any verified offer')
        }
        if (beforeOffer && pii) {
          strong += 1
          flags.push('sensitive PII requested before any interview or offer')
        }
        return { danger, strong, flags }
      }

    case 'fake_invoice_payment_redirect':
      return ({ stripped }) => {
        const flags: string[] = []
        let danger = 0
        let strong = 0
        const invoice = /\b(invoice|payment|vendor|supplier|wire\s*(?:transfer|payment))\b/i.test(stripped)
        const bankChange =
          /\b(updated|changed|new|different)\b[^.?!]{0,30}\b(bank(?:ing)?\s*(?:details|account|info)|account\s*number|routing|payment\s*details)\b|\b(bank|account|payment)\s*details\b[^.?!]{0,30}\b(changed|updated|new)\b/i.test(
            stripped
          )
        const redirect = /\b(redirect|send|wire|remit|pay)\b[^.?!]{0,40}\b(new|different|updated)\s*(?:account|bank)\b/i.test(
          stripped
        )
        if (invoice && (bankChange || redirect)) {
          danger += 1
          flags.push('invoice asks you to redirect payment to a new/changed bank account (BEC)')
        }
        return { danger, strong, flags }
      }

    case 'executive_impersonation_gift_card':
      return ({ stripped }) => {
        const flags: string[] = []
        let danger = 0
        let strong = 0
        const exec = /\b(boss|ceo|cfo|director|manager|executive|president|chief)\b/i.test(stripped)
        const giftCard = /\bgift\s*cards?\b/i.test(stripped)
        const sendCodes = /\b(send|share|text|email)\b[^.?!]{0,30}\b(codes?|numbers?|photos?)\b/i.test(stripped)
        if (exec && giftCard) {
          strong += 1
          flags.push('someone claiming to be an executive asks you to buy gift cards')
        }
        if (giftCard && sendCodes) {
          danger += 1
          flags.push('asked to buy gift cards and send the codes (unrecoverable)')
        }
        return { danger, strong, flags }
      }

    case 'qr_code_phishing':
      return ({ stripped }) => {
        const flags: string[] = []
        let danger = 0
        let strong = 0
        const qr = /\bqr\s*code\b|\bscan\s*(?:this|the|a)?\s*code\b/i.test(stripped)
        const action = /\b(log\s*in|login|sign\s*in|pay|payment|verify|view\s*(?:the\s*)?document|access)\b/i.test(stripped)
        if (qr && action) {
          danger += 1
          flags.push('told to scan a QR code to log in / pay / view a document (quishing)')
        } else if (qr) {
          strong += 1
          flags.push('unexpected QR code to scan')
        }
        return { danger, strong, flags }
      }

    case 'fake_remote_job_task_scam':
      return ({ stripped }) => {
        const flags: string[] = []
        let danger = 0
        let strong = 0
        const tasks =
          /\b(rate\s*(?:apps?|products?)|like\s*(?:videos?|posts?)|process\s*orders?|complete\s*(?:simple\s*)?tasks?|optimize\s*products?|boost\s*(?:sales|ratings?))\b/i.test(
            stripped
          )
        const depositToUnlock =
          /\b(deposit|pay|add\s*funds?|top\s*up)\b[^.?!]{0,50}\b(unlock|withdraw|continue|next\s*task|higher|more)\b|\b(withdraw|cash\s*out)\b[^.?!]{0,50}\b(deposit|pay|fee|tax)\b/i.test(
            stripped
          )
        if (tasks && depositToUnlock) {
          danger += 1
          flags.push('task job requires depositing your own money to unlock earnings (laundering/task scam)')
        } else if (tasks && /\b(daily\s*pay|easy\s*money|earn\s*\$?\d)\b/i.test(stripped)) {
          strong += 1
          flags.push('pay-per-task remote "job" with unrealistic easy earnings')
        }
        return { danger, strong, flags }
      }

    default:
      return () => ({ danger: 0, strong: 0, flags: [] })
  }
}

/**
 * Match the submission against the curated catalog and return the single
 * highest-scoring floor (or null). Critical (very_high) requires concrete
 * danger evidence; weak matches are downgraded to a Medium "needs
 * verification" floor or dropped.
 */
export function matchScamIntel(input: ScamIntelMatchInput): ScamIntelMatch | null {
  const ctx = {
    stripped: input.strippedText,
    normalized: input.normalizedText,
    urls: input.urls,
    hosts: hostsFromUrls(input.urls)
  }

  let best: ScamIntelMatch | null = null

  for (const pattern of SCAM_INTEL_CATALOG) {
    const { danger, strong, flags } = detect(pattern.name)(ctx)
    const total = danger + strong
    if (total === 0) continue

    let minScore = 0
    let minRiskLevel: RiskLevel = 'low'
    let downgraded = false

    if (pattern.severity === 'critical') {
      // Critical requires concrete danger evidence AND at least 2 groups total.
      if (danger >= 1 && total >= 2) {
        minScore = SCORE_CRITICAL
        minRiskLevel = 'very_high'
      } else if (total >= 1) {
        // Weak/partial match — never Critical. Flag for verification.
        minScore = SCORE_MEDIUM
        minRiskLevel = 'medium'
        downgraded = true
      } else {
        continue
      }
    } else if (pattern.severity === 'high') {
      if (danger >= 1 || strong >= 2) {
        minScore = SCORE_HIGH
        minRiskLevel = 'high'
      } else if (strong >= 1) {
        minScore = SCORE_MEDIUM
        minRiskLevel = 'medium'
        downgraded = true
      } else {
        continue
      }
    } else if (pattern.severity === 'medium') {
      if (total >= 1) {
        minScore = SCORE_MEDIUM
        minRiskLevel = 'medium'
      } else {
        continue
      }
    } else {
      // low severity patterns never raise a floor on their own
      continue
    }

    const redFlag =
      flags[0] ?? `matches known scam pattern: ${pattern.name.replace(/_/g, ' ')}`

    if (!best || minScore > best.minScore) {
      best = {
        pattern,
        minScore,
        minRiskLevel,
        category: pattern.floorCategory,
        redFlag,
        strongSignalCount: danger + strong,
        downgraded
      }
    }
  }

  return best
}
