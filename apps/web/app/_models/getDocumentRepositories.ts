import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getDocumentRepositories as getDocumentRepositoriesCore } from "@schornio/aibox-package-database/documentRepositories/getDocumentRepositories";

export const getDocumentRepositories = cache(async () => {
  const supabase = await createSupabaseServerClient();
  return await getDocumentRepositoriesCore({ supabase });
});
