-- Base import jobs and audit trail for generic file imports.
-- Supports collaborators in phase 1, with sectors/ghes prepared for future phases.

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('collaborators', 'sectors', 'ghes')),
  status text not null default 'preview_ready' check (status in ('preview_ready', 'committed', 'failed')),
  company_id uuid not null references public.companies(id) on delete restrict,
  created_by_user_id uuid references auth.users(id) on delete set null,
  actor_mode text not null check (actor_mode in ('user', 'api_key', 'system')),
  source_filename text not null,
  source_mime_type text,
  source_format text not null check (source_format in ('txt', 'csv', 'xlsx')),
  layout_key text not null,
  delimiter text,
  sheet_name text,
  mapping jsonb,
  validation_summary jsonb,
  commit_summary jsonb,
  total_rows integer,
  valid_rows integer,
  invalid_rows integer,
  imported_rows integer,
  ignored_rows integer,
  error_count integer,
  committed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_import_jobs_company_id on public.import_jobs(company_id);
create index if not exists idx_import_jobs_status on public.import_jobs(status);
create index if not exists idx_import_jobs_entity_type on public.import_jobs(entity_type);
create index if not exists idx_import_jobs_created_at on public.import_jobs(created_at desc);

create table if not exists public.import_job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.import_jobs(id) on delete cascade,
  event_name text not null,
  event_status text not null check (event_status in ('success', 'failure', 'denied')),
  actor_mode text not null check (actor_mode in ('user', 'api_key', 'system')),
  actor_role text,
  actor_user_id uuid,
  actor_email text,
  company_id uuid references public.companies(id) on delete set null,
  endpoint text,
  http_method text,
  ip text,
  payload_meta jsonb,
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists idx_import_job_events_job_id on public.import_job_events(job_id);
create index if not exists idx_import_job_events_company_id on public.import_job_events(company_id);
create index if not exists idx_import_job_events_created_at on public.import_job_events(created_at desc);
create index if not exists idx_import_job_events_event_name on public.import_job_events(event_name);

alter table public.import_jobs enable row level security;
alter table public.import_job_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'import_jobs'
      and policyname = 'import_jobs_select_scope'
  ) then
    create policy import_jobs_select_scope
      on public.import_jobs
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.user_profiles p
          where p.user_id = auth.uid()
            and p.is_active = true
            and (
              p.role = 'admin'
              or (p.role = 'empresa' and p.company_id = import_jobs.company_id)
            )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'import_jobs'
      and policyname = 'import_jobs_write_scope'
  ) then
    create policy import_jobs_write_scope
      on public.import_jobs
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.user_profiles p
          where p.user_id = auth.uid()
            and p.is_active = true
            and (
              p.role = 'admin'
              or (p.role = 'empresa' and p.company_id = import_jobs.company_id)
            )
        )
      )
      with check (
        exists (
          select 1
          from public.user_profiles p
          where p.user_id = auth.uid()
            and p.is_active = true
            and (
              p.role = 'admin'
              or (p.role = 'empresa' and p.company_id = import_jobs.company_id)
            )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'import_job_events'
      and policyname = 'import_job_events_select_admin'
  ) then
    create policy import_job_events_select_admin
      on public.import_job_events
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.user_profiles p
          where p.user_id = auth.uid()
            and p.is_active = true
            and p.role = 'admin'
        )
      );
  end if;
end
$$;
