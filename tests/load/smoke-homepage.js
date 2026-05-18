/**
 * tests/load/smoke-homepage.js
 *
 * Minimal smoke test — 1 VU, 30 seconds, homepage only.
 * Fastest sanity check that the server is up and responding.
 *
 * Run:
 *   k6 run tests/load/smoke-homepage.js
 *   BASE_URL=https://preview.example.com k6 run tests/load/smoke-homepage.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],          // <1% errors
    http_req_duration: ['p(95)<2000'],       // p95 <2s locally
    errors: ['rate<0.01']
  }
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export default function () {
  const res = http.get(`${BASE_URL}/`)

  const ok = check(res, {
    'homepage: status 200': r => r.status === 200,
    'homepage: not 500': r => r.status !== 500,
    'homepage: no "Application error"': r =>
      !r.body.includes('Application error'),
    'homepage: no "client-side exception"': r =>
      !r.body.includes('client-side exception'),
    'homepage: no "server-side exception"': r =>
      !r.body.includes('server-side exception'),
    'homepage: has CheckRay content': r =>
      r.body.includes('CheckRay') || r.body.includes('CheckMate') || r.body.includes('Ray')
  })

  errorRate.add(!ok)
  sleep(1)
}
