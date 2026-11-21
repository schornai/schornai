BEGIN;
INSERT INTO auth.users(id) VALUES ('fafafafa-0000-4000-8000-000000000001'),('fafafafa-0000-4000-8000-000000000002');
INSERT INTO public.organizations(id,name,description) VALUES ('xrag-auto','Automation','');
SET LOCAL ROLE service_role;
DO $$
DECLARE auto_id text := 'fafafafa-0000-4000-8000-000000000003'; entry jsonb; revision text; failed boolean := false;
BEGIN
  entry := jsonb_build_object('kind','automation','localId',auto_id,'originId','daily-check','name','Daily check','config',jsonb_build_object(
    'userId','fafafafa-0000-4000-8000-000000000001','agentId','xrag-auto-agent','message','Check documents','enabled',false,
    'trigger',jsonb_build_object('type','storage','storage',jsonb_build_object('type','documentRepository','documentRepositoryId','xrag-auto-docs'))));
  -- Deliberately put the automation first: dependencies must commit before it.
  PERFORM public.import_xrag_resources('xrag-auto',jsonb_build_array(entry,
    jsonb_build_object('kind','agent','localId','xrag-auto-agent','originId','auto-agent','name','Agent','config','{"roles":[]}'::jsonb),
    jsonb_build_object('kind','documentRepository','localId','xrag-auto-docs','originId','auto-docs','name','Docs','config','{}'::jsonb)));
  IF NOT EXISTS(SELECT 1 FROM public.automations WHERE id=auto_id::uuid AND user_id='fafafafa-0000-4000-8000-000000000001' AND storage_bucket='database_files' AND storage_prefix='xrag-auto/xrag-auto-docs/') THEN
    RAISE EXCEPTION 'Automation not installed with owner and storage binding';
  END IF;
  revision := public.xrag_resource_revision('automation',auto_id,'xrag-auto');
  BEGIN
    PERFORM public.import_xrag_resources('xrag-auto',jsonb_build_array(entry));
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'XRAG_IMPORT_CONFLICT' THEN RAISE; END IF; failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'Automation overwritten without confirmation'; END IF;
  entry := entry || jsonb_build_object('expectedRevision',revision,'name','Updated');
  PERFORM public.import_xrag_resources('xrag-auto',jsonb_build_array(entry));
  IF NOT EXISTS(SELECT 1 FROM public.automations WHERE id=auto_id::uuid AND name='Updated') THEN RAISE EXCEPTION 'Confirmed update missing'; END IF;
  revision := public.xrag_resource_revision('automation',auto_id,'xrag-auto');
  entry := jsonb_set(entry,'{config,userId}','"fafafafa-0000-4000-8000-000000000002"') || jsonb_build_object('expectedRevision',revision);
  failed := false;
  BEGIN
    PERFORM public.import_xrag_resources('xrag-auto',jsonb_build_array(entry));
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'NOT_AUTHORIZED' THEN RAISE; END IF; failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'Automation ownership stolen'; END IF;
END $$;
ROLLBACK;
