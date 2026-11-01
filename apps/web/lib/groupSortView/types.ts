import type { preferencesSchema } from "@/lib/groupSortView/schemas";
import type { z } from "zod/mini";

export type Preferences = z.infer<typeof preferencesSchema>;
