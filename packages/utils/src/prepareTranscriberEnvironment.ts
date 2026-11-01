/** Resolve legacy signing configuration and fail before a worker claims tasks.
 * Error messages contain variable names only, never credential values.
 */
export function prepareTranscriberEnvironment(environment: NodeJS.ProcessEnv) {
  const resolved: NodeJS.ProcessEnv = {
    ...environment,
    SUPABASE_JWT_SECRET:
      environment.SUPABASE_JWT_SECRET || environment.JWT_SECRET,
  };
  const required = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_JWT_SECRET",
    "REALTIME_SERVER_URL",
    "REALTIME_SERVER_SECRET",
  ];
  const missing = required.filter((key) => !resolved[key]?.trim());
  if (missing.length) {
    throw new Error(
      `Transcriber configuration error: missing ${missing.join(", ")}. SUPABASE_JWT_SECRET may also be supplied as JWT_SECRET.`,
    );
  }
  return resolved;
}
