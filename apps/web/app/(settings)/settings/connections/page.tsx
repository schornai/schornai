import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getT } from "next-i18next/server";
import { Info } from "lucide-react";
import { getWorkspaceClaims } from "../../../_models/getWorkspaceClaims";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";
import { listConnections } from "@schornio/aibox-package-database/connections/listConnections";
import { ConnectionsManager } from "./_components/ConnectionsManager";
import { getGroupSortViewPreferences } from "@/lib/groupSortView/model";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Skeleton } from "@schornio/aibox-package-ui/components/skeleton";
import { Separator } from "@schornio/aibox-package-ui/components/separator";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
export default function Page() {
  return (
    <Suspense
      fallback={
        <ContainerMain>
          <Skeleton className="h-40 w-full" />
        </ContainerMain>
      }
    >
      <Connections />
    </Suspense>
  );
}
async function Connections() {
  const { isAdmin } = await getWorkspaceClaims();
  if (!isAdmin) redirect("/me");
  const [{ t }, connections, preferences] = await Promise.all([
    getT("settings", { keyPrefix: "connections" }),

    listConnections({ supabase: await saveCreateSupabaseServiceRoleClient() }),
    getGroupSortViewPreferences("/settings/connections"),
  ]);
  return (
    <>
      <ConnectionsManager
        initialConnections={connections}
        userPreferences={preferences}
      />
      <Separator className="my-10" />
      <ContainerMain size="narrow">
        <Alert>
          <Info />
          <AlertDescription>{t("descriptionInfo")}</AlertDescription>
        </Alert>
      </ContainerMain>
    </>
  );
}
