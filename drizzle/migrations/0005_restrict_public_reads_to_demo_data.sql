-- Helper: is this employee a purely fictional demo record?
create or replace function public.is_demo_employee(_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.employees e
    where e.id = _employee_id
      and e.demo_employee is true
      and e.user_id is null
  )
$$;

revoke all on function public.is_demo_employee(uuid) from public, anon;
grant execute on function public.is_demo_employee(uuid) to authenticated, service_role;

-- has_role should not be callable by anonymous visitors
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

-- employees ------------------------------------------------------------
drop policy if exists "demo read employees" on public.employees;

create policy "anon reads demo employees"
on public.employees for select to anon
using (demo_employee is true and user_id is null);

create policy "authenticated reads demo employees"
on public.employees for select to authenticated
using (demo_employee is true and user_id is null);

create policy "employee reads own employee record"
on public.employees for select to authenticated
using (user_id = auth.uid());

create policy "hr reads employees"
on public.employees for select to authenticated
using (public.has_role(auth.uid(), 'hr'));

-- employee_skills ------------------------------------------------------
drop policy if exists "demo read employee_skills" on public.employee_skills;

create policy "anon reads demo employee_skills"
on public.employee_skills for select to anon
using (public.is_demo_employee(employee_id));

create policy "authenticated reads demo employee_skills"
on public.employee_skills for select to authenticated
using (public.is_demo_employee(employee_id));

create policy "employee reads own employee_skills"
on public.employee_skills for select to authenticated
using (exists (select 1 from public.employees e where e.id = employee_skills.employee_id and e.user_id = auth.uid()));

create policy "hr reads employee_skills"
on public.employee_skills for select to authenticated
using (public.has_role(auth.uid(), 'hr'));

-- projects -------------------------------------------------------------
drop policy if exists "demo read projects" on public.projects;

create policy "anon reads demo projects"
on public.projects for select to anon
using (public.is_demo_employee(employee_id));

create policy "authenticated reads demo projects"
on public.projects for select to authenticated
using (public.is_demo_employee(employee_id));

create policy "employee reads own projects"
on public.projects for select to authenticated
using (exists (select 1 from public.employees e where e.id = projects.employee_id and e.user_id = auth.uid()));

create policy "hr reads projects"
on public.projects for select to authenticated
using (public.has_role(auth.uid(), 'hr'));

-- role_matches ---------------------------------------------------------
drop policy if exists "demo read role_matches" on public.role_matches;

create policy "anon reads demo role_matches"
on public.role_matches for select to anon
using (public.is_demo_employee(employee_id));

create policy "authenticated reads demo role_matches"
on public.role_matches for select to authenticated
using (public.is_demo_employee(employee_id));

create policy "employee reads own role_matches"
on public.role_matches for select to authenticated
using (exists (select 1 from public.employees e where e.id = role_matches.employee_id and e.user_id = auth.uid()));

create policy "hr reads role_matches"
on public.role_matches for select to authenticated
using (public.has_role(auth.uid(), 'hr'));

-- career_roadmaps ------------------------------------------------------
drop policy if exists "demo read career_roadmaps" on public.career_roadmaps;

create policy "anon reads demo career_roadmaps"
on public.career_roadmaps for select to anon
using (public.is_demo_employee(employee_id));

create policy "authenticated reads demo career_roadmaps"
on public.career_roadmaps for select to authenticated
using (public.is_demo_employee(employee_id));

create policy "employee reads own career_roadmaps"
on public.career_roadmaps for select to authenticated
using (exists (select 1 from public.employees e where e.id = career_roadmaps.employee_id and e.user_id = auth.uid()));

create policy "hr reads career_roadmaps"
on public.career_roadmaps for select to authenticated
using (public.has_role(auth.uid(), 'hr'));

-- enrichment_runs ------------------------------------------------------
drop policy if exists "demo read enrichment_runs" on public.enrichment_runs;

create policy "employee reads own enrichment_runs"
on public.enrichment_runs for select to authenticated
using (exists (select 1 from public.employees e where e.id = enrichment_runs.employee_id and e.user_id = auth.uid()));

create policy "hr reads enrichment_runs"
on public.enrichment_runs for select to authenticated
using (public.has_role(auth.uid(), 'hr'));

create policy "authenticated reads demo enrichment_runs"
on public.enrichment_runs for select to authenticated
using (public.is_demo_employee(employee_id));

-- consent_settings -----------------------------------------------------
drop policy if exists "demo read consent_settings" on public.consent_settings;

create policy "employee reads own consent_settings"
on public.consent_settings for select to authenticated
using (exists (select 1 from public.employees e where e.id = consent_settings.employee_id and e.user_id = auth.uid()));

create policy "hr reads consent_settings"
on public.consent_settings for select to authenticated
using (public.has_role(auth.uid(), 'hr'));

create policy "authenticated reads demo consent_settings"
on public.consent_settings for select to authenticated
using (public.is_demo_employee(employee_id));

-- reference data: keep catalogue public, lock the scraped trends cache --
drop policy if exists "read trends cache" on public.industry_trends_cache;

create policy "authenticated reads trends cache"
on public.industry_trends_cache for select to authenticated
using (true);

revoke select on public.industry_trends_cache from anon;
revoke select on public.consent_settings from anon;
revoke select on public.enrichment_runs from anon;