"use server";

import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";
import { fileNeedsProcessing } from "@schornio/aibox-package-utils/getFileTypeLabel";
import { getDocumentContent } from "@schornio/aibox-package-database/storage/getDocumentContent";
import { z } from "zod/mini";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { prepareStorageWrite } from "@/lib/storageFileOperations";
import { getAgentById } from "@schornio/aibox-package-database/agent/getAgentById";
import { getDocumentRepositories } from "@schornio/aibox-package-database/documentRepositories/getDocumentRepositories";
import { requireStorageAccess } from "@schornio/aibox-package-database/storage/requireStorageAccess";
import { storageToAgentPath } from "@schornio/aibox-package-database/storage/_utils/storageToAgentPath";
import { StorageSession } from "@schornio/aibox-package-database/storage/_utils/StorageSession";
import { inspect } from "@schornio/aibox-package-database/storage/inspect";
import { validateStoragePath } from "@schornio/aibox-package-database/storage/validatePath";
import { storageSchema } from "@schornio/aibox-package-database/storage/_schemas";
import { transferStorageFile } from "@schornio/aibox-realtime/documents/storage/transferStorageFile";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import type { StorageRealtimeObject } from "@schornio/aibox-realtime/documents/storage/_types";

export const storageSelectChatFile = serverActionClient
  .inputSchema(
    z.object({
      agentId: z.string(),
      activityId: z.string(),
      storage: storageSchema,
      path: z.string(),
    }),
  )
  .action(async ({ parsedInput: input }) => {
    const supabase = await createSupabaseServerClient();
    const path = validateStoragePath(input.path);
    const destination = {
      type: "activity" as const,
      agentId: input.agentId,
      activityId: input.activityId,
    };
    const agent = await getAgentById(input.agentId, { supabase });
    await prepareStorageWrite(destination, supabase);
    await requireStorageAccess(input.storage, "read", { supabase });
    const file = await inspect(
      path,
      new StorageSession({
        storage: input.storage,
        supabaseStorage: supabase.storage,
      }),
    );
    if (!file?.file) throw new Error("FILE_NOT_FOUND");
    if (
      fileNeedsProcessing(path) &&
      !(await getDocumentContent(
        path,
        new StorageSession({
          storage: input.storage,
          supabaseStorage: supabase.storage,
        }),
      ))
    )
      return { error: "FILE_NOT_PROCESSED" };
    if (
      input.storage.type === "activity" &&
      input.storage.activityId === input.activityId &&
      input.storage.agentId === input.agentId
    )
      return { file: file as StorageRealtimeObject, copied: false };
    const agentPath = storageToAgentPath({
      storage: input.storage,
      path,
      roles: agent.roles,
      repositories: await getDocumentRepositories({ supabase }),
      agentId: input.agentId,
      activityId: input.activityId,
    });
    if (agentPath)
      return {
        file: {
          ...file,
          attachment: { storage: input.storage, agentPath },
        } satisfies StorageRealtimeObject,
        copied: false,
      };
    const extension =
      file.name.lastIndexOf(".") > 0
        ? file.name.slice(file.name.lastIndexOf("."))
        : "";
    const prefix = `attachment-${crypto.randomUUID()}-`;
    const targetName =
      prefix +
      (extension ? file.name.slice(0, -extension.length) : file.name).slice(
        0,
        Math.max(1, 200 - prefix.length - extension.length),
      ) +
      extension;
    const result = await transferStorageFile(
      {
        from: { storage: input.storage, path },
        to: { storage: destination, folder: "", name: targetName },
        move: false,
      },
      {
        supabase,
        serverToken: getRealtimeServerToken(),
        websocketProvider: new ServerRealtimeWebsocketProvider(),
      },
    );
    revalidatePath("/", "layout");
    return {
      file: result.file as StorageRealtimeObject,
      copied: true,
      processing: result.processing,
    };
  });
