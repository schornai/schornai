import { listUserGrants } from "@schornio/aibox-package-database/platformMcp/listUserGrants";
import { PersonalMCPConnections } from "./_components/PersonalMCPConnections";
import { Suspense } from "react";
import { Skeleton } from "@schornio/aibox-package-ui/components/skeleton";
import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Unplug } from "lucide-react";
import { getT } from "next-i18next/server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { listMCPOAuthConnections } from "@schornio/aibox-package-database/mcp/listMCPOAuthConnections";

export default function Page() {
  return (
    <Suspense
      fallback={
        <ContainerMain aria-busy="true">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="mt-4 h-40 w-full" />
        </ContainerMain>
      }
    >
      <Connections />
    </Suspense>
  );
}

async function Connections() {
  const {
    data: { user },
  } = await (await createSupabaseServerClient()).auth.getUser();
  if (!user) redirect("/signin");
  const [{ t }, connections, grants] = await Promise.all([
    getT("me", { keyPrefix: "connections.page" }),
    listMCPOAuthConnections(user.id, {
      supabase: createSupabaseServiceRoleClient(),
    }),
    listUserGrants(user.id, { supabase: createSupabaseServiceRoleClient() }),
  ]);
  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <Unplug />
          {t("labelTitle")}
        </HeaderMainContent>
      </HeaderMain>
      <ContainerMain>
        <PersonalMCPConnections
          grants={grants}
          serverUrls={connections.map(({ server_url }) => server_url)}
          now={new Date().toISOString()}
        />
      </ContainerMain>
    </>
  );
}
