drop policy "Allow editors to create new chatbots" on "public"."chatbots";

drop policy "Allow editors to delete chatbots" on "public"."chatbots";

drop policy "Allow editors to edit chatbots" on "public"."chatbots";

drop policy "Allow users to get chatbots" on "public"."chatbots";

drop policy "Allow editors to create, update, delete databases" on "public"."databases";


  create policy "Allow editors to create new chatbots"
  on "public"."chatbots"
  as permissive
  for insert
  to public
with check (public.authorize('workspace-admin'::public.user_role, organization_id));



  create policy "Allow editors to delete chatbots"
  on "public"."chatbots"
  as permissive
  for delete
  to public
using (public.authorize('workspace-admin'::public.user_role, organization_id));



  create policy "Allow editors to edit chatbots"
  on "public"."chatbots"
  as permissive
  for update
  to public
using (public.authorize('workspace-admin'::public.user_role, organization_id));



  create policy "Allow users to get chatbots"
  on "public"."chatbots"
  as permissive
  for select
  to public
using (public.authorize('workspace-admin'::public.user_role, organization_id));



  create policy "Allow editors to create, update, delete databases"
  on "public"."databases"
  as permissive
  for all
  to public
using (public.authorize('workspace-admin'::public.user_role, organization_id))
with check (public.authorize('workspace-admin'::public.user_role, organization_id));



