"use server";

import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";

import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { StorageRealtimeSession } from "@schornio/aibox-realtime/documents/storage/StorageRealtimeSession";
import { getDocumentContent } from "@schornio/aibox-package-database/storage/getDocumentContent";
import { inspect } from "@schornio/aibox-package-database/storage/inspect";
import { createDocumentTranscription } from "@schornio/aibox-package-database/storage/createDocumentTranscription";
import {
  storageSchema,
  transcriptionSegmentSchema,
} from "@schornio/aibox-package-database/storage/_schemas";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { authorizeStorageMutation } from "@/lib/authorizeStorageMutation";
import { serverActionClient } from "@/lib/serverActionClient";
import { z } from "zod/mini";

export const storageUpdateTranscriptionSegment = serverActionClient
  .inputSchema(
    z.object({
      storage: storageSchema,
      path: z.string(),
      segmentIndex: z.number().check(z.int(), z.minimum(0)),
      expectedSegment: transcriptionSegmentSchema,
      text: z.nullable(z.string().check(z.maxLength(100000))),
      reviewed: z.boolean(),
    }),
  )
  .action(async ({ parsedInput: input }) => {
    const supabase = await createSupabaseServerClient();
    await authorizeStorageMutation(input.storage, supabase);
    await using session = new StorageRealtimeSession({
      serverToken: getRealtimeServerToken(),
      storage: input.storage,
      supabaseStorage: supabase.storage,
      websocketProvider: new ServerRealtimeWebsocketProvider(),
    });
    const target = await inspect(input.path, session);
    if (!target?.file) throw new Error("Transcription file unavailable");
    const current = await getDocumentContent(target.path, session);
    if (
      current?.type !== "transcript" ||
      !current.segments?.[input.segmentIndex]
    )
      throw new Error("Transcription segment unavailable");
    const segment = current.segments[input.segmentIndex]!;
    if (JSON.stringify(segment) !== JSON.stringify(input.expectedSegment))
      return { status: "conflict" as const };
    const updated = { ...segment, reviewed: input.reviewed };
    if (input.text === null) delete updated.segmentOverride;
    else updated.segmentOverride = input.text;
    const transcription = {
      ...current,
      segments: current.segments.map((item, index) =>
        index === input.segmentIndex ? updated : item,
      ),
    };
    await createDocumentTranscription(target, transcription, session);
    return { status: "saved" as const, transcription };
  });
