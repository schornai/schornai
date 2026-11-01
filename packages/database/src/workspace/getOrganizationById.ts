import { cache } from "react";
import { createClient } from "@/supabase/server";
import { mapOrganization } from "./_mappers";

export const getOrganizationById = cache(async (organizationId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(undefined, { cause: error });
  }

  return data ? mapOrganization(data) : undefined;
});
