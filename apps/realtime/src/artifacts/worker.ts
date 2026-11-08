import { setTimeout as delay } from "node:timers/promises";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import { processArtifactPublication } from "@schornio/aibox-database/xrag/processArtifactPublication";
import { announceArtifactPublications } from "@schornio/aibox-database/xrag/announceArtifactPublications";
import { ArtifactCatalogSession } from "@schornio/aibox-realtime/documents/artifactCatalog/ArtifactCatalogSession";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";

export async function artifactPublicationWorker({
  supabase,
  signal,
}: {
  supabase: SupabaseClient;
  signal: AbortSignal;
}) {
  await using session = new ArtifactCatalogSession({
    serverToken: getRealtimeServerToken(),
    websocketProvider: new ServerRealtimeWebsocketProvider(),
  });
  const pause = () => delay(2_000, undefined, { signal }).catch(() => {});
  async function publish() {
    while (!signal.aborted) {
      try {
        const result = await processArtifactPublication({ supabase, signal });
        if (result.worked) continue;
      } catch {
        if (!signal.aborted)
          console.error("Artifact publication worker will retry");
      }
      await pause();
    }
  }
  async function maintain() {
    while (!signal.aborted) {
      try {
        await announceArtifactPublications(
          (id) => session.announce(id, { supabase }),
          { supabase },
        );
      } catch {
        if (!signal.aborted)
          console.error("Artifact notification delivery will retry");
      }
      await pause();
    }
  }
  // Realtime outages and slow purges cannot stall validation of queued uploads.
  await Promise.all([publish(), maintain()]);
}
