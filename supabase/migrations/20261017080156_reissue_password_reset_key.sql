-- Keys are delivered by authorized server actions, never by a profile/table read.
drop policy if exists "Allow admins to manage keys" on public.user_password_reset_key;
revoke all on public.user_password_reset_key from anon, authenticated;

create or replace function public.reissue_password_reset_key(target_user_id uuid, new_reset_key text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  expires_at timestamptz := now() + interval '7 days';
begin
  -- Serializes issuance per account, including when no prior key exists.
  perform 1 from auth.users
  where id = target_user_id and not coalesce(is_sso_user, false)
    and raw_app_meta_data ->> 'provider' = 'email'
  for update;
  if not found then raise exception 'LOCAL_USER_REQUIRED'; end if;
  if new_reset_key is null or new_reset_key !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_RESET_KEY';
  end if;

  update public.user_password_reset_key set expires = least(expires, now())
  where for_user_id = target_user_id and used is null;
  insert into public.user_password_reset_key (for_user_id, reset_key, expires)
  values (target_user_id, new_reset_key, expires_at);
  return expires_at;
end;
$$;

revoke all on function public.reissue_password_reset_key(uuid, text) from public, anon, authenticated;
grant execute on function public.reissue_password_reset_key(uuid, text) to service_role;
