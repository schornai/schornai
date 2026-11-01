"use server";

import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";

import { createStorageProcessingTask } from "@schornio/aibox-realtime/documents/storage/createStorageProcessingTask";
import { ServerRealtimeProvider } from "@schornio/aibox-realtime/server/ServerRealtimeProvider";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { addTask } from "@schornio/aibox-realtime/documents/taskQueue/addTask";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getTaskQueueDocumentName } from "@schornio/aibox-realtime/documents/taskQueue/_utils";
import { authorizeStorageMutation } from "@/lib/authorizeStorageMutation";
import { serverActionClient } from "@/lib/serverActionClient";
import { storageSchema } from "@schornio/aibox-package-database/storage/_schemas";
import { requireStorageAccess } from "@schornio/aibox-package-database/storage/requireStorageAccess";
import { validateStoragePath } from "@schornio/aibox-package-database/storage/validatePath";
import { findActiveFileTask } from "@schornio/aibox-realtime/documents/storage/findActiveFileTask";
import { z } from "zod/mini";

export const storageQueueProcessFiles = serverActionClient
  .inputSchema(
    z.object({
      filePaths: z.array(z.string()),
      storage: storageSchema,
    }),
  )
  .action(async ({ parsedInput: { filePaths, storage } }) => {
    const supabase = await createSupabaseServerClient();
    const { user, userClaims } = await authorizeStorageMutation(
      storage,
      supabase,
    );
    await requireStorageAccess(storage, "write", { supabase });
    const paths = [
      ...new Set(filePaths.map((path) => validateStoragePath(path))),
    ];

    const serverToken = getRealtimeServerToken();
    const websocketProvider = new ServerRealtimeWebsocketProvider();

    await using taskQueue = new ServerRealtimeProvider({
      documentName: getTaskQueueDocumentName(),
      serverToken,
      websocketProvider,
    });
    await taskQueue.waitForSynced();

    const skippedPaths: string[] = [];
    const alreadyQueuedPaths: string[] = [];
    for (const path of paths) {
      if (findActiveFileTask(taskQueue.document, storage, path)) {
        alreadyQueuedPaths.push(path);
        continue;
      }
      const task = await createStorageProcessingTask(
        { path, storage, userClaims, userId: user.id },
        { supabase },
      );
      if (task) addTask(taskQueue.document, task);
      else skippedPaths.push(path);
    }
    await taskQueue.waitForSynced();
    return { skippedPaths, alreadyQueuedPaths };
  });
