-- WhatsApp exceptional approval requests
-- Reps request admin approval to send a WA reminder to an unverified customer.
-- Admin approves → WA is sent automatically by the server.

create table if not exists public.whatsapp_approvals (
  id             uuid primary key default gen_random_uuid(),
  rep_id         uuid not null references public.profiles(id) on delete cascade,
  rep_name       text not null,
  customer_name  text not null,
  customer_phone text not null,
  branch         text not null,
  meeting_date   text not null,
  meeting_time   text not null,
  message        text not null,
  status         text not null default 'pending'
                   check (status in ('pending', 'sent', 'rejected')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.whatsapp_approvals enable row level security;

-- Reps can see and insert their own requests
create policy "wa_approvals_rep_select" on public.whatsapp_approvals
  for select using (auth.uid() = rep_id);
create policy "wa_approvals_rep_insert" on public.whatsapp_approvals
  for insert with check (auth.uid() = rep_id);

-- Admins can see and update all requests
create policy "wa_approvals_admin_all" on public.whatsapp_approvals
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'Admin'
    )
  );

-- Auto-update updated_at on status change
create or replace function update_wa_approvals_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger wa_approvals_updated_at
  before update on public.whatsapp_approvals
  for each row execute function update_wa_approvals_updated_at();
