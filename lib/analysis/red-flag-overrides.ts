import { caseCategories, type CaseCategory } from '@/lib/checkmate-shared'

export interface RedFlagOverride {
  minScore: number
  category?: CaseCategory
  flags: string[]
  strongSignalCount: number
  safeReply?: string
}

const jobContextPattern =
  /\b(job|role|position|recruiter|hiring|interview|offer|onboarding|employment|work from home|remote work|remote job)\b/i
const upfrontPaymentPattern =
  /\b(upfront|advance|deposit|equipment fee|equipment deposit|training fee|processing fee|application fee|send money|send \$\s*\d+|pay \$\s*\d+|purchase.{0,25}(equipment|laptop|computer|software|supplies))\b/i
const fakeCheckPattern =
  /\b(send|mail|deposit|cash|mobile deposit).{0,35}(check|cheque|cashier'?s check)|\b(check|cheque).{0,45}(equipment|supplies|laptop|computer|wire|refund|difference|remainder)\b/i
const moneyBackPattern =
  /\b(wire|send|return|refund|transfer).{0,35}(back|difference|remainder|rest|portion|supplier|vendor|funds|money)\b/i
const replyYesPattern =
  /\b(reply|respond|text)\s+["']?(yes|interested)["']?|\bconfirm\s+(interest|availability)\b/i
const urgencyPattern =
  /\b(today|immediately|right now|asap|urgent|limited time|expires? tonight|within\s+\d+\s*(hours?|hrs?|minutes?|mins?))\b/i
const messagingAppPattern = /\b(whatsapp|telegram|signal)\b/i
const highRiskPaymentPattern =
  /\b(zelle|cash\s*app|wire transfer|western union|moneygram|gift cards?|itunes cards?|steam cards?|crypto|bitcoin|ethereum|usdt)\b/i
const paymentRequestPattern =
  /\b(send|pay|wire|transfer|buy|purchase|load|deposit|payment|fee|amount|balance|invoice)\b/i
const credentialsPattern =
  /\b(login|password|passcode|2fa|two[-\s]?factor|otp|one[-\s]?time code|verification code|verify account|verify your account|account locked|account suspended|confirm your account|confirm your login)\b/i
const urgentPaymentPattern =
  /\b(final notice|past due|overdue|urgent payment|pay immediately|payment required|avoid late fees|avoid suspension|collections?|legal action)\b/i
const unknownPartyPattern =
  /\b(unknown sender|unknown party|someone i do not know|someone i don't know|random number|unsolicited|unexpected|never heard of|not sure who sent|unverifiable)\b/i
const sensitiveJobDataPattern =
  /\b(ssn|social security number|bank account|routing number|government id|driver'?s license|passport|date of birth|dob)\b/i
const earlyJobProcessPattern =
  /\b(before interview|before the interview|before onboarding|before offer|before a formal offer|first step|to continue|to proceed|application process)\b/i
const tooLittleLettersPattern = /^[^a-z0-9]+$/i
const consonantRunPattern = /^[bcdfghjklmnpqrstvwxyz]{8,}$/i

export function isLikelyInsufficientScamContent(text: string, urls: string[]): boolean {
  const trimmed = text.trim()
  if (urls.length > 0) return false
  if (trimmed.length < 10) return true
  const compact = trimmed.replace(/\s+/g, '')
  if (tooLittleLettersPattern.test(compact)) return true
  if (consonantRunPattern.test(compact)) return true
  if (/\b(asdf|qwer|zzzz|lorem ipsum)\b/i.test(trimmed)) return true
  return false
}

function addRule(
  rules: RedFlagOverride[],
  condition: boolean,
  rule: RedFlagOverride
) {
  if (condition) rules.push(rule)
}

export function evaluateRedFlagOverrides(
  text: string,
  urls: string[],
  hint?: string
): RedFlagOverride | null {
  const validHint = hint && caseCategories.includes(hint as CaseCategory)
    ? (hint as CaseCategory)
    : undefined
  const fullText = text.toLowerCase()
  const isJob = jobContextPattern.test(fullText) || validHint === 'job_scam_or_ghost_job'
  const hasUpfrontPayment = upfrontPaymentPattern.test(fullText)
  const hasFakeCheck = fakeCheckPattern.test(fullText)
  const asksMoneyBack = moneyBackPattern.test(fullText)
  const hasReplyYes = replyYesPattern.test(fullText)
  const hasUrgency = urgencyPattern.test(fullText)
  const hasMessagingApp = messagingAppPattern.test(fullText)
  const hasHighRiskPayment = highRiskPaymentPattern.test(fullText)
  const hasHighRiskPaymentRequest = hasHighRiskPayment && paymentRequestPattern.test(fullText)
  const hasCredentials = credentialsPattern.test(fullText)
  const hasUrgentPayment = urgentPaymentPattern.test(fullText)
  const looksUnknown = unknownPartyPattern.test(fullText) || validHint === undefined
  const asksSensitiveJobData = sensitiveJobDataPattern.test(fullText)
  const earlyJobProcess = earlyJobProcessPattern.test(fullText)
  const hasLink = urls.length > 0

  const rules: RedFlagOverride[] = []

  addRule(rules, isLikelyInsufficientScamContent(text, urls), {
    minScore: 30,
    category: validHint ?? 'unknown',
    flags: ['Not enough scam-related content to analyze'],
    strongSignalCount: 0
  })

  addRule(rules, isJob && hasFakeCheck && (asksMoneyBack || hasHighRiskPayment), {
    minScore: 92,
    category: 'job_scam_or_ghost_job',
    flags: [
      'Fake check or equipment check request',
      'Money movement before verified employment',
      'Payment requested before legitimate hiring process'
    ],
    strongSignalCount: 3,
    safeReply:
      'Before moving forward, please send the official job posting and contact me from your company email domain. I do not deposit checks, purchase equipment, or send money as part of the hiring process.'
  })

  addRule(rules, isJob && hasHighRiskPaymentRequest, {
    minScore: 85,
    category: 'job_scam_or_ghost_job',
    flags: [
      'High-risk payment method requested during hiring',
      'Payment requested before legitimate hiring process'
    ],
    strongSignalCount: 2
  })

  addRule(rules, isJob && (hasUpfrontPayment || hasFakeCheck), {
    minScore: 70,
    category: 'job_scam_or_ghost_job',
    flags: [
      'Upfront equipment deposit requested before interview',
      'Payment requested before legitimate hiring process'
    ],
    strongSignalCount: 2
  })

  addRule(rules, isJob && hasReplyYes && hasUrgency, {
    minScore: 60,
    category: 'job_scam_or_ghost_job',
    flags: [
      'Pressure to reply immediately',
      'Urgent confirmation requested for job offer'
    ],
    strongSignalCount: 1
  })

  addRule(rules, isJob && hasMessagingApp, {
    minScore: 60,
    category: 'job_scam_or_ghost_job',
    flags: ['Recruiter moved conversation to messaging app'],
    strongSignalCount: 1
  })

  addRule(rules, isJob && asksSensitiveJobData && earlyJobProcess, {
    minScore: 70,
    category: 'job_scam_or_ghost_job',
    flags: ['Sensitive identity or banking details requested early'],
    strongSignalCount: 2
  })

  addRule(rules, hasCredentials && hasLink, {
    minScore: 70,
    category: 'phishing_url',
    flags: [
      'Login or account verification request includes a link',
      'Credentials or verification code may be targeted'
    ],
    strongSignalCount: 2
  })

  addRule(rules, hasUrgentPayment && looksUnknown, {
    minScore: 70,
    category: validHint === 'phishing_url' ? 'phishing_url' : 'bill_or_fee',
    flags: ['Urgent payment demand from an unverifiable sender'],
    strongSignalCount: 2
  })

  addRule(rules, hasHighRiskPaymentRequest && looksUnknown, {
    minScore: hasUrgency || hasUrgentPayment ? 85 : 70,
    category: validHint ?? 'unknown',
    flags: ['High-risk payment method requested by unknown party'],
    strongSignalCount: hasUrgency || hasUrgentPayment ? 2 : 1
  })

  if (!rules.length) return null

  return rules.slice(1).reduce<RedFlagOverride>((best, rule) => {
    const minScore = Math.max(best.minScore, rule.minScore)
    return {
      minScore,
      category: rule.minScore >= best.minScore ? rule.category ?? best.category : best.category,
      flags: Array.from(new Set([...best.flags, ...rule.flags])),
      strongSignalCount: best.strongSignalCount + rule.strongSignalCount,
      safeReply: rule.safeReply ?? best.safeReply
    }
  }, rules[0])
}
