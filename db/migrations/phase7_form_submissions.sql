-- Phase 7: dynamic form submissions
-- Depends on: phase6_company_forms.sql

create table if not exists public.company_form_submissions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.company_form_templates(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  respondent_name text,
  respondent_email text,
  answers_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_company_form_submissions_template_id
  on public.company_form_submissions(template_id);

create index if not exists idx_company_form_submissions_company_id
  on public.company_form_submissions(company_id);

create index if not exists idx_company_form_submissions_created_at
  on public.company_form_submissions(created_at desc);

alter table public.company_form_submissions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'company_form_submissions'
      and policyname = 'company_form_submissions_select_scope'
  ) then
    create policy company_form_submissions_select_scope
      on public.company_form_submissions
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
              or (p.role = 'empresa' and p.company_id = company_form_submissions.company_id)
            )
        )
      );
  end if;
end
$$;

