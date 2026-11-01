import { Suspense } from "react";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Skeleton } from "@schornio/aibox-package-ui/components/skeleton";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { getGroupSortViewPreferences } from "@/lib/groupSortView/model";
import { listAllArtifacts } from "@schornio/aibox-package-database/xrag/listAllArtifacts";
import { ArtifactContext } from "./_components/ArtifactContext";
async function ArtifactsPage() {
  const supabase = await saveCreateSupabaseServiceRoleClient();
  const [artifacts, userPreferences] = await Promise.all([
    listAllArtifacts({ supabase }),
    getGroupSortViewPreferences("/artifacts"),
  ]);
  return (
    <ArtifactContext artifacts={artifacts} userPreferences={userPreferences} />
  );
}
export default function Page() {
  return (
    <Suspense
      fallback={
        <ContainerMain>
          <Skeleton className="h-64 w-full" />
        </ContainerMain>
      }
    >
      <ArtifactsPage />
    </Suspense>
  );
}
