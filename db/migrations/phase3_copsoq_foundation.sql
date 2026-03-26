-- Phase 3: COPSOQ II short foundation (transactional model + baseline RLS)
-- Run this script in Supabase SQL editor after phase2_companies_user_profiles.sql.

create table if not exists public.copsoq_questionnaire_versions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.copsoq_dimensions (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.copsoq_questionnaire_versions(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint copsoq_dimensions_version_code_uk unique (version_id, code)
);

create table if not exists public.copsoq_questions (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.copsoq_questionnaire_versions(id) on delete cascade,
  dimension_id uuid not null references public.copsoq_dimensions(id) on delete restrict,
  question_number smallint not null,
  code text not null,
  text text not null,
  reverse_scored boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint copsoq_questions_number_ck check (question_number between 1 and 40),
  constraint copsoq_questions_version_number_uk unique (version_id, question_number),
  constraint copsoq_questions_version_code_uk unique (version_id, code)
);

create table if not exists public.copsoq_collaborators (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  external_employee_id text,
  full_name text,
  email text,
  cpf_hash text,
  setor_id uuid,
  setor_nome text,
  ghe_id text,
  ghe_nome text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint copsoq_collaborators_external_uk unique (company_id, external_employee_id)
);

create table if not exists public.copsoq_response_sessions (
  id uuid primary key default gen_random_uuid(),
  questionnaire_version_id uuid not null references public.copsoq_questionnaire_versions(id) on delete restrict,
  collaborator_id uuid not null references public.copsoq_collaborators(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  period_ref text,
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'processed')),
  submitted_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.copsoq_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.copsoq_response_sessions(id) on delete cascade,
  question_id uuid not null references public.copsoq_questions(id) on delete restrict,
  raw_value smallint not null check (raw_value between 1 and 5),
  score_0_100 numeric(5,2) not null check (score_0_100 between 0 and 100),
  created_at timestamptz not null default now(),
  constraint copsoq_answers_session_question_uk unique (session_id, question_id)
);

create table if not exists public.copsoq_individual_dimension_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.copsoq_response_sessions(id) on delete cascade,
  collaborator_id uuid not null references public.copsoq_collaborators(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  dimension_id uuid not null references public.copsoq_dimensions(id) on delete restrict,
  score numeric(5,2) not null check (score between 0 and 100),
  classification text not null check (classification in ('saudavel', 'medio_alerta', 'critico')),
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint copsoq_individual_scores_session_dimension_uk unique (session_id, dimension_id)
);

create table if not exists public.copsoq_group_dimension_aggregates (
  id uuid primary key default gen_random_uuid(),
  questionnaire_version_id uuid not null references public.copsoq_questionnaire_versions(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  setor_id uuid,
  setor_nome text,
  ghe_id text,
  ghe_nome text,
  period_start date not null,
  period_end date not null,
  dimension_id uuid not null references public.copsoq_dimensions(id) on delete restrict,
  respondent_count integer not null check (respondent_count >= 0),
  mean_score numeric(5,2) not null check (mean_score between 0 and 100),
  classification text not null check (classification in ('saudavel', 'medio_alerta', 'critico')),
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint copsoq_group_aggregates_period_ck check (period_end >= period_start)
);

create index if not exists idx_copsoq_dimensions_version on public.copsoq_dimensions(version_id);
create index if not exists idx_copsoq_questions_version on public.copsoq_questions(version_id);
create index if not exists idx_copsoq_questions_dimension on public.copsoq_questions(dimension_id);

create index if not exists idx_copsoq_collaborators_company on public.copsoq_collaborators(company_id);
create index if not exists idx_copsoq_collaborators_ghe on public.copsoq_collaborators(ghe_id);
create index if not exists idx_copsoq_collaborators_setor on public.copsoq_collaborators(setor_id);

create index if not exists idx_copsoq_sessions_company on public.copsoq_response_sessions(company_id);
create index if not exists idx_copsoq_sessions_collaborator on public.copsoq_response_sessions(collaborator_id);
create index if not exists idx_copsoq_sessions_period on public.copsoq_response_sessions(period_ref);
create index if not exists idx_copsoq_sessions_submitted_at on public.copsoq_response_sessions(submitted_at);

create index if not exists idx_copsoq_answers_session on public.copsoq_answers(session_id);
create index if not exists idx_copsoq_answers_question on public.copsoq_answers(question_id);

create index if not exists idx_copsoq_individual_company on public.copsoq_individual_dimension_scores(company_id);
create index if not exists idx_copsoq_individual_collaborator on public.copsoq_individual_dimension_scores(collaborator_id);
create index if not exists idx_copsoq_individual_dimension on public.copsoq_individual_dimension_scores(dimension_id);
create index if not exists idx_copsoq_individual_computed_at on public.copsoq_individual_dimension_scores(computed_at);

create index if not exists idx_copsoq_group_aggregates_company on public.copsoq_group_dimension_aggregates(company_id);
create index if not exists idx_copsoq_group_aggregates_dimension on public.copsoq_group_dimension_aggregates(dimension_id);
create index if not exists idx_copsoq_group_aggregates_ghe on public.copsoq_group_dimension_aggregates(ghe_id);
create index if not exists idx_copsoq_group_aggregates_setor on public.copsoq_group_dimension_aggregates(setor_id);
create index if not exists idx_copsoq_group_aggregates_period on public.copsoq_group_dimension_aggregates(period_start, period_end);

create unique index if not exists uq_copsoq_group_aggregates_scope
  on public.copsoq_group_dimension_aggregates (
    questionnaire_version_id,
    company_id,
    coalesce(setor_id::text, '__null__'),
    coalesce(setor_nome, '__null__'),
    coalesce(ghe_id, '__null__'),
    coalesce(ghe_nome, '__null__'),
    period_start,
    period_end,
    dimension_id
  );

alter table public.copsoq_questionnaire_versions enable row level security;
alter table public.copsoq_dimensions enable row level security;
alter table public.copsoq_questions enable row level security;
alter table public.copsoq_collaborators enable row level security;
alter table public.copsoq_response_sessions enable row level security;
alter table public.copsoq_answers enable row level security;
alter table public.copsoq_individual_dimension_scores enable row level security;
alter table public.copsoq_group_dimension_aggregates enable row level security;

-- Readable questionnaire catalog for authenticated users.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'copsoq_questionnaire_versions'
      and policyname = 'copsoq_versions_select_authenticated'
  ) then
    create policy copsoq_versions_select_authenticated
      on public.copsoq_questionnaire_versions
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'copsoq_dimensions'
      and policyname = 'copsoq_dimensions_select_authenticated'
  ) then
    create policy copsoq_dimensions_select_authenticated
      on public.copsoq_dimensions
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'copsoq_questions'
      and policyname = 'copsoq_questions_select_authenticated'
  ) then
    create policy copsoq_questions_select_authenticated
      on public.copsoq_questions
      for select
      to authenticated
      using (true);
  end if;
end
$$;

-- Aggregated results can be read by admin users and by company users from their own company.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'copsoq_group_dimension_aggregates'
      and policyname = 'copsoq_group_aggregates_select_scope'
  ) then
    create policy copsoq_group_aggregates_select_scope
      on public.copsoq_group_dimension_aggregates
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
              or (p.role = 'empresa' and p.company_id = copsoq_group_dimension_aggregates.company_id)
            )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'copsoq_group_dimension_aggregates'
      and policyname = 'copsoq_group_aggregates_write_admin'
  ) then
    create policy copsoq_group_aggregates_write_admin
      on public.copsoq_group_dimension_aggregates
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

-- Individual-level tables are restricted to admin only (technical access will be expanded in next phases).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'copsoq_collaborators'
      and policyname = 'copsoq_collaborators_admin_all'
  ) then
    create policy copsoq_collaborators_admin_all
      on public.copsoq_collaborators
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

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'copsoq_response_sessions'
      and policyname = 'copsoq_response_sessions_admin_all'
  ) then
    create policy copsoq_response_sessions_admin_all
      on public.copsoq_response_sessions
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

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'copsoq_answers'
      and policyname = 'copsoq_answers_admin_all'
  ) then
    create policy copsoq_answers_admin_all
      on public.copsoq_answers
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

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'copsoq_individual_dimension_scores'
      and policyname = 'copsoq_individual_scores_admin_all'
  ) then
    create policy copsoq_individual_scores_admin_all
      on public.copsoq_individual_dimension_scores
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
