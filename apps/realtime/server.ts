import { homedir } from "node:os";
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

const realtimeServer = new Server({
  extensions: [
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
    createSupabaseExtension({ supabase: supabaseServiceRole }),
    createServiceStatusExtension(),
    createTaskCoordinatorExtension({ supabaseServiceRole }),
  ],
  port,
});

const capabilitiesChanged = new EventTarget();
const token = secret;

function fatal(error: unknown) {
  console.error(error);
  process.exit(1);
}

try {
  await realtimeServer.listen();
  void watchOllamaModels({
    directory:
      process.env.OLLAMA_MODELS ?? join(homedir(), ".aibox/ollama/models"),
    changes: capabilitiesChanged,
    abortSignal: new AbortController().signal,
  }).catch(fatal);

  for (const [id, worker] of [
    ["process-file", processFileWorker],
    ["model-do-generate", modelDoGenerateWorker],
    ["model-do-stream", modelDoStreamWorker],
    ["model-do-embed", modelDoEmbedWorker],
  ] as const) {
    void worker({
      capabilitiesChanged,
      token,
      workerIdentifier: `${id}-handler-1`,
    }).catch(fatal);
  }
  void chatWorker({
    supabaseServiceRole,
    token,
    workerIdentifier: "chat-handler-1",
  }).catch(fatal);
} catch (error) {
  fatal(error);
}
