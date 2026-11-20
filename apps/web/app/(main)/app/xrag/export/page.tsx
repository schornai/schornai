import { XRAGImportExport } from "../_components/XRAGImportExport";
import { listXRAGExportJobs } from "@schornio/aibox-package-database/xrag/listXRAGExportJobs";
import { listXRAGPackages } from "@schornio/aibox-package-database/xrag/listXRAGPackages";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getCurrentUserClaims } from "@schornio/aibox-package-database/user/getCurrentUserClaims";
import { requirePlatformAccess } from "@schornio/aibox-package-database/mcp/platformAccess";
import { XRAGPackages } from "../_components/XRAGPackages";
export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const claims = await getCurrentUserClaims({ supabaseAuth: supabase.auth });
  requirePlatformAccess(claims, "admin", "workspace");
  const [packages, jobs] = await Promise.all([
    listXRAGPackages({ supabase }),
    listXRAGExportJobs({ supabase }),
  ]);
  return (
    <XRAGImportExport tab="export">
      <XRAGPackages packages={packages} jobs={jobs} />
    </XRAGImportExport>
  );
}
