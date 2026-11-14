begin;
insert into auth.users(id,email) values ('aac00000-0000-4000-8000-000000000001','defaults@example.test');
insert into public.organizations(id,name,description) values ('expiry-defaults','Expiry defaults','');
insert into public.chatbots(id,organization_id,name,description,roles,config)
values ('expiry-defaults-agent','expiry-defaults','Defaults','','{}','{"additionalFunctions":{"disappearingChats":"default-on"}}');
set local role service_role;
do $$
declare name text := 'activity_chat___aac00000-0000-4000-8000-000000000010_expiry-defaults-agent';
  owner_id uuid := 'aac00000-0000-4000-8000-000000000001'; doc_id uuid; deadline timestamptz;
begin
  doc_id := public.ensure_realtime_document(name,array[owner_id]);
  select expires_at into deadline from public.realtime_documents where id=doc_id;
  assert deadline = now() + interval '12 hours';
  assert (select run_at=deadline from public.scheduled_jobs where id='chat.expire:'||name);
  perform public.ensure_realtime_document(name,array[owner_id]);
  assert (select expires_at=deadline from public.realtime_documents where id=doc_id);
  perform public.set_chat_expiration(name,owner_id,null);
  perform public.ensure_realtime_document(name,array[owner_id]);
  assert (select expires_at is null from public.realtime_documents where id=doc_id);
  assert not exists(select from public.scheduled_jobs where id='chat.expire:'||name);
  begin
    perform public.set_chat_expiration(name,owner_id,3600);
    raise exception 'Non-12-hour duration accepted';
  exception when invalid_parameter_value then null; end;
  perform public.set_chat_expiration(name,owner_id,43200);
  update public.chatbots set config='{"additionalFunctions":{"disappearingChats":false}}' where id='expiry-defaults-agent';
  begin
    perform public.set_chat_expiration(name,owner_id,43200);
    raise exception 'Disabled feature accepted';
  exception when insufficient_privilege then null; end;
  perform public.set_chat_expiration(name,owner_id,null);
  doc_id := public.ensure_realtime_document(replace(name,'000000000010','000000000011'),array[owner_id]);
  assert (select expires_at is null from public.realtime_documents where id=doc_id);
  update public.chatbots set config='{"additionalFunctions":{"disappearingChats":true}}' where id='expiry-defaults-agent';
  doc_id := public.ensure_realtime_document(replace(name,'000000000010','000000000012'),array[owner_id]);
  assert (select expires_at is null from public.realtime_documents where id=doc_id);
  perform public.set_chat_expiration(replace(name,'000000000010','000000000012'),owner_id,43200);
end $$;
rollback;
