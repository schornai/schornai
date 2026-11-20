import { XRAGImportExport } from "../_components/XRAGImportExport";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getCurrentUser } from "@schornio/aibox-package-database/user/getCurrentUser";
import { getCurrentUserClaims } from "@schornio/aibox-package-database/user/getCurrentUserClaims";
import { requirePlatformAccess } from "@schornio/aibox-package-database/mcp/platformAccess";
import { XRAGImportUpload } from "../_components/XRAGImportUpload";
export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const [user, claims] = await Promise.all([
    getCurrentUser({ supabaseAuth: supabase.auth }),
    getCurrentUserClaims({ supabaseAuth: supabase.auth }),
  ]);
  requirePlatformAccess(claims, "admin", "workspace");
  return (
    <XRAGImportExport tab="import">
      <XRAGImportUpload userId={user.id} />
    </XRAGImportExport>
  );
}
