import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import {
  AudioLines,
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
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import Link from "next/link";
import { TranscriberList } from "./_components/TranscriberList";
import { TranscriberListOptionsDropdown } from "./_components/TranscriberListOptionsDropdown";
import { TranscriberListProvider } from "./_components/TranscriberListProvider";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getAIModels } from "../../../_models/getAIModels";
import { getCurrentUserConfigFavorites } from "../../../_models/currentUserConfigFavorites";
import { getGroupSortViewPreferences } from "@/lib/groupSortView/model";
import { getT } from "next-i18next/server";
import { getTranscribers } from "@schornio/aibox-package-database/transcriber/getTranscribers";
import { getWorkspaceClaims } from "../../../_models/getWorkspaceClaims";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const [
    transcribers,
    favorites,
    groupSortViewPreferences,
    models,
    workspaceClaims,
    { t },
  ] = await Promise.all([
    getTranscribers({ supabase }),
    getCurrentUserConfigFavorites(),
    getGroupSortViewPreferences("/app/transcribe"),
    getAIModels(),
    getWorkspaceClaims(),
    getT("transcriber", { keyPrefix: "page" }),
  ]);

  const transcriberWithFavorite = transcribers.map((transcriber) => ({
    ...transcriber,
    favorite: Boolean(
      favorites.favorites?.find((favorite) => favorite.id === transcriber.id),
    ),
  }));

  return (
    <TranscriberListProvider
      id="/app/transcribe"
      transcriberWithFavorite={transcriberWithFavorite}
      userPreferences={groupSortViewPreferences}
    >
        <HeaderMain>
           <HeaderMainContent>
             <AudioLines />
             {t("labelTitle")}
           </HeaderMainContent>
           <HeaderMainAsideContent>
             <TranscriberListOptionsDropdown />
           </HeaderMainAsideContent>
         </HeaderMain>

         {transcriberWithFavorite.length === 0 ? (
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
        <TranscriberList
          favorites={favorites}
          models={models}
          workspaceClaims={workspaceClaims}
        />
      )}

      <ContainerMain className="mt-10">
        <div className="flex justify-center">
          <Button
            nativeButton={false}
            render={<Link href="/app/transcribe/new" />}
          >
            <CirclePlus />
            {t("labelNewTranscriber")}
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
        </ContainerMain>
    </TranscriberListProvider>
  );
}
