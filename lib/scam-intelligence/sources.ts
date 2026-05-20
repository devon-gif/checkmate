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

// ---------------------------------------------------------------------------
// International sources (planned — not yet enabled)
//
// These sources are documented here for Phase 2 global expansion.
// Set enabled: false until each feed is validated and legal review complete.
// Do NOT run new crawlers until approved.
// ---------------------------------------------------------------------------

/**
 * International scam-intelligence sources to evaluate for future ingestion.
 *
 * Coverage targets: UK, CA, AU, IE, EU
 *
 * DO NOT enable without:
 *   1. Confirming the feed/URL is still active
 *   2. Confirming the source permits automated access (robots.txt / ToS)
 *   3. Legal review for cross-border data ingestion
 *   4. Rate-limit and caching implementation to avoid hammering public sites
 */
export const PLANNED_INTERNATIONAL_SOURCES = [
  // ── United Kingdom ───────────────────────────────────────────────────────
  {
    id: 'ncsc_uk_advisories',
    name: 'NCSC UK Cyber Advisories',
    landing_url: 'https://www.ncsc.gov.uk/section/keep-up-to-date/ncsc-news',
    rss_url: 'https://www.ncsc.gov.uk/feeds/ncsc-news-and-blogs.xml',
    source_type: 'rss',
    trust_level: 'high',
    enabled: false,
    region: 'UK',
    notes:
      'UK National Cyber Security Centre advisories. High trust. RSS feed available. ' +
      'Validate feed URL and check robots.txt before enabling.'
  },
  {
    id: 'action_fraud_uk',
    name: 'Action Fraud UK Alerts',
    landing_url: 'https://www.actionfraud.police.uk/news',
    rss_url: null,
    source_type: 'html',
    trust_level: 'high',
    enabled: false,
    region: 'UK',
    notes:
      'UK national fraud reporting centre. HTML-only, no RSS. Lightweight parsing required. ' +
      'Validate ToS before enabling. Rate-limit aggressively.'
  },

  // ── Canada ───────────────────────────────────────────────────────────────
  {
    id: 'cafc_canada',
    name: 'Canadian Anti-Fraud Centre Alerts',
    landing_url: 'https://www.antifraudcentre-centreantifraude.ca/index-eng.htm',
    rss_url: null,
    source_type: 'html',
    trust_level: 'high',
    enabled: false,
    region: 'CA',
    notes:
      'RCMP-linked Canadian Anti-Fraud Centre. No RSS. Assess HTML structure before enabling. ' +
      'Bilingual (en/fr) — process English pages only in Phase 2.'
  },

  // ── Australia ─────────────────────────────────────────────────────────────
  {
    id: 'scamwatch_au',
    name: 'Scamwatch Australia Alerts',
    landing_url: 'https://www.scamwatch.gov.au/news-alerts',
    rss_url: null,
    source_type: 'html',
    trust_level: 'high',
    enabled: false,
    region: 'AU',
    notes:
      'ACCC Scamwatch — Australian government scam alert site. High trust. ' +
      'No RSS confirmed. Validate page structure before enabling.'
  },
  {
    id: 'acsc_au',
    name: 'Australian Cyber Security Centre Advisories',
    landing_url: 'https://www.cyber.gov.au/about-us/news',
    rss_url: 'https://www.cyber.gov.au/rss.xml',
    source_type: 'rss',
    trust_level: 'high',
    enabled: false,
    region: 'AU',
    notes:
      'Australian government cybersecurity advisory body. High trust. RSS may be available — validate URL before enabling.'
  },

  // ── EU / Europol ─────────────────────────────────────────────────────────
  {
    id: 'europol_press',
    name: 'Europol Press Releases',
    landing_url: 'https://www.europol.europa.eu/media-press/newsroom/news',
    rss_url: 'https://www.europol.europa.eu/rss.xml',
    source_type: 'rss',
    trust_level: 'high',
    enabled: false,
    region: 'EU',
    notes:
      'Europol cybercrime and fraud press releases. EU-wide scope. ' +
      'Validate RSS URL and confirm cybercrime-focused filtering before enabling.'
  },
] as const

