-- Run after the migration in an isolated transaction; all fixtures are rolled back.
begin;
insert into auth.users (id, email, encrypted_password, raw_app_meta_data, is_sso_user)
values
 ('1fd053a7-578a-4fb7-884e-12aedfdac001', 'reset-local@example.test', 'unchanged', '{"provider":"email"}', false),
 ('1fd053a7-578a-4fb7-884e-12aedfdac002', 'reset-sso@example.test', 'unchanged', '{"provider":"sso:test"}', true);

do $$
declare expires_at timestamptz; previous_expiry timestamptz;
begin
  if has_function_privilege('authenticated', 'public.reissue_password_reset_key(uuid,text)', 'execute')
     or has_function_privilege('anon', 'public.reissue_password_reset_key(uuid,text)', 'execute') then
    raise exception 'Ordinary sessions may not issue keys';
  end if;
  if has_table_privilege('authenticated', 'public.user_password_reset_key', 'select') then
    raise exception 'Keys must not be readable by sessions';
  end if;
  expires_at := public.reissue_password_reset_key('1fd053a7-578a-4fb7-884e-12aedfdac001', repeat('a',64));
  if expires_at <> now() + interval '7 days' then raise exception 'Wrong expiry'; end if;
  perform public.reissue_password_reset_key('1fd053a7-578a-4fb7-884e-12aedfdac001', repeat('b',64));
  if (select count(*) from public.user_password_reset_key where for_user_id = '1fd053a7-578a-4fb7-884e-12aedfdac001' and used is null and expires > now()) <> 1 then
    raise exception 'Only the latest key may be usable';
  end if;
  if (select encrypted_password from auth.users where id = '1fd053a7-578a-4fb7-884e-12aedfdac001') <> 'unchanged' then
    raise exception 'Issuance changed the password';
  end if;
  begin
    perform public.reissue_password_reset_key('1fd053a7-578a-4fb7-884e-12aedfdac002', repeat('c',64));
    raise exception 'SSO key unexpectedly issued';
  exception when raise_exception then
    if sqlerrm <> 'LOCAL_USER_REQUIRED' then raise; end if;
  end;
  begin
    perform public.reissue_password_reset_key('1fd053a7-578a-4fb7-884e-12aedfdac003', repeat('c',64));
    raise exception 'Missing account key unexpectedly issued';
  exception when raise_exception then
    if sqlerrm <> 'LOCAL_USER_REQUIRED' then raise; end if;
  end;
  -- A failed issuance must leave the latest valid key usable.
  begin
    perform public.reissue_password_reset_key('1fd053a7-578a-4fb7-884e-12aedfdac001', 'invalid');
    raise exception 'Invalid key accepted';
  exception when raise_exception then
    if sqlerrm <> 'INVALID_RESET_KEY' then raise; end if;
  end;
  if not exists(select 1 from public.user_password_reset_key where reset_key = repeat('b',64) and expires > now() and used is null) then
    raise exception 'Failed issuance invalidated existing key';
  end if;
end;
$$;
rollback;
