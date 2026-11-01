"use server";
import { artifactSchema } from "@schornio/aibox-package-database/xrag/_schema";
import { ArtifactCatalogSession } from "@schornio/aibox-realtime/documents/artifactCatalog/ArtifactCatalogSession";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { serverActionClient } from "@/lib/serverActionClient";
import { revalidatePath } from "next/cache";

export const deleteArtifact = serverActionClient
  .inputSchema(artifactSchema.pick({ id: true }))
  .action(async ({ parsedInput: { id } }) => {
    const supabase = await saveCreateSupabaseServiceRoleClient();
    await using session = new ArtifactCatalogSession({
      serverToken: getRealtimeServerToken(),
      websocketProvider: new ServerRealtimeWebsocketProvider(),
    });
    try {
      await session.remove(id, { supabase });
    } finally {
      revalidatePath("/artifacts");
    }
    return { id };
  });
