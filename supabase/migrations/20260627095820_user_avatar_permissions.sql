drop policy "Give users access to own folder eq7zk6_0" on "storage"."objects";

drop policy "Give users access to own folder eq7zk6_1" on "storage"."objects";

drop policy "Give users access to own folder eq7zk6_2" on "storage"."objects";

drop policy "Allow admins to manage user avatars eq7zk6_2" on "storage"."objects";


  create policy "Allow admins to manage user avatars eq7zk6_3"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'user_avatars'::text) AND public.authorize('admin'::public.user_role)));



  create policy "Allow users to manage their own avatar eq7zk6_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'user_avatars'::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])));



  create policy "Allow users to manage their own avatar eq7zk6_1"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'user_avatars'::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])));



  create policy "Allow users to manage their own avatar eq7zk6_2"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'user_avatars'::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])));



  create policy "Allow users to manage their own avatar eq7zk6_3"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'user_avatars'::text) AND (( SELECT (auth.uid())::text AS uid) = (storage.foldername(name))[1])));



  create policy "Allow admins to manage user avatars eq7zk6_2"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'user_avatars'::text) AND public.authorize('admin'::public.user_role)));



