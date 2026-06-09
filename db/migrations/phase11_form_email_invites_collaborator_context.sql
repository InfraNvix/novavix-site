-- Phase 11: collaborator context for one-time form invites
-- Depends on: phase10_form_email_invites_delivery_audit.sql

alter table public.form_email_invites
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists collaborator_id uuid references public.copsoq_collaborators(id) on delete set null,
  add column if not exists collaborator_external_employee_id text,
  add column if not exists collaborator_name text;

create index if not exists idx_form_email_invites_company_id
  on public.form_email_invites(company_id);

create index if not exists idx_form_email_invites_collaborator_id
  on public.form_email_invites(collaborator_id);
