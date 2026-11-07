import type { ToolMCP } from "./_types.ts";
import { storageSchema } from "../storage/_schemas.ts";
import type { LanguageModelUsage, UIMessage } from "ai";
import type {
  ToolWebFetch,
  ToolWebSearch,
  ToolStorageList,
  ToolStorageReadFile,
  ToolStorageSearch,
  ToolStorageWriteFile,
  ToolStorageTransferFile,
} from "./_types.ts";
import { validateUIMessages } from "ai";
import { z } from "zod/v4";

export const chatRoleDataSchema = z.union([
  z.object({
    currentTry: z.number(),
    state: z.literal("pending"),
  }),
  z.object({
    roleName: z.string(),
    state: z.literal("selected"),
  }),
]);

export const chatFileDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  url: z.string(),
  attachment: z.optional(
    z.object({ storage: storageSchema, agentPath: z.string() }),
  ),
});

const dataSchemas = {
  file: chatFileDataSchema,
  role: chatRoleDataSchema,
};

export async function validateChatMessages(messages: unknown) {
  return await validateUIMessages<
    UIMessage<
      {
        roleName?: string;
        roleId?: string;
        thinking?: boolean;
        timing?: {
          inputDuration: number;
          outputDuration: number;
          totalDuration: number;
        };
        usage?: LanguageModelUsage;
      },
      { [key in keyof typeof dataSchemas]: z.infer<(typeof dataSchemas)[key]> },
      {
        [name: `platform_${string}`]: {
          input: Record<string, unknown>;
          output: unknown;
        };
        mcp: ToolMCP;
        "web-fetch": ToolWebFetch;
        "web-search": ToolWebSearch;
        "storage-list": ToolStorageList;
        "storage-read-file": ToolStorageReadFile;
        "storage-write-file": ToolStorageWriteFile;
        "storage-search": ToolStorageSearch;
        "storage-copy-file": ToolStorageTransferFile;
        "storage-move-file": ToolStorageTransferFile;
      }
    >
  >({
    dataSchemas,
    messages,
  });
}

export const chatMessagesSchema = z
  .array(z.unknown())
  .transform(async (messages) => await validateChatMessages(messages));

export const chatFeatures = z.object({
  deepResearch: z.boolean(),
  thinking: z.boolean(),
});

export const chatBodySchema = z.object({
  activityId: z.string().optional(),
  chatbotId: z.string(),
  features: chatFeatures,
  messages: chatMessagesSchema,
});
