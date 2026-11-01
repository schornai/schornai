-- Read-only preflight for 20261017111427_security_boundaries.sql.
-- Run as a database administrator. Empty output means no conflicting parents.
-- Investigate ownership before choosing a manual repair; never blindly delete.
SELECT
  substring(document_name FROM '^(?:activity_chat___|activity_transcription__)([^_]+)_') AS activity_id,
  array_agg(id ORDER BY document_name) AS document_ids,
  array_agg(document_name ORDER BY document_name) AS parent_document_names
FROM public.realtime_documents
GROUP BY activity_id
HAVING substring(document_name FROM '^(?:activity_chat___|activity_transcription__)([^_]+)_') IS NOT NULL
  AND count(*) > 1;
