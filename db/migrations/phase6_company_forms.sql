-- Phase 6: company form templates (admin upload pipeline)
-- Depends on: phase2_companies_user_profiles.sql

create table if not exists public.company_form_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_name text not null,
  source_format text not null check (source_format in ('json', 'csv', 'xlsx')),
  source_file_name text not null,
  schema_json jsonb not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  uploaded_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_company_form_templates_company_id
  on public.company_form_templates(company_id);

create index if not exists idx_company_form_templates_status
  on public.company_form_templates(status);

create index if not exists idx_company_form_templates_created_at
  on public.company_form_templates(created_at desc);

alter table public.company_form_templates enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'company_form_templates'
      and policyname = 'company_form_templates_select_scope'
  ) then
    create policy company_form_templates_select_scope
      on public.company_form_templates
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.user_profiles p
          where p.user_id = auth.uid()
            and p.is_active = true
            and (
              p.role in ('admin', 'tecnico', 'clinica')
              or (p.role = 'empresa' and p.company_id = company_form_templates.company_id)
            )
        )
      );
  end if;
end
$$;

