-- ── Registration Requests ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.registration_requests (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text        NOT NULL,
  full_name     text        NOT NULL,
  enc_password  text        NOT NULL,
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','approved','rejected')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated) can submit a registration request
CREATE POLICY "Public can insert registration requests"
  ON public.registration_requests FOR INSERT
  WITH CHECK (true);

-- Only Admins can view
CREATE POLICY "Admins can view registration requests"
  ON public.registration_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Only Admins can update (approve / reject)
CREATE POLICY "Admins can update registration requests"
  ON public.registration_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );
