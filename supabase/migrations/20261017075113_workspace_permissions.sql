-- Transcriber management follows the same workspace role boundary as agents.
DROP POLICY "Allow editors to manage transcribers" ON public.transcribers;
CREATE POLICY "Allow workspace admins to manage transcribers"
ON public.transcribers FOR ALL TO authenticated
USING (public.authorize('workspace-admin'::public.user_role, organization_id))
WITH CHECK (public.authorize('workspace-admin'::public.user_role, organization_id));
