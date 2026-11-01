import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import {
  BotMessageSquare,
  CirclePlus,
  Info,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import {
  HeaderMain,
  HeaderMainAsideContent,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { AgentList } from "./_components/AgentList";
import { AgentListOptionsDropdown } from "./_components/AgentListOptionsDropdown";
import { AgentListProvider } from "./_components/AgentListProvider";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getAIModels } from "../../_models/getAIModels";
import { getAgents } from "@schornio/aibox-package-database/agent/getAgents";
import { getCurrentUserConfigFavorites } from "../../_models/currentUserConfigFavorites";
import { getDocumentRepositories } from "../../_models/getDocumentRepositories";
import { getGroupSortViewPreferences } from "@/lib/groupSortView/model";
import { getT } from "next-i18next/server";
import { getWorkspaceClaims } from "../../_models/getWorkspaceClaims";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const [
    agents,
    favorites,
    groupSortViewPreferences,
    documentRepositories,
    models,
    workspaceClaims,
    { t },
  ] = await Promise.all([
    getAgents({ supabase }),
    getCurrentUserConfigFavorites(),
    getGroupSortViewPreferences("/agent"),
    getDocumentRepositories(),
    getAIModels(),
    getWorkspaceClaims(),
    getT("agent", { keyPrefix: "page" }),
  ]);

  const agentsWithFavorite = agents.map((agent) => ({
    ...agent,
    favorite: Boolean(
      favorites.favorites?.find((favorite) => favorite.id === agent.id),
    ),
  }));

  return (
    <AgentListProvider
      agentsWithFavorite={agentsWithFavorite}
      id="/agent"
      userPreferences={groupSortViewPreferences}
    >
      <HeaderMain>
        <HeaderMainContent>
          <BotMessageSquare />
          {t("labelTitle")}
        </HeaderMainContent>
        <HeaderMainAsideContent>
          <AgentListOptionsDropdown />
        </HeaderMainAsideContent>
      </HeaderMain>

      {agents.length === 0 ? (
        <ContainerMain>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BotMessageSquare />
              </EmptyMedia>
              <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
              <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </ContainerMain>
      ) : (
        <AgentList
          documentRepositories={documentRepositories}
          favorites={favorites}
          models={models}
          workspaceClaims={workspaceClaims}
        />
      )}
      <ContainerMain className="mt-10">
        <div className="flex justify-center">
          <Button nativeButton={false} render={<Link href="/agent/new" />}>
            <CirclePlus />
            {t("labelNewAgent")}
          </Button>
        </div>
      </ContainerMain>
      <hr className="my-10" />
      <ContainerMain className="flex flex-col gap-3" size="narrow">
        <h2 title="Help">
          <Info className="mx-auto" size={40} />
        </h2>

        <Alert>
          <Search />
          <AlertDescription>{t("helpSearchDescription")}</AlertDescription>
        </Alert>
        <Alert>
          <SlidersHorizontal />
          <AlertDescription>{t("helpSortDescription")}</AlertDescription>
        </Alert>
      </ContainerMain>
    </AgentListProvider>
  );
}
