-- Analytics base views for COPSOQ dashboards.
-- Depends on: phase3_copsoq_foundation.sql + phase4 seed/processing data.

create or replace view public.copsoq_analytics_session_facts
with (security_invoker = true)
as
select
  s.id as session_id,
  s.company_id,
  s.submitted_at,
  (s.submitted_at at time zone 'UTC')::date as submitted_date,
  s.period_ref,
  c.id as collaborator_id,
  c.external_employee_id as collaborator_external_employee_id,
  c.full_name as collaborator_name,
  c.setor_id,
  c.setor_nome,
  c.ghe_id,
  c.ghe_nome,
  d.id as dimension_id,
  d.code as dimension_code,
  d.name as dimension_name,
  ids.score,
  ids.classification
from public.copsoq_individual_dimension_scores ids
join public.copsoq_response_sessions s on s.id = ids.session_id
join public.copsoq_collaborators c on c.id = ids.collaborator_id
join public.copsoq_dimensions d on d.id = ids.dimension_id
where s.status = 'processed'
  and s.submitted_at is not null;

grant select on public.copsoq_analytics_session_facts to authenticated;
