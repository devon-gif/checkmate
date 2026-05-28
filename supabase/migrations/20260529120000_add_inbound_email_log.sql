-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: inbound_email_log
--
-- Audit + idempotency log for `/api/inbound/email`. One row per webhook
-- delivery, regardless of outcome. The route writes here BEFORE calling
-- OpenAI or sending a reply, so even spam / unknown-sender requests are
-- visible to the admin for forensic / abuse-pattern detection.
--
-- Idempotency: `provider_msg_id` is unique. A second delivery of the
-- same Resend message (provider retry, manual replay) finds an existing
-- row and short-circuits — no second analyzer call, no second reply.
--
-- RLS is enabled with NO authenticated-user policies. Reads/writes happen
-- only through the service-role server route.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "citext";

create table if not exists "public"."inbound_email_log" (
  "id"              uuid        not null default gen_random_uuid(),
  "provider"        text        not null default 'resend',
  "provider_msg_id" text,
  "sender_email"    citext,
  "to_email"        citext,
  "subject"         text,
  "matched_user_id" uuid        references auth.users(id) on delete set null,
  "case_id"         uuid        references public.cases(id) on delete set null,
  "outcome"         text        not null,
  "http_status"     int         not null default 200,
  "error_message"   text,
  "received_at"     timestamptz not null default now(),
  constraint "inbound_email_log_pkey"        primary key ("id"),
  constraint "inbound_email_log_outcome_check" check (
    outcome in (
      'analyzed',              -- happy path
      'unknown_sender',        -- no beta + no paid plan
      'beta_expired',          -- beta_access row found but expired/revoked
      'over_limit',            -- past monthly cap (paid or beta)
      'past_due',              -- subscription past_due
      'no_user_record',        -- couldn't locate auth.users for the email
      'duplicate',             -- idempotent replay
      'rejected_spam',         -- loop guard / auto-reply
      'webhook_invalid',       -- signature failed
      'analyzer_error',        -- analyzer threw (rare)
      'save_failed',           -- case/report write failed
      'reply_failed'           -- reply email could not be sent
    )
  )
);

-- provider_msg_id is the idempotency key for retried deliveries. We make
-- it unique but allow NULL because some inbound providers don't send one.
create unique index if not exists "inbound_email_log_provider_msg_id_uniq"
  on "public"."inbound_email_log" ("provider", "provider_msg_id")
  where "provider_msg_id" is not null;

create index if not exists "inbound_email_log_sender_received_idx"
  on "public"."inbound_email_log" ("sender_email", "received_at" desc);

create index if not exists "inbound_email_log_outcome_idx"
  on "public"."inbound_email_log" ("outcome", "received_at" desc);

alter table "public"."inbound_email_log" enable row level security;

-- No authenticated-user policies. Service-role server routes only.

comment on table "public"."inbound_email_log" is
  'One row per inbound email webhook delivery. Drives idempotency and admin auditing.';
comment on column "public"."inbound_email_log"."outcome" is
  'analyzed | unknown_sender | beta_expired | over_limit | past_due | no_user_record | duplicate | rejected_spam | webhook_invalid | analyzer_error | save_failed | reply_failed';
