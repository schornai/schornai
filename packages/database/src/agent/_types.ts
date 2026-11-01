import type { Database } from "../_shared/_supabase.ts";
import type { agentSchema } from "./_schemas.ts";

import type z from "zod/mini";

export type ChatbotDatabaseRow =
  Database["public"]["Tables"]["chatbots"]["Row"];

export type Agent = z.infer<typeof agentSchema>;
