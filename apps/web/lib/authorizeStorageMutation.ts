import "server-only";

import type { Storage } from "@schornio/aibox-package-database/storage/_types";
import type { SupabaseClient } from "@schornio/aibox-package-database/_shared/_types";
import { getCurrentUser } from "@schornio/aibox-package-database/user/getCurrentUser";
import { getCurrentUserClaims } from "@schornio/aibox-package-database/user/getCurrentUserClaims";
import { getRealtimeDocumentPermission } from "@schornio/aibox-package-database/realtime/getRealtimeDocumentPermission";
import { getChatDocumentName } from "@schornio/aibox-realtime/documents/chat/_utils";
import { getTranscribeDocumentName } from "@schornio/aibox-realtime/documents/transcribe/_utils";
import { getStorageDocumentName } from "@schornio/aibox-realtime/documents/storage/_utils";
import { hasPermission } from "./hasPermission";

/** Authorize before using a privileged realtime worker connection. */
export async function authorizeStorageMutation(
  storage: Storage,
  supabase: SupabaseClient,
) {
  const [user, userClaims] = await Promise.all([
    getCurrentUser({ supabaseAuth: supabase.auth }),
    getCurrentUserClaims({ supabaseAuth: supabase.auth }),
  ]);
  const documentName =
    storage.type === "activity"
      ? getChatDocumentName(storage)
      : storage.type === "activity-transcription"
        ? getTranscribeDocumentName(storage)
        : getStorageDocumentName(storage);
  if (
    !(await getRealtimeDocumentPermission(documentName, {
      supabase,
      userId: user.id,
    }))
  )
    throw new Error("NOT_AUTHORIZED");
  if (storage.type === "documentRepository") {
    const claim =
      userClaims === "admin"
        ? "admin"
        : userClaims.find(
            (item) => item.organization_id === storage.workspaceId,
          )?.role;
    if (!hasPermission({ claim, permission: "editor" }))
      throw new Error("NOT_AUTHORIZED");
  }
  return { user, userClaims };
}
