import { Suspense } from "react";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Skeleton } from "@schornio/aibox-package-ui/components/skeleton";
import { ClusterOverview } from "./_components/ClusterOverview";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ContainerMain>
          <Skeleton className="h-64 w-full" />
        </ContainerMain>
      }
    >
      <ClusterOverview />
    </Suspense>
  );
}
