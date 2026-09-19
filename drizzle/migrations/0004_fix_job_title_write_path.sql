alter table public.employees add column if not exists job_title text;

update public.employees set job_title = "current_role" where job_title is null;

alter table public.employees alter column "current_role" set default 'Not set';

create or replace function public.sync_employee_job_title()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.job_title is null or btrim(new.job_title) = '' then
    new.job_title := coalesce(nullif(btrim(new."current_role"), ''), 'Not set');
  end if;
  if new.job_title in ('supabase_read_only_user', 'authenticated', 'anon', 'service_role', 'postgres') then
    new.job_title := 'Not set';
  end if;
  new."current_role" := new.job_title;
  return new;
end;
$$;

drop trigger if exists employees_sync_job_title on public.employees;
create trigger employees_sync_job_title
before insert or update on public.employees
for each row execute function public.sync_employee_job_title();

update public.employees
set job_title = 'Not set'
where job_title in ('supabase_read_only_user', 'authenticated', 'anon', 'service_role', 'postgres');

grant select (job_title), update (job_title), insert (job_title) on public.employees to authenticated;
grant select (job_title) on public.employees to anon;