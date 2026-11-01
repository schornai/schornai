import { beforeEach, afterEach, vi } from "vitest";
// Next enforces this import boundary at build time; tests also import server code.
vi.mock("server-only", () => ({}));
process.env.DEBUG_PRINT_LIMIT = "2000";

// No test contacts production services. Individual suites replace network boundaries.
process.env.DOCUMENT_EXTRACTOR_URL = "http://tika.test";
process.env.SUPABASE_URL = "http://supabase.test";
process.env.SUPABASE_ANON_KEY = "test-anon";
process.env.SUPABASE_PUBLIC_ANON_KEY = "test-public-anon";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service";
process.env.OLLAMA_URL = "http://ollama.test";
process.env.REALTIME_SERVER_URL = "ws://realtime.test";
process.env.REALTIME_SERVER_SECRET =
  "test-only-realtime-secret-not-for-production";
process.env.REALTIME_URL = "ws://realtime.test";
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("Unexpected network request: mock fetch in this test");
    }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
