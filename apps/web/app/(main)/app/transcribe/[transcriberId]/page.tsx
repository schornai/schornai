import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { TranscriberInfo } from "../_components/TranscriberInfo";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getAIModels } from "../../../../_models/getAIModels";
import { getCurrentUserConfigFavorites } from "../../../../_models/currentUserConfigFavorites";
import { getT } from "next-i18next/server";
import { getTranscriberById } from "@schornio/aibox-package-database/transcriber/getTranscriberById";
import { getWorkspaceClaims } from "../../../../_models/getWorkspaceClaims";
import { notFound } from "next/navigation";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";

export default async function Page(
  props: PageProps<"/app/transcribe/[transcriberId]">,
) {
  const [{ transcriberId }, supabase] = await Promise.all([
    props.params,
    createSupabaseServerClient(),
  ]);

  const [
    { data: transcriber },
    favorites,
    models,
    { claims: workspaces },
    { t },
  ] = await Promise.all([
    tryAsync(() => getTranscriberById(transcriberId, { supabase })),
    getCurrentUserConfigFavorites(),
    getAIModels(),
    getWorkspaceClaims(),
    getT("transcriber", {
      keyPrefix: "_components.TranscriberEditor",
    }),
  ]);

  if (!transcriber) {
    notFound();
  }

  const modelMap = new Map(models.map((model) => [model.identifier, model]));
  const workspace = workspaces.find(
    (workspace) => workspace.id === transcriber.workspaceId,
  );

  return (
    <>
      <HeaderMain appColor={transcriber.color}>
        <HeaderMainContent>{t("labelTranscriber")}</HeaderMainContent>
      </HeaderMain>

      <TranscriberInfo
        favorites={favorites}
        editTranscriberPathname={`/app/transcribe/${transcriber.id}/edit`}
        editDefaultTranscriber={transcriber}
        editable={true}
        modelMap={modelMap}
        transcriber={transcriber}
        workspace={workspace}
      />
    </>
  );
}
