create extension if not exists "pgcrypto";
create extension if not exists "citext";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table "public"."users" (
    "id" uuid not null references auth.users(id) on delete cascade,
    "email" citext,
    "full_name" text,
    "avatar_url" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

create table "public"."profiles" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null default auth.uid() references public.users(id) on delete cascade,
    "display_name" text,
    "company_name" text,
    "timezone" text,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

create table "public"."subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null default auth.uid() references public.users(id) on delete cascade,
    "provider" text not null default 'stripe',
    "provider_customer_id" text,
    "provider_subscription_id" text,
    "plan" text not null default 'free',
    "status" text not null default 'inactive',
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean not null default false,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    constraint subscriptions_status_check check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'))
);

create table "public"."cases" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null default auth.uid() references public.users(id) on delete cascade,
    "category" text not null default 'unknown',
    "status" text not null default 'open',
    "title" text not null,
    "risk_level" text not null default 'low',
    "risk_score" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    constraint cases_category_check check (category in ('scam_text', 'job_scam_or_ghost_job', 'bill_or_fee', 'phishing_url', 'rental_or_marketplace', 'unknown')),
    constraint cases_status_check check (status in ('open', 'resolved', 'archived')),
    constraint cases_risk_level_check check (risk_level in ('needs_more_info', 'low', 'medium', 'high', 'very_high')),
    constraint cases_risk_score_check check (risk_score >= 0 and risk_score <= 100)
);

create table "public"."case_messages" (
    "id" uuid not null default gen_random_uuid(),
    "case_id" uuid not null references public.cases(id) on delete cascade,
    "user_id" uuid not null default auth.uid() references public.users(id) on delete cascade,
    "sender_role" text not null default 'user',
    "content" text not null,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    constraint case_messages_sender_role_check check (sender_role in ('user', 'assistant', 'system', 'support'))
);

create table "public"."case_attachments" (
    "id" uuid not null default gen_random_uuid(),
    "case_id" uuid not null references public.cases(id) on delete cascade,
    "message_id" uuid,
    "user_id" uuid not null default auth.uid() references public.users(id) on delete cascade,
    "storage_bucket" text not null,
    "storage_path" text not null,
    "file_name" text not null,
    "content_type" text,
    "file_size" bigint,
    "metadata" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    constraint case_attachments_file_size_check check (file_size is null or file_size >= 0)
);

create table "public"."risk_reports" (
    "id" uuid not null default gen_random_uuid(),
    "case_id" uuid not null references public.cases(id) on delete cascade,
    "summary" text,
    "risk_score" integer,
    "risk_level" text,
    "red_flags" jsonb not null default '[]'::jsonb,
    "recommended_actions" jsonb not null default '[]'::jsonb,
    "safe_reply" text,
    "disclaimer" text,
    "sources" jsonb not null default '[]'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    constraint risk_reports_risk_score_check check (risk_score is null or (risk_score >= 0 and risk_score <= 100)),
    constraint risk_reports_risk_level_check check (risk_level is null or risk_level in ('needs_more_info', 'low', 'medium', 'high', 'very_high'))
);

create table "public"."usage_events" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null default auth.uid() references public.users(id) on delete cascade,
    "event_type" text not null,
    "cost_estimate" numeric,
    "created_at" timestamp with time zone not null default now(),
    constraint usage_events_event_type_check check (event_type in ('check_created', 'sms_received', 'email_received', 'attachment_uploaded')),
    constraint usage_events_cost_estimate_check check (cost_estimate is null or cost_estimate >= 0)
);

create table "public"."phone_numbers" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null default auth.uid() references public.users(id) on delete cascade,
    "phone_number" text not null,
    "label" text,
    "is_primary" boolean not null default false,
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

create table "public"."email_aliases" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null default auth.uid() references public.users(id) on delete cascade,
    "email" citext not null,
    "label" text,
    "is_primary" boolean not null default false,
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

alter table "public"."users" add constraint "users_pkey" primary key ("id");
alter table "public"."profiles" add constraint "profiles_pkey" primary key ("id");
alter table "public"."subscriptions" add constraint "subscriptions_pkey" primary key ("id");
alter table "public"."cases" add constraint "cases_pkey" primary key ("id");
alter table "public"."case_messages" add constraint "case_messages_pkey" primary key ("id");
alter table "public"."case_messages" add constraint "case_messages_id_case_id_key" unique ("id", "case_id");
alter table "public"."case_attachments" add constraint "case_attachments_pkey" primary key ("id");
alter table "public"."case_attachments" add constraint "case_attachments_message_case_fkey" foreign key ("message_id", "case_id") references public.case_messages("id", "case_id") on delete cascade;
alter table "public"."risk_reports" add constraint "risk_reports_pkey" primary key ("id");
alter table "public"."usage_events" add constraint "usage_events_pkey" primary key ("id");
alter table "public"."phone_numbers" add constraint "phone_numbers_pkey" primary key ("id");
alter table "public"."email_aliases" add constraint "email_aliases_pkey" primary key ("id");

create unique index profiles_user_id_key on public.profiles using btree (user_id);
create unique index subscriptions_provider_subscription_id_key on public.subscriptions using btree (provider, provider_subscription_id) where provider_subscription_id is not null;
create index cases_user_id_idx on public.cases using btree (user_id);
create index cases_status_idx on public.cases using btree (status);
create index case_messages_case_id_created_at_idx on public.case_messages using btree (case_id, created_at);
create index case_attachments_case_id_idx on public.case_attachments using btree (case_id);
create index risk_reports_case_id_created_at_idx on public.risk_reports using btree (case_id, created_at desc);
create index usage_events_user_id_created_at_idx on public.usage_events using btree (user_id, created_at desc);
create unique index phone_numbers_user_id_phone_number_key on public.phone_numbers using btree (user_id, phone_number);
create unique index phone_numbers_one_primary_per_user_idx on public.phone_numbers using btree (user_id) where is_primary;
create unique index email_aliases_user_id_email_key on public.email_aliases using btree (user_id, email);
create unique index email_aliases_one_primary_per_user_idx on public.email_aliases using btree (user_id) where is_primary;

insert into public.users (id, email, full_name, avatar_url, created_at, updated_at)
select
  id,
  email,
  raw_user_meta_data ->> 'full_name',
  raw_user_meta_data ->> 'avatar_url',
  created_at,
  updated_at
from auth.users
on conflict (id) do nothing;

insert into public.profiles (user_id, display_name, created_at, updated_at)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name', email),
  created_at,
  updated_at
from auth.users
on conflict (user_id) do nothing;

create trigger set_users_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger set_cases_updated_at before update on public.cases for each row execute function public.set_updated_at();
create trigger set_case_messages_updated_at before update on public.case_messages for each row execute function public.set_updated_at();
create trigger set_case_attachments_updated_at before update on public.case_attachments for each row execute function public.set_updated_at();
create trigger set_phone_numbers_updated_at before update on public.phone_numbers for each row execute function public.set_updated_at();
create trigger set_email_aliases_updated_at before update on public.email_aliases for each row execute function public.set_updated_at();

alter table "public"."users" enable row level security;
alter table "public"."profiles" enable row level security;
alter table "public"."subscriptions" enable row level security;
alter table "public"."cases" enable row level security;
alter table "public"."case_messages" enable row level security;
alter table "public"."case_attachments" enable row level security;
alter table "public"."risk_reports" enable row level security;
alter table "public"."usage_events" enable row level security;
alter table "public"."phone_numbers" enable row level security;
alter table "public"."email_aliases" enable row level security;

create policy "Allow users to manage themselves" on public.users for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Allow users to manage own profile" on public.profiles for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Allow users to manage own subscriptions" on public.subscriptions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Allow users to manage own cases" on public.cases for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Allow users to manage messages on own cases" on public.case_messages for all to authenticated using (exists (select 1 from public.cases where cases.id = case_messages.case_id and cases.user_id = auth.uid())) with check (auth.uid() = user_id and exists (select 1 from public.cases where cases.id = case_messages.case_id and cases.user_id = auth.uid()));
create policy "Allow users to manage attachments on own cases" on public.case_attachments for all to authenticated using (exists (select 1 from public.cases where cases.id = case_attachments.case_id and cases.user_id = auth.uid())) with check (auth.uid() = user_id and exists (select 1 from public.cases where cases.id = case_attachments.case_id and cases.user_id = auth.uid()));
create policy "Allow users to manage risk reports on own cases" on public.risk_reports for all to authenticated using (exists (select 1 from public.cases where cases.id = risk_reports.case_id and cases.user_id = auth.uid())) with check (exists (select 1 from public.cases where cases.id = risk_reports.case_id and cases.user_id = auth.uid()));
create policy "Allow users to manage own usage events" on public.usage_events for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Allow users to manage own phone numbers" on public.phone_numbers for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Allow users to manage own email aliases" on public.email_aliases for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.users.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url);

  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
