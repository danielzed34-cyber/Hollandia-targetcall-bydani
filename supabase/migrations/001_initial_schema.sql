-- ============================================================
--  Hollandia – Initial Database Schema
--  Run this in the Supabase SQL Editor (or via CLI migration).
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── Profiles (extends auth.users) ────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        text not null default 'Rep' check (role in ('Admin', 'Rep')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create profile when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'Rep')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Clock Events ──────────────────────────────────────────────
create table if not exists public.clock_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  event_type  text not null check (event_type in ('clock_in', 'clock_out')),
  timestamp   timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- ── Active Breaks (Real-time) ─────────────────────────────────
create table if not exists public.active_breaks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  user_name   text not null,
  started_at  timestamptz not null default now(),
  ends_at     timestamptz not null,
  created_at  timestamptz not null default now()
);

-- Enable Real-time on active_breaks
alter publication supabase_realtime add table public.active_breaks;

-- ── Shift Constraints ─────────────────────────────────────────
create table if not exists public.shift_constraints (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  week_start       date not null,               -- Sunday of the work week
  day_of_week      int  not null check (day_of_week between 0 and 4),
  constraint_type  text not null check (constraint_type in ('day_off', 'short_shift')),
  shift_start      time,
  shift_end        time,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, week_start, day_of_week)
);

-- ── AI Feedback Requests ──────────────────────────────────────
create table if not exists public.feedback_requests (
  id              uuid primary key default gen_random_uuid(),
  rep_id          uuid not null references public.profiles(id) on delete cascade,
  rep_name        text not null,
  customer_name   text not null,
  customer_phone  text not null,
  struggle_point  text not null,
  status          text not null default 'pending' check (status in ('pending', 'processing', 'done')),
  audio_url       text,
  report          jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Enable Real-time on feedback_requests (so reps get notified when report is ready)
alter publication supabase_realtime add table public.feedback_requests;

-- ── Knowledge Base Articles ────────────────────────────────────
create table if not exists public.kb_articles (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  content     text not null,
  category    text not null,
  tags        text[] not null default '{}',
  created_by  uuid not null references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Full-text search on knowledge base
create index if not exists kb_articles_fts on public.kb_articles
  using gin (to_tsvector('simple', title || ' ' || content));

-- ── AI Mentor Settings ────────────────────────────────────────
create table if not exists public.ai_settings (
  id             uuid primary key default gen_random_uuid(),
  system_prompt  text not null default '',
  daily_tip      text not null default '',
  updated_by     uuid not null references public.profiles(id),
  updated_at     timestamptz not null default now()
);

-- ── Row Level Security ────────────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.clock_events      enable row level security;
alter table public.active_breaks     enable row level security;
alter table public.shift_constraints enable row level security;
alter table public.feedback_requests enable row level security;
alter table public.kb_articles       enable row level security;
alter table public.ai_settings       enable row level security;

-- Profiles: everyone can read; users can update their own
create policy "profiles_select_all"  on public.profiles for select using (true);
create policy "profiles_update_own"  on public.profiles for update using (auth.uid() = id);

-- Clock events: users see/insert their own; admins see all
create policy "clock_own"   on public.clock_events for all using (auth.uid() = user_id);

-- Active breaks: all authenticated users can read (needed for the real-time check)
create policy "breaks_select_all" on public.active_breaks for select using (auth.role() = 'authenticated');
create policy "breaks_insert_own" on public.active_breaks for insert with check (auth.uid() = user_id);
create policy "breaks_delete_own" on public.active_breaks for delete using (auth.uid() = user_id);

-- Shift constraints: own data only (admins handled via service role)
create policy "shifts_own" on public.shift_constraints for all using (auth.uid() = user_id);

-- Feedback requests: reps see their own; admins see all (via service role)
create policy "feedback_rep_own" on public.feedback_requests for select using (auth.uid() = rep_id);
create policy "feedback_rep_insert" on public.feedback_requests for insert with check (auth.uid() = rep_id);

-- KB articles: all authenticated users can read
create policy "kb_select_all"   on public.kb_articles for select using (auth.role() = 'authenticated');
create policy "kb_manage_admin" on public.kb_articles for all using (
  (select role from public.profiles where id = auth.uid()) = 'Admin'
);

-- AI settings: all authenticated users can read; admin writes via service role
create policy "ai_settings_select" on public.ai_settings for select using (auth.role() = 'authenticated');
