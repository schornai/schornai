BEGIN;
INSERT INTO auth.users(id) VALUES ('11111111-1111-4111-8111-111111111111'),('33333333-3333-4333-8333-333333333333');
SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","organization_roles":[{"organization_id":"workspace","role":"workspace-admin"}]}';
SET LOCAL ROLE authenticated;
INSERT INTO public.xrag_packages(id,owner_id,name) VALUES ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','My package');
INSERT INTO public.xrag_package_items(package_id,kind,resource_id,name) VALUES ('22222222-2222-4222-8222-222222222222','agent','local-agent','Agent');
SET LOCAL request.jwt.claims = '{"sub":"33333333-3333-4333-8333-333333333333","organization_roles":[{"organization_id":"workspace","role":"workspace-admin"}]}';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.xrag_packages) OR EXISTS(SELECT 1 FROM public.xrag_package_items) THEN RAISE EXCEPTION 'Other owner sees package'; END IF;
 BEGIN
  INSERT INTO public.xrag_package_items(package_id,kind,resource_id,name) VALUES ('22222222-2222-4222-8222-222222222222','agent','other-agent','Other');
  RAISE EXCEPTION 'Other owner can add item';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","organization_roles":[{"organization_id":"workspace","role":"editor"}]}';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.xrag_packages) OR EXISTS(SELECT 1 FROM public.xrag_package_items) THEN RAISE EXCEPTION 'Revoked admin sees package'; END IF;
END $$;
SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","organization_roles":[{"organization_id":"workspace","role":"workspace-admin"}]}';
DO $$ BEGIN
 IF (SELECT count(*) FROM public.xrag_package_items)<>1 THEN RAISE EXCEPTION 'Owner cannot read item'; END IF;
 DELETE FROM public.xrag_packages;
 IF EXISTS(SELECT 1 FROM public.xrag_package_items) THEN RAISE EXCEPTION 'Package delete leaves items'; END IF;
END $$;
ROLLBACK;
