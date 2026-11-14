-- Personal definitions are never shared, even with workspace administrators.
-- Mutations go through the authorized application operations; workers alone
-- may advance deadlines and create durable runs.
create table public.automations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id text not null references public.chatbots(id) on delete cascade,
  name text not null check (length(name) between 1 and 200),
  message text not null check (length(message) between 1 and 100000),
  enabled boolean not null default true,
  access_level text not null default 'admin' check (access_level in ('editor', 'workspace', 'admin')),
  trigger jsonb not null check (trigger->>'type' in ('time', 'storage')),
  storage_bucket text,
  storage_prefix text,
  next_run_at timestamptz,
  revision uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index automations_owner on public.automations(user_id, created_at desc);
create index automations_agent on public.automations(agent_id);
create index automations_due on public.automations(next_run_at) where enabled and next_run_at is not null;
create index automations_storage on public.automations(storage_bucket) where enabled and storage_bucket is not null;
alter table public.automations enable row level security;
revoke all on public.automations from anon, authenticated;
grant select on public.automations to authenticated;
grant all on public.automations to service_role;
create policy "Read own automations" on public.automations for select to authenticated
  using (user_id = (select auth.uid()) and public.authorize('editor'::public.user_role));

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  revision uuid not null,
  occurrence text not null,
  event jsonb,
  activity_id uuid not null default gen_random_uuid(),
  state text not null default 'pending' check (state in ('pending', 'started', 'queued', 'failed', 'cancelled')),
  error_code text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  unique(automation_id, revision, occurrence)
);
create index automation_runs_history on public.automation_runs(automation_id, created_at desc);
alter table public.automation_runs enable row level security;
revoke all on public.automation_runs from anon, authenticated;
grant select on public.automation_runs to authenticated;
grant all on public.automation_runs to service_role;
create policy "Read own automation runs" on public.automation_runs for select to authenticated
  using (exists(select 1 from public.automations a where a.id = automation_id));

-- Enqueue and advance the exact version/deadline atomically. Concurrent
-- dispatchers cannot create two runs for the same occurrence.
create function public.enqueue_automation_time(p_id uuid, p_revision uuid, p_due timestamptz, p_next timestamptz)
returns void language plpgsql security invoker set search_path = '' as $$
declare run_id uuid;
begin
  perform 1 from public.automations where id = p_id and revision = p_revision
    and enabled and next_run_at = p_due and next_run_at <= now() for update;
  if not found then return; end if;
  insert into public.automation_runs(automation_id, revision, occurrence)
    values (p_id, p_revision, p_due::text) on conflict do nothing returning id into run_id;
  if run_id is not null then
    insert into public.scheduled_jobs(id, kind, payload, run_at, max_attempts)
      values ('automation.run:' || run_id, 'automation.run', jsonb_build_object('runId', run_id), now(), 100);
  end if;
  update public.automations set next_run_at = p_next where id = p_id;
end $$;

-- Fence external chat submission durably. An interrupted started run is never
-- replayed: sending twice is worse than surfacing an interrupted execution.
create function public.begin_automation_run(p_id uuid, p_token uuid)
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
  perform 1 from public.automations where id = r.automation_id and revision = r.revision and enabled for share;
  if not found then
    update public.automation_runs set state = 'cancelled', finished_at = now() where id = p_id;
    return;
  end if;
  return query update public.automation_runs set state = 'started', started_at = now() where id = p_id returning *;
end $$;
revoke all on function public.enqueue_automation_time(uuid, uuid, timestamptz, timestamptz), public.begin_automation_run(uuid, uuid) from public, anon, authenticated;
grant execute on function public.enqueue_automation_time(uuid, uuid, timestamptz, timestamptz), public.begin_automation_run(uuid, uuid) to service_role;

-- The object mutation and its automation outbox are one transaction. This also
-- sees uploads/deletions from external clients and processing sidecar writes.
create function public.capture_automation_storage_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare object_name text; bucket text; event_name text; relative_path text; folder text; a public.automations; run_id uuid;
begin
  if TG_OP = 'DELETE' then object_name := old.name; bucket := old.bucket_id; event_name := 'deleted';
  else
    object_name := new.name; bucket := new.bucket_id;
    event_name := case when TG_OP = 'INSERT' then 'uploaded' when old.name is distinct from new.name then 'moved' else 'updated' end;
  end if;
  if bucket not in ('database_files', 'realtime_files') then return null; end if;
  if object_name like '%.__xrag_content.mdc' then
    if TG_OP = 'DELETE' then return null; end if;
    object_name := left(object_name, -length('.__xrag_content.mdc')); event_name := 'processed';
  elsif object_name like '%.__xrag_transcript.json' or object_name like '%.__xrag_text_write.json'
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
create trigger capture_automation_storage_event after insert or update or delete on storage.objects
  for each row execute function public.capture_automation_storage_event();
