-- Allow 'normal' as a valid constraint_type so we can store all 5 days per submission.
-- This lets us accurately track whether a rep has submitted (hasSubmitted = any row exists).

alter table public.shift_constraints
  drop constraint if exists shift_constraints_constraint_type_check;

alter table public.shift_constraints
  add constraint shift_constraints_constraint_type_check
  check (constraint_type in ('normal', 'day_off', 'short_shift'));
