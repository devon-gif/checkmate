-- ============================================================
-- Scam Intelligence v1
-- ============================================================
-- scam_intel          — curated catalog of known scam patterns.
--                       Mirrors the in-code catalog in
--                       lib/analyzer/scam-intel-catalog.ts. The admin UI
--                       reads/writes this table; the analyzer does NOT read
--                       it at request time (scoring uses the in-code catalog
--                       so it works offline and admin edits can't silently
--                       change risk scoring).
-- scam_intel_pending  — staging area for future crawler/admin review.
--                       Nothing here affects scoring.
-- ============================================================
-- Admin-only: both tables have RLS enabled with a no-public-access policy.
-- They are reached only via the service-role client in the admin app layer.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- scam_intel
-- ────────────────────────────────────────────────────────────
create table if not exists public.scam_intel (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null unique,
  category            text not null,
  severity            text not null default 'medium'
                        check (severity in ('low', 'medium', 'high', 'critical')),
  description         text not null default '',
  signals            jsonb not null default '[]'::jsonb,
  recommended_action  text not null default '',
  source_type         text not null default 'curated',
  source_url          text,
  confidence          text not null default 'medium'
                        check (confidence in ('low', 'medium', 'high')),
  status              text not null default 'active'
                        check (status in ('active', 'inactive', 'archived')),
  first_seen          timestamptz not null default now(),
  last_seen           timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.scam_intel enable row level security;

-- Only accessible via service role (admin app layer)
create policy "scam_intel: no public access"
  on public.scam_intel
  for all
  using (false)
  with check (false);

drop trigger if exists scam_intel_updated_at on public.scam_intel;
create trigger scam_intel_updated_at
  before update on public.scam_intel
  for each row execute procedure public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- scam_intel_pending  (future crawler/admin review queue)
-- ────────────────────────────────────────────────────────────
create table if not exists public.scam_intel_pending (
  id                  uuid primary key default gen_random_uuid(),
  name                text,
  category            text,
  severity            text,
  description         text not null default '',
  signals            jsonb not null default '[]'::jsonb,
  recommended_action  text not null default '',
  source_type         text not null default 'crawler',
  source_url          text,
  confidence          text not null default 'low',
  review_status       text not null default 'pending'
                        check (review_status in ('pending', 'approved', 'rejected')),
  raw                 jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.scam_intel_pending enable row level security;

create policy "scam_intel_pending: no public access"
  on public.scam_intel_pending
  for all
  using (false)
  with check (false);

drop trigger if exists scam_intel_pending_updated_at on public.scam_intel_pending;
create trigger scam_intel_pending_updated_at
  before update on public.scam_intel_pending
  for each row execute procedure public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- Seed: 10 initial curated patterns (idempotent via unique name)
-- These mirror lib/analyzer/scam-intel-catalog.ts. Keep both in sync.
-- ────────────────────────────────────────────────────────────
insert into public.scam_intel
  (name, category, severity, description, signals, recommended_action, source_type, confidence, status)
values
  (
    'fake_scheduling_login_credential_theft',
    'phishing',
    'critical',
    'Recruiter or contact-form message proposes a quick call or interview, sends a Calendly-like scheduling link, then prompts a Google/Microsoft/email login on a fake page to steal credentials.',
    '["scheduling or interview link (calendly/booking)", "prompts google/microsoft/email login to view or confirm", "login page on a domain that is not the real provider", "urgent quick call / immediate interview pressure"]'::jsonb,
    'Do not log in through links in the message. Navigate to the provider (Google/Microsoft) directly and verify the recruiter and company through official channels before sharing anything.',
    'curated',
    'high',
    'active'
  ),
  (
    'fake_equipment_check_scam',
    'employment_scam',
    'high',
    'Fake employer says they will mail equipment (laptop, etc.) and asks you to deposit or forward a check to a vendor first. The check bounces after you have sent money.',
    '["new job before any interview", "they mail you a check for equipment", "asked to deposit check then send part to a vendor", "buy equipment from a specified supplier"]'::jsonb,
    'Never deposit a check from a new employer and forward funds. Legitimate employers do not ask you to pay or move money for equipment.',
    'curated',
    'high',
    'active'
  ),
  (
    'zelle_cashapp_equipment_deposit_scam',
    'payment_fraud',
    'high',
    'Job or seller asks for an upfront deposit via Zelle/CashApp/Venmo/crypto/gift cards for equipment, training, or a "refundable" fee.',
    '["upfront deposit or fee requested", "pay via zelle/cashapp/venmo/crypto/gift card", "promise it is refundable", "equipment or training fee"]'::jsonb,
    'Stop. Legitimate employers never require upfront payment. Instant-payment apps and gift cards are unrecoverable once sent.',
    'curated',
    'high',
    'active'
  ),
  (
    'fake_recruiter_chat_migration',
    'employment_scam',
    'medium',
    'A recruiter quickly pushes the conversation off-platform to WhatsApp/Telegram/Signal to avoid oversight before any verification.',
    '["move to whatsapp/telegram/signal immediately", "recruiter avoids company email", "hiring without an interview", "personal messaging app for a job"]'::jsonb,
    'Keep hiring conversations on official company email or platforms. Verify the recruiter independently before continuing.',
    'curated',
    'medium',
    'active'
  ),
  (
    'fake_onboarding_portal_early_pii',
    'phishing',
    'high',
    'A fake onboarding portal asks for SSN, bank account, or a photo of your ID very early — before an offer or any verification.',
    '["onboarding portal link", "asks for ssn / bank details / id photo early", "before any offer or interview", "fill this to get started"]'::jsonb,
    'Do not enter SSN, banking, or ID details into an unverified portal. Sensitive details belong only after a verified offer through official systems.',
    'curated',
    'high',
    'active'
  ),
  (
    'fake_invoice_payment_redirect',
    'payment_fraud',
    'high',
    'An invoice or vendor email claims bank/payment details have changed and asks you to redirect payment to a new account (business email compromise).',
    '["invoice with updated/changed bank details", "redirect payment to a new account", "urgent payment before deadline", "vendor banking change by email"]'::jsonb,
    'Verify any banking-change request by calling a known contact at the vendor using a number you already have — never the one in the email.',
    'curated',
    'high',
    'active'
  ),
  (
    'executive_impersonation_gift_card',
    'impersonation',
    'high',
    'Someone impersonating a boss/executive urgently asks you to buy gift cards and send the codes, often claiming they are busy or in a meeting.',
    '["message claims to be a boss/executive/ceo", "urgent request to buy gift cards", "send gift card codes/photos", "keep it confidential / cannot talk now"]'::jsonb,
    'Verify any gift-card request through a separate, known channel. Real executives do not ask staff to buy gift cards.',
    'curated',
    'high',
    'active'
  ),
  (
    'microsoft_google_login_phishing',
    'phishing',
    'critical',
    'An email mimics Microsoft/Google/Apple and pushes you to a login page on a non-provider domain to "verify", "reactivate", or avoid account suspension — to steal credentials.',
    '["claims to be microsoft/google/apple/office365", "verify or reactivate your account", "account will be suspended/closed", "login link on a non-provider domain"]'::jsonb,
    'Do not log in via the link. Go to the provider directly and check account status. Enable MFA.',
    'curated',
    'high',
    'active'
  ),
  (
    'qr_code_phishing',
    'phishing',
    'high',
    'A message or notice tells you to scan a QR code to log in, pay, or view a document — the QR points to a phishing or payment-redirect site (quishing).',
    '["scan this qr code to log in / pay / view", "qr code in an unexpected email or notice", "qr leads to a login or payment page", "urgency to scan now"]'::jsonb,
    'Do not scan unsolicited QR codes. Reach the service through its official app or a typed URL instead.',
    'curated',
    'medium',
    'active'
  ),
  (
    'fake_remote_job_task_scam',
    'employment_scam',
    'high',
    'A "remote job" pays you to complete simple tasks (rating apps, liking videos, processing orders), then requires you to deposit your own money to "unlock" higher earnings — a task/money-laundering scam.',
    '["paid to do simple tasks (rate apps/like videos/process orders)", "deposit your own money to unlock earnings", "commission grows then you must pay to withdraw", "recruited via text/whatsapp for easy daily pay"]'::jsonb,
    'Stop. Legitimate jobs never require you to deposit your own funds to earn. This is a task/laundering scam.',
    'curated',
    'high',
    'active'
  )
on conflict (name) do nothing;
