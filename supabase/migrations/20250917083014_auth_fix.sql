set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.authorize(p_role user_role)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$declare
  org_roles jsonb := auth.jwt() -> 'organization_roles';
begin
  -- kein Claim vorhanden
  if org_roles is null then
    return false;
  end if;

  -- Fall 1: organization_roles ist ein String
  if jsonb_typeof(org_roles) = 'string' then
    -- immer autorisiert, wenn der String "admin" ist
    return org_roles = to_jsonb('admin'::text);
  end if;

  -- Fall 2: organization_roles ist ein Array (nur user/editor)
  if jsonb_typeof(org_roles) = 'array' then
    return exists (
      select 1
      from jsonb_array_elements(org_roles) as org_role
      where (
           (p_role = 'user'   and org_role->>'role' in ('user','editor'))
        or (p_role = 'editor' and org_role->>'role' = 'editor')
      )
    );
  end if;

  -- andere Typen lehnen wir ab
  return false;
end;$function$
;


