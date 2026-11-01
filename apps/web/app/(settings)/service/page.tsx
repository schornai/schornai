import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { getGroupSortViewPreferences } from "@/lib/groupSortView/model";
import { ServiceContext } from "./_components/ServiceContext";
import { Suspense } from "react";
import { Skeleton } from "@schornio/aibox-package-ui/components/skeleton";
async function ServicePage() {
  await saveCreateSupabaseServiceRoleClient();
  const userPreferences = await getGroupSortViewPreferences("/service");
  return <ServiceContext userPreferences={userPreferences} />;
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
      <ServicePage />
    </Suspense>
  );
}
