import type { ScamSource } from './types'

/**
 * Registry of upstream scam-intelligence sources CheckRay is allowed to fetch.
 *
 * Allow list only. We DO NOT scrape LinkedIn / Indeed / Glassdoor / ZipRecruiter
 * or any commercial job board. We DO NOT bypass paywalls, login walls, or
 * CAPTCHAs. RSS feeds are preferred over HTML where available.
 *
 * All four entries here are public alert pages whose entire purpose is to
 * warn the general public about scams or cybersecurity threats.
 */
export const SCAM_SOURCES: ScamSource[] = [
  {
    id: 'ftc_consumer_alerts',
    name: 'FTC Consumer Alerts',
    landing_url: 'https://consumer.ftc.gov/consumer-alerts',
    rss_url: 'https://consumer.ftc.gov/consumer-alerts/rss',
    source_type: 'rss',
    trust_level: 'high',
    enabled: true,
    notes:
      'Official US Federal Trade Commission consumer protection alerts. ' +
      'Treat as authoritative public alert, but still phrase downstream ' +
      'output as "reported scam pattern" rather than "confirmed fake".'
  },
  {
    id: 'fbi_ic3_psa',
    name: 'FBI IC3 Public Service Announcements',
    landing_url: 'https://www.ic3.gov/PSA',
    source_type: 'html',
    trust_level: 'high',
    enabled: true,
    notes:
      'FBI Internet Crime Complaint Center public service announcements. ' +
      'Plain HTML index page — parsed conservatively via lightweight regex.'
  },
  {
    id: 'cisa_advisories',
    name: 'CISA Cybersecurity Advisories',
    landing_url: 'https://www.cisa.gov/news-events/cybersecurity-advisories',
    rss_url: 'https://www.cisa.gov/cybersecurity-advisories.xml',
    source_type: 'rss',
    trust_level: 'high',
    enabled: true,
    notes:
      'US Cybersecurity & Infrastructure Security Agency advisories. ' +
      'Mostly cybersecurity-focused (ransomware, vulnerabilities) — useful ' +
      'context for phishing / impersonation campaigns.'
  },
  {
    id: 'bbb_scam_tracker',
    name: 'BBB Scam Tracker',
    landing_url: 'https://www.bbb.org/scamtracker',
    source_type: 'html',
    trust_level: 'medium',
    enabled: true,
    notes:
      'Better Business Bureau crowd-reported scam tracker. Medium trust — ' +
      'treat as trend signal only. Page is JS-heavy; expect 0 items via ' +
      'plain HTTP fetch. If 0, log warning and continue.'
  }
]

/**
 * Sources that are deliberately excluded from this allow list.
 *
 * Documented inline (not in code) so future contributors can see why:
 *   - LinkedIn, Indeed, Glassdoor, ZipRecruiter, monster.com, etc.:
 *     Commercial job boards. ToS does not permit research scraping and we
 *     have no business need to mirror their data.
 *   - Reddit / X / TikTok / Facebook: rate-limited, ToS-sensitive, and
 *     content is user-generated rather than a vetted public alert.
 *   - Anything behind a paywall, login wall, or CAPTCHA.
 */
export const EXCLUDED_SOURCES_NOTE =
  'Commercial job boards (LinkedIn/Indeed/Glassdoor/ZipRecruiter) and social ' +
  'platforms (Reddit/X/TikTok/Facebook) are intentionally excluded.'
