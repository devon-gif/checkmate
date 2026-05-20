/**
 * lib/call-ray/types.ts
 *
 * TypeScript type stubs for the future "Call Ray" phone support feature.
 *
 * STATUS: STUB ONLY — not wired into any production route.
 * These types define the planned data contract. Implement in Phase 2.
 *
 * See also:
 *   docs/CALL_RAY_ROADMAP.md
 *   docs/CALL_RAY_REQUIREMENTS.md
 *   supabase/sql/call_ray_future_schema.sql
 */

import type { RiskLevel, CaseCategory } from "@/lib/checkray-core"

// ---------------------------------------------------------------------------
// Enums / union types
// ---------------------------------------------------------------------------

/** Delivery channel for the written summary. */
export type CallRayDeliveryChannel = "sms" | "email" | "both" | "unknown"

/** Lifecycle status of a call session. */
export type CallRaySessionStatus =
  | "new"
  | "processing"
  | "pending_review"
  | "sent"
  | "failed"
  | "no_consent"
  | "abandoned"

/** Delivery status of an outbound message. */
export type CallRayMessageStatus =
  | "draft"
  | "queued"
  | "sent"
  | "delivered"
  | "failed"
  | "cancelled"

/** Admin review status for high-risk sessions. */
export type CallRayReviewStatus =
  | "needs_review"
  | "approved"
  | "rejected"
  | "escalated"

// ---------------------------------------------------------------------------
// Core session type
// ---------------------------------------------------------------------------

/**
 * A single inbound call session.
 * Maps to the `call_ray_sessions` table.
 */
export interface CallRaySession {
  id: string
  user_id: string | null

  /** Caller's phone number (E.164 format preferred). Null if withheld. */
  phone_number: string | null
  /** Email address collected during the call (if user prefers email). */
  email: string | null

  contact_preference: CallRayDeliveryChannel
  status: CallRaySessionStatus

  /** Full verbatim transcript. Null unless consent_to_transcribe = true. */
  transcript: string | null
  /** Ray's compressed description of the situation (used for analysis). */
  transcript_summary: string | null

  // CheckRay analysis output
  category: CaseCategory | string | null
  risk_score: number | null
  risk_level: RiskLevel | null
  red_flags: string[] | null
  recommended_actions: string[] | null
  safe_reply: string | null
  disclaimer: string | null

  /** Linked cases record, if the user claimed this session. */
  case_id: string | null

  // Consent flags
  consent_to_transcribe: boolean
  consent_to_receive_sms: boolean
  consent_to_receive_email: boolean

  // Provider metadata
  provider: string | null
  provider_call_id: string | null
  provider_metadata: Record<string, unknown> | null

  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Outbound message type
// ---------------------------------------------------------------------------

/**
 * A single outbound SMS or email message for a call session.
 * Maps to the `call_ray_messages` table.
 */
export interface CallRayMessage {
  id: string
  session_id: string
  channel: "sms" | "email"
  recipient: string
  subject: string | null
  body: string
  status: CallRayMessageStatus
  provider_message_id: string | null
  sent_at: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Admin review type
// ---------------------------------------------------------------------------

/**
 * Admin review record for a session that requires human approval.
 * Maps to the `call_ray_admin_reviews` table.
 */
export interface CallRayAdminReview {
  id: string
  session_id: string
  admin_user_id: string | null
  status: CallRayReviewStatus
  notes: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Transcript summary (intermediate type used during analysis)
// ---------------------------------------------------------------------------

/**
 * The structured output of Ray's comprehension pass over the call transcript.
 * This is what gets passed to the CheckRay analyzer.
 */
export interface CallRayTranscriptSummary {
  /** Plain-language summary of what the caller described. */
  situation: string
  /** Inferred case category (may be "unknown"). */
  category: CaseCategory | "unknown"
  /** Key details extracted from the call (amounts, sender names, URLs, etc.). */
  details: string[]
  /** True if the caller mentioned they already sent money or personal info. */
  has_already_acted: boolean
  /** True if the caller described an urgent or threatening situation. */
  is_urgent: boolean
}
