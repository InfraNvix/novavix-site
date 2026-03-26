-- Phase 4: COPSOQ II short seed (version + dimensions + 40 questions)
-- Depends on: phase3_copsoq_foundation.sql
-- Notes:
-- 1) This seed is idempotent.
-- 2) Question texts are stored as operational labels and can be replaced by validated official wording later.

with upsert_version as (
  insert into public.copsoq_questionnaire_versions (code, title, description, is_active)
  values (
    'copsoq_ii_short_v1_br',
    'COPSOQ II - Versao Curta (BR)',
    'Versao curta com 40 itens para processamento individual e agregado.',
    true
  )
  on conflict (code) do update
    set title = excluded.title,
        description = excluded.description,
        is_active = excluded.is_active,
        updated_at = now()
  returning id
), version_row as (
  select id from upsert_version
  union all
  select v.id
  from public.copsoq_questionnaire_versions v
  where v.code = 'copsoq_ii_short_v1_br'
  limit 1
), dimension_seed(code, name, description, sort_order) as (
  values
    ('exigencias_quantitativas', 'Exigencias Quantitativas', 'Volume e intensidade de demandas de trabalho.', 1),
    ('exigencias_emocionais', 'Exigencias Emocionais', 'Carga emocional percebida durante o trabalho.', 2),
    ('influencia_no_trabalho', 'Influencia no Trabalho', 'Percepcao de autonomia e participacao nas decisoes.', 3),
    ('desenvolvimento_no_trabalho', 'Desenvolvimento no Trabalho', 'Oportunidades de aprendizado e crescimento.', 4),
    ('apoio_social', 'Apoio Social', 'Suporte de colegas e lideranca imediata.', 5),
    ('qualidade_da_lideranca', 'Qualidade da Lideranca', 'Clareza, suporte e capacidade de coordenacao da lideranca.', 6),
    ('burnout', 'Burnout', 'Sinais de esgotamento relacionado ao trabalho.', 7),
    ('estresse', 'Estresse', 'Nivel de tensao e sobrecarga percebida.', 8)
)
insert into public.copsoq_dimensions (version_id, code, name, description, sort_order)
select vr.id, d.code, d.name, d.description, d.sort_order
from version_row vr
cross join dimension_seed d
on conflict (version_id, code) do update
  set name = excluded.name,
      description = excluded.description,
      sort_order = excluded.sort_order,
      updated_at = now();

with version_row as (
  select id
  from public.copsoq_questionnaire_versions
  where code = 'copsoq_ii_short_v1_br'
  limit 1
), question_seed(question_number, code, text, dimension_code, reverse_scored, sort_order) as (
  values
    (1, 'q01', 'Item 01 - Exigencias Quantitativas', 'exigencias_quantitativas', false, 1),
    (2, 'q02', 'Item 02 - Exigencias Quantitativas', 'exigencias_quantitativas', false, 2),
    (3, 'q03', 'Item 03 - Exigencias Quantitativas', 'exigencias_quantitativas', false, 3),
    (4, 'q04', 'Item 04 - Exigencias Quantitativas', 'exigencias_quantitativas', false, 4),
    (5, 'q05', 'Item 05 - Exigencias Quantitativas', 'exigencias_quantitativas', false, 5),

    (6, 'q06', 'Item 06 - Exigencias Emocionais', 'exigencias_emocionais', false, 6),
    (7, 'q07', 'Item 07 - Exigencias Emocionais', 'exigencias_emocionais', false, 7),
    (8, 'q08', 'Item 08 - Exigencias Emocionais', 'exigencias_emocionais', false, 8),
    (9, 'q09', 'Item 09 - Exigencias Emocionais', 'exigencias_emocionais', false, 9),
    (10, 'q10', 'Item 10 - Exigencias Emocionais', 'exigencias_emocionais', false, 10),

    (11, 'q11', 'Item 11 - Influencia no Trabalho', 'influencia_no_trabalho', false, 11),
    (12, 'q12', 'Item 12 - Influencia no Trabalho', 'influencia_no_trabalho', false, 12),
    (13, 'q13', 'Item 13 - Influencia no Trabalho', 'influencia_no_trabalho', false, 13),
    (14, 'q14', 'Item 14 - Influencia no Trabalho', 'influencia_no_trabalho', false, 14),
    (15, 'q15', 'Item 15 - Influencia no Trabalho', 'influencia_no_trabalho', false, 15),

    (16, 'q16', 'Item 16 - Desenvolvimento no Trabalho', 'desenvolvimento_no_trabalho', false, 16),
    (17, 'q17', 'Item 17 - Desenvolvimento no Trabalho', 'desenvolvimento_no_trabalho', false, 17),
    (18, 'q18', 'Item 18 - Desenvolvimento no Trabalho', 'desenvolvimento_no_trabalho', false, 18),
    (19, 'q19', 'Item 19 - Desenvolvimento no Trabalho', 'desenvolvimento_no_trabalho', false, 19),
    (20, 'q20', 'Item 20 - Desenvolvimento no Trabalho', 'desenvolvimento_no_trabalho', false, 20),

    (21, 'q21', 'Item 21 - Apoio Social', 'apoio_social', false, 21),
    (22, 'q22', 'Item 22 - Apoio Social', 'apoio_social', false, 22),
    (23, 'q23', 'Item 23 - Apoio Social', 'apoio_social', false, 23),
    (24, 'q24', 'Item 24 - Apoio Social', 'apoio_social', false, 24),
    (25, 'q25', 'Item 25 - Apoio Social', 'apoio_social', false, 25),

    (26, 'q26', 'Item 26 - Qualidade da Lideranca', 'qualidade_da_lideranca', false, 26),
    (27, 'q27', 'Item 27 - Qualidade da Lideranca', 'qualidade_da_lideranca', false, 27),
    (28, 'q28', 'Item 28 - Qualidade da Lideranca', 'qualidade_da_lideranca', false, 28),
    (29, 'q29', 'Item 29 - Qualidade da Lideranca', 'qualidade_da_lideranca', false, 29),
    (30, 'q30', 'Item 30 - Qualidade da Lideranca', 'qualidade_da_lideranca', false, 30),

    (31, 'q31', 'Item 31 - Burnout', 'burnout', false, 31),
    (32, 'q32', 'Item 32 - Burnout', 'burnout', false, 32),
    (33, 'q33', 'Item 33 - Burnout', 'burnout', false, 33),
    (34, 'q34', 'Item 34 - Burnout', 'burnout', false, 34),
    (35, 'q35', 'Item 35 - Burnout', 'burnout', false, 35),

    (36, 'q36', 'Item 36 - Estresse', 'estresse', false, 36),
    (37, 'q37', 'Item 37 - Estresse', 'estresse', false, 37),
    (38, 'q38', 'Item 38 - Estresse', 'estresse', false, 38),
    (39, 'q39', 'Item 39 - Estresse', 'estresse', false, 39),
    (40, 'q40', 'Item 40 - Estresse', 'estresse', false, 40)
)
insert into public.copsoq_questions (
  version_id,
  dimension_id,
  question_number,
  code,
  text,
  reverse_scored,
  sort_order
)
select
  vr.id,
  d.id,
  q.question_number,
  q.code,
  q.text,
  q.reverse_scored,
  q.sort_order
from version_row vr
join question_seed q
  on true
join public.copsoq_dimensions d
  on d.version_id = vr.id
 and d.code = q.dimension_code
on conflict (version_id, code) do update
  set dimension_id = excluded.dimension_id,
      question_number = excluded.question_number,
      text = excluded.text,
      reverse_scored = excluded.reverse_scored,
      sort_order = excluded.sort_order,
      updated_at = now();
