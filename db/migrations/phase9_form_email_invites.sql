-- Phase 9: one-time form invites by email
-- Depends on: phase8_form_submissions_collaborator.sql

create table if not exists public.form_email_invites (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.company_form_templates(id) on delete cascade,
  recipient_email text not null,
  token_hash text not null unique,
  status text not null default 'pending',
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null
);

create index if not exists idx_form_email_invites_template_id
  on public.form_email_invites(template_id);

create index if not exists idx_form_email_invites_recipient_email
  on public.form_email_invites(recipient_email);

create index if not exists idx_form_email_invites_status_expires_at
  on public.form_email_invites(status, expires_at);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'form_email_invites_status_check'
  ) then
    alter table public.form_email_invites
      add constraint form_email_invites_status_check
      check (status in ('pending', 'used', 'expired', 'revoked'));
  end if;
end
$$;

alter table public.company_form_submissions
  alter column company_id drop not null;

alter table public.company_form_submissions
  add column if not exists invite_id uuid null references public.form_email_invites(id) on delete set null;

create index if not exists idx_company_form_submissions_invite_id
  on public.company_form_submissions(invite_id);

create unique index if not exists uq_company_form_submissions_invite_id
  on public.company_form_submissions(invite_id)
  where invite_id is not null;
