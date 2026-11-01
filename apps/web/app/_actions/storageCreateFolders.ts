"use server";

import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";

import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { StorageRealtimeSession } from "@schornio/aibox-realtime/documents/storage/StorageRealtimeSession";
import { createFolder } from "@schornio/aibox-package-database/storage/createFolder";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { ensureActivity } from "@/lib/ensureActivity";
import { getCurrentUser } from "@schornio/aibox-package-database/user/getCurrentUser";
import { authorizeStorageMutation } from "@/lib/authorizeStorageMutation";
import { serverActionClient } from "@/lib/serverActionClient";
import { storageSchema } from "@schornio/aibox-package-database/storage/_schemas";
import { z } from "zod/mini";

export const storageCreateFolders = serverActionClient
  .inputSchema(
    z.object({
      basePath: z.string(),
      folderNames: z.array(z.string()),
      storage: storageSchema,
    }),
  )
  .action(async ({ parsedInput: { basePath, folderNames, storage } }) => {
    const supabase = await createSupabaseServerClient();

    if (
      storage.type === "activity" ||
      storage.type === "activity-transcription"
    ) {
      const user = await getCurrentUser({ supabaseAuth: supabase.auth });
      await ensureActivity(user.id, storage, {
        labelOnInsert: "Transkriptionen",
      });
    }

    await authorizeStorageMutation(storage, supabase);

    const websocketProvider = new ServerRealtimeWebsocketProvider();

    await using storageSession = new StorageRealtimeSession({
      serverToken: getRealtimeServerToken(),
      storage,
      supabaseStorage: supabase.storage,
      websocketProvider,
    });

    await Promise.all(
      folderNames.map((folderName) =>
        createFolder(`${basePath}/${folderName}`, storageSession),
      ),
    );
  });
