import type { Database } from "../_shared/_supabase.ts";
import type { StorageFileObject } from "../storage/_types.ts";
import type { documentRepositorySchema } from "./_schema.ts";
import type { z } from "zod/v4";

export type DatabaseRow = Database["public"]["Tables"]["databases"]["Row"];

export type DocumentRepository = z.infer<typeof documentRepositorySchema>;

export type DocumentRepositorySearchResult = {
  digest: string;
  digestOffset: number;

  embeddingDistance?: number;

  file: StorageFileObject;
};
