create table public.user_progression (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_check_in_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_progression enable row level security;
create policy "Users can manage own progression"
  on public.user_progression for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  xp_amount integer not null,
  event_date date not null,
  created_at timestamptz not null default now(),
  metadata jsonb
);

alter table public.xp_events enable row level security;
create policy "Users can manage own xp events"
  on public.xp_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create unique index xp_events_idempotency
  on public.xp_events (user_id, event_type, event_date);
