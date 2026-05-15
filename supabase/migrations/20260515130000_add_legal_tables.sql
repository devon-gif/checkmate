-- ============================================================
-- Legal versions & user acceptance tables
-- ============================================================

-- Tracks every published version of each legal document.
-- When a document is updated, insert a new row with the new version.
create table if not exists "public"."legal_versions" (
    "id"             uuid        primary key default gen_random_uuid(),
    "document_type"  text        not null,  -- 'terms' | 'privacy' | 'ai_disclosure' | 'acceptable_use'
    "version"        text        not null,
    "effective_date" timestamptz not null default now(),
    "content_hash"   text,                  -- SHA-256 of the document body, optional
    "created_at"     timestamptz not null default now(),
    constraint legal_versions_document_type_check check (
        document_type in ('terms', 'privacy', 'ai_disclosure', 'acceptable_use')
    )
);

-- Seed initial versions (must match CURRENT_LEGAL_VERSIONS in lib/legalCopy.ts)
insert into "public"."legal_versions" ("document_type", "version", "effective_date")
values
    ('terms',            '1.0.0', now()),
    ('privacy',          '1.0.0', now()),
    ('ai_disclosure',    '1.0.0', now()),
    ('acceptable_use',   '1.0.0', now());

-- RLS: anyone can read published versions; only service role can insert/update.
alter table "public"."legal_versions" enable row level security;

create policy "legal_versions_select_public"
    on "public"."legal_versions"
    for select
    using (true);

-- ============================================================

-- Records the versions a user has accepted, when, and from where.
create table if not exists "public"."user_legal_acceptances" (
    "id"                    uuid        primary key default gen_random_uuid(),
    "user_id"               uuid        not null references auth.users(id) on delete cascade,
    "terms_version"         text        not null,
    "privacy_version"       text        not null,
    "ai_disclosure_version" text        not null,
    "acceptable_use_version" text,
    "accepted_at"           timestamptz not null default now(),
    "ip_address"            text,
    "user_agent"            text
);

-- Index for fast lookup by user
create index if not exists user_legal_acceptances_user_id_idx
    on "public"."user_legal_acceptances" ("user_id");

-- RLS
alter table "public"."user_legal_acceptances" enable row level security;

-- Users can read their own acceptance records
create policy "user_legal_acceptances_select_own"
    on "public"."user_legal_acceptances"
    for select
    using (auth.uid() = user_id);

-- Users (and the service role) can insert their own acceptance records.
-- The application API route uses the service-role key so we only need the service
-- role bypass; authenticated users may also insert directly if calling from the client.
create policy "user_legal_acceptances_insert_own"
    on "public"."user_legal_acceptances"
    for insert
    with check (auth.uid() = user_id);

-- Nobody can update or delete an acceptance record after creation.
-- (The service role bypasses RLS, so restrict that at the app layer.)
