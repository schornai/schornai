import { getCurrentUserConfigFavorites } from "../../../_models/currentUserConfigFavorites";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CirclePlus, Info, Search, SlidersHorizontal } from "lucide-react";
import { getT } from "next-i18next/server";
import { CircleChevronsRight } from "@/lib/icons/circle-chevrons-right";
import {
  HeaderMain,
  HeaderMainContent,
  HeaderMainAsideContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Button } from "@schornio/aibox-package-ui/components/button";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { getAutomationContext } from "../../../_models/getAutomationContext";
import { getAutomations } from "@schornio/aibox-package-database/automation/getAutomations";
import { getGroupSortViewPreferences } from "@/lib/groupSortView/model";
import { AutomationList } from "./_components/AutomationList";
import { AutomationListProvider } from "./_components/AutomationListProvider";
import { AutomationListOptionsDropdown } from "./_components/AutomationListOptionsDropdown";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; runs?: string }>;
}) {
  const { edit, runs } = await searchParams;
  if (edit)
    redirect(
      edit === "new"
        ? "/app/automation/new"
        : `/app/automation/${encodeURIComponent(edit)}/edit`,
    );
  if (runs) redirect(`/app/automation/${encodeURIComponent(runs)}/runs`);
  const context = await getAutomationContext();
  const [automations, preferences, { t }, favorites] = await Promise.all([
    getAutomations(context),
    getGroupSortViewPreferences("/app/automation"),
    getT("automation"),
    getCurrentUserConfigFavorites(),
  ]);
  return (
    <AutomationListProvider
      automations={automations}
      userPreferences={preferences}
      favorites={favorites}
    >
      <HeaderMain>
        <HeaderMainContent>
          <CircleChevronsRight />
          {t("labelTitle")}
        </HeaderMainContent>
        <HeaderMainAsideContent>
          <AutomationListOptionsDropdown />
        </HeaderMainAsideContent>
      </HeaderMain>
      <AutomationList />
      <ContainerMain className="mt-10">
        <div className="flex justify-center">
          <Button
            nativeButton={false}
            render={<Link href="/app/automation/new" />}
          >
            <CirclePlus />
            {t("labelNew")}
          </Button>
        </div>
      </ContainerMain>
      <hr className="my-10" />
      <ContainerMain size="narrow" className="flex flex-col gap-3">
        <h2 title={t("labelHelp")}>
          <Info className="mx-auto" size={40} />
        </h2>
        <Alert>
          <Search />
          <AlertDescription>{t("descriptionSearch")}</AlertDescription>
        </Alert>
        <Alert>
          <SlidersHorizontal />
          <AlertDescription>{t("descriptionOptions")}</AlertDescription>
        </Alert>
      </ContainerMain>
    </AutomationListProvider>
  );
}
