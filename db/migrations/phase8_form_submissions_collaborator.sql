-- Phase 8: add collaborator reference to form submissions
-- Depends on: phase7_form_submissions.sql

alter table public.company_form_submissions
  add column if not exists collaborator_id uuid references public.copsoq_collaborators(id) on delete set null,
  add column if not exists collaborator_external_employee_id text,
  add column if not exists collaborator_name text;

create index if not exists idx_company_form_submissions_collaborator_id
  on public.company_form_submissions(collaborator_id);

