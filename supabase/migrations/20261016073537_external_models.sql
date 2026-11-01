CREATE TABLE "public"."ai_model_credentials" (
  "model_id" text NOT NULL,
  "api_key"  text NOT NULL,
  CONSTRAINT "ai_model_credentials_pkey" PRIMARY KEY (model_id)
);

ALTER TABLE "public"."ai_model_credentials"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."ai_model_credentials" FROM "anon", "authenticated";

ALTER TYPE "public"."ai_model_type" ADD VALUE 'external_llm_v1' AFTER 'mlx_whisper_v1';

ALTER TABLE "public"."ai_model_credentials"
  ADD CONSTRAINT "ai_model_credentials_model_id_fkey" FOREIGN KEY (model_id) REFERENCES public.ai_models(id) ON DELETE CASCADE;

REVOKE ALL ON TABLE "public"."ai_model_credentials" FROM "postgres";

-- MAINTAIN is only available from PostgreSQL 17; the box also supports 15.
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ai_model_credentials" TO "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ai_model_credentials" TO "service_role";
