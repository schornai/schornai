import { xragExportWorker } from "./src/xrag/worker.ts";
import { createChatExpirationExtension } from "@schornio/aibox-realtime/server/createChatExpirationExtension";
import { startScheduler } from "./src/scheduler/startScheduler.ts";
import { artifactPublicationWorker } from "./src/artifacts/worker.ts";
import { homedir, hostname } from "node:os";
import { join } from "node:path";
import { watchOllamaModels } from "./src/_utils/watchOllamaModels.ts";
import { Server } from "@hocuspocus/server";
import { createTaskCoordinatorExtension } from "@schornio/aibox-realtime/server/createTaskCoordinatorExtension";
import { createServiceStatusExtension } from "@schornio/aibox-realtime/server/createServiceStatusExtension";
import { chatWorker } from "./src/chat/worker.ts";
import { createSupabaseClient } from "@schornio/aibox-database/_util/createSupabaseClient";
import { createSupabaseExtension } from "@schornio/aibox-realtime/_lib/createSupabaseExtension";
import { modelDoEmbedWorker } from "./src/modelDoEmbed/worker.ts";
import { modelDoGenerateWorker } from "./src/modelDoGenerate/worker.ts";
import { modelDoStreamWorker } from "./src/modelDoStream/worker.ts";
import { processFileWorker } from "./src/processFile/worker.ts";
import { createRealtimeAuthentication } from "@schornio/aibox-realtime/server/createRealtimeAuthentication";
import { getRealtimeServerSecret } from "@schornio/aibox-realtime/server/getRealtimeServerToken";
import { authorizeRealtimeUser } from "@schornio/aibox-database/realtime/authorizeRealtimeUser";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@schornio/aibox-database/_shared/_supabase";
import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";

const port = parseInt(process.env.PORT ?? "9000");
const secret = getRealtimeServerSecret();
const supabaseUrl = getEnvSafe("SUPABASE_URL");
const supabaseAnonKey = getEnvSafe("SUPABASE_ANON_KEY");

const supabaseServiceRole = createSupabaseClient({
  environmentKeys: {
    supabaseKey: "SUPABASE_SERVICE_ROLE_KEY",
    supabaseUrl: "SUPABASE_URL",
  },
});

const schedulerAbort = new AbortController();

const realtimeServer = new Server({
  extensions: [
    {
      async onDestroy() {
        schedulerAbort.abort();
      },
    },
    createRealtimeAuthentication({
      secret,
      serviceSecret: process.env.SERVICE_API_TOKEN,
      authorizeUser(token, documentName) {
        const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        return authorizeRealtimeUser(token, documentName, { supabase });
      },
    }),
    createChatExpirationExtension({ supabase: supabaseServiceRole }),
    createSupabaseExtension({ supabase: supabaseServiceRole }),
    createServiceStatusExtension(),
    createTaskCoordinatorExtension({ supabaseServiceRole }),
  ],
  port,
});

const capabilitiesChanged = new EventTarget();
const chatConcurrency = 4;
const workerInstance = `${process.env.SERVICE_ID ?? hostname()}:${process.pid}`;
const token = secret;

function fatal(error: unknown) {
  console.error(error);
  process.exit(1);
}

try {
  await realtimeServer.listen();
  process.once("SIGTERM", () => schedulerAbort.abort());
  process.once("SIGINT", () => schedulerAbort.abort());
  void startScheduler({
    serverToken: `Worker ${token}`,
    supabase: supabaseServiceRole,
    signal: schedulerAbort.signal,
    instance: realtimeServer.hocuspocus,
  }).catch(fatal);
  void xragExportWorker({
    supabase: supabaseServiceRole,
    signal: schedulerAbort.signal,
  }).catch(fatal);
  void artifactPublicationWorker({
    supabase: supabaseServiceRole,
    signal: new AbortController().signal,
  }).catch(fatal);
  void watchOllamaModels({
    directory:
      process.env.OLLAMA_MODELS ?? join(homedir(), ".aibox/ollama/models"),
    changes: capabilitiesChanged,
    abortSignal: new AbortController().signal,
  }).catch(fatal);

  for (const [id, worker, concurrency] of [
    ["process-file", processFileWorker, 1],
    ["model-do-generate", modelDoGenerateWorker, chatConcurrency],
    ["model-do-stream", modelDoStreamWorker, chatConcurrency],
    ["model-do-embed", modelDoEmbedWorker, 1],
  ] as const) {
    void worker({
      capabilitiesChanged,
      concurrency,
      token,
      workerIdentifier: `${workerInstance}:${id}`,
    }).catch(fatal);
  }
  void chatWorker({
    concurrency: chatConcurrency,
    supabaseServiceRole,
    token,
    workerIdentifier: `${workerInstance}:chat`,
  }).catch(fatal);
} catch (error) {
  fatal(error);
}
