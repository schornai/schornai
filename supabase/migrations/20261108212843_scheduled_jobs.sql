-- Trusted server scheduling only. Handlers must tolerate at-least-once delivery.
create table public.scheduled_jobs (
  id text primary key check (length(id) between 1 and 200),
  kind text not null check (length(kind) between 1 and 100),
  payload jsonb not null default '{}'::jsonb,
  run_at timestamptz not null default now() check (isfinite(run_at)),
  interval_seconds integer check (interval_seconds >= 1),
  state text not null default 'pending' check (state in ('pending', 'running', 'completed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 100),
  lease_token uuid,
  lease_until timestamptz,
  updated_at timestamptz not null default now(),
  check ((state = 'running') = (lease_token is not null and lease_until is not null))
);
alter table public.scheduled_jobs enable row level security;
revoke all on public.scheduled_jobs from public, anon, authenticated;
grant all on public.scheduled_jobs to service_role;
create index scheduled_jobs_due on public.scheduled_jobs (run_at, id) where state = 'pending';
create index scheduled_jobs_expired on public.scheduled_jobs (lease_until) where state = 'running';

-- Lock and claim together: competing servers never acquire the same live lease.
create function public.claim_scheduled_job(p_kinds text[])
returns setof public.scheduled_jobs language plpgsql security invoker set search_path = '' as $$
begin
  update public.scheduled_jobs set state = 'failed', lease_token = null, lease_until = null, updated_at = now()
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
create function public.renew_scheduled_job(p_id text, p_token uuid)
returns boolean language sql security invoker set search_path = '' as $$
  with renewed as (
    update public.scheduled_jobs set lease_until = now() + interval '90 seconds', updated_at = now()
    where id = p_id and state = 'running' and lease_token = p_token and lease_until > now() returning id
  ) select exists(select 1 from renewed);
$$;
create function public.finish_scheduled_job(p_id text, p_token uuid, p_success boolean)
returns boolean language sql security invoker set search_path = '' as $$
  with finished as (
    update public.scheduled_jobs set
      state = case when p_success then case when interval_seconds is null then 'completed' else 'pending' end
        when attempts >= max_attempts then 'failed' else 'pending' end,
      run_at = case when p_success and interval_seconds is not null then now() + make_interval(secs => interval_seconds)
        when not p_success then now() + make_interval(secs => least(3600, 5 * power(2, least(attempts - 1, 10)))::integer)
        else run_at end,
      attempts = case when p_success then 0 else attempts end,
      lease_token = null, lease_until = null, updated_at = now()
    where id = p_id and state = 'running' and lease_token = p_token and lease_until > now() returning id
  ) select exists(select 1 from finished);
$$;
revoke all on function public.claim_scheduled_job(text[]), public.renew_scheduled_job(text, uuid), public.finish_scheduled_job(text, uuid, boolean) from public, anon, authenticated;
grant execute on function public.claim_scheduled_job(text[]), public.renew_scheduled_job(text, uuid), public.finish_scheduled_job(text, uuid, boolean) to service_role;
