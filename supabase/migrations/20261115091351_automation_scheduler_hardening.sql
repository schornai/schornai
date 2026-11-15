create or replace function public.capture_automation_storage_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare object_name text; bucket text; event_name text; relative_path text; folder text; a public.automations; run_id uuid;
begin
  -- Access timestamps and other bookkeeping do not represent new file content.
  -- In particular, reading an attachment must not recursively trigger new runs.
  if TG_OP = 'UPDATE' and new.bucket_id is not distinct from old.bucket_id
    and new.name is not distinct from old.name
    and new.version is not distinct from old.version
    and new.metadata is not distinct from old.metadata
    and new.user_metadata is not distinct from old.user_metadata then return null; end if;
  if TG_OP = 'DELETE' then object_name := old.name; bucket := old.bucket_id; event_name := 'deleted';
  else
    object_name := new.name; bucket := new.bucket_id;
    event_name := case when TG_OP = 'INSERT' then 'uploaded' when old.name is distinct from new.name then 'moved' else 'updated' end;
  end if;
  if bucket not in ('database_files', 'realtime_files') then return null; end if;
  if right(object_name, length('.__xrag_content.mdc')) = '.__xrag_content.mdc' then
    if TG_OP = 'DELETE' then return null; end if;
    object_name := left(object_name, -length('.__xrag_content.mdc')); event_name := 'processed';
  elsif right(object_name, length('.__xrag_transcript.json')) = '.__xrag_transcript.json' or right(object_name, length('.__xrag_text_write.json')) = '.__xrag_text_write.json'
    or object_name like '%/.empty-folder-placeholder' then return null;
  end if;
  for a in select * from public.automations where enabled and storage_bucket = bucket
    and trigger->>'type' = 'storage' and (trigger->'events') ? event_name
  loop
    if left(object_name, length(a.storage_prefix)) <> a.storage_prefix then continue; end if;
    relative_path := substring(object_name from length(a.storage_prefix) + 1);
    folder := a.trigger->>'folder';
    if folder <> '' then
      if left(relative_path, length(folder) + 1) <> folder || '/' then continue; end if;
    end if;
    if not (a.trigger->>'includeSubfolders')::boolean
      and position('/' in substring(relative_path from case when folder = '' then 1 else length(folder) + 2 end)) > 0 then continue; end if;
    insert into public.automation_runs(automation_id, revision, occurrence, event)
      values (a.id, a.revision, gen_random_uuid()::text, jsonb_build_object('type', event_name, 'path', relative_path)) returning id into run_id;
    insert into public.scheduled_jobs(id, kind, payload, run_at, max_attempts)
      values ('automation.run:' || run_id, 'automation.run', jsonb_build_object('runId', run_id), now(), 100);
  end loop;
  return null;
end $$;
revoke all on function public.capture_automation_storage_event() from public, anon, authenticated;

-- Exhaustion is terminal for one-off work. Recurring maintenance must survive
-- prolonged outages, including a worker crash on its last attempt.
create or replace function public.claim_scheduled_job(p_kinds text[])
returns setof public.scheduled_jobs language plpgsql security invoker set search_path = '' as $$
begin
  update public.scheduled_jobs set
    state = case when interval_seconds is null then 'failed' else 'pending' end,
    attempts = case when interval_seconds is null then attempts else 0 end,
    run_at = case when interval_seconds is null then run_at else now() + make_interval(secs => greatest(3600, interval_seconds)) end,
    lease_token = null, lease_until = null, updated_at = now()
    where state = 'running' and lease_until <= now() and attempts >= max_attempts and kind = any(p_kinds);
  return query
    update public.scheduled_jobs j set state = 'running', attempts = attempts + 1,
      lease_token = gen_random_uuid(), lease_until = now() + interval '90 seconds', updated_at = now()
    where j.id = (
      select q.id from public.scheduled_jobs q
      where q.kind = any(p_kinds) and q.attempts < q.max_attempts
        and ((q.state = 'pending' and q.run_at <= now()) or (q.state = 'running' and q.lease_until <= now()))
      order by q.run_at, q.id for update skip locked limit 1
    ) returning j.*;
end;
$$;
create or replace function public.finish_scheduled_job(p_id text, p_token uuid, p_success boolean)
returns boolean language sql security invoker set search_path = '' as $$
  with finished as (
    update public.scheduled_jobs set
      state = case when p_success then case when interval_seconds is null then 'completed' else 'pending' end
        when attempts >= max_attempts and interval_seconds is null then 'failed' else 'pending' end,
      run_at = case when p_success and interval_seconds is not null then now() + make_interval(secs => interval_seconds)
        when not p_success and interval_seconds is not null and attempts >= max_attempts
          then now() + make_interval(secs => greatest(3600, interval_seconds))
        when not p_success then now() + make_interval(secs => least(3600, 5 * power(2, least(attempts - 1, 10)))::integer)
        else run_at end,
      attempts = case when p_success or (interval_seconds is not null and attempts >= max_attempts) then 0 else attempts end,
      lease_token = null, lease_until = null, updated_at = now()
    where id = p_id and state = 'running' and lease_token = p_token and lease_until > now() returning id
  ) select exists(select 1 from finished);
$$;
-- Recover recurring jobs already stranded by the previous implementation.
update public.scheduled_jobs set state = 'pending', attempts = 0,
  lease_token = null, lease_until = null,
  run_at = now() + make_interval(secs => greatest(3600, interval_seconds)), updated_at = now()
  where interval_seconds is not null and state = 'failed';
revoke all on function public.claim_scheduled_job(text[]), public.finish_scheduled_job(text,uuid,boolean) from public, anon, authenticated;
grant execute on function public.claim_scheduled_job(text[]), public.finish_scheduled_job(text,uuid,boolean) to service_role;
