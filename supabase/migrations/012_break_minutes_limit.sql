-- ============================================================
--  012 – Replace per-count break limit with per-day minutes limit
-- ============================================================
alter table public.ai_settings
  add column if not exists max_break_minutes_per_day integer not null default 35;
