/**
 * tests/load/soak-public-routes.js
 *
 * Soak test — low VU count sustained over 10 minutes.
 * Detects memory leaks, connection pool exhaustion, and gradual degradation.
 *
 * ⚠️  LOCAL / PREVIEW ONLY. Do not run against production unless planned.
 *     Total duration: 10 minutes.
 *
 * Run:
 *   k6 run tests/load/soak-public-routes.js
 *   BASE_URL=https://preview.example.com k6 run tests/load/soak-public-routes.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const errorRate = new Rate('errors')
const p99Duration = new Trend('p99_duration_ms')

export const options = {
  stages: [
    { duration: '1m',  target: 5  },   // ramp up
    { duration: '8m',  target: 10 },   // sustained soak
    { duration: '1m',  target: 0  }    // ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000', 'p(99)<4000'],
    errors: ['rate<0.02']
  }
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

const SOAK_ROUTES = [
  '/',
  '/pricing',
  '/sign-in',
  '/sign-up',
  '/terms',
  '/privacy',
  '/ai-disclosure',
  '/contact'
]

const ERROR_STRINGS = [
  'Application error',
  'client-side exception',
  'server-side exception'
]

export default function () {
  const path = SOAK_ROUTES[Math.floor(Math.random() * SOAK_ROUTES.length)]
  const res = http.get(`${BASE_URL}${path}`)

  p99Duration.add(res.timings.duration)

  const bodyStr = res.body ? res.body.toString() : ''

  const ok = check(res, {
    'soak: not 500': r => r.status !== 500,
    'soak: status < 500': r => r.status < 500,
    'soak: no error strings': () =>
      !ERROR_STRINGS.some(s => bodyStr.includes(s))
  })

  errorRate.add(!ok)
  sleep(1)
}
