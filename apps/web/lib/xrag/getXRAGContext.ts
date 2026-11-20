import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { getCurrentUser } from "@schornio/aibox-package-database/user/getCurrentUser";
import { getCurrentUserClaims } from "@schornio/aibox-package-database/user/getCurrentUserClaims";
import { getAuthorizedResource } from "@schornio/aibox-package-database/xrag/getAuthorizedResource";
import { getAIModelById } from "@schornio/aibox-package-database/aiModel/getAIModelById";
import { requirePlatformAccess } from "@schornio/aibox-package-database/mcp/platformAccess";
import { transferPathSchema } from "@schornio/aibox-package-database/xrag/transferSchema";
import type { XRAGResource } from "xrag/schema";

/** Authorize the exact source and target before creating a privileged client.
 * The shared operations repeat these checks for non-web callers. */
export async function getXRAGContext(input: {
  source?: { path: string };
  target?: { workspaceId: string; newWorkspaceName?: string };
  selection?: { kind: XRAGResource["resourceType"] | "model"; id: string };
}) {
  const supabase = await createSupabaseServerClient();
  const [user, claims] = await Promise.all([
    getCurrentUser({ supabaseAuth: supabase.auth }),
    getCurrentUserClaims({ supabaseAuth: supabase.auth }),
  ]);
  requirePlatformAccess(claims, "admin", "workspace");
  const authenticated = { userId: user.id, claims };
  if (
    input.source &&
    transferPathSchema.parse(input.source.path).split("/")[0] !== user.id
  )
    throw new Error("NOT_AUTHORIZED");
  if (input.target)
    requirePlatformAccess(
      claims,
      "admin",
      input.target.newWorkspaceName === undefined ? "workspace" : "admin",
      input.target.workspaceId,
    );
  if (input.selection) {
    if (input.selection.kind === "model")
      await getAIModelById(input.selection.id, { supabase });
    else
      await getAuthorizedResource(input.selection.kind, input.selection.id, {
        supabase,
        authenticated,
      });
  }
  const supabaseServiceRole =
    claims === "admin"
      ? await saveCreateSupabaseServiceRoleClient()
      : createSupabaseServiceRoleClient();
  return { supabase, supabaseServiceRole, authenticated };
}
