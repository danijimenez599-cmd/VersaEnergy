-- 00016_improvement_monitoring_period.sql
-- VersaEnergy — Monitoring window for sustained improvement verification

alter table energy_improvements
  add column if not exists monitoring_start date,
  add column if not exists monitoring_end date,
  add column if not exists monitoring_status text not null default 'not_started'
    check (monitoring_status in ('not_started','in_progress','passed','failed')),
  add column if not exists monitoring_notes text;

create index if not exists idx_improvements_monitoring
  on energy_improvements(monitoring_status, monitoring_end);
