-- A publication owns its immutable upload object. Catalog publication and job
-- completion share one transaction; a withdrawn digest can never be resurrected.
create table public.artifact_catalog (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  object_path text not null unique,
  metadata jsonb not null check (jsonb_typeof(metadata) = 'object' and metadata->>'id' = id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  purged_at timestamptz,
  check (purged_at is null or deleted_at is not null)
);
alter table public.artifact_catalog enable row level security;
revoke all on public.artifact_catalog from public, anon, authenticated;
grant all on public.artifact_catalog to service_role;

create table public.artifact_publications (
  id uuid primary key default gen_random_uuid(),
  upload_path text not null unique,
  name text not null,
  state text not null default 'queued' check (state in ('queued', 'processing', 'published', 'error')),
  artifact_id text references public.artifact_catalog(id),
  attempts integer not null default 0 check (attempts >= 0),
  owner_token uuid,
  lease_until timestamptz,
  retry_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cleaned_at timestamptz,
  error_code text,
  check ((state = 'processing') = (owner_token is not null and lease_until is not null)),
  check ((state = 'published') = (artifact_id is not null))
);
alter table public.artifact_publications enable row level security;
revoke all on public.artifact_publications from public, anon, authenticated;
grant all on public.artifact_publications to service_role;
create index artifact_publications_work on public.artifact_publications (retry_at, created_at) where state in ('queued', 'processing');
create index artifact_publications_artifact on public.artifact_publications (artifact_id);
create index artifact_publications_cleanup on public.artifact_publications (updated_at) where cleaned_at is null and state in ('published', 'error');

create function public.claim_artifact_publication(p_owner_token uuid)
returns setof public.artifact_publications language plpgsql set search_path = '' as $$
begin
  -- Bound retries even when the previous owner died without recording failure.
  update public.artifact_publications set state = 'error', owner_token = null,
    lease_until = null, error_code = 'XRAG_RETRY_LIMIT', updated_at = clock_timestamp()
    where attempts >= 5 and (state = 'queued' or (state = 'processing' and lease_until < clock_timestamp()));
  return query
    update public.artifact_publications as job
    set state = 'processing', owner_token = p_owner_token,
      lease_until = clock_timestamp() + interval '90 seconds',
      attempts = attempts + 1, updated_at = clock_timestamp()
    where job.id = (
      select candidate.id from public.artifact_publications candidate
      where (candidate.state = 'queued' and candidate.retry_at <= clock_timestamp())
        or (candidate.state = 'processing' and candidate.lease_until < clock_timestamp())
      order by candidate.created_at limit 1 for update skip locked
    ) returning job.*;
end;
$$;

create function public.renew_artifact_publication(p_id uuid, p_owner_token uuid)
returns boolean language sql set search_path = '' as $$
  with renewed as (
    update public.artifact_publications set lease_until = clock_timestamp() + interval '90 seconds'
    where id = p_id and state = 'processing' and owner_token = p_owner_token and lease_until > clock_timestamp()
    returning 1
  ) select exists(select 1 from renewed);
$$;

create function public.finish_artifact_publication(p_id uuid, p_owner_token uuid, p_metadata jsonb)
returns text language plpgsql set search_path = '' as $$
declare
  job public.artifact_publications;
  artifact public.artifact_catalog;
  digest text := p_metadata->>'id';
begin
  select * into job from public.artifact_publications where id = p_id for update;
  if not found or job.state <> 'processing' or job.owner_token is distinct from p_owner_token
      or job.lease_until <= clock_timestamp() then
    raise exception 'ARTIFACT_LEASE_LOST';
  end if;
  if digest is null or digest !~ '^[a-f0-9]{64}$' or jsonb_typeof(p_metadata->'xrag') <> 'object'
      or (p_metadata->>'size')::bigint <= 0 then raise exception 'INVALID_ARTIFACT'; end if;
  insert into public.artifact_catalog (id, object_path, metadata)
    values (digest, job.upload_path, p_metadata) on conflict (id) do nothing;
  -- This row lock serializes completion with withdrawal, including duplicate uploads.
  select * into artifact from public.artifact_catalog where id = digest for update;
  if artifact.deleted_at is not null then
    update public.artifact_publications set state = 'error', error_code = 'ARTIFACT_WITHDRAWN',
      owner_token = null, lease_until = null, updated_at = clock_timestamp() where id = p_id;
    return null;
  end if;
  update public.artifact_publications set state = 'published', artifact_id = digest,
    owner_token = null, lease_until = null, error_code = null, updated_at = clock_timestamp()
    where id = p_id;
  return digest;
end;
$$;

create function public.fail_artifact_publication(p_id uuid, p_owner_token uuid, p_retryable boolean)
returns boolean language sql set search_path = '' as $$
  with changed as (
    update public.artifact_publications set
      state = case when p_retryable and attempts < 5 then 'queued' else 'error' end,
      owner_token = null, lease_until = null, error_code = 'XRAG_PUBLISH_FAILED',
      retry_at = clock_timestamp() + interval '30 seconds' * attempts,
      updated_at = clock_timestamp()
    where id = p_id and state = 'processing' and owner_token = p_owner_token and lease_until > clock_timestamp()
    returning 1
  ) select exists(select 1 from changed);
$$;

-- Service-only functions: entry points authorize global administrators. Workers
-- possess service credentials; clients cannot claim leases or fabricate metadata.
revoke all on function public.claim_artifact_publication(uuid) from public, anon, authenticated;
revoke all on function public.renew_artifact_publication(uuid, uuid) from public, anon, authenticated;
revoke all on function public.finish_artifact_publication(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.fail_artifact_publication(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.claim_artifact_publication(uuid) to service_role;
grant execute on function public.renew_artifact_publication(uuid, uuid) to service_role;
grant execute on function public.finish_artifact_publication(uuid, uuid, jsonb) to service_role;
grant execute on function public.fail_artifact_publication(uuid, uuid, boolean) to service_role;

-- Upload objects are write-once for authenticated clients, even before queueing.
-- This prevents a concurrent overwrite/delete from changing the bytes being
-- inspected. Only authorized server cleanup uses service_role to remove objects.
create policy "XRAG uploads have private unique paths" on storage.objects as restrictive
  for insert to authenticated
  with check (bucket_id <> 'box-action-files' or name ~ '^uploads/[0-9a-f-]{36}/[^/]+$');
create policy "XRAG upload objects cannot be overwritten" on storage.objects as restrictive
  for update to authenticated
  using (bucket_id <> 'box-action-files')
  with check (bucket_id <> 'box-action-files');
create policy "XRAG objects require authorized server cleanup" on storage.objects as restrictive
  for delete to authenticated
  using (bucket_id <> 'box-action-files');

-- The outbox survives a crash between SQL commit and the Yjs notification.
alter table public.artifact_publications add column announced_at timestamptz;
create index artifact_publications_outbox on public.artifact_publications (updated_at)
  where state = 'published' and announced_at is null;

-- Claim abandoned objects before deleting via the Storage API. The unique upload
-- path serializes this with queueing; never delete Storage bytes through SQL.
create function public.expire_artifact_uploads()
returns integer language plpgsql set search_path = '' as $$
declare affected integer; reclaimed integer;
begin
  -- A previously issued signed upload token can outlive early duplicate/error
  -- cleanup. Revisit recreated terminal objects after the same retention window.
  update public.artifact_publications job set cleaned_at = null
    where job.cleaned_at is not null and job.state in ('published', 'error')
      and not exists(select 1 from public.artifact_catalog where object_path = job.upload_path)
      and exists(select 1 from storage.objects object where object.bucket_id = 'box-action-files'
        and object.name = job.upload_path and object.created_at < clock_timestamp() - interval '72 hours'
        and object.updated_at < clock_timestamp() - interval '72 hours');
  get diagnostics reclaimed = row_count;
  insert into public.artifact_publications (upload_path, name, state, error_code)
    select object.name, split_part(object.name, '/', -1), 'error', 'XRAG_UPLOAD_EXPIRED'
    from storage.objects object
    where object.bucket_id = 'box-action-files'
      and object.created_at < clock_timestamp() - interval '72 hours'
      and object.updated_at < clock_timestamp() - interval '72 hours'
      and (object.name like 'uploads/%' or object.name like 'staging/%' or object.name not like '%/%' or object.name ~ '^artifacts/[a-f0-9]{64}\.tar$')
      and not exists(select 1 from public.artifact_catalog where object_path = object.name)
      and not exists(select 1 from public.artifact_publications where upload_path = object.name)
    order by object.created_at limit 100
    on conflict (upload_path) do nothing;
  get diagnostics affected = row_count;
  return affected + reclaimed;
end;
$$;
revoke all on function public.expire_artifact_uploads() from public, anon, authenticated;
grant execute on function public.expire_artifact_uploads() to service_role;
