/**
 * lib/risk-colors.ts
 *
 * Single source of truth for severity color tokens used across the CheckRay UI
 * and email templates. Normalizes all risk level variants into a canonical set
 * before mapping to color values.
 *
 * Design tokens:
 *   needs_more_info — slate/gray  (#94a3b8)
 *   low             — mint/green  (#84f0dd  ≈ CheckRay cm-green)
 *   medium          — amber       (#facc15)
 *   high            — orange      (#fb923c)
 *   critical        — red         (#ef4444)
 *
 * Usage (Tailwind JSX):
 *   import { riskTw } from '@/lib/risk-colors'
 *   <span className={riskTw('very_high').text}>Critical risk</span>
 *
 * Usage (inline CSS / email templates):
 *   import { riskHex } from '@/lib/risk-colors'
 *   const color = riskHex('very_high')  // "#ef4444"
 */

// ── Canonical tiers ──────────────────────────────────────────────────────────

export type RiskTier =
  | 'needs_more_info'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'unknown'

/** Normalise any risk_level string (DB, analyzer output, etc.) to a RiskTier. */
export function toRiskTier(level: string | null | undefined): RiskTier {
  switch ((level ?? '').toLowerCase()) {
    case 'very_high':
    case 'critical':
      return 'critical'
    case 'high':
      return 'high'
    case 'medium':
    case 'moderate':
      return 'medium'
    case 'low':
      return 'low'
    case 'needs_more_info':
    case 'needs more info':
    case 'more_info':
      return 'needs_more_info'
    default:
      return 'unknown'
  }
}

// ── Human-readable labels ─────────────────────────────────────────────────────

export function riskLabel(level: string | null | undefined): string {
  switch (toRiskTier(level)) {
    case 'critical':
      return 'Critical risk'
    case 'high':
      return 'High risk'
    case 'medium':
      return 'Medium risk'
    case 'low':
      return 'Low risk'
    case 'needs_more_info':
      return 'Needs more info'
    case 'unknown':
      return 'Unknown'
  }
}

// ── Hex color values (for email / inline styles) ─────────────────────────────

interface HexTokens {
  /** Primary accent color. */
  accent: string
  /** Muted/background tint (rgba string). */
  bg: string
  /** Text color for dark backgrounds. */
  text: string
}

const HEX_MAP: Record<RiskTier, HexTokens> = {
  critical: {
    accent: '#ef4444',
    bg: 'rgba(239,68,68,0.14)',
    text: '#ff7070'
  },
  high: {
    accent: '#fb923c',
    bg: 'rgba(251,146,60,0.12)',
    text: '#fba371'
  },
  medium: {
    accent: '#facc15',
    bg: 'rgba(250,204,21,0.12)',
    text: '#fcd34d'
  },
  low: {
    accent: '#7ae2cf',
    bg: 'rgba(122,226,207,0.10)',
    text: '#7ae2cf'
  },
  needs_more_info: {
    accent: '#94a3b8',
    bg: 'rgba(148,163,184,0.10)',
    text: '#94a3b8'
  },
  unknown: {
    accent: '#94a3b8',
    bg: 'rgba(148,163,184,0.10)',
    text: '#94a3b8'
  }
}

/** Returns hex/rgba color tokens for inline CSS / email HTML. */
export function riskHex(level: string | null | undefined): HexTokens {
  return HEX_MAP[toRiskTier(level)]
}

// ── Tailwind class bundles (for JSX) ─────────────────────────────────────────

interface TwTokens {
  /** e.g. "text-red-400" */
  text: string
  /** e.g. "bg-red-500/10" */
  bg: string
  /** e.g. "border-red-500/30" */
  border: string
  /** Combined pill classes (border + bg + text). */
  pill: string
}

const TW_MAP: Record<RiskTier, TwTokens> = {
  critical: {
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    pill: 'border-red-500/30 bg-red-500/10 text-red-400'
  },
  high: {
    text: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    pill: 'border-orange-500/30 bg-orange-500/10 text-orange-400'
  },
  medium: {
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    pill: 'border-amber-500/30 bg-amber-500/10 text-amber-400'
  },
  low: {
    text: 'text-cm-green',
    bg: 'bg-cm-green/10',
    border: 'border-cm-green/30',
    pill: 'border-cm-green/30 bg-cm-green/10 text-cm-green'
  },
  needs_more_info: {
    text: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    pill: 'border-slate-500/30 bg-slate-500/10 text-slate-400'
  },
  unknown: {
    text: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    pill: 'border-slate-500/30 bg-slate-500/10 text-slate-400'
  }
}

/** Returns Tailwind class tokens for JSX components. */
export function riskTw(level: string | null | undefined): TwTokens {
  return TW_MAP[toRiskTier(level)]
}
