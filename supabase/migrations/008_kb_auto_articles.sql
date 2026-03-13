-- ============================================================
--  008 – KB Auto-Articles: add status, image_url, ai_generated
-- ============================================================

-- status: 'draft' (AI just generated), 'pending_approval' (waiting for admin),
--         'approved' (visible to reps), 'rejected' (admin rejected)
-- Existing rows get 'approved' so nothing breaks.
alter table public.kb_articles
  add column if not exists status text not null default 'approved'
    check (status in ('draft', 'pending_approval', 'approved', 'rejected'));

alter table public.kb_articles
  add column if not exists image_url text;

alter table public.kb_articles
  add column if not exists ai_generated boolean not null default false;

-- Index for fast filtering by status
create index if not exists kb_articles_status on public.kb_articles (status);

-- Update RLS: reps can only SELECT approved articles
drop policy if exists "kb_select_all" on public.kb_articles;
create policy "kb_select_approved" on public.kb_articles for select using (
  status = 'approved'
  or (select role from public.profiles where id = auth.uid()) = 'Admin'
);
