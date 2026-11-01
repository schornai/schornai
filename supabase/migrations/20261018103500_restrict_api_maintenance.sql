-- GRANT ALL from the original default privileges also includes MAINTAIN when
-- replayed on PostgreSQL 17+. API roles must not perform table maintenance.
-- Guard dynamic SQL so the same migrations remain valid on the shipped PG 15.
DO $migration$
BEGIN
  IF pg_catalog.current_setting('server_version_num')::integer >= 170000 THEN
    EXECUTE 'REVOKE MAINTAIN ON ALL TABLES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE MAINTAIN ON TABLES FROM anon, authenticated';
  END IF;
END;
$migration$;
