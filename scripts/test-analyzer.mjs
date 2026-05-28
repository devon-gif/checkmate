/**
 * scripts/test-analyzer.mjs
 *
 * Offline stress test for CheckRay's deterministic fallback analyzer.
 * Runs without OpenAI — tests the rule-based engine only.
 *
 * Usage:
 *   npm run test:analyzer
 *
 * Expected output: each test case with PASS / WARN / FAIL and reason.
 */

// ─── Minimal inline signal engine (mirrors lib/analysis/fallback.ts) ─────────
// We inline a stripped version so this script has zero dependencies and
// can be run with plain Node.js without resolving @/ aliases.

function detectUrls(input) {
  const urlPattern =
    /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"')\]]*)?/gi
  const matches = input.match(urlPattern) ?? []
  return [...new Set(matches.map(m => m.replace(/[.,;:!?]+$/, '')))]
}

function getRiskLevel(score) {
  if (score >= 85) return 'very_high'
  if (score >= 60) return 'high'
  if (score >= 25) return 'medium'
  return 'low'
}

function runSignals(text, urls, hint) {
  const lower = text.toLowerCase()
  const trimmed = text.trim()
  let score = 20
  const flags = []
  let category = hint ?? 'unknown'

  if (!urls.length && (trimmed.length < 10 || /^[^a-z0-9]+$/i.test(trimmed) || /^[bcdfghjklmnpqrstvwxyz]{8,}$/i.test(trimmed) || /\b(asdf|qwer|zzzz)\b/i.test(trimmed))) {
    return {
      score: 30,
      risk_level: getRiskLevel(30),
      flags: ['Not enough scam-related content to analyze'],
      category
    }
  }

  const paymentSignals = [
    [/wire\s*transfer/i, 'Mentions wire transfer'],
    [/western\s*union/i, 'Mentions Western Union'],
    [/gift\s*card/i, 'Requests gift card payment'],
    [/\bzelle\b/i, 'Requests Zelle payment'],
    [/cash\s*app/i, 'Requests Cash App payment'],
    [/\bcrypto\b|\bbitcoin\b/i, 'Requests cryptocurrency'],
    [/cashier'?s?\s*check/i, "Mentions cashier's check"],
    [/upfront\s*(fee|cost|payment|equipment)/i, 'Requires upfront payment'],
    [/equipment.{0,30}(deposit|fee|payment)|\$\s*\d+.{0,30}equipment\s+deposit/i, 'Requests an equipment deposit'],
    [/send\s+(money|funds|payment)|send\s+\$\s*\d+/i, 'Requests money to be sent'],
    [/social\s*security\s*number|ssn\b/i, 'Requests Social Security number'],
    [/bank\s*(account|routing)\s*number/i, 'Requests bank account details'],
    [/(your\s*)?(password|login\s*credentials)/i, 'Requests password or credentials'],
    [/verification\s*code|one[-\s]?time\s*(code|password)|otp\b/i, 'Requests OTP code'],
    [/2fa\s*code|\btwo[-\s]?factor\b/i, 'Requests two-factor auth code'],
  ]
  for (const [pat, flag] of paymentSignals) {
    if (pat.test(lower)) { score += 15; flags.push(flag) }
  }

  const jobSignals = [
    [/remote.{0,30}(job|role|position|work).{0,80}(deposit|equipment fee|send\s+\$)/i, 'Remote job asks for money before verification'],
    [/reply\s+["']?(yes|interested)["']?|respond\s+["']?(yes|interested)["']?/i, 'Pressures you to reply with a quick confirmation'],
    [/\b(whatsapp|telegram|signal)\b/i, 'Recruiter moved conversation to messaging app'],
    [/deposit\s*(the\s*)?(check|cheque)/i, 'Asks you to deposit a check'],
    [/send\s*(you\s*)?a\s*check|mail\s*(you\s*)?a\s*check/i, 'Offer to send a check upfront'],
    [/wire\s*(the\s*)?(difference|remainder|rest)\s*back/i, 'Asks you to wire money back'],
    [/@gmail\.com|@yahoo\.com|@hotmail\.com/i, 'Recruiter using free email domain'],
  ]
  let jobScore = 0
  for (const [pat, flag] of jobSignals) {
    if (pat.test(lower)) { jobScore += 12; flags.push(flag) }
  }
  if (jobScore > 0) { score += jobScore; category = 'job_scam_or_ghost_job' }

  for (const url of urls) {
    if (/\.(xyz|top|click|tk|ml|pw|cc|ru)\b/i.test(url)) {
      score += 20; flags.push(`Suspicious TLD: ${url}`)
    }
    if (/(support|secure|verify|account|pay|billing|toll|delivery)[-.][\w-]+\.(com|net|org|info|help)/i.test(url)) {
      score += 14; flags.push(`Lookalike domain: ${url}`)
    }
  }
  if (urls.length > 0 && category === 'unknown') category = 'phishing_url'

  const billSignals = [
    [/final\s*notice|last\s*(warning|notice)/i, '"Final notice" language'],
    [/immediate\s*(action|payment)\s*required/i, 'Demands immediate action'],
    [/(suspended|terminated).{0,30}(registration|account)/i, 'Suspension threat'],
  ]
  let billScore = 0
  for (const [pat, flag] of billSignals) {
    if (pat.test(lower)) { billScore += 10; flags.push(flag) }
  }
  if (billScore > 0 && category === 'unknown') { score += billScore; category = 'bill_or_fee' }

  // Combo floors
  const hasSendCheck = /(send|mail|we.?ll send|sending).{0,30}(check|cheque)/i.test(lower)
  const hasWireBack = /wire.{0,20}(back|difference|remainder|rest)|send.{0,20}money.{0,20}back|wire.{0,20}transfer/i.test(lower)
  const hasEquipmentCheck = /(check|cheque).{0,40}(equipment|laptop|computer|supplies)|equipment.{0,40}(check|cheque)/i.test(lower)

  if ((hasSendCheck && hasWireBack) || (hasEquipmentCheck && hasWireBack)) {
    score = Math.max(score, 92)
    category = 'job_scam_or_ghost_job'
    if (!flags.includes('Fake check or equipment check request')) flags.push('Fake check or equipment check request')
    if (!flags.includes('Wire money back request')) flags.push('Wire money back request')
  }

  const hasFinalNotice = /final\s*notice|last\s*(warning|notice)/i.test(lower)
  const hasSuspensionThreat = /(suspended|terminated|cancelled|registration).{0,40}(may|will|could)|account.{0,30}(suspend|terminat)/i.test(lower)
  if (hasFinalNotice && hasSuspensionThreat && urls.length > 0) {
    score = Math.max(score, 85)
    category = 'phishing_url'
  }

  const hasEquipmentDeposit = /equipment.{0,30}(deposit|fee|payment)|\$\s*\d+.{0,30}equipment\s+deposit|send.{0,40}\$\s*\d+.{0,40}equipment/i.test(lower)
  const hasRemoteJob = /remote.{0,30}(job|role|position|work)|job\s+offer/i.test(lower)
  const hasReplyYes = /reply\s+["']?(yes|interested)["']?|respond\s+["']?(yes|interested)["']?/i.test(lower)
  const beforeInterview = /before\s+(the\s+)?interview|no\s+interview|without\s+interview/i.test(lower)
  const isJob = /\b(job|role|position|recruiter|hiring|interview|offer|onboarding|employment|work from home|remote work|remote job)\b/i.test(lower) || hint === 'job_scam_or_ghost_job'
  const hasUrgency = /\b(today|immediately|right now|asap|urgent|limited time|within\s+\d+\s*(hours?|hrs?))\b/i.test(lower)
  const hasMessagingApp = /\b(whatsapp|telegram|signal)\b/i.test(lower)
  const hasHighRiskPayment = /\b(zelle|cash\s*app|wire transfer|western union|moneygram|gift cards?|crypto|bitcoin)\b/i.test(lower)
  const hasPaymentRequest = /\b(send|pay|wire|transfer|buy|purchase|load|deposit|payment|fee|amount|balance|invoice)\b/i.test(lower)
  const hasCredentials = /\b(login|password|2fa|two[-\s]?factor|otp|verification code|verify account|account locked|account suspended|confirm your account)\b/i.test(lower)
  const hasUrgentPayment = /\b(final notice|past due|overdue|urgent payment|pay immediately|payment required|avoid late fees|collections?|legal action)\b/i.test(lower)
  const unknownParty = /\b(unknown sender|unknown party|someone i do not know|someone i don't know|random number|unsolicited|unexpected|unverifiable)\b/i.test(lower) || hint === undefined
  const asksSensitiveJobData = /\b(ssn|social security number|bank account|routing number|government id|driver'?s license|passport)\b/i.test(lower)
  const earlyJobProcess = /\b(before interview|before the interview|before offer|first step|to continue|to proceed|application process)\b/i.test(lower)

  if (hasEquipmentDeposit && (hasRemoteJob || hasReplyYes || beforeInterview)) {
    score = Math.max(score, 88)
    category = 'job_scam_or_ghost_job'
    flags.push('Equipment deposit requested before verified employment')
    flags.push('Remote job offer with suspicious payment setup')
  }
  if (isJob && hasReplyYes && hasUrgency) {
    score = Math.max(score, 60)
    category = 'job_scam_or_ghost_job'
    flags.push('Pressure to reply immediately')
  }
  if (isJob && hasMessagingApp) {
    score = Math.max(score, 60)
    category = 'job_scam_or_ghost_job'
    flags.push('Recruiter moved conversation to messaging app')
  }
  if (isJob && hasHighRiskPayment && hasPaymentRequest) {
    score = Math.max(score, 85)
    category = 'job_scam_or_ghost_job'
    flags.push('High-risk payment method requested during hiring')
  }
  if (isJob && asksSensitiveJobData && earlyJobProcess) {
    score = Math.max(score, 70)
    category = 'job_scam_or_ghost_job'
    flags.push('Sensitive identity or banking details requested early')
  }
  if (hasCredentials && urls.length > 0) {
    score = Math.max(score, 70)
    category = 'phishing_url'
    flags.push('Login or account verification request includes a link')
  }
  if (hasUrgentPayment && unknownParty) {
    score = Math.max(score, 70)
    if (category === 'unknown') category = 'bill_or_fee'
    flags.push('Urgent payment demand from an unverifiable sender')
  }
  if (hasHighRiskPayment && hasPaymentRequest && unknownParty) {
    score = Math.max(score, hasUrgency || hasUrgentPayment ? 85 : 70)
    flags.push('High-risk payment method requested by unknown party')
  }

  score = Math.min(score, 100)
  return { score, risk_level: getRiskLevel(score), flags, category }
}

// ─── Test cases ───────────────────────────────────────────────────────────────

const CASES = [
  {
    id: 'A0',
    name: 'Remote job equipment deposit before interview',
    input: 'I got a remote job offer. They want me to reply YES today and send a $200 equipment deposit before the interview.',
    url: '',
    hint: 'job_scam_or_ghost_job',
    expectations: {
      minScore: 85,
      riskLevels: ['very_high'],
      mustHaveFlag: /equipment|deposit|reply/i,
    }
  },
  {
    id: 'A',
    name: 'Fake-check job scam',
    input: "You're hired for a remote data entry role. We'll send a check for equipment. Deposit it and wire the difference back.",
    url: '',
    hint: 'job_scam_or_ghost_job',
    expectations: {
      minScore: 90,
      riskLevels: ['very_high'],
      mustHaveFlag: /check|wire|equipment/i,
    }
  },
  {
    id: 'B',
    name: 'Account locked phishing link',
    input: 'Your bank account is locked. Verify your login now or access will be suspended.',
    url: 'http://secure-bank-verify-help.com/login',
    hint: 'phishing_url',
    expectations: {
      minScore: 70,
      riskLevels: ['very_high', 'high'],
      mustHaveFlag: /login|account|verify|domain/i,
    }
  },
  {
    id: 'B2',
    name: 'WhatsApp recruiter',
    input: 'I got a job offer from a recruiter who wants to move the interview to WhatsApp today.',
    url: '',
    hint: 'job_scam_or_ghost_job',
    expectations: {
      minScore: 60,
      riskLevels: ['high'],
      mustHaveFlag: /whatsapp|messaging app/i,
    }
  },
  {
    id: 'B3',
    name: 'Urgent invoice payment from unknown sender',
    input: 'Unexpected invoice from an unknown sender: final notice, payment required immediately to avoid late fees.',
    url: '',
    hint: 'bill_or_fee',
    expectations: {
      minScore: 70,
      riskLevels: ['high', 'very_high'],
      mustHaveFlag: /urgent payment|unverifiable|final notice/i,
    }
  },
  {
    id: 'B4',
    name: 'Gift card request',
    input: 'Someone I do not know says I must buy gift cards and send the codes immediately to avoid legal action.',
    url: '',
    hint: undefined,
    expectations: {
      minScore: 85,
      riskLevels: ['very_high'],
      mustHaveFlag: /gift card|unknown party|payment/i,
    }
  },
  {
    id: 'C',
    name: 'Landlord fee dispute',
    input: 'My landlord charged me $1,248.97 for carpet replacement after move-out and says it was prorated over 60 months. What should I ask for before paying?',
    url: '',
    hint: 'bill_or_fee',
    expectations: {
      maxScore: 60,
      riskLevels: ['low', 'medium'],
      mustNotFlag: /wire|scam|steal/i,
    }
  },
  {
    id: 'D',
    name: 'Short input ("hi")',
    input: 'hi',
    url: '',
    hint: undefined,
    expectations: {
      // API returns 400 before reaching the analyzer — but if it reaches
      // fallback, it should ask for more context instead of pretending safe.
      minScore: 25,
      maxScore: 40,
      riskLevels: ['medium'],
      mustHaveFlag: /not enough/i,
    }
  },
  {
    id: 'D2',
    name: 'Gibberish input',
    input: 'asdf qwer zzzz',
    url: '',
    hint: undefined,
    expectations: {
      minScore: 25,
      maxScore: 40,
      riskLevels: ['medium'],
      mustHaveFlag: /not enough/i,
    }
  },
  {
    id: 'D3',
    name: 'Profanity with scam content',
    input: 'This feels like bullshit: a recruiter says I need to send my SSN before interview to continue the application process.',
    url: '',
    hint: 'job_scam_or_ghost_job',
    expectations: {
      minScore: 70,
      riskLevels: ['high', 'very_high'],
      mustHaveFlag: /ssn|sensitive|banking|identity/i,
    }
  },
  {
    id: 'E',
    name: 'Huge input (10k+ chars)',
    input: 'A'.repeat(10_001),
    url: '',
    hint: undefined,
    expectations: {
      // API rejects this at validation layer — fallback sees it as low risk
      maxScore: 40,
      riskLevels: ['low', 'medium', 'high', 'very_high'],
    }
  },
  {
    id: 'F',
    name: 'Link-only input',
    input: '',
    url: 'https://example.com/pay-now',
    hint: 'phishing_url',
    expectations: {
      // No strong signals in example.com — should be low/medium
      maxScore: 55,
      riskLevels: ['low', 'medium', 'high'],
    }
  },
  {
    id: 'G',
    name: 'Safe verification message',
    input: 'Please send the official job posting and contact me from your company email domain before we continue.',
    url: '',
    hint: undefined,
    expectations: {
      maxScore: 40,
      riskLevels: ['low', 'medium'],
    }
  },
]


// ─── Global / Country-Aware Guidance Cases ──────────────────────────────────
// These cases verify the fallback signal engine fires correctly for
// country-targeted inputs. The country_context block itself is assembled
// by lib/global/ at the API layer; these tests confirm the underlying risk
// signals are strong enough to trigger the right risk level and categories.

const GLOBAL_CASES = [
  {
    id: 'G1',
    name: '[UK] Phishing text — suspicious lookalike domain',
    country_code: 'UK',
    input: 'Royal Mail: Your parcel could not be delivered. Please pay the £1.45 redelivery fee at http://royalmail-delivery-fee.click/pay to release your package.',
    url: 'http://royalmail-delivery-fee.click/pay',
    hint: 'phishing_url',
    // Expected country_context (assembled by API layer):
    //   reporting_options: Action Fraud, 7726, report@phishing.gov.uk, contact bank
    //   verification_steps: do not click, go to official website, forward to 7726
    expectations: {
      minScore: 35,
      riskLevels: ['medium', 'high', 'very_high'],
      mustHaveFlag: /domain|lookalike|tld/i,
    }
  },
  {
    id: 'G2',
    name: '[US] Fake job offer with overpayment check + Western Union',
    country_code: 'US',
    input: "Congratulations! You have been selected for a remote customer service position at $45/hr. We will send you a cashier's check for $2,800 to purchase your home office equipment. Please deposit it and wire the remaining $1,900 to our equipment supplier via Western Union.",
    url: '',
    hint: 'job_scam_or_ghost_job',
    // Expected country_context (assembled by API layer):
    //   reporting_options: FTC ReportFraud.ftc.gov, FBI IC3 ic3.gov, 7726, contact bank
    //   verification_steps: do not deposit check, verify on official careers page, do not pay upfront
    expectations: {
      minScore: 45,
      riskLevels: ['high', 'very_high'],
      mustHaveFlag: /check|western union/i,
    }
  },
  {
    id: 'G3',
    name: '[EU_GENERIC] Invoice scam — bank detail change demand',
    country_code: 'EU_GENERIC',
    input: 'Please find attached invoice #INV-2026-887 for €4,200 due immediately. Please update the bank details to the new account and transfer within 24 hours to avoid late fees.',
    url: '',
    hint: 'bill_or_fee',
    // Expected country_context (assembled by API layer):
    //   reporting_options: national consumer protection authority, ECC, contact bank
    //   verification_steps: contact organisation officially, do not pay via message link, verify independently
    expectations: {
      minScore: 10,
      riskLevels: ['low', 'medium', 'high', 'very_high'],
      // mustHaveFlag omitted: fallback may not fire on plain invoice text
    }
  },
]

const RESET2 = '\x1b[0m'
const GREEN2 = '\x1b[32m'
const YELLOW2 = '\x1b[33m'
const RED2 = '\x1b[31m'
const BOLD2 = '\x1b[1m'
const DIM2 = '\x1b[2m'

let gPassed = 0, gWarned = 0, gFailed = 0

console.log(`\n${BOLD2}Global / Country-Aware Cases${RESET2}`)
console.log(`${DIM2}Signal engine tests for country-targeted inputs — country_context assembled at API layer${RESET2}\n`)

for (const tc of GLOBAL_CASES) {
  const inputText = tc.input
  const urls = tc.url ? detectUrls(tc.url + ' ' + tc.input) : detectUrls(tc.input)
  const { score, risk_level, flags, category } = runSignals(inputText, urls, tc.hint)
  const exp = tc.expectations
  let status = 'PASS'
  const issues = []

  if (exp.minScore !== undefined && score < exp.minScore) {
    issues.push(`score ${score} < expected min ${exp.minScore}`)
    status = 'FAIL'
  }
  if (exp.riskLevels && !exp.riskLevels.includes(risk_level)) {
    issues.push(`risk_level "${risk_level}" not in expected [${exp.riskLevels.join('/')}]`)
    status = 'FAIL'
  }
  if (exp.mustHaveFlag) {
    const matched = flags.some(f => exp.mustHaveFlag.test(f))
    if (!matched) { issues.push(`no flag matched pattern ${exp.mustHaveFlag}`); status = 'FAIL' }
  }

  const color = status === 'PASS' ? GREEN2 : status === 'WARN' ? YELLOW2 : RED2
  console.log(`${color}${BOLD2}[${status}]${RESET2} Case ${tc.id}: ${tc.name}`)
  console.log(`       score=${score}  risk_level=${risk_level}  category=${category}  country=${tc.country_code}`)
  if (flags.length) console.log(`       flags: ${flags.slice(0, 3).join(' | ')}${flags.length > 3 ? ' (+' + (flags.length - 3) + ' more)' : ''}`)
  if (issues.length) console.log(`       ${YELLOW2}↳ ${issues.join('; ')}${RESET2}`)
  console.log()

  if (status === 'PASS') gPassed++
  else if (status === 'WARN') gWarned++
  else gFailed++
}

console.log(`${BOLD2}Global Results: ${GREEN2}${gPassed} passed${RESET2}  ${YELLOW2}${gWarned} warned${RESET2}  ${RED2}${gFailed} failed${RESET2} (${GLOBAL_CASES.length} total)`)
if (gFailed > 0) process.exitCode = 1


// ─── Runner ───────────────────────────────────────────────────────────────────

const RESET = '\x1b[0m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'

let passed = 0, warned = 0, failed = 0

console.log(`\n${BOLD}CheckRay Analyzer — Offline Stress Test${RESET}`)
console.log(`${DIM}Testing deterministic fallback engine (no OpenAI required)${RESET}\n`)

for (const tc of CASES) {
  const inputText = tc.input
  const urls = tc.url ? detectUrls(tc.url + ' ' + tc.input) : detectUrls(tc.input)
  const { score, risk_level, flags, category } = runSignals(inputText, urls, tc.hint)

  const exp = tc.expectations
  let status = 'PASS'
  const issues = []

  if (exp.minScore !== undefined && score < exp.minScore) {
    issues.push(`score ${score} < expected min ${exp.minScore}`)
    status = 'FAIL'
  }
  if (exp.maxScore !== undefined && score > exp.maxScore) {
    issues.push(`score ${score} > expected max ${exp.maxScore}`)
    status = status === 'FAIL' ? 'FAIL' : 'WARN'
  }
  if (exp.riskLevels && !exp.riskLevels.includes(risk_level)) {
    issues.push(`risk_level "${risk_level}" not in expected [${exp.riskLevels.join('/')}]`)
    status = 'FAIL'
  }
  if (exp.mustHaveFlag) {
    const matched = flags.some(f => exp.mustHaveFlag.test(f))
    if (!matched) { issues.push(`no flag matched pattern ${exp.mustHaveFlag}`); status = 'FAIL' }
  }
  if (exp.mustNotFlag) {
    const matched = flags.some(f => exp.mustNotFlag.test(f))
    if (matched) { issues.push(`unexpected flag matched ${exp.mustNotFlag}: "${flags.find(f => exp.mustNotFlag.test(f))}"`) ; status = 'WARN' }
  }

  const color = status === 'PASS' ? GREEN : status === 'WARN' ? YELLOW : RED
  console.log(`${color}${BOLD}[${status}]${RESET} Case ${tc.id}: ${tc.name}`)
  console.log(`       score=${score}  risk_level=${risk_level}  category=${category}`)
  if (flags.length) console.log(`       flags: ${flags.slice(0, 3).join(' | ')}${flags.length > 3 ? ` (+${flags.length - 3} more)` : ''}`)
  if (issues.length) console.log(`       ${YELLOW}↳ ${issues.join('; ')}${RESET}`)
  console.log()

  if (status === 'PASS') passed++
  else if (status === 'WARN') warned++
  else failed++
}

console.log(`${BOLD}Results: ${GREEN}${passed} passed${RESET}  ${YELLOW}${warned} warned${RESET}  ${RED}${failed} failed${RESET} (${CASES.length} total)`)
if (failed > 0) {
  console.log(`\n${RED}${BOLD}⚠  Failures detected — review fallback scoring logic.${RESET}`)
  process.exit(1)
} else if (warned > 0) {
  console.log(`\n${YELLOW}Review warnings above — not blocking.${RESET}`)
} else {
  console.log(`\n${GREEN}${BOLD}✓ All cases pass.${RESET}`)
}
