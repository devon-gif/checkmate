/**
 * Shared type definitions for CheckRay's internal scam-intelligence feed.
 *
 * IMPORTANT: This module is intelligence-only. Nothing here is allowed to
 * auto-update the analyzer scoring or claim that a specific message is
 * confirmed fake. Use cautious phrasing in any downstream surface.
 */

/** Categories used to bucket normalized intelligence items. */
export type ScamCategory =
  | 'ghost_jobs'
  | 'job_scams'
  | 'phishing_links'
  | 'imposter_scams'
  | 'bill_or_fee_scams'
  | 'rental_marketplace'
  | 'delivery_toll_texts'
  | 'investment_crypto'
  | 'romance_social'
  | 'small_business_invoice'
  | 'cybersecurity'
  | 'other'

/** Trust tiering for an upstream source. */
export type TrustLevel = 'high' | 'medium' | 'low'

/** How the upstream source delivers its content. */
export type SourceType = 'rss' | 'html' | 'mixed'

/** Definition of a single upstream intelligence source. */
export interface ScamSource {
  /** Stable machine identifier, e.g. "ftc_consumer_alerts". */
  id: string
  /** Human-readable name, e.g. "FTC Consumer Alerts". */
  name: string
  /** Canonical landing page (used as a citation link). */
  landing_url: string
  /** RSS feed URL, when one exists. Preferred over HTML parsing. */
  rss_url?: string
  /** Source delivery mechanism. */
  source_type: SourceType
  /** Trust tiering — official US-gov alerts are 'high', BBB Scam Tracker is 'medium'. */
  trust_level: TrustLevel
  /** Whether the source is enabled in the current fetch run. */
  enabled: boolean
  /** Optional notes for human reviewers. */
  notes?: string
}

/** A single normalized intelligence item. */
export interface ScamIntelItem {
  title: string
  url: string
  source_id: string
  source_name: string
  source_type: SourceType
  trust_level: TrustLevel
  category: ScamCategory
  summary?: string
  /** ISO8601 date string if the upstream source provided one. */
  published_at?: string
  /** ISO8601 timestamp when CheckRay fetched the item. */
  fetched_at: string
  /** Keyword/pattern matches detected in title + summary. Cautious labels only. */
  risk_signals: string[]
}

/** Result wrapper returned by a fetcher so the orchestrator can keep going on failure. */
export interface FetchResult {
  source_id: string
  ok: boolean
  items: ScamIntelItem[]
  /** Human-readable warning (not thrown) if something went wrong. */
  warning?: string
}
