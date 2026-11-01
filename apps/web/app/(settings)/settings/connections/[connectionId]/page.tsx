import { Suspense } from "react";
import { Skeleton } from "@schornio/aibox-package-ui/components/skeleton";
import { Plug } from "lucide-react";
import { notFound } from "next/navigation";
import { getWorkspaceClaims } from "../../../../_models/getWorkspaceClaims";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { listConnections } from "@schornio/aibox-package-database/connections/listConnections";
import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ConnectionForm } from "../_components/ConnectionForm";
async function Content({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  if (!(await getWorkspaceClaims()).isAdmin) notFound();
  const { connectionId } = await params;
  const connection = (
    await listConnections({
      supabase: await saveCreateSupabaseServiceRoleClient(),
    })
  ).find((item) => item.id === connectionId);
  if (!connection || !["oauth", "brave", "staan"].includes(connection.kind))
    notFound();
  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <Plug />
          {connection.name}
        </HeaderMainContent>
      </HeaderMain>
      <ContainerMain>
        <ConnectionForm
          key={connection.id}
          kind={connection.kind as "oauth" | "brave" | "staan"}
          connection={connection}
        />
      </ContainerMain>
    </>
  );
}

export default function Page(props: {
  params: Promise<{ connectionId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <ContainerMain>
          <Skeleton className="h-40 w-full" />
        </ContainerMain>
      }
    >
      <Content {...props} />
    </Suspense>
  );
}
