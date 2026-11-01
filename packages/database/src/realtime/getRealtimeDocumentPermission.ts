import type { SupabaseClient } from "../_shared/_types.ts";

const uuid =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const resourceId = `(?:${uuid}|[a-z0-9]{25})`;
const chat = new RegExp(`^activity_chat___(${uuid})_(${resourceId})$`);
const draft = new RegExp(
  `^activity_chat_currentMessage___(${uuid})_(${resourceId})$`,
);
const transcription = new RegExp(
  `^activity_transcription__(${uuid})_(${resourceId})$`,
);
const activityStorage = new RegExp(`^storage___activity_(${uuid})$`);
const repositoryStorage = new RegExp(
  `^storage___repo_(${resourceId})_(${resourceId})$`,
);

/**
 * Requires a user-scoped client (RLS must apply), an authenticated userId, and,
 * when supplied, an isAdmin value obtained from verified server-issued claims.
 * Workers use a separate server credential; browsers never write the task queue.
 */
export async function getRealtimeDocumentPermission(
  documentName: string,
  {
    supabase,
    userId,
    isAdmin = false,
  }: {
    supabase: SupabaseClient;
    userId: string;
    isAdmin?: boolean;
  },
): Promise<"read" | "read_write" | undefined> {
  if (documentName === `activity___${userId}`) return "read";
  if (
    ["taskQueue", "workerLog", "artifactCatalog", "services"].includes(
      documentName,
    )
  ) {
    return isAdmin ? "read" : undefined;
  }

  const draftMatch = draft.exec(documentName);
  const parentDocumentName = draftMatch
    ? `activity_chat___${draftMatch[1]}_${draftMatch[2]}`
    : documentName;
  if (
    draftMatch ||
    chat.test(documentName) ||
    transcription.test(documentName)
  ) {
    const { data, error } = await supabase
      .from("realtime_documents")
      .select("id")
      .eq("document_name", parentDocumentName)
      .maybeSingle();
    if (error || !data) return undefined;
    return draftMatch ? "read_write" : "read";
  }

  const storageMatch = activityStorage.exec(documentName);
  if (storageMatch) {
    // UUID-only patterns prevent wildcard/filter injection; RLS limits the
    // matching documents to activities explicitly shared with this user.
    const { data, error } = await supabase
      .from("realtime_documents")
      .select("document_name")
      .or(
        `document_name.like.activity_chat___${storageMatch[1]}_%,document_name.like.activity_transcription__${storageMatch[1]}_%`,
      );
    return !error &&
      data?.some(({ document_name }) => {
        const match =
          chat.exec(document_name) ?? transcription.exec(document_name);
        return match?.[1] === storageMatch[1];
      })
      ? "read"
      : undefined;
  }

  const repositoryMatch = repositoryStorage.exec(documentName);
  if (repositoryMatch) {
    const { data, error } = await supabase
      .from("databases")
      .select("id")
      .eq("id", repositoryMatch[2]!)
      .eq("organization_id", repositoryMatch[1]!)
      .maybeSingle();
    return !error && data ? "read" : undefined;
  }

  return undefined;
}
