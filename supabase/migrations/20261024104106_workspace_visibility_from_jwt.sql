-- Auto-join and SAML memberships exist in the signed session claims, not
-- necessarily in user_roles. Match workspace visibility to resource visibility.
ALTER POLICY "Allow to get own organizations" ON public.organizations
TO authenticated
USING (public.authorize('user'::public.user_role, id));
