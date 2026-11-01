"use server";

import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";

import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { StorageRealtimeSession } from "@schornio/aibox-realtime/documents/storage/StorageRealtimeSession";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { safeRedirectPath } from "@/lib/safeRedirectPath";
import { redirect } from "next/navigation";
import { remove } from "@schornio/aibox-package-database/storage/remove";
import { authorizeStorageMutation } from "@/lib/authorizeStorageMutation";
import { serverActionClient } from "@/lib/serverActionClient";
import { storageSchema } from "@schornio/aibox-package-database/storage/_schemas";
import { z } from "zod/mini";

export const storageRemove = serverActionClient
  .inputSchema(
    z.object({
      path: z.string(),
      redirectToParent: z.optional(z.object({ basePathApp: z.string() })),
      storage: storageSchema,
    }),
  )
  .action(async ({ parsedInput: { path, redirectToParent, storage } }) => {
    const supabase = await createSupabaseServerClient();
    await authorizeStorageMutation(storage, supabase);

    const websocketProvider = new ServerRealtimeWebsocketProvider();

    await using storageSession = new StorageRealtimeSession({
      serverToken: getRealtimeServerToken(),
      storage,
      supabaseStorage: supabase.storage,
      websocketProvider,
    });

    await remove(path, storageSession);

    if (redirectToParent) {
      const parent = path.split("/").slice(0, -1).join("/");
      redirect(safeRedirectPath(`${redirectToParent.basePathApp}/${parent}`));
    }
  });
