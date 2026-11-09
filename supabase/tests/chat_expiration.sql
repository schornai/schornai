begin;
insert into auth.users(id, email) values ('aab00000-0000-4000-8000-000000000001', 'expiry@example.test'), ('aab00000-0000-4000-8000-000000000002', 'stranger@example.test');
set local role service_role;
do $$
declare name text := 'activity_chat___aab00000-0000-4000-8000-000000000010_aab00000-0000-4000-8000-000000000020';
  owner_id uuid := 'aab00000-0000-4000-8000-000000000001'; deadline timestamptz; job public.scheduled_jobs; doc_id uuid;
begin
  doc_id := public.ensure_realtime_document(name, array[owner_id]);
  begin
    perform public.set_chat_expiration(name, 'aab00000-0000-4000-8000-000000000002', 60);
    raise exception 'Unauthorized schedule accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.set_chat_expiration(name, owner_id, 61);
    raise exception 'Invalid duration accepted';
  exception when invalid_parameter_value then null; end;
  deadline := public.set_chat_expiration(name, owner_id, 60);
  assert deadline = now() + interval '60 seconds';
  assert (select run_at = deadline and state = 'pending' from public.scheduled_jobs where id = 'chat.expire:' || name);
  assert not exists(select from public.claim_scheduled_job(array['chat.expire']));
  -- Claims from a previous deadline cannot delete a rescheduled chat.
  update public.scheduled_jobs set run_at = now() where id = 'chat.expire:' || name;
  select * into job from public.claim_scheduled_job(array['chat.expire']);
  perform public.set_chat_expiration(name, owner_id, 3600);
  assert not exists(select from public.begin_chat_expiration(name, job.lease_token));
  assert not public.finish_scheduled_job(job.id, job.lease_token, true);
  perform public.set_chat_expiration(name, owner_id, null);
  assert not exists(select from public.scheduled_jobs where id = job.id);
  assert (select expires_at is null from public.realtime_documents where id = doc_id);
  perform public.set_chat_expiration(name, owner_id, 60);
  update public.scheduled_jobs set run_at = now() where id = 'chat.expire:' || name;
  update public.realtime_documents set expires_at = now(), document_data = '\x736563726574' where id = doc_id;
  select * into job from public.claim_scheduled_job(array['chat.expire']);
  assert not exists(select from public.begin_chat_expiration(name, gen_random_uuid()));
  assert exists(select from public.begin_chat_expiration(name, job.lease_token));
  assert exists(select from public.begin_chat_expiration(name, job.lease_token)); -- retry
  assert public.is_chat_deleted(name);
  assert public.is_chat_deleted(replace(name, 'activity_chat___', 'activity_chat_currentMessage___'));
  assert public.is_chat_deleted('storage___activity_aab00000-0000-4000-8000-000000000010');
  assert not public.is_chat_deleted('storage___activity_aab00000-0000-4000-8000-000000000011');
  -- Late persistence cannot restore snapshots, including drafts.
  update public.realtime_documents set document_data = '\x736563726574', deleted_at = null where id = doc_id;
  assert (select deleted_at is not null and document_data is null from public.realtime_documents where id = doc_id);
  update public.realtime_documents set document_data = '\x736563726574' where document_name = replace(name, 'activity_chat___', 'activity_chat_currentMessage___');
  assert (select document_data is null from public.realtime_documents where document_name = replace(name, 'activity_chat___', 'activity_chat_currentMessage___'));
  begin
    perform public.set_chat_expiration(name, owner_id, null);
    raise exception 'Deletion was reversed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.ensure_realtime_document(name, array[owner_id]);
    raise exception 'Deleted chat was recreated';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects(bucket_id, name) values ('realtime_files', name || '/late.txt');
    raise exception 'Late upload was accepted';
  exception when insufficient_privilege then null; end;
end $$;
do $$
declare name text := 'activity_chat___aab00000-0000-4000-8000-000000000010_aab00000-0000-4000-8000-000000000020'; claim public.task_claims;
begin
 select * into claim from public.claim_background_task('expired-model', gen_random_uuid(), 'encoded-prompt', name);
 assert claim.state = 'error' and claim.chat_document_name = name and claim.snapshot is null;
 insert into public.task_claims(task_id,owner_token,state,snapshot,expires_at,completed_at,recovery_pending,chat_document_name) values ('old-model', gen_random_uuid(), 'finished', 'old-prompt', now(), now(), true, name);
 begin
   perform public.purge_chat_task_snapshots(name);
   raise exception 'Pending recovery was ignored';
 exception when raise_exception then
   if sqlerrm <> 'CHAT_TASKS_BUSY' then raise; end if;
 end;
 update public.task_claims set recovery_pending = false where task_id = 'old-model';
 perform public.purge_chat_task_snapshots(name);
 assert (select snapshot is null from public.task_claims where task_id = 'expired-model');
 assert exists(select from public.task_claims where task_id = 'expired-model');
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aab00000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
begin
 assert not exists(select from public.realtime_documents where document_name like 'activity_chat___aab00000%');
 assert not has_function_privilege('authenticated', 'public.set_chat_expiration(text,uuid,integer)', 'EXECUTE');
 assert not has_function_privilege('anon', 'public.begin_chat_expiration(text,uuid)', 'EXECUTE');
end $$;
rollback;
