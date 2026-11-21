begin;
set local role service_role;
insert into public.scheduled_jobs(id, kind, run_at) values
 ('test:once', 'test', now() - interval '1 second'),
 ('test:future', 'test', now() + interval '1 day'),
 ('test:unknown', 'unknown', now());
do $$
declare j public.scheduled_jobs; old_token uuid;
begin
 select * into j from public.claim_scheduled_job(array['test']);
 assert j.id = 'test:once';
 old_token := j.lease_token;
 assert not exists(select from public.claim_scheduled_job(array['test']));
 assert not public.finish_scheduled_job(j.id, gen_random_uuid(), true);
 assert public.renew_scheduled_job(j.id, old_token);
 update public.scheduled_jobs set lease_until = now() - interval '1 second' where id = j.id;
 assert not public.renew_scheduled_job(j.id, old_token);
 assert not public.finish_scheduled_job(j.id, old_token, true);
 select * into j from public.claim_scheduled_job(array['test']);
 assert j.attempts = 2 and j.lease_token <> old_token;
 assert public.finish_scheduled_job(j.id, j.lease_token, false);
 assert (select state = 'pending' and run_at > now() from public.scheduled_jobs where id = j.id);
 update public.scheduled_jobs set run_at = now(), max_attempts = 3 where id = j.id;
 select * into j from public.claim_scheduled_job(array['test']);
 assert public.finish_scheduled_job(j.id, j.lease_token, false);
 assert (select state = 'failed' from public.scheduled_jobs where id = j.id);
end $$;
insert into public.scheduled_jobs(id, kind, interval_seconds) values ('test:repeat', 'test', 60);
do $$
declare j public.scheduled_jobs;
begin
 select * into j from public.claim_scheduled_job(array['test']);
 assert public.finish_scheduled_job(j.id, j.lease_token, true);
 assert (select state = 'pending' and attempts = 0 and run_at = now() + interval '60 seconds' from public.scheduled_jobs where id = j.id);
 update public.scheduled_jobs set run_at = now(), interval_seconds = null where id = j.id;
 select * into j from public.claim_scheduled_job(array['test']);
 assert public.finish_scheduled_job(j.id, j.lease_token, true);
 assert (select state = 'completed' from public.scheduled_jobs where id = j.id);
end $$;
insert into public.scheduled_jobs(id, kind, max_attempts) values ('test:crash', 'crash', 1);
do $$
declare j public.scheduled_jobs;
begin
 select * into j from public.claim_scheduled_job(array['crash']);
 update public.scheduled_jobs set lease_until = now() - interval '1 second' where id = j.id;
 assert not exists(select from public.claim_scheduled_job(array['crash']));
 assert (select state = 'failed' from public.scheduled_jobs where id = j.id);
end $$;
insert into public.scheduled_jobs(id, kind) values ('test:cancel', 'cancel');
do $$
declare j public.scheduled_jobs;
begin
 select * into j from public.claim_scheduled_job(array['cancel']);
 -- Re-registration preserves a live claim and its payload.
 insert into public.scheduled_jobs(id, kind, payload) values (j.id, 'cancel', '{"changed":true}') on conflict(id) do nothing;
 assert (select lease_token = j.lease_token and payload = '{}'::jsonb from public.scheduled_jobs where id = j.id);
 delete from public.scheduled_jobs where id = j.id;
 insert into public.scheduled_jobs(id, kind) values (j.id, 'cancel');
 assert not public.renew_scheduled_job(j.id, j.lease_token);
 assert not public.finish_scheduled_job(j.id, j.lease_token, true);
end $$;
reset role;
do $$
begin
 assert not has_table_privilege('authenticated', 'public.scheduled_jobs', 'SELECT');
 assert not has_table_privilege('anon', 'public.scheduled_jobs', 'INSERT');
 assert not has_function_privilege('authenticated', 'public.claim_scheduled_job(text[])', 'EXECUTE');
 assert not has_function_privilege('anon', 'public.finish_scheduled_job(text,uuid,boolean)', 'EXECUTE');
end $$;
rollback;
