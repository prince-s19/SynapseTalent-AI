-- Roles
create type public.app_role as enum ('hr', 'employee');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select, insert on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create policy "read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());

create policy "claim own role" on public.user_roles
  for insert to authenticated with check (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  )
$$;

-- Link employees to auth users
alter table public.employees add column user_id uuid;
create unique index employees_user_id_key on public.employees (user_id);

grant insert, update on public.employees to authenticated;

create policy "create own employee record" on public.employees
  for insert to authenticated with check (user_id = auth.uid());

create policy "update own employee record" on public.employees
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Owner-managed projects
grant insert, update, delete on public.projects to authenticated;

create policy "manage own projects insert" on public.projects
  for insert to authenticated
  with check (exists (select 1 from public.employees e where e.id = projects.employee_id and e.user_id = auth.uid()));

create policy "manage own projects update" on public.projects
  for update to authenticated
  using (exists (select 1 from public.employees e where e.id = projects.employee_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.employees e where e.id = projects.employee_id and e.user_id = auth.uid()));

create policy "manage own projects delete" on public.projects
  for delete to authenticated
  using (exists (select 1 from public.employees e where e.id = projects.employee_id and e.user_id = auth.uid()));

-- Owner-managed declared skills
grant insert, update, delete on public.employee_skills to authenticated;

create policy "manage own skills insert" on public.employee_skills
  for insert to authenticated
  with check (exists (select 1 from public.employees e where e.id = employee_skills.employee_id and e.user_id = auth.uid()));

create policy "manage own skills update" on public.employee_skills
  for update to authenticated
  using (exists (select 1 from public.employees e where e.id = employee_skills.employee_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.employees e where e.id = employee_skills.employee_id and e.user_id = auth.uid()));

create policy "manage own skills delete" on public.employee_skills
  for delete to authenticated
  using (exists (select 1 from public.employees e where e.id = employee_skills.employee_id and e.user_id = auth.uid()));

-- Owner-managed consent
grant insert, update on public.consent_settings to authenticated;

create policy "manage own consent insert" on public.consent_settings
  for insert to authenticated
  with check (exists (select 1 from public.employees e where e.id = consent_settings.employee_id and e.user_id = auth.uid()));

create policy "manage own consent update" on public.consent_settings
  for update to authenticated
  using (exists (select 1 from public.employees e where e.id = consent_settings.employee_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.employees e where e.id = consent_settings.employee_id and e.user_id = auth.uid()));