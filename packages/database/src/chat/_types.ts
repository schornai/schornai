import type { Chatbot, ChatbotDatabaseRow } from "../chatbot/_types.ts";
import type {
  Storage,
  StorageFileObject,
  StorageObject,
} from "../storage/_types.ts";
import type {
  chatFeatures,
  chatFileDataSchema,
  chatContextCompressionSchema,
  chatMessagesSchema,
} from "./_schema.ts";
import type { Database } from "../_shared/_supabase.ts";
import type { DocumentRepositorySearchResult } from "../documentRepositories/_types.ts";
import type { list } from "../storage/list.ts";
import type z from "zod/v4";

export type ToolMCP = {
  input: {
    serverId: string;
    toolName?: string;
    arguments?: Record<string, unknown>;
    cursor?: string;
  };
  output: unknown;
};

export type ToolOutput<T> =
  | (T & { ok: true })
  | {
      ok: false;
      error: string;
    };

type ToolHelper<TInput, TOutput> = {
  input: TInput;
  output: ToolOutput<TOutput>;
};

export type ToolStorageList = ToolHelper<
  { path: string },
  {
    content: Awaited<ReturnType<typeof list>>;
    storage?: Storage;
    storageParent?: StorageObject;
  }
>;

export type ToolStorageReadFile = ToolHelper<
  { offset?: number; path: string },
  {
    content: string;
    contentOffset?: number;
    contentLength: number;
    totalLength: number;
    file: StorageFileObject;
    storage: Storage;
    storagePath: string;
  }
>;

export type ToolStorageWriteFile = ToolHelper<
  { content: string; path: string },
  {
    file: StorageFileObject;
    storage: Storage;
    storagePath: string;
  }
>;

export type ToolStorageTransferFile = ToolHelper<
  { fromPath: string; toPath: string },
  {
    file: StorageFileObject;
    storage: Storage;
    storagePath: string;
    processing: "ready" | "queued" | "unsupported" | "error";
  }
>;

export type ToolStorageSearchResult = {
  storage: Storage;
  storagePath: string;
} & DocumentRepositorySearchResult;

export type ToolStorageSearch = ToolHelper<
  { keywords?: string[] },
  {
    content: ToolStorageSearchResult[];
  }
>;

export type ChatDatabaseRow = Database["public"]["Tables"]["chats"]["Row"] & {
  chatbots?: ChatbotDatabaseRow | null;
};

export type ChatFileData = z.infer<typeof chatFileDataSchema>;
export type ChatContextCompression = z.infer<
  typeof chatContextCompressionSchema
>;

export type ChatMessage = z.infer<typeof chatMessagesSchema>[number];

export type ChatMessagesVersion4 =
  | { messages: ChatMessage[]; version: "chat-messages-version-4" }
  | { version: "???" };

export type Chat = {
  id: ChatDatabaseRow["id"];

  createdAt: Date; // <-- map ChatDatabaseRow['created_at'];

  label: ChatDatabaseRow["label"];
  chatbotId?: NonNullable<ChatDatabaseRow["chatbot_id"]>;
  chatbot?: Chatbot;
  messages?: ChatMessage[];

  userId?: NonNullable<ChatDatabaseRow["user_id"]>;
};

export type ChatFeatures = z.infer<typeof chatFeatures>;

export type ToolWebFetch = ToolHelper<
  { url: string; path?: string; offset?: number },
  | {
      url: string;
      file: StorageFileObject;
      storage: Storage;
      storagePath: string;
      path: string;
      processing: "ready" | "unavailable" | "failed";
      // Optional for persisted results from before text was returned inline.
      content?: string;
    }
  | {
      // Persisted results from before downloads were stored as files.
      url: string;
      title: string;
      content: string;
      contentOffset: number;
      totalLength: number;
      truncated: boolean;
    }
>;

export type ToolWebSearch = ToolHelper<
  { query: string; offset?: number },
  {
    provider: "brave" | "staan";
    query: string;
    results: { title: string; url: string; snippet: string }[];
    nextOffset?: number;
  }
>;

export type ToolCalculator = ToolHelper<
  { expression: string },
  { expression: string; result: number }
>;
export type ToolChatSetLabel = ToolHelper<
  { label: string },
  { label: string; updated: boolean }
>;
export type ToolChatResponseSuggestions = ToolHelper<
  { suggestions: string[] },
  { suggestions: string[] }
>;
export type ToolChatCurrentDateTime = ToolHelper<
  { timeZone?: string },
  { iso: string; timeZone: string; local: string; unixMilliseconds: number }
>;
