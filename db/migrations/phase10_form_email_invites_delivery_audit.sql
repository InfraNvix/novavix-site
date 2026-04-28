-- Phase 10: invite delivery audit columns
-- Depends on: phase9_form_email_invites.sql

alter table public.form_email_invites
  add column if not exists sent_at timestamptz null,
  add column if not exists last_error text null;
