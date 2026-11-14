-- Explicit manual runs are allowed while paused and never advance the schedule.
-- Authorization is performed by the shared operation before this service-only RPC.
create function public.enqueue_automation_manual(p_id uuid, p_user_id uuid, p_revision uuid, p_request_id uuid, p_event jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare run_id uuid;
begin
  perform 1 from public.automations where id=p_id and user_id=p_user_id and revision=p_revision for share;
  if not found then raise exception 'AUTOMATION_CHANGED'; end if;
  insert into public.automation_runs(automation_id, revision, occurrence, event)
    values(p_id,p_revision,'manual:' || p_request_id,p_event)
    on conflict (automation_id,revision,occurrence) do nothing returning id into run_id;
  if run_id is null then
    select id into run_id from public.automation_runs where automation_id=p_id and revision=p_revision and occurrence='manual:' || p_request_id;
  else
    insert into public.scheduled_jobs(id,kind,payload,run_at,max_attempts)
      values('automation.run:' || run_id,'automation.run',jsonb_build_object('runId',run_id),now(),100);
  end if;
  return run_id;
end $$;
revoke all on function public.enqueue_automation_manual(uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.enqueue_automation_manual(uuid,uuid,uuid,uuid,jsonb) to service_role;

create or replace function public.begin_automation_run(p_id uuid, p_token uuid)
returns setof public.automation_runs language plpgsql security invoker set search_path = '' as $$
declare r public.automation_runs;
begin
  select * into r from public.automation_runs where id = p_id for update;
  if r.id is null then return; end if;
  perform 1 from public.scheduled_jobs where id = 'automation.run:' || p_id
    and state = 'running' and lease_token = p_token and lease_until > now() for update;
  if not found then return; end if;
  if r.state = 'started' then
    update public.automation_runs set state = 'failed', error_code = 'AUTOMATION_INTERRUPTED', finished_at = now() where id = p_id;
    return;
  end if;
  if r.state <> 'pending' then return; end if;
  perform 1 from public.automations where id = r.automation_id and revision = r.revision and (enabled or r.occurrence like 'manual:%') for share;
  if not found then
    update public.automation_runs set state = 'cancelled', finished_at = now() where id = p_id;
    return;
  end if;
  return query update public.automation_runs set state = 'started', started_at = now() where id = p_id returning *;
end $$;
