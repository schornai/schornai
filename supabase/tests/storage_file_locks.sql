begin;
insert into auth.users(id,email) values ('55763d93-cbc8-48be-aafc-663a913645b1','file-lock@example.test');
insert into public.organizations(id,name,description) values ('lock-workspace','Lock test','');
insert into public.databases(id,name,description,organization_id,config) values ('lock-repo','Lock test','','lock-workspace','{}');
insert into public.realtime_documents(id,document_name) values ('55763d93-cbc8-48be-aafc-663a913645b2','activity_chat___lockactivity_agent');
insert into public.realtime_document_access(document_id,user_id) values ('55763d93-cbc8-48be-aafc-663a913645b2','55763d93-cbc8-48be-aafc-663a913645b1');
set local role authenticated;
do $$
declare role_name text; claims jsonb;
begin
  foreach role_name in array array['user','editor','workspace-admin','admin'] loop
    claims := case when role_name = 'admin' then '"admin"'::jsonb else jsonb_build_array(jsonb_build_object('organization_id','lock-workspace','role',role_name)) end;
    perform set_config('request.jwt.claims',jsonb_build_object('sub','55763d93-cbc8-48be-aafc-663a913645b1','organization_roles',claims)::text,true);
    begin
      if not public.acquire_storage_file_lock('database_files','lock-workspace/lock-repo/file.txt','55763d93-cbc8-48be-aafc-663a913645b3') then raise exception 'First lock failed'; end if;
      if role_name = 'user' then raise exception 'Reader received write lock'; end if;
      if public.acquire_storage_file_lock('database_files','lock-workspace/lock-repo/file.txt','55763d93-cbc8-48be-aafc-663a913645b4') then raise exception 'Duplicate worker lock accepted'; end if;
      if not public.acquire_storage_file_lock('database_files','lock-workspace/lock-repo/file.txt','55763d93-cbc8-48be-aafc-663a913645b3') then raise exception 'Renewal failed'; end if;
      perform public.release_storage_file_lock('database_files','lock-workspace/lock-repo/file.txt','55763d93-cbc8-48be-aafc-663a913645b4');
      if public.acquire_storage_file_lock('database_files','lock-workspace/lock-repo/file.txt','55763d93-cbc8-48be-aafc-663a913645b4') then raise exception 'Wrong token released lock'; end if;
      perform public.release_storage_file_lock('database_files','lock-workspace/lock-repo/file.txt','55763d93-cbc8-48be-aafc-663a913645b3');
    exception when raise_exception then
      if role_name <> 'user' or sqlerrm <> 'NOT_AUTHORIZED' then raise; end if;
    end;
    begin
      perform public.acquire_storage_file_lock('database_files','other-workspace/lock-repo/file.txt','55763d93-cbc8-48be-aafc-663a913645b3');
      raise exception 'Forged workspace accepted';
    exception when raise_exception then if sqlerrm <> 'NOT_AUTHORIZED' then raise; end if; end;
  end loop;
  if not public.acquire_storage_file_lock('realtime_files','activity_chat___lockactivity_agent/file.txt','55763d93-cbc8-48be-aafc-663a913645b3') then raise exception 'Own activity inaccessible'; end if;
  begin
    perform public.acquire_storage_file_lock('realtime_files','activity_chat___foreign_agent/file.txt','55763d93-cbc8-48be-aafc-663a913645b3');
    raise exception 'Foreign activity accepted';
  exception when raise_exception then if sqlerrm <> 'NOT_AUTHORIZED' then raise; end if; end;
end;
$$;
reset role;
rollback;
