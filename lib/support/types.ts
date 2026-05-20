/**
 * lib/support/types.ts
 *
 * Single source of truth for support ticket statuses and categories.
 * Imported by the customer-facing /support form, the admin tickets
 * queue, the submit API route, and the admin tickets API route.
 *
 * The DB check constraints (see migration
 * 20260520120000_widen_support_ticket_enums.sql) accept both the
 * canonical values below AND a small set of legacy values so historical
 * rows remain valid. New code should only ever write canonical values.
 */

// ─── Statuses ────────────────────────────────────────────────────────────────

export const TICKET_STATUSES = [
  'open',
  'waiting_on_customer',
  'in_review',
  'resolved',
  'closed'
] as const

export type TicketStatus = (typeof TICKET_STATUSES)[number]

/** Statuses we still accept on read for legacy rows; never write these. */
export const LEGACY_TICKET_STATUSES = ['in_progress'] as const

export const ALL_TICKET_STATUSES = [
  ...TICKET_STATUSES,
  ...LEGACY_TICKET_STATUSES
] as const

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  waiting_on_customer: 'Waiting on customer',
  in_review: 'In review',
  resolved: 'Resolved',
  closed: 'Closed'
}

// ─── Categories ──────────────────────────────────────────────────────────────

export const TICKET_CATEGORIES = [
  'billing',
  'cancellation',
  'refund_request',
  'technical_issue',
  'account_access',
  'report_question',
  'suspicious_result_feedback',
  'other'
] as const

export type TicketCategory = (typeof TICKET_CATEGORIES)[number]

/** Legacy values still accepted for historical rows. Never write these. */
export const LEGACY_TICKET_CATEGORIES = ['general', 'bug', 'feature'] as const

export const ALL_TICKET_CATEGORIES = [
  ...TICKET_CATEGORIES,
  ...LEGACY_TICKET_CATEGORIES
] as const

/** Human-readable labels for the customer-facing form. */
export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  billing: 'Billing',
  cancellation: 'Cancellation request',
  refund_request: 'Refund request',
  technical_issue: 'Technical issue',
  account_access: 'Account access',
  report_question: 'Question about a report',
  suspicious_result_feedback: 'Feedback on a result',
  other: 'Other'
}

/**
 * Pick a safe canonical category from arbitrary user input, defaulting
 * to 'other'. Used by the submit route for input validation.
 */
export function safeCategory(input: unknown): TicketCategory {
  if (typeof input !== 'string') return 'other'
  return TICKET_CATEGORIES.includes(input as TicketCategory)
    ? (input as TicketCategory)
    : 'other'
}

/**
 * Validate a status against the canonical set. Returns null if invalid.
 * Used by the admin patch route — admins only ever write canonical
 * values, never legacy ones.
 */
export function safeStatus(input: unknown): TicketStatus | null {
  if (typeof input !== 'string') return null
  return TICKET_STATUSES.includes(input as TicketStatus)
    ? (input as TicketStatus)
    : null
}
