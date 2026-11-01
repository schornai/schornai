import "server-only";

// Internal server helper, deliberately not a remotely callable Server Action.
import { createSupabaseServerClient } from "./supabase/createSupabaseServerClient";
import { getCurrentUser } from "@schornio/aibox-package-database/user/getCurrentUser";
import { getAgentWorkspaceId } from "@schornio/aibox-package-database/agent/getAgentWorkspaceId";
import { getTranscriberById } from "@schornio/aibox-package-database/transcriber/getTranscriberById";

import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";

import type { Activity } from "@schornio/aibox-realtime/documents/activity/_types";
import { ExhaustiveError } from "@schornio/aibox-package-utils/ExhaustiveError";
import { ServerBatchRealtimeProvider } from "@schornio/aibox-realtime/server/ServerRealtimeProvider";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import type { Storage } from "@schornio/aibox-package-database/storage/_types";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { ensureDocument } from "@schornio/aibox-realtime/server/ensureDocument";
import { getActivitiesDocumentName } from "@schornio/aibox-realtime/documents/activity/_utils";
import { getAllowedUserIdsByDocumentName } from "@schornio/aibox-realtime/_lib/getAllowedUserIdsByDocumentName";
import { getChatDocumentName } from "@schornio/aibox-realtime/documents/chat/_utils";
import { getTranscribeDocumentName } from "@schornio/aibox-realtime/documents/transcribe/_utils";
import { upsertActivity } from "@schornio/aibox-realtime/documents/activity/upsertActivity";

function getActivityStorageDocumentName(
  storage: Extract<Storage, { type: "activity" | "activity-transcription" }>,
) {
  switch (storage.type) {
    case "activity":
      return getChatDocumentName(storage);
    case "activity-transcription":
      return getTranscribeDocumentName(storage);
    default:
      throw new ExhaustiveError(storage);
  }
}

function getActivityStorageContent(
  storage: Extract<Storage, { type: "activity" | "activity-transcription" }>,
): Activity["content"] {
  switch (storage.type) {
    case "activity":
      return { chatbotId: storage.agentId, type: "chat" };
    case "activity-transcription":
      return { transcriberId: storage.transcriberId, type: "transcription" };
    default:
      throw new ExhaustiveError(storage);
  }
}

export async function ensureActivity(
  userId: string,
  storage: Extract<Storage, { type: "activity" | "activity-transcription" }>,
  config?: { labelOnInsert?: string; publishActivity?: boolean },
) {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser({ supabaseAuth: supabase.auth });
  if (user.id !== userId) throw new Error("NOT_AUTHORIZED");
  const accessible =
    storage.type === "activity"
      ? await getAgentWorkspaceId(storage.agentId, { supabase })
      : await getTranscriberById(storage.transcriberId, { supabase });
  if (!accessible) throw new Error("NOT_AUTHORIZED");
  const supabaseServiceRole = createSupabaseServiceRoleClient();

  const documentName = getActivityStorageDocumentName(storage);
  const websocketProvider = new ServerRealtimeWebsocketProvider();

  await ensureDocument(
    documentName,
    { userIds: [userId] },
    { supabase: supabaseServiceRole },
  );

  if (config?.publishActivity === false) return;

  const allowedUserIds = await getAllowedUserIdsByDocumentName(documentName, {
    supabase: supabaseServiceRole,
  });

  if (!allowedUserIds.includes(userId))
    throw new Error("STORAGE_NOT_AUTHORIZED");

  await using activites = new ServerBatchRealtimeProvider({
    documentNames: allowedUserIds.map((userId) =>
      getActivitiesDocumentName({ userId }),
    ),
    serverToken: getRealtimeServerToken(),
    websocketProvider,
  });

  await activites.waitForSynced();

  activites.batch(
    upsertActivity,
    {
      content: getActivityStorageContent(storage),
      id: storage.activityId,
    },
    { labelOnInsert: config?.labelOnInsert },
  );
}
