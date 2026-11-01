create policy "Allow admins to manage users"
on "public"."user_profiles"
as permissive
for all
to public
using (authorize('admin'::user_role));



create policy "Allow admins to manage user avatars eq7zk6_0"
on "storage"."objects"
as permissive
for select
to public
using (((bucket_id = 'user_avatars'::text) AND authorize('admin'::user_role)));


create policy "Allow admins to manage user avatars eq7zk6_1"
on "storage"."objects"
as permissive
for insert
to public
with check (((bucket_id = 'user_avatars'::text) AND authorize('admin'::user_role)));


create policy "Allow admins to manage user avatars eq7zk6_2"
on "storage"."objects"
as permissive
for delete
to public
using (((bucket_id = 'user_avatars'::text) AND authorize('admin'::user_role)));



