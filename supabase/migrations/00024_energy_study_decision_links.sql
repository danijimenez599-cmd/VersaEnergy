-- 00024_energy_study_decision_links.sql
-- Trazabilidad desde estudios hacia acciones y evidencia SGEn.

alter table energy_improvements
  add column if not exists source_study_id uuid references energy_studies(id) on delete set null,
  add column if not exists source_study_model_id uuid references energy_study_models(id) on delete set null;

create index if not exists idx_improvements_source_study on energy_improvements(source_study_id);
create index if not exists idx_improvements_source_study_model on energy_improvements(source_study_model_id);

alter table energy_study_decisions
  drop constraint if exists energy_study_decisions_decision_type_check;

alter table energy_study_decisions
  add constraint energy_study_decisions_decision_type_check
  check (decision_type in (
    'promote_enpi',
    'create_improvement',
    'request_meter',
    'update_baseline',
    'create_sgen_evidence',
    'archive'
  ));
