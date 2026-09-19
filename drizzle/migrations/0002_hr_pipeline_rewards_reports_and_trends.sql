-- Public profile links on the employee record
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS github_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS slack_url TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT;

-- ============ HR-only structured profile analyses ============
CREATE TABLE IF NOT EXISTS public.profile_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  generated_by UUID,
  analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profile_analyses_employee_idx ON public.profile_analyses(employee_id, created_at DESC);
GRANT SELECT ON public.profile_analyses TO authenticated;
GRANT ALL ON public.profile_analyses TO service_role;
ALTER TABLE public.profile_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr reads profile analyses" ON public.profile_analyses
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'hr'));

-- ============ Recognitions (HR rewards) ============
CREATE TABLE IF NOT EXISTS public.recognitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  badge TEXT NOT NULL,
  message TEXT,
  awarded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recognitions_employee_idx ON public.recognitions(employee_id, created_at DESC);
GRANT SELECT ON public.recognitions TO authenticated;
GRANT ALL ON public.recognitions TO service_role;
ALTER TABLE public.recognitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr reads recognitions" ON public.recognitions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'hr'));
CREATE POLICY "employee reads own recognitions" ON public.recognitions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = recognitions.employee_id AND e.user_id = auth.uid()));

-- ============ HR reports sent to employees ============
CREATE TABLE IF NOT EXISTS public.hr_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hr_reports_employee_idx ON public.hr_reports(employee_id, created_at DESC);
GRANT SELECT ON public.hr_reports TO authenticated;
GRANT ALL ON public.hr_reports TO service_role;
ALTER TABLE public.hr_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr reads hr reports" ON public.hr_reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'hr'));
CREATE POLICY "employee reads own hr reports" ON public.hr_reports
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = hr_reports.employee_id AND e.user_id = auth.uid()));

-- ============ Internal mobility candidate pipeline ============
CREATE TABLE IF NOT EXISTS public.pipeline_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  stage TEXT NOT NULL DEFAULT 'identified',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS pipeline_candidates_unique ON public.pipeline_candidates(employee_id, role_id);
GRANT SELECT ON public.pipeline_candidates TO authenticated;
GRANT ALL ON public.pipeline_candidates TO service_role;
ALTER TABLE public.pipeline_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr reads pipeline" ON public.pipeline_candidates
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'hr'));
CREATE POLICY "employee reads own pipeline" ON public.pipeline_candidates
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = pipeline_candidates.employee_id AND e.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.mobility_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.pipeline_candidates(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_by UUID,
  response TEXT,
  response_note TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mobility_messages_candidate_idx ON public.mobility_messages(candidate_id, created_at DESC);
GRANT SELECT ON public.mobility_messages TO authenticated;
GRANT ALL ON public.mobility_messages TO service_role;
ALTER TABLE public.mobility_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr reads mobility messages" ON public.mobility_messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'hr'));
CREATE POLICY "employee reads own mobility messages" ON public.mobility_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pipeline_candidates c
    JOIN public.employees e ON e.id = c.employee_id
    WHERE c.id = mobility_messages.candidate_id AND e.user_id = auth.uid()
  ));

-- ============ Industry trends cache ============
CREATE TABLE IF NOT EXISTS public.industry_trends_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_key TEXT NOT NULL UNIQUE,
  trends JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'curated',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.industry_trends_cache TO anon, authenticated;
GRANT ALL ON public.industry_trends_cache TO service_role;
ALTER TABLE public.industry_trends_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read trends cache" ON public.industry_trends_cache
  FOR SELECT TO anon, authenticated USING (true);