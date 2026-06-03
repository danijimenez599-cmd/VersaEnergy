-- 00017_sgen_enhancements.sql
-- VersaEnergy — SGEn Phase 2: política lifecycle, tratamiento de riesgos, control operacional de SEUs

-- sgen_policy_documents: agregar estado de ciclo de vida
alter table sgen_policy_documents
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'active', 'superseded'));

-- sgen_risks_opportunities: plan de tratamiento y riesgo residual post-control
alter table sgen_risks_opportunities
  add column if not exists treatment_plan text,
  add column if not exists review_date date,
  add column if not exists residual_probability text
    check (residual_probability in ('low', 'medium', 'high')),
  add column if not exists residual_impact text
    check (residual_impact in ('low', 'medium', 'high'));

-- sgen_significant_uses: control operacional, variables relevantes, mantenimiento
alter table sgen_significant_uses
  add column if not exists operational_criteria text,
  add column if not exists relevant_variables text[] default '{}',
  add column if not exists maintenance_criteria text,
  add column if not exists review_frequency text;

-- Índices para nuevas queries de madurez
create index if not exists idx_sgen_policy_site   on sgen_policy_documents(site_id);
create index if not exists idx_sgen_risks_site    on sgen_risks_opportunities(site_id);
create index if not exists idx_sgen_mgmt_site     on sgen_management_reviews(site_id);
