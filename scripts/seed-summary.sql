-- Only names/counts: never print API keys, password hashes or settings values.
SELECT 'Benutzer' AS bereich, count(*) AS anzahl FROM auth.users
UNION ALL SELECT 'Workspaces', count(*) FROM public.organizations
UNION ALL SELECT 'Agenten', count(*) FROM public.chatbots
UNION ALL SELECT 'Modelle', count(*) FROM public.ai_models
UNION ALL SELECT 'Dokumentenablagen', count(*) FROM public.databases
UNION ALL SELECT 'Transkriptoren', count(*) FROM public.transcribers
UNION ALL SELECT 'Aktivitäten', count(*) FROM public.activities
UNION ALL SELECT 'Transkriptionen', count(*) FROM public.transcriptions
UNION ALL SELECT 'Storage-Dateien', count(*) FROM storage.objects;
SELECT 'Workspace' AS typ, name AS name FROM public.organizations
UNION ALL SELECT 'Agent', name FROM public.chatbots
UNION ALL SELECT 'Modell', name FROM public.ai_models
UNION ALL SELECT 'Dokumentenablage', name FROM public.databases
UNION ALL SELECT 'Transkriptor', name FROM public.transcribers
UNION ALL SELECT 'Systemeinstellung (Wert verborgen)', key FROM public.system_settings
ORDER BY typ, name LIMIT 30;
