-- Workspace roles inherit lower permissions, but never global administrator access.
-- These helpers only inspect the signed JWT and do not need elevated privileges.
CREATE OR REPLACE FUNCTION public.authorize(p_role public.user_role, p_organization_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  org_roles jsonb := auth.jwt() -> 'organization_roles';
BEGIN
  IF jsonb_typeof(org_roles) = 'string' THEN
    RETURN org_roles = to_jsonb('admin'::text);
  END IF;

  IF jsonb_typeof(org_roles) = 'array' THEN
    RETURN EXISTS (
      SELECT 1
      FROM jsonb_array_elements(org_roles) AS org_role
      WHERE org_role ->> 'organization_id' = p_organization_id
        AND (
          (p_role = 'user' AND org_role ->> 'role' IN ('user', 'editor', 'workspace-admin'))
          OR (p_role = 'editor' AND org_role ->> 'role' IN ('editor', 'workspace-admin'))
          OR (p_role = 'workspace-admin' AND org_role ->> 'role' = 'workspace-admin')
        )
    );
  END IF;

  RETURN false;
END;
$function$;

-- The unscoped overload controls shared resources such as chat models.
CREATE OR REPLACE FUNCTION public.authorize(p_role public.user_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  org_roles jsonb := auth.jwt() -> 'organization_roles';
BEGIN
  IF jsonb_typeof(org_roles) = 'string' THEN
    RETURN org_roles = to_jsonb('admin'::text);
  END IF;

  IF jsonb_typeof(org_roles) = 'array' THEN
    RETURN EXISTS (
      SELECT 1
      FROM jsonb_array_elements(org_roles) AS org_role
      WHERE (
        (p_role = 'user' AND org_role ->> 'role' IN ('user', 'editor', 'workspace-admin'))
        OR (p_role = 'editor' AND org_role ->> 'role' IN ('editor', 'workspace-admin'))
        OR (p_role = 'workspace-admin' AND org_role ->> 'role' = 'workspace-admin')
      )
    );
  END IF;

  RETURN false;
END;
$function$;

ALTER POLICY "Allow users to get chatbots" ON public.chatbots
TO authenticated
USING (public.authorize('user'::public.user_role, organization_id));

ALTER POLICY "Allow editors to create new chatbots" ON public.chatbots
TO authenticated
WITH CHECK (public.authorize('workspace-admin'::public.user_role, organization_id));

ALTER POLICY "Allow editors to edit chatbots" ON public.chatbots
TO authenticated
USING (public.authorize('workspace-admin'::public.user_role, organization_id))
WITH CHECK (public.authorize('workspace-admin'::public.user_role, organization_id));

ALTER POLICY "Allow editors to delete chatbots" ON public.chatbots
TO authenticated
USING (public.authorize('workspace-admin'::public.user_role, organization_id));
