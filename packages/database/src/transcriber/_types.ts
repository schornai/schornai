import type {
  transcriberConfigLegacySchema,
  transcriberLegacySchema,
  transcriberSchema,
  transcriptionRetryLevelSchema,
  // transcriptionContentSchema,
} from "./_schemas.ts";
import type { Database } from "../_shared/_supabase.ts";
import type { z } from "zod/v4";

export type TranscriberDatabaseRow =
  Database["public"]["Tables"]["transcribers"]["Row"] & {
    ai_models?: Database["public"]["Tables"]["ai_models"]["Row"];
  };

export type TranscriptionDatabaseRow =
  Database["public"]["Tables"]["transcriptions"]["Row"] & {
    transcribers?: Database["public"]["Tables"]["transcribers"]["Row"];
  };

export type TranscriberConfig = z.infer<typeof transcriberConfigLegacySchema>;

export type TranscriberLegacy = z.infer<typeof transcriberLegacySchema>;

export type Transcriber_new = z.infer<typeof transcriberSchema>;

export type TranscriptionRetryLevel = z.infer<
  typeof transcriptionRetryLevelSchema
>;
