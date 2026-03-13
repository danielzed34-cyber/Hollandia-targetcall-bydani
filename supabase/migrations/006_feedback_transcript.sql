-- Add transcript, rep action plan, and acknowledged status to feedback_requests

alter table public.feedback_requests
  add column if not exists transcript          text,
  add column if not exists action_improvements text,
  add column if not exists action_preservation text,
  add column if not exists acknowledged_at     timestamptz;

-- Extend status to include 'acknowledged'
alter table public.feedback_requests
  drop constraint if exists feedback_requests_status_check;
alter table public.feedback_requests
  add constraint feedback_requests_status_check
  check (status in ('pending', 'processing', 'done', 'acknowledged'));
