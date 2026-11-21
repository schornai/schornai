import { globalIdentifierSchema } from "xrag/identifier";
import { z } from "zod";
import { resourceKindSchema } from "xrag/schema";
import type { XRAGOptions } from "./authentication.ts";
import { getAuthorizedResource } from "./getAuthorizedResource.ts";
import { getResourceIdentity } from "./getResourceIdentity.ts";

export const setResourceIdentitySchema = z.object({
  kind: resourceKindSchema,
  id: z.string().min(1),
  globalId: globalIdentifierSchema,
  expectedGlobalId: globalIdentifierSchema,
});

/** Changing an identity affects future exports, never previously created files.
 * Compare the displayed identity to prevent overwriting another editor's change. */
export async function setResourceIdentity(
  input: z.input<typeof setResourceIdentitySchema>,
  options: XRAGOptions,
) {
  const value = setResourceIdentitySchema.parse(input);
  const object = await getAuthorizedResource(value.kind, value.id, options);
  const current = await getResourceIdentity(
    value.kind,
    object.id,
    object.workspaceId,
    {
      supabase: options.supabaseServiceRole,
      name: object.name,
    },
  );
  if (current !== value.expectedGlobalId)
    throw new Error("XRAG_IDENTITY_CHANGED");
  const result = await options.supabaseServiceRole
    .from("xrag_resource_origins")
    .update({ origin_id: value.globalId })
    .eq("kind", value.kind)
    .eq("local_id", object.id)
    .eq("workspace_id", object.workspaceId)
    .eq("origin_id", value.expectedGlobalId)
    .select("origin_id")
    .maybeSingle();
  if (result.error?.code === "23505") throw new Error("XRAG_IDENTITY_EXISTS");
  if (result.error) throw new Error("XRAG_IDENTITY_FAILED");
  if (!result.data) throw new Error("XRAG_IDENTITY_CHANGED");
  return { globalId: result.data.origin_id };
}
