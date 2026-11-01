create table public.storage_file_locks (
  bucket text not null,
  path text not null,
  token uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  primary key (bucket, path)
);
alter table public.storage_file_locks enable row level security;
revoke all on public.storage_file_locks from public, anon, authenticated;

create function public.acquire_storage_file_lock(p_bucket text, p_path text, p_token uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare affected integer;
begin
  if auth.uid() is null or p_token is null then raise exception 'NOT_AUTHORIZED'; end if;
  if p_bucket = 'database_files' then
    if not public.authorize('editor'::public.user_role, split_part(p_path, '/', 1))
      or not exists (select 1 from public.databases where id = split_part(p_path, '/', 2) and organization_id = split_part(p_path, '/', 1)) then
      raise exception 'NOT_AUTHORIZED';
    end if;
  elsif p_bucket = 'realtime_files' then
    if not exists (select 1 from public.realtime_documents d join public.realtime_document_access a on a.document_id = d.id
      where d.document_name = split_part(p_path, '/', 1) and a.user_id = auth.uid()) then raise exception 'NOT_AUTHORIZED'; end if;
  else raise exception 'NOT_AUTHORIZED';
  end if;
  insert into public.storage_file_locks(bucket, path, token, user_id, expires_at)
  values(p_bucket, p_path, p_token, auth.uid(), now() + interval '5 minutes')
  on conflict(bucket, path) do update set token = excluded.token, user_id = excluded.user_id, expires_at = excluded.expires_at
  where storage_file_locks.expires_at < now()
     or (storage_file_locks.token = excluded.token and storage_file_locks.user_id = excluded.user_id);
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

create function public.release_storage_file_lock(p_bucket text, p_path text, p_token uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.storage_file_locks where bucket = p_bucket and path = p_path and token = p_token and user_id = auth.uid();
$$;
revoke all on function public.acquire_storage_file_lock(text,text,uuid) from public, anon;
revoke all on function public.release_storage_file_lock(text,text,uuid) from public, anon;
grant execute on function public.acquire_storage_file_lock(text,text,uuid) to authenticated;
grant execute on function public.release_storage_file_lock(text,text,uuid) to authenticated;
