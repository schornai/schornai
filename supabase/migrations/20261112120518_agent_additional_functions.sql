-- Keep new-chat defaults, participant authorization and scheduling atomic.
create or replace function public.set_chat_expiration(p_document_name text, p_user_id uuid, p_seconds integer)
returns timestamptz language plpgsql security invoker set search_path = '' as $$
declare doc public.realtime_documents; deadline timestamptz;
begin
  if p_seconds is not null and p_seconds <> 43200 then
    raise exception 'INVALID_CHAT_EXPIRATION' using errcode = '22023';
  end if;
  select * into doc from public.realtime_documents where document_name = p_document_name for update;
  if doc.id is null or doc.document_name !~ '^activity_chat___[0-9a-fA-F-]{36}_[a-zA-Z0-9-]+$' or doc.deleted_at is not null
    or not exists(select 1 from public.realtime_document_access where document_id = doc.id and user_id = p_user_id) then
    raise exception 'CHAT_ACCESS_DENIED' using errcode = '42501';
  end if;
  -- Disabling an existing deadline remains possible after the agent disables
  -- the feature. Enabling must respect the current agent configuration.
  if p_seconds is not null and exists (
    select 1 from public.chatbots
    where id = substring(p_document_name from '^activity_chat___[^_]+_(.+)$')
      and config #> '{additionalFunctions,disappearingChats}' = 'false'::jsonb
  ) then
    raise exception 'CHAT_EXPIRATION_DISABLED' using errcode = '42501';
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
    -- Apply the default only in the creation transaction, after ownership is
    -- established. Retries/reloads must never restart or re-enable a timer.
    IF p_document_name ~ '^activity_chat___[0-9a-fA-F-]{36}_[a-zA-Z0-9-]+$'
      AND EXISTS (
        SELECT 1 FROM public.chatbots
        WHERE id = substring(p_document_name FROM '^activity_chat___[^_]+_(.+)$')
          AND config #>> '{additionalFunctions,disappearingChats}' = 'default-on'
      ) THEN
      PERFORM public.set_chat_expiration(p_document_name, p_user_ids[1], 43200);
    END IF;
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
