/**
 * tests/load/analyze-fallback.js
 *
 * Load test for POST /api/analyze-case in fallback-only mode.
 *
 * IMPORTANT: Start the server with CHECKRAY_FORCE_FALLBACK=true to ensure
 * the deterministic analyzer runs instead of OpenAI. This avoids large
 * OpenAI bills during load testing.
 *
 *   CHECKRAY_FORCE_FALLBACK=true pnpm run start
 *   k6 run tests/load/analyze-fallback.js
 *
 * Default: 2 VUs, 30 seconds.
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const errorRate = new Rate('errors')
const analyzeDuration = new Trend('analyze_duration_ms')

// Only log the first failure to avoid spamming the console
let firstFailureLogged = false

export const options = {
  vus: 2,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<3000'],       // fallback should be well under 3s
    errors: ['rate<0.02']
  }
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

// Synthetic test payloads — safe fictional scam messages.
// Never include real user data in load test fixtures.
// test_mode field is ignored by the server (header controls it), but
// documents intent clearly when reviewing test logs.
const TEST_PAYLOADS = [
  {
    input_text: "You're hired for a remote data entry role. We'll send a check for equipment. Deposit it and wire the difference back.",
    category_hint: 'job_scam_or_ghost_job'
  },
  {
    input_text: 'URGENT: Your Netflix account will be suspended. Click here to verify your payment info: http://netflix-verify-account.xyz',
    category_hint: 'scam_text'
  },
  {
    input_text: 'Congratulations! You have won a $500 gift card. Claim it now by providing your SSN and bank routing number.',
    category_hint: 'scam_text'
  },
  {
    input_text: 'Your package could not be delivered. Pay $3.50 customs fee to: http://usps-package-delivery.net',
    category_hint: 'scam_text'
  },
  {
    input_text: 'We are offering a work from home position: $45/hr, no experience needed. Just register here and pay a $50 training fee.',
    category_hint: 'job_scam_or_ghost_job'
  }
]

const FORBIDDEN_STRINGS = [
  'OPENAI_API_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'at Object.',     // raw stack trace
  'at async',       // raw async stack trace
]

export default function () {
  const payload = TEST_PAYLOADS[Math.floor(Math.random() * TEST_PAYLOADS.length)]

  const params = {
    headers: {
      'Content-Type': 'application/json',
      // Signal to the server that this is a test request.
      // The server only honours this in non-production environments.
      'X-CheckRay-Test-Mode': 'fallback'
    }
  }

  const res = http.post(
    `${BASE_URL}/api/analyze-case`,
    JSON.stringify(payload),
    params
  )

  analyzeDuration.add(res.timings.duration)

  const bodyStr = res.body ? res.body.toString() : ''

  let parsed = null
  try {
    parsed = JSON.parse(bodyStr)
  } catch (_) {
    // body is not JSON — will fail checks below
  }

  // The API always nests analysis fields under `report`.
  // Top-level fields: saved, save_reason, case_id, report_id, used_fallback, report, access
  const rpt = parsed && parsed.report ? parsed.report : null

  // For 402 usage_limit_reached: must have clean error structure
  const is402 = res.status === 402
  const is200 = res.status === 200

  const ok = check(res, {
    'analyze: status 200 or 402': r => r.status === 200 || r.status === 402,
    'analyze: not 500': r => r.status !== 500,
    'analyze: is JSON': () => parsed !== null,

    // 200 checks — fields are nested under report
    'analyze: report.risk_score present (200)': () =>
      !is200 || (rpt !== null && typeof rpt.risk_score !== 'undefined'),
    'analyze: report.risk_level present (200)': () =>
      !is200 || (rpt !== null && typeof rpt.risk_level !== 'undefined'),
    'analyze: report.disclaimer present (200)': () =>
      !is200 || (rpt !== null && typeof rpt.disclaimer !== 'undefined'),

    // 402 checks — clean usage gating response
    'analyze: 402 has error field': () =>
      !is402 || (parsed && typeof parsed.error !== 'undefined'),
    'analyze: 402 has message field': () =>
      !is402 || (parsed && typeof parsed.message !== 'undefined'),

    // Safety checks — both 200 and 402
    'analyze: no secret leakage': () =>
      !FORBIDDEN_STRINGS.some(s => bodyStr.includes(s)),
    'analyze: no raw stack trace': () =>
      !bodyStr.includes('at Object.') && !bodyStr.includes('at async handlePost')
  })

  // Log the first failure for easy debugging without spamming the console
  if (!ok && !firstFailureLogged) {
    firstFailureLogged = true
    console.log(`[first failure] status=${res.status} body=${bodyStr.substring(0, 500)}`)
  }

  errorRate.add(!ok)
  sleep(1)
}
