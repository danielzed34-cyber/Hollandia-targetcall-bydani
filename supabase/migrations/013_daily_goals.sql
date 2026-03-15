-- ── Daily Goals ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_goals (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  date            date        NOT NULL DEFAULT current_date,
  goal_type       text        NOT NULL CHECK (goal_type IN ('team', 'individual')),
  target_user_id  uuid        REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_count    integer     NOT NULL CHECK (target_count > 0),
  status          text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active')),
  created_by      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  activated_at    timestamptz,
  CONSTRAINT unique_goal_per_user_per_day UNIQUE (date, goal_type, target_user_id)
);

ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins manage daily goals"
  ON public.daily_goals
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- Reps: read only active goals for themselves or team
CREATE POLICY "Reps read active goals"
  ON public.daily_goals
  FOR SELECT
  USING (
    status = 'active'
    AND (
      goal_type = 'team'
      OR target_user_id = auth.uid()
    )
  );

-- ── Daily Appointment Counts ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_appointment_counts (
  date     date NOT NULL DEFAULT current_date,
  user_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  count    integer NOT NULL DEFAULT 0,
  PRIMARY KEY (date, user_id)
);

ALTER TABLE public.daily_appointment_counts ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins manage appointment counts"
  ON public.daily_appointment_counts
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- Reps: read/write own row (service role used for upsert from API)
CREATE POLICY "Reps read own count"
  ON public.daily_appointment_counts
  FOR SELECT
  USING (user_id = auth.uid());

-- ── RPC: atomic increment ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_appointment_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.daily_appointment_counts (date, user_id, count)
  VALUES (current_date, p_user_id, 1)
  ON CONFLICT (date, user_id)
  DO UPDATE SET count = daily_appointment_counts.count + 1;
END;
$$;
