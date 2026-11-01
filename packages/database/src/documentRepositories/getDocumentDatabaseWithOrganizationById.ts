import type { SupabaseClient } from "../_shared/_types.ts";
import { mapDocumentDatabaseWithOrganization } from "./_mappers.ts";

export async function getDocumentDatabaseWithOrganizationById(
  databaseId: string,
  { supabase }: { supabase: SupabaseClient },
) {
  const { data } = await supabase
    .from("databases")
    .select("*, organizations(*)")
    .eq("id", databaseId)
    .single()
    .throwOnError();

  const mappedData = mapDocumentDatabaseWithOrganization(data);

  if (!mappedData) {
    throw new Error(
      `Could not map document database. databaseId: "${databaseId}"`,
    );
  }

  return mappedData;
}
