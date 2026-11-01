import type { Context } from "./config.ts";

/** Resolve the same connection contract for native workers and Core containers.
 * API keys may be publishable/secret keys or legacy anon/service_role keys.
 * Trusted workers also need the legacy signing secret for createClientWithClaims.
 * Publishable/secret API keys cannot replace a JWT signing secret.
 */
export function connectionEnvironment(
  context: Context,
  environment: NodeJS.ProcessEnv,
  target: "host" | "container",
): NodeJS.ProcessEnv {
  const { config } = context;
  const publishable =
    environment.SUPABASE_PUBLISHABLE_KEY ||
    environment.ANON_KEY ||
    environment.SUPABASE_PUBLIC_ANON_KEY ||
    environment.SUPABASE_ANON_KEY;
  const secret =
    environment.SUPABASE_SECRET_KEY ||
    environment.SERVICE_ROLE_KEY ||
    environment.SUPABASE_SERVICE_ROLE_KEY;
  const supabase =
    config.endpoints.supabase ||
    environment.SUPABASE_URL ||
    (config.services.includes("supabase")
      ? target === "container"
        ? "http://kong:8000"
        : `http://127.0.0.1:${config.development ? "54321" : environment.SUPABASE_PORT || "8085"}`
      : undefined);
  const extractor =
    config.endpoints.documentExtractor ||
    environment.DOCUMENT_EXTRACTOR_URL ||
    environment.APACHE_TIKA_URL ||
    (target === "container"
      ? "http://document-extractor:9998"
      : "http://127.0.0.1:9998");
  return Object.fromEntries(
    Object.entries({
      SUPABASE_URL: supabase,
      SUPABASE_PUBLISHABLE_KEY: publishable,
      SUPABASE_SECRET_KEY: secret,
      SUPABASE_PUBLIC_ANON_KEY: publishable,
      SUPABASE_ANON_KEY: publishable,
      SUPABASE_SERVICE_ROLE_KEY: secret,
      SUPABASE_JWT_SECRET:
        environment.SUPABASE_JWT_SECRET || environment.JWT_SECRET,
      DOCUMENT_EXTRACTOR_URL: extractor,
      OLLAMA_URL:
        config.endpoints.ollama ||
        environment.OLLAMA_URL ||
        (target === "container"
          ? "http://host.docker.internal:11434"
          : "http://127.0.0.1:11434"),
    }).filter(([, value]) => value !== undefined),
  );
}

export function workerRealtimeUrl(
  context: Context,
  environment: NodeJS.ProcessEnv,
) {
  return (
    context.config.endpoints.realtime ||
    environment.REALTIME_SERVER_URL ||
    (context.config.services.includes("core")
      ? `http://127.0.0.1:${context.config.development ? "9000" : environment.SERVICE_REALTIME_PORT || "9001"}`
      : context.config.sharing &&
        `${context.config.sharing.url.replace(/\/$/, "")}/v2/realtime`)
  );
}
