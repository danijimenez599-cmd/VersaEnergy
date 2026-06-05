-- 00026_e1_registry_lifecycle.sql
-- VersaEnergy E1 — Core Asset Registry lifecycle, sync events and accumulator guard.
--
-- Este archivo mantiene el mock local de Energy alineado con el contrato Core:
-- - Energy puede originar solicitudes si esta solo o si Maint gobierna.
-- - La deduplicacion no es flujo normal en maint_and_energy; aplica a adopcion,
--   imports y fusiones administrativas.
-- - Las lecturas acumuladoras no pueden retroceder sin evento auditado.

alter table public.asset_registry_requests
  add column if not exists requested_by uuid references public.profiles(id) on delete set null,
  add column if not exists decided_by uuid references public.profiles(id) on delete set null;

create table if not exists public.asset_registry_events (
  id                  uuid primary key default uuid_generate_v4(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  site_id             uuid not null references public.sites(id) on delete cascade,
  entity_type         text not null
                        check (entity_type in (
                          'asset',
                          'physical_meter',
                          'measurement_point',
                          'registry_request'
                        )),
  entity_id           uuid not null,
  related_request_id  uuid references public.asset_registry_requests(id) on delete set null,
  event_type          text not null
                        check (event_type in (
                          'created',
                          'updated',
                          'activated',
                          'standby',
                          'decommissioned',
                          'reactivated',
                          'request_created',
                          'request_approved',
                          'request_rejected',
                          'request_cancelled',
                          'adoption_requested',
                          'adopted',
                          'merge_requested',
                          'merged',
                          'measurement_point_created',
                          'measurement_point_updated',
                          'meter_changed',
                          'meter_reset',
                          'meter_rollover',
                          'manual_correction',
                          'sync_published',
                          'sync_applied',
                          'sync_conflict',
                          'imported'
                        )),
  source_app          text not null default 'versa_energy'
                        check (source_app in ('versa_maint', 'versa_energy', 'versa_platform', 'api', 'import', 'system')),
  actor_id            uuid references public.profiles(id) on delete set null,
  event_payload       jsonb not null default '{}',
  notes               text,
  created_at          timestamptz not null default now(),
  check (jsonb_typeof(event_payload) = 'object')
);

alter table public.asset_registry_events enable row level security;

create policy "Asset registry events — view in own company"
  on public.asset_registry_events for select
  using (company_id = get_my_company_id());

create policy "Asset registry events — manage in own company"
  on public.asset_registry_events for insert
  with check (
    company_id = get_my_company_id()
    and get_my_role() in ('admin', 'engineer', 'manager')
  );

create index if not exists idx_are_company_created
  on public.asset_registry_events(company_id, created_at desc);
create index if not exists idx_are_site_created
  on public.asset_registry_events(site_id, created_at desc);
create index if not exists idx_are_entity
  on public.asset_registry_events(entity_type, entity_id, created_at desc);
create index if not exists idx_are_request
  on public.asset_registry_events(related_request_id)
  where related_request_id is not null;

create or replace function public.fn_log_asset_registry_event(
  p_company_id uuid,
  p_site_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_event_type text,
  p_source_app text default 'system',
  p_related_request_id uuid default null,
  p_event_payload jsonb default '{}',
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_id uuid;
begin
  insert into public.asset_registry_events (
    company_id,
    site_id,
    entity_type,
    entity_id,
    related_request_id,
    event_type,
    source_app,
    actor_id,
    event_payload,
    notes
  ) values (
    p_company_id,
    p_site_id,
    p_entity_type,
    p_entity_id,
    p_related_request_id,
    p_event_type,
    coalesce(p_source_app, 'system'),
    (select p.id from public.profiles p where p.auth_id = auth.uid() limit 1),
    coalesce(p_event_payload, '{}'),
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function public.fn_asset_registry_request_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_type text;
begin
  if tg_op = 'INSERT' then
    v_event_type := case
      when new.request_type = 'adopt_physical_asset' then 'adoption_requested'
      when new.request_type = 'merge_physical_asset' then 'merge_requested'
      else 'request_created'
    end;
  elsif new.status is distinct from old.status then
    v_event_type := case new.status
      when 'approved' then 'request_approved'
      when 'rejected' then 'request_rejected'
      when 'merged' then 'merged'
      when 'cancelled' then 'request_cancelled'
      else null
    end;
  end if;

  if v_event_type is not null then
    perform public.fn_log_asset_registry_event(
      new.company_id,
      new.site_id,
      'registry_request',
      new.id,
      v_event_type,
      new.requested_from_app,
      new.id,
      jsonb_build_object(
        'request_type', new.request_type,
        'status', new.status,
        'target_asset_id', new.target_asset_id,
        'proposed_parent_id', new.proposed_parent_id,
        'decision_payload', new.decision_payload
      ),
      new.decision_notes
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_asset_registry_request_event on public.asset_registry_requests;
create trigger trg_asset_registry_request_event
after insert or update of status, decision_payload, decision_notes
on public.asset_registry_requests
for each row execute function public.fn_asset_registry_request_event();

alter table public.measurement_readings
  add column if not exists measurement_event_type text
    check (
      measurement_event_type is null
      or measurement_event_type in ('meter_changed', 'meter_reset', 'meter_rollover', 'manual_correction')
    ),
  add column if not exists previous_reading_id uuid references public.measurement_readings(id) on delete set null,
  add column if not exists validation_status text not null default 'accepted'
    check (validation_status in ('accepted', 'accepted_with_event', 'rejected')),
  add column if not exists validation_notes text,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

create or replace function public.fn_guard_measurement_reading_accumulator()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_mp record;
  v_prev record;
  v_allowed_event boolean;
begin
  select mp.id, mp.measurement_type, mp.site_id, s.company_id
    into v_mp
  from public.measurement_points mp
  join public.sites s on s.id = mp.site_id
  where mp.id = new.measurement_point_id;

  if v_mp.id is null then
    raise exception 'MeasurementPoint no encontrado.';
  end if;

  select id, value, recorded_at
    into v_prev
  from public.measurement_readings
  where measurement_point_id = new.measurement_point_id
    and recorded_at < new.recorded_at
  order by recorded_at desc, created_at desc
  limit 1;

  new.previous_reading_id := coalesce(new.previous_reading_id, v_prev.id);
  new.created_by := coalesce(
    new.created_by,
    (select p.id from public.profiles p where p.auth_id = auth.uid() limit 1)
  );

  if v_mp.measurement_type in ('accumulator', 'counter') and v_prev.id is not null and new.value < v_prev.value then
    v_allowed_event := coalesce(new.measurement_event_type in (
      'meter_changed',
      'meter_reset',
      'meter_rollover',
      'manual_correction'
    ), false);

    if not v_allowed_event then
      raise exception 'Lectura acumuladora menor que la anterior. Declare meter_reset, meter_changed, meter_rollover o manual_correction.'
        using errcode = '22003';
    end if;

    new.validation_status := 'accepted_with_event';
    new.validation_notes := coalesce(
      new.validation_notes,
      format('Valor anterior %s en %s; nuevo valor %s con evento %s.',
        v_prev.value,
        v_prev.recorded_at,
        new.value,
        new.measurement_event_type
      )
    );
  else
    new.validation_status := coalesce(new.validation_status, 'accepted');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_measurement_reading_accumulator on public.measurement_readings;
create trigger trg_guard_measurement_reading_accumulator
before insert on public.measurement_readings
for each row execute function public.fn_guard_measurement_reading_accumulator();

create or replace function public.fn_measurement_reading_registry_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_site_id uuid;
  v_company_id uuid;
begin
  if new.measurement_event_type is null then
    return new;
  end if;

  select mp.site_id, s.company_id
    into v_site_id, v_company_id
  from public.measurement_points mp
  join public.sites s on s.id = mp.site_id
  where mp.id = new.measurement_point_id;

  perform public.fn_log_asset_registry_event(
    v_company_id,
    v_site_id,
    'measurement_point',
    new.measurement_point_id,
    new.measurement_event_type,
    'versa_energy',
    null,
    jsonb_build_object(
      'reading_id', new.id,
      'value', new.value,
      'recorded_at', new.recorded_at,
      'quality', new.quality,
      'previous_reading_id', new.previous_reading_id,
      'validation_status', new.validation_status
    ),
    coalesce(new.validation_notes, new.notes)
  );

  return new;
end;
$$;

drop trigger if exists trg_measurement_reading_registry_event on public.measurement_readings;
create trigger trg_measurement_reading_registry_event
after insert on public.measurement_readings
for each row execute function public.fn_measurement_reading_registry_event();

create or replace function public.fn_record_measurement_reading_tx(
  p_measurement_point_id uuid,
  p_value numeric,
  p_recorded_at timestamptz default now(),
  p_quality text default 'manual',
  p_notes text default null,
  p_measurement_event_type text default null,
  p_event_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_mp record;
  v_reading public.measurement_readings%rowtype;
begin
  select mp.id, mp.site_id, s.company_id
    into v_mp
  from public.measurement_points mp
  join public.sites s on s.id = mp.site_id
  where mp.id = p_measurement_point_id;

  if v_mp.id is null then
    raise exception 'MeasurementPoint no encontrado.';
  end if;

  if v_mp.company_id is distinct from get_my_company_id() then
    raise exception 'No autorizado para registrar lectura en esta empresa.';
  end if;

  if get_my_role() not in ('admin', 'engineer', 'manager', 'operator') then
    raise exception 'Rol no autorizado para registrar lecturas.';
  end if;

  insert into public.measurement_readings (
    measurement_point_id,
    value,
    recorded_at,
    quality,
    notes,
    measurement_event_type,
    validation_notes
  ) values (
    p_measurement_point_id,
    p_value,
    coalesce(p_recorded_at, now()),
    coalesce(p_quality, 'manual'),
    p_notes,
    nullif(btrim(coalesce(p_measurement_event_type, '')), ''),
    nullif(btrim(coalesce(p_event_notes, '')), '')
  )
  returning * into v_reading;

  return jsonb_build_object(
    'id', v_reading.id,
    'measurement_point_id', v_reading.measurement_point_id,
    'value', v_reading.value,
    'recorded_at', v_reading.recorded_at,
    'quality', v_reading.quality,
    'measurement_event_type', v_reading.measurement_event_type,
    'validation_status', v_reading.validation_status,
    'previous_reading_id', v_reading.previous_reading_id
  );
end;
$$;

grant execute on function public.fn_log_asset_registry_event(uuid, uuid, text, uuid, text, text, uuid, jsonb, text) to authenticated;
grant execute on function public.fn_record_measurement_reading_tx(uuid, numeric, timestamptz, text, text, text, text) to authenticated;
