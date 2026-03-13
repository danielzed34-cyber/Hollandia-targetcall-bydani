-- ============================================================
--  Migration 002 – Add nickname to profiles
--  Run this in Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

alter table public.profiles
  add column if not exists nickname text;

-- Allow users to update their own nickname (already covered by profiles_update_own policy)
-- Allow admins to update any profile's nickname via service role (no extra policy needed)
