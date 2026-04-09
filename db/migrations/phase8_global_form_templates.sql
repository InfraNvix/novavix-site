-- Phase 8: global form templates (remove company requirement)
-- Depends on: phase6_company_forms.sql

alter table public.company_form_templates
  alter column company_id drop not null;

