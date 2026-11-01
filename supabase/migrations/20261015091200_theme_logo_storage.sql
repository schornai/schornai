-- Logos are shared branding, also displayed before sign-in. Only global admins
-- may upload or manage them; anonymous access is restricted to reading a file.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'theme_logos', 'theme_logos', false, 5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
);

CREATE POLICY "Read theme logos before sign-in"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'theme_logos'
  AND storage.allow_any_operation(ARRAY['object.get_authenticated_info', 'object.get_authenticated'])
);

CREATE POLICY "Admins manage theme logos"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'theme_logos' AND (SELECT public.authorize('admin'::public.user_role)))
WITH CHECK (bucket_id = 'theme_logos' AND (SELECT public.authorize('admin'::public.user_role)));
