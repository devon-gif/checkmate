-- =============================================================================
-- CALL RAY — Future Schema Proposal
-- =============================================================================
-- Status: PROPOSAL ONLY — do not run this migration yet.
--
-- This file documents the proposed database tables for the "Call Ray" phone
-- support feature. These tables are NOT part of the current application.
--
-- When ready to implement Phase 2, convert this file into a timestamped
-- Supabase migration file:
--   supabase/migrations/YYYYMMDDHHMMSS_add_call_ray_tables.sql
--
-- See also:
--   docs/CALL_RAY_ROADMAP.md
--   docs/CALL_RAY_REQUIREMENTS.md
--   docs/CALL_RAY_SAFETY_POLICY.md
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. call_ray_sessions
--    One record per inbound call. Created when the call ends and the
--    transcript (or partial summary) is received from the voice provider.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.call_ray_sessions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User link (nullable — caller may not have a CheckRay account)
  user_id                  uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Caller contact info (collected during call with consent)
  phone_number             text,       -- Caller ID or collected number; may be null if withheld
  email                    text,       -- Collected if user prefers email delivery

  -- Delivery preference
  contact_preference       text NOT NULL DEFAULT 'unknown'
                             CHECK (contact_preference IN ('sms', 'email', 'both', 'unknown')),

  -- Session lifecycle
  status                   text NOT NULL DEFAULT 'new'
                             CHECK (status IN (
                               'new',           -- Call received, not yet processed
                               'processing',    -- Transcript being analyzed
                               'pending_review',-- High-risk or admin-review required
                               'sent',          -- Summary delivered
                               'failed',        -- Delivery failed
                               'no_consent',    -- User declined; no summary sent
                               'abandoned'      -- Call ended before completion
                             )),

  -- Transcript and analysis
  transcript               text,       -- Full call transcript (null if no consent)
  transcript_summary       text,       -- Ray's compressed description of the situation

  -- CheckRay analysis output (mirrors cases table fields)
  category                 text,
  risk_score               integer CHECK (risk_score BETWEEN 0 AND 100),
  risk_level               text CHECK (risk_level IN ('needs_more_info', 'low', 'medium', 'high', 'very_high')),
  red_flags                jsonb,      -- string[]
  recommended_actions      jsonb,      -- string[]
  safe_reply               text,       -- Suggested safe response if relevant
  disclaimer               text,       -- Disclaimer text included in summary

  -- Link to a cases record (created if user claimed the case)
  case_id                  uuid REFERENCES public.cases(id) ON DELETE SET NULL,

  -- Consent flags — must be true before storing/sending the corresponding data
  consent_to_transcribe    boolean NOT NULL DEFAULT false,
  consent_to_receive_sms   boolean NOT NULL DEFAULT false,
  consent_to_receive_email boolean NOT NULL DEFAULT false,

  -- Voice provider metadata
  provider                 text,           -- 'twilio', 'vapi', 'retell', 'bland', etc.
  provider_call_id         text,           -- Provider's unique call/conversation ID
  provider_metadata        jsonb,          -- Any additional provider-specific fields

  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS call_ray_sessions_user_id_idx
  ON public.call_ray_sessions (user_id);

-- Index for phone number lookup (for matching repeat callers to accounts)
CREATE INDEX IF NOT EXISTS call_ray_sessions_phone_idx
  ON public.call_ray_sessions (phone_number)
  WHERE phone_number IS NOT NULL;

-- Index for admin queue (status-based)
CREATE INDEX IF NOT EXISTS call_ray_sessions_status_idx
  ON public.call_ray_sessions (status, created_at DESC);

-- Auto-update updated_at
-- (Assumes the moddatetime extension or a trigger already exists in the project.
--  If not, add: CREATE EXTENSION IF NOT EXISTS moddatetime; and attach trigger.)


-- ---------------------------------------------------------------------------
-- 2. call_ray_messages
--    One record per outbound message (SMS or email) sent as a summary.
--    A session may produce multiple messages (e.g., one SMS + one email).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.call_ray_messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid NOT NULL REFERENCES public.call_ray_sessions(id)
                        ON DELETE CASCADE,

  channel             text NOT NULL CHECK (channel IN ('sms', 'email')),
  recipient           text NOT NULL,  -- Phone number (E.164) or email address

  -- Email-specific fields
  subject             text,           -- Email subject line; null for SMS

  -- Message content
  body                text NOT NULL,  -- Full message body (may be long for email)

  -- Delivery lifecycle
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN (
                          'draft',       -- Not yet sent
                          'queued',      -- Queued for sending
                          'sent',        -- Accepted by provider
                          'delivered',   -- Provider confirmed delivery (if supported)
                          'failed',      -- Delivery failed
                          'cancelled'    -- Cancelled before sending (e.g., admin rejected)
                        )),

  -- Provider tracking
  provider_message_id text,           -- Provider's message/delivery ID

  sent_at             timestamptz,    -- When the message was accepted by the provider
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS call_ray_messages_session_id_idx
  ON public.call_ray_messages (session_id);

CREATE INDEX IF NOT EXISTS call_ray_messages_status_idx
  ON public.call_ray_messages (status, created_at DESC);


-- ---------------------------------------------------------------------------
-- 3. call_ray_admin_reviews
--    Admin review records for sessions that require human review before
--    the summary is sent. Created automatically for high-risk sessions
--    (risk_score >= 75) and any session flagged by abuse detection.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.call_ray_admin_reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES public.call_ray_sessions(id)
                  ON DELETE CASCADE,

  -- Admin reviewer (null if not yet assigned)
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  status        text NOT NULL DEFAULT 'needs_review'
                  CHECK (status IN (
                    'needs_review',  -- Awaiting admin action
                    'approved',      -- Summary approved for sending
                    'rejected',      -- Summary rejected; will not be sent
                    'escalated'      -- Escalated for further review or human support
                  )),

  notes         text,                -- Admin notes about the review decision
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS call_ray_admin_reviews_session_id_idx
  ON public.call_ray_admin_reviews (session_id);

CREATE INDEX IF NOT EXISTS call_ray_admin_reviews_status_idx
  ON public.call_ray_admin_reviews (status, created_at DESC);


-- =============================================================================
-- ROW LEVEL SECURITY NOTES
-- =============================================================================
-- The following RLS policies should be applied when this migration is run.
-- Exact syntax depends on the existing RLS helper functions in the project.
--
-- call_ray_sessions:
--   - Authenticated users can SELECT their own sessions:
--       USING (auth.uid() = user_id)
--   - Service role can INSERT (provider webhook callbacks)
--   - Admins (via is_admin() helper) can SELECT all
--   - No public (anon) access to transcripts or phone numbers
--
-- call_ray_messages:
--   - Authenticated users can SELECT messages for their own sessions:
--       USING (session_id IN (
--         SELECT id FROM call_ray_sessions WHERE user_id = auth.uid()
--       ))
--   - Service role can INSERT and UPDATE (delivery status updates)
--   - Admins can SELECT all
--
-- call_ray_admin_reviews:
--   - Admins can SELECT, INSERT, UPDATE
--   - No access for regular users
--   - Service role can INSERT (auto-creates review for high-risk sessions)
--
-- Example (adjust to match project's RLS pattern):
--
--   ALTER TABLE public.call_ray_sessions ENABLE ROW LEVEL SECURITY;
--
--   CREATE POLICY "users_read_own_sessions"
--     ON public.call_ray_sessions
--     FOR SELECT
--     USING (auth.uid() = user_id);
--
--   CREATE POLICY "service_role_insert_sessions"
--     ON public.call_ray_sessions
--     FOR INSERT
--     WITH CHECK (true);  -- restricted at API layer to service role key
--
--   CREATE POLICY "admins_read_all_sessions"
--     ON public.call_ray_sessions
--     FOR SELECT
--     USING (is_admin());  -- assumes is_admin() function exists
--
-- =============================================================================
-- END OF PROPOSAL
-- =============================================================================
