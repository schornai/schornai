import { transcribeWorker } from "./src/service/transcribeWorker.ts";
import { getRealtimeServerSecret } from "@schornio/aibox-realtime/server/getRealtimeServerToken";
import { hostname } from "node:os";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";

const shutdown = new AbortController();
const stop = () => shutdown.abort(new Error("Transcriber service stopping"));
process.once("SIGTERM", stop);
process.once("SIGINT", stop);

void transcribeWorker({
  token: getRealtimeServerSecret(),
  workerIdentifier:
    process.env.WORKER_IDENTIFIER ?? `${hostname()}:transcriber:${process.pid}`,
  abortSignal: shutdown.signal,
})
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    process.removeListener("SIGTERM", stop);
    process.removeListener("SIGINT", stop);
    for (const provider of ServerRealtimeWebsocketProvider.websocketProviders.values())
      provider.destroy();
    ServerRealtimeWebsocketProvider.websocketProviders.clear();
  });
