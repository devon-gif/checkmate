import type { FetchResult, ScamIntelItem, ScamSource } from './types'
import { toScamIntelItem, type RawEntry } from './normalize'

/**
 * Conservative HTTP fetcher with timeout + clear User-Agent. Used by all
 * source-specific fetchers below. We intentionally do not retry aggressively.
 */
export const USER_AGENT =
  'CheckRay MVP research crawler - contact: support@checkray.app'

export async function fetchText(url: string, timeoutMs = 15000): Promise<string> {
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

/* ────────────────────────────────────────────────────────────────────────── *
 * Lightweight RSS/Atom parsing — regex-only, no xml2js dependency.
 * Handles <item> (RSS 2.0) and <entry> (Atom 1.0).
 * ────────────────────────────────────────────────────────────────────────── */

interface RssEntry {
  title: string
  link: string
  description?: string
  pubDate?: string
}

export function parseRss(xml: string): RssEntry[] {
  const out: RssEntry[] = []

  // RSS 2.0 <item>...</item>
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1]
    const title = pickTag(block, 'title')
    const link = pickTag(block, 'link') || pickAtomLink(block)
    if (!title || !link) continue
    out.push({
      title: decodeXml(title),
      link: link.trim(),
      description: pickTag(block, 'description') || pickTag(block, 'content:encoded'),
      pubDate: pickTag(block, 'pubDate') || pickTag(block, 'dc:date')
    })
  }

  // Atom <entry>...</entry>
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

function pickTag(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m = block.match(re)
  if (!m) return undefined
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .trim()
}

function pickAtomLink(block: string): string | undefined {
  // Atom uses <link href="..." rel="alternate" />
  const m = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i)
  return m ? m[1] : undefined
}

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Per-source fetchers. Each is wrapped in the orchestrator's try/catch so a
 * single source failure never aborts the run.
 * ────────────────────────────────────────────────────────────────────────── */

const FETCHED_AT = () => new Date().toISOString()

/** Generic RSS fetcher used by FTC + CISA. */
export async function fetchRssSource(source: ScamSource): Promise<FetchResult> {
  if (!source.rss_url) {
    return { source_id: source.id, ok: false, items: [], warning: 'No rss_url configured.' }
  }
  try {
    const xml = await fetchText(source.rss_url)
    const entries = parseRss(xml)
    const fetchedAt = FETCHED_AT()
    const items: ScamIntelItem[] = entries.map(e => {
      const raw: RawEntry = {
        title: e.title,
        url: e.link,
        summary: e.description,
        published_at: e.pubDate ? toIsoDate(e.pubDate) : undefined
      }
      return toScamIntelItem(source, raw, fetchedAt)
    })
    return { source_id: source.id, ok: true, items }
  } catch (err) {
    return {
      source_id: source.id,
      ok: false,
      items: [],
      warning: `RSS fetch failed: ${errorMessage(err)}`
    }
  }
}

/**
 * FBI IC3 PSA HTML fetcher.
 * The index page links to /PSA/YYYY/PSAYYMMDD-style URLs. We extract those
 * anchor tags conservatively with a single regex.
 */
export async function fetchIc3Psa(source: ScamSource): Promise<FetchResult> {
  try {
    const html = await fetchText(source.landing_url)
    const fetchedAt = FETCHED_AT()
    const linkRegex =
      /<a\b[^>]*href=["'](\/PSA\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
    const items: ScamIntelItem[] = []
    const seen = new Set<string>()
    let m: RegExpExecArray | null
    while ((m = linkRegex.exec(html)) !== null) {
      const href = m[1]
      const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      if (!text || text.length < 10) continue
      const url = `https://www.ic3.gov${href}`
      if (seen.has(url)) continue
      seen.add(url)
      const raw: RawEntry = {
        title: text,
        url,
        summary: undefined,
        published_at: extractIc3Date(href)
      }
      items.push(toScamIntelItem(source, raw, fetchedAt))
      if (items.length >= 50) break
    }
    return { source_id: source.id, ok: true, items }
  } catch (err) {
    return {
      source_id: source.id,
      ok: false,
      items: [],
      warning: `IC3 HTML fetch failed: ${errorMessage(err)}`
    }
  }
}

/**
 * BBB Scam Tracker HTML fetcher. Page is JS-heavy so we expect 0 items most
 * of the time; we still attempt a polite single fetch and surface a clear
 * warning instead of failing the whole run.
 */
export async function fetchBbbScamTracker(source: ScamSource): Promise<FetchResult> {
  try {
    const html = await fetchText(source.landing_url)
    const fetchedAt = FETCHED_AT()
    // Look for any anchors that link to /scamtracker/report/* — most BBB pages
    // don't render these server-side, so this often returns nothing.
    const items: ScamIntelItem[] = []
    const seen = new Set<string>()
    const linkRegex =
      /<a\b[^>]*href=["']([^"']*scamtracker[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
    let m: RegExpExecArray | null
    while ((m = linkRegex.exec(html)) !== null) {
      const href = m[1]
      const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      if (!text || text.length < 10) continue
      const url = href.startsWith('http') ? href : `https://www.bbb.org${href}`
      if (seen.has(url)) continue
      seen.add(url)
      items.push(
        toScamIntelItem(source, { title: text, url }, fetchedAt)
      )
      if (items.length >= 30) break
    }
    if (items.length === 0) {
      return {
        source_id: source.id,
        ok: true,
        items: [],
        warning:
          'BBB Scam Tracker page is client-rendered — 0 items parsed from ' +
          'plain HTTP fetch. Treat as expected; do not retry aggressively.'
      }
    }
    return { source_id: source.id, ok: true, items }
  } catch (err) {
    return {
      source_id: source.id,
      ok: false,
      items: [],
      warning: `BBB HTML fetch failed: ${errorMessage(err)}`
    }
  }
}

/**
 * Orchestrate one fetch per enabled source. Sources run sequentially so we
 * never hammer any single host; per spec, no aggressive parallelism.
 */
export async function fetchAll(sources: ScamSource[]): Promise<FetchResult[]> {
  const results: FetchResult[] = []
  for (const src of sources) {
    if (!src.enabled) continue
    const result = await dispatchFetcher(src)
    results.push(result)
  }
  return results
}

async function dispatchFetcher(src: ScamSource): Promise<FetchResult> {
  if (src.id === 'fbi_ic3_psa') return fetchIc3Psa(src)
  if (src.id === 'bbb_scam_tracker') return fetchBbbScamTracker(src)
  if (src.rss_url) return fetchRssSource(src)
  return {
    source_id: src.id,
    ok: false,
    items: [],
    warning: 'No fetcher registered for this source.'
  }
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Helpers
 * ────────────────────────────────────────────────────────────────────────── */

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

function toIsoDate(input: string): string | undefined {
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

/** Pull YYYY-MM-DD out of /PSA/2025/PSA250131 style hrefs, best-effort. */
function extractIc3Date(href: string): string | undefined {
  const m = href.match(/PSA\/(\d{4})\/PSA(\d{2})(\d{2})(\d{2})/i)
  if (!m) return undefined
  const year = m[1]
  const month = m[3]
  const day = m[4]
  return `${year}-${month}-${day}T00:00:00Z`
}
