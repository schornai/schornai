import type { SupabaseClient } from "../_shared/_types.ts";
import { getWorkspaceById } from "./getWorkspaceById.ts";
import { mapDBOrganizationDescription } from "./_mappers.ts";

export async function updateWorkspaceDocumentation(
  workspaceId: string,
  { documentation }: { documentation: string },
  {
    supabaseServiceRole,
  }: {
    supabaseServiceRole: SupabaseClient;
  },
) {
  const workspace = await getWorkspaceById(workspaceId, {
    supabase: supabaseServiceRole,
  });

  if (!workspace) {
    throw new Error("WORKSPACE_NOT_FOUND");
  }

  await supabaseServiceRole
    .from("organizations")
    .update({
      description: mapDBOrganizationDescription({
        ...workspace,
        documentation,
      }),
    })
    .eq("id", workspaceId)
    .throwOnError();
}
