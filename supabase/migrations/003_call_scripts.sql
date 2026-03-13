-- ============================================================
--  Hollandia – Call Scripts
--  Personal call-script builder with AI editing + admin approval
-- ============================================================

create table if not exists public.call_scripts (
  id           uuid primary key default gen_random_uuid(),
  rep_id       uuid not null references auth.users(id) on delete cascade,
  rep_name     text not null,
  status       text not null default 'draft'
    check (status in ('draft', 'pending', 'approved', 'rejected')),
  admin_note   text,
  -- Six sections of the script
  section_1    text not null default '',  -- פתיחת השיחה
  section_2    text not null default '',  -- התחברות רגשית
  section_3    text not null default '',  -- הצגת הערך והחשיבות
  section_4    text not null default '',  -- הצגת ההטבה
  section_5    text not null default '',  -- קביעת פגישה
  section_6    text not null default '',  -- סיכום השיחה
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── RLS ──────────────────────────────────────────────────────
alter table public.call_scripts enable row level security;

-- Reps: full access to their own scripts
create policy "rep_own_scripts"
  on public.call_scripts
  for all
  to authenticated
  using (rep_id = auth.uid())
  with check (rep_id = auth.uid());

-- Admins: read all scripts
create policy "admin_read_all_scripts"
  on public.call_scripts
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'Admin'
    )
  );

-- Admins: update status/admin_note on any script
create policy "admin_update_scripts"
  on public.call_scripts
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'Admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'Admin'
    )
  );
