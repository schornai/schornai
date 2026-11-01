"use server";

import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { ArtifactCatalogSession } from "@schornio/aibox-realtime/documents/artifactCatalog/ArtifactCatalogSession";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { z } from "zod";

export const submitXRAG = serverActionClient
  .inputSchema(
    z.object({
      actionFileName: z
        .string()
        .min(1)
        .max(310)
        .regex(/^(?:uploads\/[0-9a-f-]{36}\/)?[^/\\]+$/i)
        .refine((value) => value !== "." && value !== ".."),
    }),
  )
  .action(async ({ parsedInput: { actionFileName } }) => {
    const supabase = await saveCreateSupabaseServiceRoleClient();
    await using session = new ArtifactCatalogSession({
      serverToken: getRealtimeServerToken(),
      websocketProvider: new ServerRealtimeWebsocketProvider(),
    });
    const id = await session.publish(actionFileName, { supabase });
    revalidatePath("/settings/xrag");
    revalidatePath("/models");
    revalidatePath("/artifacts");
    return { id };
  });
