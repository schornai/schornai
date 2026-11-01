import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getCurrentUserConfig } from "@schornio/aibox-package-database/config/getCurrentUserConfig";
import { preferencesSchema } from "@/lib/groupSortView/schemas";

export const getGroupSortViewPreferences = cache(async (id: string) => {
  const configKey = `groupSortView-${id}` as const;
  const supabase = await createSupabaseServerClient();
  const parsedGroupSortViewPreferences = await getCurrentUserConfig(configKey, {
    supabase,
  });
  const { data: preferences } = preferencesSchema.safeParse(
    parsedGroupSortViewPreferences,
  );
  return preferences;
});
