-- ============================================================
--  009 – Add max_breaks_per_day to ai_settings
-- ============================================================
alter table public.ai_settings
  add column if not exists max_breaks_per_day integer not null default 1;
