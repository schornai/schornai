import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Skeleton } from "@schornio/aibox-package-ui/components/skeleton";

export default function Loading() {
  return (
    <ContainerMain aria-busy="true" className="flex flex-col gap-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-48 w-full" />
        ))}
      </div>
    </ContainerMain>
  );
}
