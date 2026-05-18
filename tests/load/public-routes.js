/**
 * tests/load/public-routes.js
 *
 * Load test for all public marketing and legal routes.
 * Checks status, response time, and absence of error strings.
 *
 * Default: 5 VUs for 60 seconds. Safe to run locally.
 *
 * Run:
 *   k6 run tests/load/public-routes.js
 *   BASE_URL=https://preview.example.com k6 run tests/load/public-routes.js
 */

import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const errorRate = new Rate('errors')
const homepageDuration = new Trend('homepage_duration')

export const options = {
  vus: 5,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],          // <1% HTTP failures
    http_req_duration: ['p(95)<1500'],       // p95 <1.5s locally
    errors: ['rate<0.02']                    // <2% check failures
  }
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

// Routes with their expected status codes.
// All public pages return 200. Redirects from middleware return 307/302.
const ROUTES = [
  { path: '/',              expectedStatus: [200] },
  { path: '/pricing',       expectedStatus: [200] },
  { path: '/sign-in',       expectedStatus: [200] },
  { path: '/sign-up',       expectedStatus: [200] },
  { path: '/terms',         expectedStatus: [200] },
  { path: '/privacy',       expectedStatus: [200] },
  { path: '/disclaimer',    expectedStatus: [200] },
  { path: '/ai-disclosure', expectedStatus: [200] },
  { path: '/acceptable-use',expectedStatus: [200] },
  { path: '/contact',       expectedStatus: [200] }
]

const ERROR_STRINGS = [
  'Application error',
  'client-side exception',
  'server-side exception',
  'Unhandled Runtime Error',
  'Internal Server Error'
]

export default function () {
  for (const route of ROUTES) {
    group(route.path, () => {
      const res = http.get(`${BASE_URL}${route.path}`)

      if (route.path === '/') {
        homepageDuration.add(res.timings.duration)
      }

      const bodyStr = res.body ? res.body.toString() : ''

      const ok = check(res, {
        [`${route.path}: expected status`]: r =>
          route.expectedStatus.includes(r.status),
        [`${route.path}: not 500`]: r => r.status !== 500,
        [`${route.path}: no error strings`]: () =>
          !ERROR_STRINGS.some(s => bodyStr.includes(s))
      })

      errorRate.add(!ok)
    })

    sleep(0.3)
  }

  sleep(1)
}
