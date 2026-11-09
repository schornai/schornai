import type { Extension, Hocuspocus } from "@hocuspocus/server";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import {
  isChatDeleted,
  isChatDocument,
} from "@schornio/aibox-database/chat/isChatDeleted";

/** Fence every sync (including privileged workers), and close idle readers on
 * all realtime nodes. Postgres separately fences persistence and Storage writes.
 */
export function createChatExpirationExtension({
  supabase,
}: {
  supabase: SupabaseClient;
}): Extension {
  let timer: ReturnType<typeof setInterval> | undefined;
  let checking = false;
  async function guard(documentName: string) {
    if (await isChatDeleted(documentName, { supabase }))
      throw new Error("CHAT_DELETED");
  }
  async function sweep(instance: Hocuspocus) {
    if (checking) return;
    checking = true;
    try {
      for (const [name, document] of instance.documents) {
        if (!isChatDocument(name) || !(await isChatDeleted(name, { supabase })))
          continue;
        // Inform browser clients before disconnecting; their local UI can leave
        // the expired chat. No user content is included in this notification.
        document.broadcastStateless(JSON.stringify({ type: "chat-deleted" }));
        instance.closeConnections(name);
        await instance.unloadDocument(document);
      }
    } catch {
      console.error("CHAT_EXPIRATION_SWEEP_UNAVAILABLE");
    } finally {
      checking = false;
    }
  }
  return {
    async onListen({ instance }) {
      timer = setInterval(() => void sweep(instance), 1_000);
      timer.unref();
    },
    async onLoadDocument({ documentName }) {
      await guard(documentName);
    },
    async beforeSync({ documentName }) {
      await guard(documentName);
    },
    async onDestroy() {
      clearInterval(timer);
    },
  };
}
