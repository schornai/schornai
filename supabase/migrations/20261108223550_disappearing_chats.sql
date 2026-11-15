alter table public.realtime_documents
  add column expires_at timestamptz,
  add column expiry_seconds integer check (expiry_seconds between 60 and 31536000),
  add column deleted_at timestamptz;
create policy "Expired documents are inaccessible" on public.realtime_documents
  as restrictive for select to authenticated using (deleted_at is null);

-- Durable tombstones prevent stale Yjs snapshots, drafts and service-role
-- uploads from recreating content after deletion has begun.
create function public.guard_deleted_chat_document() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare parent_name text; deletion timestamptz;
begin
  parent_name := replace(new.document_name, 'activity_chat_currentMessage___', 'activity_chat___');
  if parent_name like 'activity_chat___%' then
    select deleted_at into deletion from public.realtime_documents where document_name = parent_name;
    if deletion is not null then
      new.deleted_at := deletion;
      new.document_data := null;
    end if;
  end if;
  if new.deleted_at is not null then new.document_data := null; end if;
  return new;
end $$;
create trigger guard_deleted_chat_document before insert or update on public.realtime_documents
  for each row execute function public.guard_deleted_chat_document();
revoke all on function public.guard_deleted_chat_document() from public, anon, authenticated;

-- Storage's RLS cannot protect against a late upload by a privileged worker.
-- This trigger only rejects writes; it never grants data access.
create function public.guard_deleted_chat_upload() returns trigger
language plpgsql security definer set search_path = '' as $$
declare deletion timestamptz;
begin
  if new.bucket_id = 'realtime_files' then
    -- Serialize in-flight uploads with the parent tombstone. A committed upload
    -- is either visible to cleanup or rejected after deletion has begun.
    select deleted_at into deletion from public.realtime_documents
      where document_name = split_part(new.name, '/', 1) for share;
    if deletion is not null then raise exception 'CHAT_DELETED' using errcode = '42501'; end if;
  end if;
  return new;
end $$;
create trigger guard_deleted_chat_upload before insert or update on storage.objects
  for each row execute function public.guard_deleted_chat_upload();
revoke all on function public.guard_deleted_chat_upload() from public, anon, authenticated;

-- Authorize the exact participant and atomically change both deadline and job.
-- Re-registration rotates ownership so a previously claimed handler is harmless.
create function public.set_chat_expiration(p_document_name text, p_user_id uuid, p_seconds integer)
returns timestamptz language plpgsql security invoker set search_path = '' as $$
declare doc public.realtime_documents; deadline timestamptz;
begin
  if p_seconds is not null and (p_seconds < 60 or p_seconds > 31536000 or p_seconds % 60 <> 0) then
    raise exception 'INVALID_CHAT_EXPIRATION' using errcode = '22023';
  end if;
  select * into doc from public.realtime_documents where document_name = p_document_name for update;
  if doc.id is null or doc.document_name !~ '^activity_chat___[0-9a-fA-F-]{36}_[a-zA-Z0-9-]+$' or doc.deleted_at is not null
    or not exists(select 1 from public.realtime_document_access where document_id = doc.id and user_id = p_user_id) then
    raise exception 'CHAT_ACCESS_DENIED' using errcode = '42501';
  end if;
  deadline := case when p_seconds is null then null else now() + make_interval(secs => p_seconds) end;
  update public.realtime_documents set expires_at = deadline, expiry_seconds = p_seconds where id = doc.id;
  if deadline is null then
    delete from public.scheduled_jobs where id = 'chat.expire:' || p_document_name;
  else
    insert into public.scheduled_jobs(id, kind, payload, run_at, max_attempts)
      values ('chat.expire:' || p_document_name, 'chat.expire', jsonb_build_object('documentName', p_document_name), deadline, 100)
    on conflict(id) do update set run_at = excluded.run_at, payload = excluded.payload,
      state = 'pending', attempts = 0, lease_token = null, lease_until = null, updated_at = now();
  end if;
  return deadline;
end $$;

create function public.begin_chat_expiration(p_document_name text, p_token uuid)
returns setof public.realtime_documents language plpgsql security invoker set search_path = '' as $$
declare doc public.realtime_documents;
begin
  select * into doc from public.realtime_documents where document_name = p_document_name for update;
  if doc.id is null then return; end if;
  perform 1 from public.scheduled_jobs where id = 'chat.expire:' || p_document_name
    and kind = 'chat.expire' and state = 'running' and lease_token = p_token and lease_until > now() for update;
  if not found or doc.expires_at is null or doc.expires_at > now() then return; end if;
  update public.realtime_documents set deleted_at = coalesce(deleted_at, now()), document_data = null where id = doc.id;
  -- Retain the parent and its ACL until history/file cleanup succeeds; RLS hides it.
  -- Keep a draft tombstone even if this draft has not yet reached persistence.
  insert into public.realtime_documents(document_name, deleted_at)
    values (replace(p_document_name, 'activity_chat___', 'activity_chat_currentMessage___'), now())
    on conflict(document_name) do update set deleted_at = excluded.deleted_at, document_data = null;
  return query select * from public.realtime_documents where id = doc.id;
end $$;

revoke all on function public.set_chat_expiration(text, uuid, integer), public.begin_chat_expiration(text, uuid) from public, anon, authenticated;
grant execute on function public.set_chat_expiration(text, uuid, integer), public.begin_chat_expiration(text, uuid) to service_role;

-- An expired activity ID can never be adopted again through an old URL.
CREATE OR REPLACE FUNCTION public.ensure_realtime_document(p_document_name text, p_user_ids uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_document_id uuid;
  v_activity_id text;
BEGIN
  IF p_document_name IS NULL OR length(p_document_name) = 0
    OR p_user_ids IS NULL OR cardinality(p_user_ids) = 0
    OR array_position(p_user_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid document owner' USING ERRCODE = '22023';
  END IF;

  -- Activity storage is keyed by activity ID alone. Claim that ID across all
  -- agent/transcriber parents before inserting to prevent storage aliasing.
  v_activity_id := substring(p_document_name FROM '^(?:activity_chat___|activity_transcription__)([^_]+)_');
  IF v_activity_id IS NOT NULL THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('realtime_activity:' || v_activity_id, 0));
    IF EXISTS (
      SELECT 1 FROM public.realtime_documents
      WHERE document_name <> p_document_name
        AND substring(document_name FROM '^(?:activity_chat___|activity_transcription__)([^_]+)_') = v_activity_id
    ) THEN
      RAISE EXCEPTION 'Activity already exists' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.realtime_documents (document_name)
  VALUES (p_document_name)
  ON CONFLICT (document_name) DO NOTHING
  RETURNING id INTO v_document_id;

  IF v_document_id IS NOT NULL THEN
    INSERT INTO public.realtime_document_access (document_id, user_id)
    SELECT v_document_id, user_id FROM (SELECT DISTINCT unnest(p_user_ids) AS user_id) AS owners;
  ELSE
    SELECT id INTO STRICT v_document_id FROM public.realtime_documents
    WHERE document_name = p_document_name;
    IF EXISTS (
      SELECT 1 FROM unnest(p_user_ids) AS requested(user_id)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.realtime_document_access AS access
        WHERE access.document_id = v_document_id AND access.user_id = requested.user_id
      )
    ) THEN
      RAISE EXCEPTION 'Document access denied' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.realtime_documents WHERE id = v_document_id AND deleted_at IS NOT NULL) THEN
    RAISE EXCEPTION 'CHAT_DELETED' USING ERRCODE = '42501';
  END IF;
  RETURN v_document_id;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.ensure_realtime_document(text, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_realtime_document(text, uuid[]) TO service_role;


create function public.is_chat_deleted(p_document_name text)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from public.realtime_documents where deleted_at is not null and (
      document_name = replace(p_document_name, 'activity_chat_currentMessage___', 'activity_chat___')
      or (p_document_name ~ '^storage___activity_[0-9a-fA-F-]{36}$'
        and substring(document_name from '^activity_chat___([^_]+)_') = substring(p_document_name from 20))
    )
  );
$$;
revoke all on function public.is_chat_deleted(text) from public, anon, authenticated;
grant execute on function public.is_chat_deleted(text) to service_role;

-- Correlate model task snapshots with their chat so prompts/results can be
-- removed even after callers have consumed and removed the live queue entry.
alter table public.task_claims add column chat_document_name text;
create index task_claims_chat on public.task_claims(chat_document_name) where chat_document_name is not null;
drop function public.claim_background_task(text, uuid, text);
create function public.claim_background_task(p_task_id text, p_owner_token uuid, p_snapshot text, p_chat_document_name text default null)
returns setof public.task_claims language plpgsql security invoker set search_path = '' as $$
declare deleted boolean := false;
begin
  if p_chat_document_name is not null then
    select deleted_at is not null into deleted from public.realtime_documents where document_name = p_chat_document_name for share;
  end if;
  insert into public.task_claims(task_id, owner_token, state, snapshot, expires_at, completed_at, recovery_pending, chat_document_name)
    values(p_task_id, p_owner_token, case when deleted then 'error' else 'claimed' end, case when deleted then null else p_snapshot end,
      clock_timestamp() + interval '90 seconds', case when deleted then clock_timestamp() else null end,
      false, p_chat_document_name)
    on conflict(task_id) do nothing;
  return query select * from public.task_claims where task_id = p_task_id;
end $$;
revoke all on function public.claim_background_task(text,uuid,text,text) from public, anon, authenticated;
grant execute on function public.claim_background_task(text,uuid,text,text) to service_role;

create function public.purge_chat_task_snapshots(p_document_name text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not exists(select from public.realtime_documents where document_name = p_document_name and deleted_at is not null) then
    raise exception 'CHAT_NOT_DELETED';
  end if;
  if exists(select from public.task_claims where chat_document_name = p_document_name and (state = 'claimed' or recovery_pending)) then
    raise exception 'CHAT_TASKS_BUSY';
  end if;
  update public.task_claims set snapshot = null where chat_document_name = p_document_name;
end $$;
revoke all on function public.purge_chat_task_snapshots(text) from public, anon, authenticated;
grant execute on function public.purge_chat_task_snapshots(text) to service_role;
