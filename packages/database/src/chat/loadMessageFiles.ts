import { transcriptionToText } from "../storage/transcriptionToText.ts";
import { fileNeedsProcessing } from "@schornio/aibox-package-utils/getFileTypeLabel";
import type { ChatFileData, ChatMessage } from "./_types.ts";
import type { StorageSession } from "../storage/_utils/StorageSession.ts";
import { THIS_CONVERSATION_MOUNT } from "../storage/_utils/agentToStoragePath.ts";
import { blobToDataURL } from "@schornio/aibox-package-utils/blobToDataURL";
import { getDocumentBlob } from "../storage/getDocumentBlob.ts";
import { getDocumentContent } from "../storage/getDocumentContent.ts";

export async function loadMessageFiles(
  messages: ChatMessage[],
  storageSession: StorageSession,
  {
    resolveReference,
  }: {
    resolveReference?: (
      file: ChatFileData,
    ) => Promise<
      { storageSession: StorageSession; agentPath: string } | undefined
    >;
  } = {},
): Promise<ChatMessage[]> {
  const key = (file: ChatFileData) =>
    JSON.stringify([file.attachment?.storage ?? null, file.url]);
  const loaded = new Map<
    string,
    Promise<{ image?: string; content?: string; agentPath: string }>
  >();
  for (const message of messages)
    for (const part of message.parts) {
      if (part.type !== "data-file" || loaded.has(key(part.data))) continue;
      loaded.set(
        key(part.data),
        (async () => {
          const reference = part.data.attachment
            ? await resolveReference?.(part.data)
            : undefined;
          if (part.data.attachment && !reference)
            return {
              agentPath: "unavailable",
              content:
                "Attachment unavailable: access or agent mounts changed. Please select the file again.",
            };
          const session = reference?.storageSession ?? storageSession;
          const agentPath =
            reference?.agentPath ??
            `${THIS_CONVERSATION_MOUNT}/${part.data.url}`;
          if (part.data.type.startsWith("image/")) {
            const blob = await getDocumentBlob(part.data.url, session);
            return {
              agentPath,
              image: blob ? await blobToDataURL(blob) : undefined,
            };
          }
          const content = await getDocumentContent(part.data.url, session);
          return {
            agentPath,
            content:
              content?.type === "mdc"
                ? content.current
                : content?.type === "transcript"
                  ? transcriptionToText(content)
                  : fileNeedsProcessing(part.data.url) === "transcript"
                    ? "Transcript unavailable: the audio has not been transcribed successfully yet."
                    : undefined,
          };
        })(),
      );
    }
  const results = new Map(
    await Promise.all(
      [...loaded].map(async ([id, value]) => [id, await value] as const),
    ),
  );
  return messages.map((message) => ({
    ...message,
    parts: message.parts.map((part) => {
      if (part.type !== "data-file") return part;
      const result = results.get(key(part.data));
      if (result?.image)
        return {
          filename: part.data.attachment ? result.agentPath : part.data.name,
          mediaType: part.data.type,
          type: "file" as const,
          url: result.image,
        };
      if (result?.content !== undefined)
        return {
          text: `
--- file start ---
path: ${result.agentPath}
type: ${part.data.type}
--- file start content ---
${result.content}
--- file end content ---
--- file end ---`.trim(),
          type: "text" as const,
        };
      return part;
    }),
  }));
}
