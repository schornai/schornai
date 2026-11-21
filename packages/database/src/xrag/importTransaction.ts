import { z } from "zod";
import { userClaimsSchema } from "../auth/_schemas.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import type { Json } from "../_shared/_supabase.ts";

export const IMPORT_STAGING_BUCKET = "xrag-import-staging";
export const importPlanSchema = z.object({
  source: z
    .object({ path: z.string(), uploadId: z.uuid().optional() })
    .optional(),
  entries: z.array(z.json()),
  target: z
    .object({
      workspaceId: z.string(),
      newWorkspaceName: z.string().optional(),
    })
    .optional(),
  claims: userClaimsSchema,
  files: z.array(
    z.object({
      path: z.string(),
      basePath: z.string(),
      // Older in-flight imports may still have an incoming staging copy.
      stage: z.string().optional(),
      backup: z.string(),
      hadOriginal: z.boolean().default(false),
      // Missing input removes stale text/transcript sidecars when replacing a file.
      remove: z.boolean().default(false),
    }),
  ),
  artifacts: z.array(z.object({ path: z.string(), name: z.string() })),
  processing: z.array(
    z.object({
      id: z.uuid(),
      path: z.string(),
      useSavedContent: z.boolean(),
      storage: z.object({
        type: z.literal("documentRepository"),
        workspaceId: z.string(),
        documentRepositoryId: z.string(),
      }),
    }),
  ),
});
export type ImportPlan = z.infer<typeof importPlanSchema>;
export const importResultSchema = z.object({
  workspaceId: z.string().nullable(),
  imported: z.array(
    z.object({ kind: z.string(), originId: z.string(), localId: z.string() }),
  ),
  publications: z.array(z.string()),
  documentFileCount: z.number().int().nonnegative(),
});
export const json = (value: unknown): Json => JSON.parse(JSON.stringify(value));

/** Service-only. Never infer a failed commit from a lost HTTP response. */
export async function readImport(id: string, supabase: SupabaseClient) {
  const result = await supabase
    .from("xrag_import_transactions")
    .select("*")
    .eq("id", id)
    .single();
  if (result.error || !result.data)
    throw new Error("XRAG_IMPORT_STATE_UNAVAILABLE");
  return { ...result.data, plan: importPlanSchema.parse(result.data.plan) };
}

export async function renewImport(
  id: string,
  token: string,
  supabase: SupabaseClient,
) {
  const result = await supabase
    .from("xrag_import_transactions")
    .update({ expires_at: new Date(Date.now() + 300_000).toISOString() })
    .eq("id", id)
    .eq("token", token)
    .in("state", ["preparing", "applying", "rolling_back"])
    .gt("expires_at", new Date().toISOString())
    .select("id")
    .single();
  if (result.error || !result.data) throw new Error("XRAG_IMPORT_LEASE_LOST");
}

export async function setImportApplying(
  id: string,
  token: string,
  supabase: SupabaseClient,
) {
  const result = await supabase
    .from("xrag_import_transactions")
    .update({ state: "applying", files_applied: true })
    .eq("id", id)
    .eq("token", token)
    .eq("state", "preparing")
    .gt("expires_at", new Date().toISOString())
    .select("id")
    .single();
  if (result.error || !result.data) throw new Error("XRAG_IMPORT_LEASE_LOST");
}
