begin;
set local storage.allow_delete_query = 'true';
insert into auth.users(id,email) values
 ('aae00000-0000-4000-8000-000000000001','automation-owner@example.test'),
 ('aae00000-0000-4000-8000-000000000002','automation-other@example.test');
insert into public.organizations(id,name,description) values ('automation-test','Automation','');
insert into public.chatbots(id,organization_id,name,description,roles,config)
 values ('automation-agent','automation-test','Agent','','{}','{}');
insert into public.automations(id,user_id,agent_id,name,message,trigger,next_run_at)
 values ('aae00000-0000-4000-8000-000000000010','aae00000-0000-4000-8000-000000000001','automation-agent','Time','Hello','{"type":"time","schedule":{"kind":"hours","every":1}}',now());
do $$ begin
 assert (select description = '' and color is null and icon is null from public.automations where id='aae00000-0000-4000-8000-000000000010'), 'Existing definitions must remain valid without appearance';
 update public.automations set description='Card description',color='{"type":"color-oklch-hue","oklchHue":290}',icon='{"type":"icon-lucide","iconName":"calendar-clock"}' where id='aae00000-0000-4000-8000-000000000010';
 assert (select message='Hello' and description='Card description' and icon->>'iconName'='calendar-clock' from public.automations where id='aae00000-0000-4000-8000-000000000010'), 'Appearance must be independent from the chat message';
 begin
  update public.automations set color='[]' where id='aae00000-0000-4000-8000-000000000010';
  raise exception 'Invalid appearance accepted';
 exception when check_violation then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aae00000-0000-4000-8000-000000000002","organization_roles":"admin"}',true);
do $$ begin
 assert (select count(*) = 0 from public.automations), 'Other admins must not see personal automations';
 assert not has_table_privilege('authenticated','public.automations','INSERT');
 assert not has_function_privilege('authenticated','public.begin_automation_run(uuid,uuid)','EXECUTE');
end $$;
select set_config('request.jwt.claims','{"sub":"aae00000-0000-4000-8000-000000000001","organization_roles":[{"organization_id":"automation-test","role":"editor"}]}',true);
do $$ begin assert (select count(*) = 1 from public.automations); end $$;
select set_config('request.jwt.claims','{"sub":"aae00000-0000-4000-8000-000000000001","organization_roles":[{"organization_id":"automation-test","role":"user"}]}',true);
do $$ begin assert (select count(*) = 0 from public.automations); end $$;
reset role;
set local role service_role;
do $$ declare a public.automations; r public.automation_runs; token uuid := gen_random_uuid(); begin
 select * into a from public.automations where id='aae00000-0000-4000-8000-000000000010';
 perform public.enqueue_automation_time(a.id,a.revision,a.next_run_at,now()+interval '1 hour');
 perform public.enqueue_automation_time(a.id,a.revision,a.next_run_at,now()+interval '1 hour');
 assert (select count(*)=1 from public.automation_runs where automation_id=a.id), 'Duplicate time occurrence';
 select * into r from public.automation_runs where automation_id=a.id;
 assert (select count(*)=0 from public.begin_automation_run(r.id,token)), 'Unleased run started';
 update public.scheduled_jobs set state='running', lease_token=token, lease_until=now()+interval '1 minute' where id='automation.run:'||r.id;
 assert (select count(*)=1 from public.begin_automation_run(r.id,token));
 assert (select count(*)=0 from public.begin_automation_run(r.id,token)), 'Started run replayed';
 assert (select state='failed' and error_code='AUTOMATION_INTERRUPTED' from public.automation_runs where id=r.id);
end $$;
reset role;
insert into public.automations(id,user_id,agent_id,name,message,trigger,storage_bucket,storage_prefix)
 values ('aae00000-0000-4000-8000-000000000011','aae00000-0000-4000-8000-000000000001','automation-agent','Files','Summarize',
 '{"type":"storage","events":["uploaded","processed","deleted"],"folder":"inbox","includeSubfolders":true,"attachment":"copy"}', 'database_files','automation-test/repository/');
insert into storage.objects(bucket_id,name) values
 ('database_files','automation-test/repository/inbox/sub/report.pdf'),
 ('database_files','automation-test/repository/inbox-other/report.pdf'),
 ('database_files','automation-test/repository/inbox/sub/report.pdf.__xrag_content.mdc');
do $$ begin
 assert (select count(*)=2 from public.automation_runs where automation_id='aae00000-0000-4000-8000-000000000011');
 assert exists(select from public.automation_runs where event->>'type'='processed' and event->>'path'='inbox/sub/report.pdf');
end $$;
delete from storage.objects where name='automation-test/repository/inbox/sub/report.pdf';
do $$ begin assert exists(select from public.automation_runs where event->>'type'='deleted' and event->>'path'='inbox/sub/report.pdf'); end $$;
do $$ declare a public.automations; run_id uuid; request_id uuid := gen_random_uuid(); token uuid := gen_random_uuid(); before_due timestamptz; begin
 assert not has_function_privilege('authenticated','public.enqueue_automation_manual(uuid,uuid,uuid,uuid,jsonb)','EXECUTE');
 select * into a from public.automations where id='aae00000-0000-4000-8000-000000000010';
 before_due := a.next_run_at;
 update public.automations set enabled=false where id=a.id;
 run_id := public.enqueue_automation_manual(a.id,a.user_id,a.revision,request_id,'{"type":"manual","path":"","accessLevel":"editor"}');
 assert public.enqueue_automation_manual(a.id,a.user_id,a.revision,request_id,'{}') = run_id, 'Manual retry must reuse its run';
 assert (select count(*)=1 from public.scheduled_jobs where id='automation.run:'||run_id);
 assert (select next_run_at=before_due and not enabled from public.automations where id=a.id), 'Manual run changes schedule';
 update public.scheduled_jobs set state='running',lease_token=token,lease_until=now()+interval '1 minute' where id='automation.run:'||run_id;
 assert (select count(*)=1 from public.begin_automation_run(run_id,token)), 'Paused manual run must start';
 begin
   perform public.enqueue_automation_manual(a.id,'aae00000-0000-4000-8000-000000000002',a.revision,gen_random_uuid(),'{}');
   raise exception 'Expected owner rejection';
 exception when raise_exception then
   assert SQLERRM='AUTOMATION_CHANGED';
 end;
end $$;
rollback;
