import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import {
  AudioLines,
  CirclePlus,
  FolderOpen,
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
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { DocumentRepositoryList } from "./_components/DocumentRepositoryList";
import { DocumentRepositoryListOptionsDropdown } from "./_components/DocumentRepositoryListOptionsDropdown";
import { DocumentRepositoryListProvider } from "./_components/DocumentRepositoryListProvider";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getAIModels } from "../../../_models/getAIModels";
import { getCurrentUserConfigFavorites } from "../../../_models/currentUserConfigFavorites";
import { getDocumentRepositories } from "../../../_models/getDocumentRepositories";
import { getGroupSortViewPreferences } from "@/lib/groupSortView/model";
import { getT } from "next-i18next/server";
import { getTranscribers } from "@schornio/aibox-package-database/transcriber/getTranscribers";
import { getWorkspaceClaims } from "../../../_models/getWorkspaceClaims";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const [
    documentRepositories,
    favorites,
    groupSortViewPreferences,
    models,
    transcribers,
    workspaceClaims,
    { t },
  ] = await Promise.all([
    getDocumentRepositories(),
    getCurrentUserConfigFavorites(),
    getGroupSortViewPreferences("/app/documents"),
    getAIModels(),
    getTranscribers({ supabase }),
    getWorkspaceClaims(),
    getT("documentRepository", { keyPrefix: "page" }),
  ]);

  const documentRepositoriesWithFavorite = documentRepositories.map(
    (documentRepository) => ({
      ...documentRepository,
      favorite: Boolean(
        favorites.favorites?.find(
          (favorite) => favorite.id === documentRepository.id,
        ),
      ),
    }),
  );

  return (
    <DocumentRepositoryListProvider
      id="/app/documents"
      documentRepositoriesWithFavorite={documentRepositoriesWithFavorite}
      userPreferences={groupSortViewPreferences}
    >
      <HeaderMain>
        <HeaderMainContent>
          <FolderOpen />
          {t("labelTitle")}
        </HeaderMainContent>
        <HeaderMainAsideContent>
          <DocumentRepositoryListOptionsDropdown />
        </HeaderMainAsideContent>
      </HeaderMain>

      {documentRepositoriesWithFavorite.length === 0 ? (
        <ContainerMain>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <AudioLines />
              </EmptyMedia>
              <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
              <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </ContainerMain>
      ) : (
        <DocumentRepositoryList
          favorites={favorites}
          models={models}
          transcribers={transcribers}
          workspaceClaims={workspaceClaims}
        />
      )}

      <ContainerMain className="mt-10">
        <div className="flex justify-center">
          <Button
            nativeButton={false}
            render={<Link href="/app/documents/new" />}
          >
            <CirclePlus />
            {t("labelNewDocumentRepository")}
          </Button>
        </div>
      </ContainerMain>
      <hr className="my-10" />
      <ContainerMain className="flex flex-col gap-3" size="narrow">
        <h2 title={t("helpTitle")}>
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
        <Alert>
          <AudioLines />
          <AlertDescription>{t("helpTranscriberDescription")}</AlertDescription>
        </Alert>
      </ContainerMain>
    </DocumentRepositoryListProvider>
  );
}
