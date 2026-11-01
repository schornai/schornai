import type { SupabaseClient } from "../_shared/_types.ts";
import { mapDBOrganizationDescription } from "./_mappers.ts";

export async function createWorkspace(
  { name, description }: { name: string; description: string },
  { supabaseServiceRole }: { supabaseServiceRole: SupabaseClient },
) {
  const workspaceId = crypto.randomUUID();
  await supabaseServiceRole
    .from("organizations")
    .insert({
      id: workspaceId,
      name,
      description: mapDBOrganizationDescription({
        id: workspaceId,
        name,
        description,
        autoJoin: false,
        createdAt: new Date(),
      }),
      auto_join: false,
    })
    .throwOnError();

  return { workspaceId };
}
