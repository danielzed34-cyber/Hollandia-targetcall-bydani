-- ============================================================
--  010 – Task management
-- ============================================================

-- Core task definition
create table if not exists public.tasks (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  description text,
  due_date    date        not null,
  priority    text        not null default 'normal'
                check (priority in ('low', 'normal', 'high')),
  target_all  boolean     not null default true,
  created_by  uuid        references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- When target_all = false, specific users are listed here
create table if not exists public.task_targets (
  task_id  uuid not null references public.tasks(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  primary key (task_id, user_id)
);

-- Completion log (rep inserts a row when they mark complete)
create table if not exists public.task_completions (
  task_id      uuid        not null references public.tasks(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

-- RLS
alter table public.tasks enable row level security;
alter table public.task_targets enable row level security;
alter table public.task_completions enable row level security;

-- Admins: full access to tasks
create policy "tasks_admin_all" on public.tasks for all using (
  (select role from public.profiles where id = auth.uid()) = 'Admin'
);

-- Reps: see tasks assigned to them (all or specific)
create policy "tasks_rep_select" on public.tasks for select using (
  target_all = true
  or exists (
    select 1 from public.task_targets
    where task_id = tasks.id and user_id = auth.uid()
  )
);

-- task_targets: admins full, reps see their own rows
create policy "task_targets_admin_all" on public.task_targets for all using (
  (select role from public.profiles where id = auth.uid()) = 'Admin'
);
create policy "task_targets_rep_select" on public.task_targets for select using (
  user_id = auth.uid()
);

-- task_completions: admins full, reps see + insert their own
create policy "task_completions_admin_all" on public.task_completions for all using (
  (select role from public.profiles where id = auth.uid()) = 'Admin'
);
create policy "task_completions_rep_select" on public.task_completions for select using (
  user_id = auth.uid()
);
create policy "task_completions_rep_insert" on public.task_completions for insert with check (
  user_id = auth.uid()
);
