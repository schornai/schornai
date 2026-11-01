-- Branding is read with the anonymous client, including in the sidebar.
-- Expose only the theme configuration; writes remain admin-only.
CREATE POLICY "Allow anonymous visitors to read theme settings"
ON public.system_settings
FOR SELECT
TO anon
USING (key = 'theme');
