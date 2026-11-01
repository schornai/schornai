import type { SupabaseClient } from "../_shared/_types.ts";
import { getWorkspaceById } from "./getWorkspaceById.ts";
import { mapDBOrganizationDescription } from "./_mappers.ts";

export async function updateWorkspaceSSOMapping(
  workspaceId: string,
  {
    samlMappingEditor,
    samlMappingUser,
    samlMappingWorkspaceAdmin,
  }: {
    samlMappingEditor?: string;
    samlMappingUser?: string;
    samlMappingWorkspaceAdmin?: string;
  },
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
        samlMappingWorkspaceAdmin,
      }),
      saml_mapping_editor: samlMappingEditor ?? null,
      saml_mapping_user: samlMappingUser ?? null,
    })
    .eq("id", workspaceId)
    .throwOnError();
}
