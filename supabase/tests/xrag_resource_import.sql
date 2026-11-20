BEGIN;
INSERT INTO public.organizations(id,name,description) VALUES ('xrag-target','Target',''),('xrag-other','Other','');
SET LOCAL ROLE service_role;
DO $$
DECLARE entries jsonb := '[
  {"kind":"documentRepository","localId":"xrag-repo","originId":"11111111-1111-4111-8111-111111111111","name":"Repository","config":{"type":"database-v2","identifier":"xrag-repo"}},
  {"kind":"transcriber","localId":"xrag-transcriber","originId":"22222222-2222-4222-8222-222222222222","name":"Transcriber","config":{"version":"transcriber-v2","identifier":"xrag-transcriber"}},
  {"kind":"agent","localId":"xrag-agent","originId":"33333333-3333-4333-8333-333333333333","name":"Agent","config":{"roles":[]}}
]';
  revision text; attempted jsonb; rejected boolean;
BEGIN
  PERFORM public.import_xrag_resources('xrag-model-target', '[]'::jsonb, 'Models only');
  IF NOT EXISTS(SELECT 1 FROM public.organizations WHERE id='xrag-model-target') THEN
    RAISE EXCEPTION 'Model-only import did not create target workspace';
  END IF;
  PERFORM public.import_xrag_resources('xrag-target', entries);
  IF (SELECT count(*) FROM public.xrag_resource_origins WHERE workspace_id='xrag-target') <> 3 THEN
    RAISE EXCEPTION 'Import did not retain all global identities';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.chatbots WHERE id='xrag-agent' AND organization_id='xrag-target') THEN
    RAISE EXCEPTION 'Agent missing';
  END IF;
  rejected := false;
  BEGIN
    PERFORM public.import_xrag_resources('xrag-target', entries);
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'XRAG_IMPORT_CONFLICT' THEN RAISE; END IF;
    rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Import overwrote without confirmation'; END IF;
  revision := public.xrag_resource_revision('documentRepository','xrag-repo','xrag-target');
  attempted := jsonb_build_array((entries->0) || jsonb_build_object('name','Confirmed','expectedRevision',revision));
  PERFORM public.import_xrag_resources('xrag-target', attempted);
  IF (SELECT name FROM public.databases WHERE id='xrag-repo') <> 'Confirmed' THEN
    RAISE EXCEPTION 'Confirmed update missing';
  END IF;
  rejected := false;
  BEGIN
    PERFORM public.import_xrag_resources('xrag-target', attempted);
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'XRAG_IMPORT_CONFLICT' THEN RAISE; END IF;
    rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Stale confirmation accepted'; END IF;
  -- A failure on the second item must roll back both the first item and its mapping.
  attempted := '[
    {"kind":"transcriber","localId":"xrag-rollback","originId":"44444444-4444-4444-8444-444444444444","name":"Rollback","config":{}},
    {"kind":"agent","localId":"xrag-agent","originId":"33333333-3333-4333-8333-333333333333","name":"Conflict","config":{"roles":[]}}
  ]';
  rejected := false;
  BEGIN
    PERFORM public.import_xrag_resources('xrag-target', attempted);
  EXCEPTION WHEN raise_exception THEN rejected := true;
  END;
  IF NOT rejected OR EXISTS(SELECT 1 FROM public.transcribers WHERE id='xrag-rollback')
    OR EXISTS(SELECT 1 FROM public.xrag_resource_origins WHERE local_id='xrag-rollback') THEN
    RAISE EXCEPTION 'Failed import left partial metadata';
  END IF;
  rejected := false;
  BEGIN
    PERFORM public.import_xrag_resources('xrag-other', entries);
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'XRAG_WORKSPACE_MISMATCH' THEN RAISE; END IF;
    rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Cross-workspace overwrite accepted'; END IF;
  rejected := false;
  BEGIN
    PERFORM public.import_xrag_resources('xrag-new', attempted, 'New workspace');
  EXCEPTION WHEN raise_exception THEN rejected := true;
  END;
  IF NOT rejected OR EXISTS(SELECT 1 FROM public.organizations WHERE id='xrag-new') THEN
    RAISE EXCEPTION 'Failed import left a new workspace';
  END IF;
END;
$$;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM public.import_xrag_resources('xrag-target', '[]');
    RAISE EXCEPTION 'Authenticated user called privileged importer';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM * FROM public.xrag_resource_origins;
    RAISE EXCEPTION 'Authenticated user read private identity map';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
RESET ROLE;
DO $$ BEGIN
  BEGIN
    UPDATE public.xrag_resource_origins SET origin_id='11111111-1111-4111-8111-111111111111'
      WHERE kind='transcriber' AND local_id='xrag-transcriber';
    RAISE EXCEPTION 'Global UUID collision across resource kinds accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END; $$;
UPDATE public.databases SET organization_id='xrag-other' WHERE id='xrag-repo';
UPDATE public.transcribers SET organization_id='xrag-other' WHERE id='xrag-transcriber';
UPDATE public.chatbots SET organization_id='xrag-other' WHERE id='xrag-agent';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.xrag_resource_origins WHERE workspace_id='xrag-other') <> 3 THEN
    RAISE EXCEPTION 'Moving resources lost or left stale global identities';
  END IF;
  IF EXISTS(SELECT 1 FROM public.xrag_resource_origins WHERE workspace_id='xrag-target') THEN
    RAISE EXCEPTION 'Moved origins still belong to old workspace';
  END IF;
END; $$;
ROLLBACK;
