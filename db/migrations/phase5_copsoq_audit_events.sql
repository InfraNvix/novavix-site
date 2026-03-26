-- Phase 5: COPSOQ audit events (operational traceability)
-- Depends on: phase3_copsoq_foundation.sql

create table if not exists public.copsoq_audit_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  event_status text not null check (event_status in ('success', 'failure', 'denied')),
  actor_mode text not null check (actor_mode in ('api_key', 'user', 'system')),
  actor_role text,
  actor_user_id uuid,
  actor_email text,
  company_id uuid references public.companies(id) on delete set null,
  session_id uuid references public.copsoq_response_sessions(id) on delete set null,
  endpoint text,
  http_method text,
  ip text,
  payload_meta jsonb,
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists idx_copsoq_audit_created_at on public.copsoq_audit_events(created_at desc);
create index if not exists idx_copsoq_audit_event_name on public.copsoq_audit_events(event_name);
create index if not exists idx_copsoq_audit_company_id on public.copsoq_audit_events(company_id);
create index if not exists idx_copsoq_audit_session_id on public.copsoq_audit_events(session_id);

alter table public.copsoq_audit_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'copsoq_audit_events'
      and policyname = 'copsoq_audit_events_admin_read'
  ) then
    create policy copsoq_audit_events_admin_read
      on public.copsoq_audit_events
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

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'copsoq_audit_events'
      and policyname = 'copsoq_audit_events_admin_write'
  ) then
    create policy copsoq_audit_events_admin_write
      on public.copsoq_audit_events
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.user_profiles p
          where p.user_id = auth.uid()
            and p.is_active = true
            and p.role = 'admin'
        )
      )
      with check (
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
