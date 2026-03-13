-- ============================================================
--  011 – Daily broadcasts (admin → rep messages)
-- ============================================================

create table if not exists public.broadcasts (
  id             uuid        primary key default gen_random_uuid(),
  message        text        not null,
  target_all     boolean     not null default true,
  target_user_id uuid        references auth.users(id) on delete cascade,
  broadcast_date date        not null default current_date,
  created_by     uuid        references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);

create table if not exists public.broadcast_reads (
  broadcast_id uuid        not null references public.broadcasts(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  read_at      timestamptz not null default now(),
  primary key (broadcast_id, user_id)
);

-- RLS
alter table public.broadcasts enable row level security;
alter table public.broadcast_reads enable row level security;

-- Admins: full access
create policy "broadcasts_admin_all" on public.broadcasts for all using (
  (select role from public.profiles where id = auth.uid()) = 'Admin'
);

-- Reps: see today's broadcasts targeted to them
create policy "broadcasts_rep_select" on public.broadcasts for select using (
  broadcast_date = current_date
  and (
    target_all = true
    or target_user_id = auth.uid()
  )
);

-- broadcast_reads: admins full, reps see + insert their own
create policy "broadcast_reads_admin_all" on public.broadcast_reads for all using (
  (select role from public.profiles where id = auth.uid()) = 'Admin'
);
create policy "broadcast_reads_rep_select" on public.broadcast_reads for select using (
  user_id = auth.uid()
);
create policy "broadcast_reads_rep_insert" on public.broadcast_reads for insert with check (
  user_id = auth.uid()
);
