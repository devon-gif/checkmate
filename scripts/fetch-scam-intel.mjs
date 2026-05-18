#!/usr/bin/env node
/**
 * CheckRay scam-intelligence fetcher.
 *
 * Pulls a small set of trusted public scam-alert sources, normalizes them
 * into ScamIntelItem objects, deduplicates, prints a terminal digest, and
 * writes JSON snapshots to data/scam-intel/.
 *
 * Hard rules:
 *   - No LinkedIn / Indeed / Glassdoor / ZipRecruiter or any commercial board.
 *   - No bypassing robots.txt, paywalls, login walls, CAPTCHAs, rate limits.
 *   - No Playwright / Puppeteer. No browser automation.
 *   - One sequential pass — never aggressive parallel fetching.
 *   - Intelligence-only output. Phrases like "reported scam pattern" / "public
 *     alert" / "risk signal" — never "confirmed fake" / "verified scam".
 *
 * Run with:
 *   npm run scam:intel
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'

const USER_AGENT =
  'CheckRay MVP research crawler - contact: support@checkray.app'

/**
 * Source registry. Each source supports either RSS, HTML extraction, or both
 * (RSS preferred, HTML fallback). `html_link_pattern` is a regex applied to
 * anchor hrefs to find item links on the landing page.
 */
const SOURCES = [
  {
    id: 'ftc_consumer_alerts',
    name: 'FTC Consumer Alerts',
    landing_url: 'https://consumer.ftc.gov/consumer-alerts',
    // Several FTC RSS paths are tried in order — the public path moves around.
    rss_candidates: [
      'https://consumer.ftc.gov/consumer-alerts/feed',
      'https://consumer.ftc.gov/consumer-alerts/rss',
      'https://consumer.ftc.gov/feed/consumer-alerts'
    ],
    html_link_pattern: /\/consumer-alerts\/\d{4}\/\d{2}\/[a-z0-9-]+/,
    html_origin: 'https://consumer.ftc.gov',
    source_type: 'mixed',
    trust_level: 'high',
    enabled: true
  },
  {
    id: 'fbi_ic3_psa',
    name: 'FBI IC3 Public Service Announcements',
    landing_url: 'https://www.ic3.gov/PSA',
    source_type: 'html',
    trust_level: 'high',
    enabled: true
  },
  {
    id: 'cisa_advisories',
    name: 'CISA Cybersecurity Advisories',
    landing_url: 'https://www.cisa.gov/news-events/cybersecurity-advisories',
    rss_candidates: [
      'https://www.cisa.gov/cybersecurity-advisories.xml',
      'https://www.cisa.gov/news-events/cybersecurity-advisories.xml',
      'https://www.cisa.gov/news.xml',
      'https://www.cisa.gov/uscert/ncas/current-activity.xml'
    ],
    html_link_pattern: /\/news-events\/cybersecurity-advisories\/[a-z0-9-]+/,
    html_origin: 'https://www.cisa.gov',
    source_type: 'mixed',
    trust_level: 'high',
    enabled: true
  },
  {
    id: 'bbb_scam_tracker',
    name: 'BBB Scam Tracker',
    landing_url: 'https://www.bbb.org/scamtracker',
    source_type: 'html',
    trust_level: 'medium',
    enabled: true,
    // Generic BBB nav links we never want as "intelligence items".
    bbb_nav_deny: [
      'report a scam',
      'look up a scam',
      'open the heatmap',
      'dashboard',
      'submit a report',
      'submit your report',
      'about scam tracker',
      'login',
      'sign in',
      'home',
      'menu'
    ]
  }
]

/* ─── HTTP ────────────────────────────────────────────────────────────────── */

async function fetchText(url, timeoutMs = 15000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept:
          'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.5',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`)
    }
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

/* ─── RSS / Atom parsing ──────────────────────────────────────────────────── */

function pickTag(block, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m = block.match(re)
  if (!m) return undefined
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
}

function pickAtomLink(block) {
  const m = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i)
  return m ? m[1] : undefined
}

function decodeXml(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function parseRss(xml) {
  const out = []
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi
  let m
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1]
    const title = pickTag(block, 'title')
    const link = pickTag(block, 'link') || pickAtomLink(block)
    if (!title || !link) continue
    out.push({
      title: decodeXml(title),
      link: link.trim(),
      description:
        pickTag(block, 'description') || pickTag(block, 'content:encoded'),
      pubDate: pickTag(block, 'pubDate') || pickTag(block, 'dc:date')
    })
  }
  if (out.length === 0) {
    const entryRegex = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi
    while ((m = entryRegex.exec(xml)) !== null) {
      const block = m[1]
      const title = pickTag(block, 'title')
      const link = pickAtomLink(block)
      if (!title || !link) continue
      out.push({
        title: decodeXml(title),
        link: link.trim(),
        description: pickTag(block, 'summary') || pickTag(block, 'content'),
        pubDate: pickTag(block, 'updated') || pickTag(block, 'published')
      })
    }
  }
  return out
}

/* ─── Categorize + risk signals ───────────────────────────────────────────── */

const CATEGORY_RULES = [
  { category: 'ghost_jobs', keywords: ['ghost job', 'ghost hiring', 'fake job posting', 'never filled', 'phantom job'] },
  { category: 'job_scams', keywords: ['job scam', 'employment scam', 'recruiter scam', 'work-from-home scam', 'work from home scam', 'job offer scam', 'hiring scam', 'fake employer', 'fake recruiter', 'reshipping', 'reshipper'] },
  { category: 'delivery_toll_texts', keywords: ['toll', 'unpaid toll', 'e-zpass', 'sunpass', 'fastrak', 'usps', 'package delivery', 'delivery notice', 'final notice', 'registration suspended', 'smishing'] },
  { category: 'phishing_links', keywords: ['phishing', 'lookalike', 'fake login', 'fake site', 'verification code', 'one-time code', 'password reset', 'mfa fatigue', 'qr code scam', 'quishing'] },
  { category: 'imposter_scams', keywords: ['imposter', 'impersonation', 'tech support scam', 'irs scam', 'social security scam', 'government imposter', 'police imposter', 'family emergency scam', 'grandparent scam', 'utility scam', 'amazon imposter', 'bank imposter'] },
  { category: 'bill_or_fee_scams', keywords: ['unexpected charge', 'refund scam', 'fake invoice', 'overpayment', 'fake bill', 'subscription scam'] },
  { category: 'rental_marketplace', keywords: ['rental scam', 'apartment scam', 'marketplace scam', 'craigslist', 'fake listing', 'security deposit scam'] },
  { category: 'investment_crypto', keywords: ['investment scam', 'crypto scam', 'cryptocurrency', 'pig butchering', 'pig-butchering', 'fake trading', 'romance investment', 'rug pull'] },
  { category: 'romance_social', keywords: ['romance scam', 'dating scam', 'sextortion', 'catfish', 'online relationship scam'] },
  { category: 'small_business_invoice', keywords: ['small business scam', 'vendor impersonation', 'business email compromise', 'bec ', 'ceo fraud', 'invoice fraud'] },
  { category: 'cybersecurity', keywords: ['ransomware', 'vulnerability', 'cve-', 'exploit', 'malware', 'zero-day', 'advisory', 'threat actor', 'apt'] }
]

const RISK_SIGNAL_PATTERNS = [
  { label: 'job / hiring language', keywords: ['job', 'remote job', 'recruiter', 'hiring', 'employment', 'work from home', 'work-from-home'] },
  { label: 'equipment / deposit ask', keywords: ['equipment', 'deposit', 'starter kit'] },
  { label: 'money-movement ask', keywords: ['wire transfer', 'gift card', 'zelle', 'cash app', 'venmo', 'cryptocurrency', 'crypto', 'bitcoin'] },
  { label: 'check overpayment', keywords: ['check', 'cashier\u2019s check', 'cashiers check', 'overpayment'] },
  { label: 'delivery / toll smishing', keywords: ['toll', 'unpaid toll', 'usps', 'delivery', 'package', 'final notice', 'registration suspended'] },
  { label: 'unexpected bill / fee', keywords: ['invoice', 'bill', 'fee', 'refund', 'unexpected charge'] },
  { label: 'impersonation', keywords: ['impersonation', 'imposter', 'irs', 'social security', 'police', 'bank', 'government', 'tech support'] },
  { label: 'phishing / credential ask', keywords: ['phishing', 'verification code', 'one-time code', 'password', 'login', 'mfa', 'otp'] },
  { label: 'rental / marketplace', keywords: ['rent', 'rental', 'apartment', 'marketplace', 'listing'] },
  { label: 'cybersecurity advisory', keywords: ['ransomware', 'cve-', 'vulnerability', 'malware', 'exploit', 'advisory'] }
]

function categorize(title, summary) {
  const blob = `${(title || '').toLowerCase()} ${(summary || '').toLowerCase()}`
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => blob.includes(kw))) return rule.category
  }
  return 'other'
}

function extractRiskSignals(title, summary) {
  const blob = `${(title || '').toLowerCase()} ${(summary || '').toLowerCase()}`
  const out = []
  for (const sig of RISK_SIGNAL_PATTERNS) {
    if (sig.keywords.some(kw => blob.includes(kw))) out.push(sig.label)
  }
  return out
}

/* ─── Normalize ───────────────────────────────────────────────────────────── */

function stripWhitespace(s) {
  return s.replace(/\s+/g, ' ').trim()
}

function stripHtml(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function toIsoDate(input) {
  if (!input) return undefined
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

function toScamIntelItem(source, raw, fetchedAt) {
  const title = stripWhitespace(raw.title)
  const summary = raw.summary ? stripHtml(raw.summary) : undefined
  return {
    title,
    url: raw.url,
    source_id: source.id,
    source_name: source.name,
    source_type: source.source_type,
    trust_level: source.trust_level,
    category: categorize(title, summary),
    summary: summary && summary.length > 400 ? summary.slice(0, 400) + '…' : summary,
    published_at: raw.published_at,
    fetched_at: fetchedAt,
    risk_signals: extractRiskSignals(title, summary)
  }
}

function dedupeItems(items) {
  const seenUrls = new Set()
  const seenTitles = new Set()
  const out = []
  for (const item of items) {
    const urlKey = (item.url || '').trim().toLowerCase()
    const titleKey = (item.title || '').trim().toLowerCase()
    if (urlKey && seenUrls.has(urlKey)) continue
    if (titleKey && seenTitles.has(titleKey)) continue
    if (urlKey) seenUrls.add(urlKey)
    if (titleKey) seenTitles.add(titleKey)
    out.push(item)
  }
  return out
}

/* ─── Per-source fetchers ─────────────────────────────────────────────────── */

/**
 * Try each RSS candidate URL in order. Returns the parsed entries on first
 * success, or a warning string after all attempts fail.
 */
async function tryRssCandidates(candidates) {
  const errs = []
  for (const url of candidates) {
    try {
      const xml = await fetchText(url)
      const entries = parseRss(xml)
      if (entries.length > 0) return { entries, used_url: url }
      errs.push(`${url} returned 0 items`)
    } catch (err) {
      errs.push(`${url}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return { entries: [], errors: errs }
}

/**
 * Generic landing-page HTML fallback. Extracts anchors whose href matches
 * `html_link_pattern`, normalizes them against `html_origin`, and surfaces
 * the anchor text as the item title.
 */
async function fetchHtmlLinks(source) {
  if (!source.html_link_pattern || !source.html_origin) {
    return { items: [], warning: 'No html_link_pattern configured.' }
  }
  try {
    const html = await fetchText(source.landing_url)
    const fetchedAt = new Date().toISOString()
    const items = []
    const seen = new Set()
    const linkRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
    let m
    while ((m = linkRegex.exec(html)) !== null) {
      const href = m[1]
      const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      if (!source.html_link_pattern.test(href)) continue
      if (!text || text.length < 12) continue
      let url
      try {
        url = new URL(href, source.html_origin).toString()
      } catch {
        continue
      }
      if (seen.has(url)) continue
      seen.add(url)
      items.push(toScamIntelItem(source, { title: text, url }, fetchedAt))
      if (items.length >= 40) break
    }
    return { items }
  } catch (err) {
    return {
      items: [],
      warning: `HTML fallback failed: ${err instanceof Error ? err.message : String(err)}`
    }
  }
}

async function fetchRssSource(source) {
  const candidates = source.rss_candidates || (source.rss_url ? [source.rss_url] : [])
  if (candidates.length === 0) {
    return { source_id: source.id, ok: false, items: [], warning: 'No RSS candidates configured.' }
  }
  const result = await tryRssCandidates(candidates)
  if (result.entries.length > 0) {
    const fetchedAt = new Date().toISOString()
    const items = result.entries.map(e =>
      toScamIntelItem(
        source,
        {
          title: e.title,
          url: e.link,
          summary: e.description,
          published_at: toIsoDate(e.pubDate)
        },
        fetchedAt
      )
    )
    return { source_id: source.id, ok: true, items }
  }
  // All RSS candidates failed — fall back to HTML extraction if configured.
  const rssWarning = `RSS candidates exhausted: ${(result.errors || []).join(' | ')}`
  if (source.html_link_pattern) {
    const html = await fetchHtmlLinks(source)
    if (html.items.length > 0) {
      return {
        source_id: source.id,
        ok: true,
        items: html.items,
        warning: `${rssWarning} — used HTML fallback (${html.items.length} item(s)).`
      }
    }
    return {
      source_id: source.id,
      ok: false,
      items: [],
      warning: html.warning ? `${rssWarning}; HTML fallback: ${html.warning}` : rssWarning
    }
  }
  return { source_id: source.id, ok: false, items: [], warning: rssWarning }
}

function extractIc3Date(href) {
  const m = href.match(/PSA\/(\d{4})\/PSA(\d{2})(\d{2})(\d{2})/i)
  if (!m) return undefined
  return `${m[1]}-${m[3]}-${m[4]}T00:00:00Z`
}

async function fetchIc3Psa(source) {
  try {
    const html = await fetchText(source.landing_url)
    const fetchedAt = new Date().toISOString()
    const linkRegex =
      /<a\b[^>]*href=["'](\/PSA\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
    const items = []
    const seen = new Set()
    let m
    while ((m = linkRegex.exec(html)) !== null) {
      const href = m[1]
      const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      if (!text || text.length < 10) continue
      const url = `https://www.ic3.gov${href}`
      if (seen.has(url)) continue
      seen.add(url)
      items.push(
        toScamIntelItem(
          source,
          { title: text, url, published_at: extractIc3Date(href) },
          fetchedAt
        )
      )
      if (items.length >= 50) break
    }
    return { source_id: source.id, ok: true, items }
  } catch (err) {
    return {
      source_id: source.id,
      ok: false,
      items: [],
      warning: `IC3 HTML fetch failed: ${err instanceof Error ? err.message : String(err)}`
    }
  }
}

async function fetchBbbScamTracker(source) {
  const deny = (source.bbb_nav_deny || []).map(s => s.toLowerCase())
  try {
    const html = await fetchText(source.landing_url)
    const fetchedAt = new Date().toISOString()
    const items = []
    const seen = new Set()
    const linkRegex =
      /<a\b[^>]*href=["']([^"']*scamtracker[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
    let m
    while ((m = linkRegex.exec(html)) !== null) {
      const href = m[1]
      const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      if (!text || text.length < 18) continue
      if (deny.includes(text.toLowerCase())) continue
      // BBB nav links are typically short and lower-case; require at least
      // one space to filter out single-word menu items.
      if (!text.includes(' ')) continue
      const url = href.startsWith('http') ? href : `https://www.bbb.org${href}`
      if (seen.has(url)) continue
      seen.add(url)
      items.push(toScamIntelItem(source, { title: text, url }, fetchedAt))
      if (items.length >= 30) break
    }
    if (items.length === 0) {
      return {
        source_id: source.id,
        ok: true,
        items: [],
        warning:
          'BBB Scam Tracker page is client-rendered — 0 intelligence items parsed from plain HTTP fetch (nav links filtered). Treat as expected.'
      }
    }
    return { source_id: source.id, ok: true, items }
  } catch (err) {
    return {
      source_id: source.id,
      ok: false,
      items: [],
      warning: `BBB HTML fetch failed: ${err instanceof Error ? err.message : String(err)}`
    }
  }
}

async function dispatchFetcher(src) {
  if (src.id === 'fbi_ic3_psa') return fetchIc3Psa(src)
  if (src.id === 'bbb_scam_tracker') return fetchBbbScamTracker(src)
  if (src.rss_candidates || src.rss_url) return fetchRssSource(src)
  return {
    source_id: src.id,
    ok: false,
    items: [],
    warning: 'No fetcher registered for this source.'
  }
}

/* ─── Digest + output ─────────────────────────────────────────────────────── */

function formatItemLine(item) {
  const signals = item.risk_signals.length ? ` [${item.risk_signals.join(', ')}]` : ''
  return [
    `• ${item.source_name} | ${item.category} | trust=${item.trust_level}`,
    `    ${item.title}`,
    `    ${item.url}${signals}`
  ].join('\n')
}

function printDigest(results, allItems) {
  console.log('── CheckRay scam-intelligence fetch ──\n')
  for (const r of results) {
    const flag = r.ok ? 'ok' : 'FAIL'
    console.log(`[${flag}] ${r.source_id} — ${r.items.length} item(s)`)
    if (r.warning) console.log(`      warning: ${r.warning}`)
  }
  console.log('')
  for (const item of allItems) {
    console.log(formatItemLine(item))
  }
  console.log('')
  console.log(`Total normalized items after dedupe: ${allItems.length}`)
  console.log(
    'Reminder: internal intelligence feed only. No claims that any specific\n' +
      'message is confirmed fake. Phrase downstream output as\n' +
      '"reported scam pattern" / "public alert" / "risk signal".'
  )
}

async function writeJson(outDir, items) {
  await fs.mkdir(outDir, { recursive: true })
  const today = new Date().toISOString().slice(0, 10)
  const payload = JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      item_count: items.length,
      items
    },
    null,
    2
  )
  const latestPath = path.join(outDir, 'latest.json')
  const datedPath = path.join(outDir, `${today}.json`)
  await fs.writeFile(latestPath, payload, 'utf8')
  await fs.writeFile(datedPath, payload, 'utf8')
  return { latestPath, datedPath }
}

/* ─── Main ────────────────────────────────────────────────────────────────── */

async function main() {
  const enabled = SOURCES.filter(s => s.enabled)
  const results = []
  for (const src of enabled) {
    const r = await dispatchFetcher(src)
    results.push(r)
  }

  const allItems = dedupeItems(results.flatMap(r => r.items))

  printDigest(results, allItems)

  try {
    const outDir = path.resolve(process.cwd(), 'data', 'scam-intel')
    const { latestPath, datedPath } = await writeJson(outDir, allItems)
    console.log('')
    console.log(`JSON saved to:\n  ${latestPath}\n  ${datedPath}`)
  } catch (err) {
    console.warn(
      `Warning: could not write JSON output — ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

main().catch(err => {
  console.error('Unhandled error:', err)
  process.exitCode = 1
})
