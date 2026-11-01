import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getWorkspaces as getWorkspacesCore } from "@schornio/aibox-package-database/workspace/getWorkspaces";

export const getWorkspaces = cache(async () => {
  const supabase = await createSupabaseServerClient();
  return await getWorkspacesCore({ supabase });
});
