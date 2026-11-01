import { Suspense } from "react";
import { Skeleton } from "@schornio/aibox-package-ui/components/skeleton";
import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@schornio/aibox-package-ui/components/empty";
import { Separator } from "@schornio/aibox-package-ui/components/separator";
import { Info, Unplug } from "lucide-react";
import { getT } from "next-i18next/server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { listMCPOAuthConnections } from "@schornio/aibox-package-database/mcp/listMCPOAuthConnections";
import { MCPDisconnectButton } from "./_components/MCPDisconnectButton";

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
  const [{ t }, connections] = await Promise.all([
    getT("me", { keyPrefix: "connections.page" }),
    listMCPOAuthConnections(user.id, {
      supabase: createSupabaseServiceRoleClient(),
    }),
  ]);
  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <Unplug />
          {t("labelTitle")}
        </HeaderMainContent>
      </HeaderMain>
      <ContainerMain className="flex max-w-3xl flex-col gap-4">
        {connections.length ? (
          <ul className="divide-y rounded-lg border">
            {connections.map(({ server_url }) => (
              <li
                key={server_url}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <span className="break-all">{server_url}</span>
                <MCPDisconnectButton serverUrl={server_url} />
              </li>
            ))}
          </ul>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Unplug />
              </EmptyMedia>
              <EmptyTitle>{t("labelEmpty")}</EmptyTitle>
              <EmptyDescription>{t("descriptionEmpty")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </ContainerMain>
      <Separator className="my-10" />
      <ContainerMain className="flex flex-col gap-3" size="narrow">
        <h2 title={t("labelInfo")}>
          <Info className="mx-auto" size={40} />
        </h2>
        <Alert>
          <Unplug />
          <AlertDescription>{t("descriptionConnections")}</AlertDescription>
        </Alert>
      </ContainerMain>
    </>
  );
}
