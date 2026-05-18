/**
 * tests/load/spike-public-routes.js
 *
 * Spike test — ramps from 1 to 50 VUs quickly, holds briefly, ramps down.
 * Tests whether the server handles sudden traffic bursts on public routes.
 *
 * ⚠️  LOCAL / PREVIEW ONLY. Do not run against production unless planned.
 *     Total duration: ~2.5 minutes.
 *
 * Run:
 *   k6 run tests/load/spike-public-routes.js
 *   BASE_URL=https://preview.example.com k6 run tests/load/spike-public-routes.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  stages: [
    { duration: '30s', target: 1  },   // baseline
    { duration: '20s', target: 50 },   // spike up
    { duration: '30s', target: 50 },   // hold
    { duration: '30s', target: 5  },   // ramp down
    { duration: '30s', target: 0  }    // cool down
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],     // allow up to 5% during spike
    http_req_duration: ['p(95)<3000'],  // p95 <3s during spike
    errors: ['rate<0.05']
  }
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

const SPIKE_ROUTES = ['/', '/pricing', '/sign-in', '/sign-up', '/terms']

const ERROR_STRINGS = [
  'Application error',
  'client-side exception',
  'server-side exception'
]

export default function () {
  const path = SPIKE_ROUTES[Math.floor(Math.random() * SPIKE_ROUTES.length)]
  const res = http.get(`${BASE_URL}${path}`)

  const bodyStr = res.body ? res.body.toString() : ''

  const ok = check(res, {
    'spike: not 500': r => r.status !== 500,
    'spike: status < 500': r => r.status < 500,
    'spike: no error strings': () =>
      !ERROR_STRINGS.some(s => bodyStr.includes(s))
  })

  errorRate.add(!ok)
  sleep(0.5)
}
