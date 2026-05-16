-- notification_preferences
-- Stores per-user email alert settings for Ray's Weekly Scam Watch.

create table if not exists public.notification_preferences (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users(id) on delete cascade not null unique,
  weekly_email_enabled boolean not null default true,
  unsubscribed_at      timestamptz null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Updated-at trigger (reuse or create)
create or replace function public.set_notification_preferences_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_notification_preferences_updated_at on public.notification_preferences;
create trigger trg_notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute procedure public.set_notification_preferences_updated_at();

-- RLS
alter table public.notification_preferences enable row level security;

create policy "Users can view own notification preferences"
  on public.notification_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert own notification preferences"
  on public.notification_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notification preferences"
  on public.notification_preferences for update
  using (auth.uid() = user_id);
