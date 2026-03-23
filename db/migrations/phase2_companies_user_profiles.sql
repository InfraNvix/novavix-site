-- Phase 2: minimal model for company authentication and access profiles
-- Run this script in Supabase SQL editor.

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  cnpj varchar(14) not null unique,
  razao_social text not null,
  nome_fantasia text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'empresa')),
  company_id uuid references public.companies(id) on delete restrict,
  login_email text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_role_company_ck check (
    (role = 'admin' and company_id is null) or
    (role = 'empresa' and company_id is not null)
  )
);

create index if not exists idx_companies_cnpj on public.companies(cnpj);
create index if not exists idx_user_profiles_company_id on public.user_profiles(company_id);
create index if not exists idx_user_profiles_role on public.user_profiles(role);

-- Optional: basic RLS starter policies. Review before production usage.
alter table public.companies enable row level security;
alter table public.user_profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'user_profiles_select_own'
  ) then
    create policy user_profiles_select_own
      on public.user_profiles
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;

