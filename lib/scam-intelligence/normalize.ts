import type { ScamIntelItem, ScamSource } from './types'
import { categorize, extractRiskSignals } from './categorize'

/**
 * Convert a raw parsed entry from a fetcher into a fully-normalized
 * ScamIntelItem. The fetcher is responsible for pulling title/url/published_at
 * out of the upstream payload; this function fills in the rest.
 */
export interface RawEntry {
  title: string
  url: string
  summary?: string
  published_at?: string
}

export function toScamIntelItem(source: ScamSource, raw: RawEntry, fetchedAt: string): ScamIntelItem {
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
    summary,
    published_at: raw.published_at,
    fetched_at: fetchedAt,
    risk_signals: extractRiskSignals(title, summary)
  }
}

/**
 * Deduplicate items by URL first, then by lower-cased title. Stable order
 * (the first occurrence wins).
 */
export function dedupeItems(items: ScamIntelItem[]): ScamIntelItem[] {
  const seenUrls = new Set<string>()
  const seenTitles = new Set<string>()
  const out: ScamIntelItem[] = []
  for (const item of items) {
    const urlKey = item.url.trim().toLowerCase()
    const titleKey = item.title.trim().toLowerCase()
    if (urlKey && seenUrls.has(urlKey)) continue
    if (titleKey && seenTitles.has(titleKey)) continue
    if (urlKey) seenUrls.add(urlKey)
    if (titleKey) seenTitles.add(titleKey)
    out.push(item)
  }
  return out
}

function stripWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

function stripHtml(s: string): string {
  // Minimal HTML tag + CDATA stripper for short snippet/summary text.
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
