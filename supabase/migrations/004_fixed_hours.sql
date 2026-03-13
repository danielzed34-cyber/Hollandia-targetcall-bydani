-- Add fixed shift hours to profiles
-- Admin can set these per rep; used as defaults for "normal" shift days

alter table public.profiles
  add column if not exists shift_start_fixed text,  -- e.g. "09:00"
  add column if not exists shift_end_fixed   text;  -- e.g. "17:00"
