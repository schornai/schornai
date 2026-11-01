-- The sign-in page reads these settings through an anonymous client.
-- Keep all other settings protected by the existing authorization policies.
CREATE POLICY "Allow anonymous visitors to read login settings"
ON public.system_settings
FOR SELECT
TO anon
USING (key IN ('welcomeMessage', 'signIn'));
