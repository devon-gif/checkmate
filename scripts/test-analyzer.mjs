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
  if (score >= 75) return 'very_high'
  if (score >= 50) return 'high'
  if (score >= 25) return 'medium'
  return 'low'
}

function runSignals(text, urls, hint) {
  const lower = text.toLowerCase()
  let score = 20
  const flags = []
  let category = hint ?? 'unknown'

  const paymentSignals = [
    [/wire\s*transfer/i, 'Mentions wire transfer'],
    [/western\s*union/i, 'Mentions Western Union'],
    [/gift\s*card/i, 'Requests gift card payment'],
    [/\bzelle\b/i, 'Requests Zelle payment'],
    [/cashier'?s?\s*check/i, "Mentions cashier's check"],
    [/upfront\s*(fee|cost|payment|equipment)/i, 'Requires upfront payment'],
    [/social\s*security\s*number|ssn\b/i, 'Requests Social Security number'],
    [/bank\s*(account|routing)\s*number/i, 'Requests bank account details'],
    [/verification\s*code|one[-\s]?time\s*(code|password)|otp\b/i, 'Requests OTP code'],
  ]
  for (const [pat, flag] of paymentSignals) {
    if (pat.test(lower)) { score += 15; flags.push(flag) }
  }

  const jobSignals = [
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

  score = Math.min(score, 100)
  return { score, risk_level: getRiskLevel(score), flags, category }
}

// ─── Test cases ───────────────────────────────────────────────────────────────

const CASES = [
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
    name: 'Toll phishing',
    input: 'Final notice: pay your toll balance now or your registration will be suspended. Click',
    url: 'http://pay-toll-fast-help.com',
    hint: 'phishing_url',
    expectations: {
      minScore: 80,
      riskLevels: ['very_high', 'high'],
      mustHaveFlag: /notice|suspend|toll|domain/i,
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
      // fallback, score must not be dangerously high
      maxScore: 40,
      riskLevels: ['low', 'medium', 'high', 'very_high'], // any is fine, won't crash
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
