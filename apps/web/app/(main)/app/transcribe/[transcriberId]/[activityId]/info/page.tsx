import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { AudioLines } from "lucide-react";
import { TabsTranscription } from "../_components/TabsTranscription";
import { TranscriberInfo } from "../../../_components/TranscriberInfo";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getAIModels } from "../../../../../../_models/getAIModels";
import { getCurrentUserConfigFavorites } from "../../../../../../_models/currentUserConfigFavorites";
import { getTranscriberById } from "@schornio/aibox-package-database/transcriber/getTranscriberById";
import { getWorkspaceClaims } from "../../../../../../_models/getWorkspaceClaims";
import { notFound } from "next/navigation";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";

export default async function Page(
  props: PageProps<"/app/transcribe/[transcriberId]/[activityId]/info">,
) {
  const [{ activityId, transcriberId }, supabase] = await Promise.all([
    props.params,
    createSupabaseServerClient(),
  ]);
  const [{ data: transcriber }, favorites, models, { claims: workspaces }] =
    await Promise.all([
      tryAsync(() => getTranscriberById(transcriberId, { supabase })),
      getCurrentUserConfigFavorites(),
      getAIModels(),
      getWorkspaceClaims(),
    ]);

  if (!transcriber) {
    notFound();
  }

  const modelMap = new Map(models.map((model) => [model.identifier, model]));

  return (
    <>
      <HeaderMain appColor={transcriber?.color}>
        <HeaderMainContent>
          <AudioLines />
          {transcriber?.name}
        </HeaderMainContent>
      </HeaderMain>

      <TabsTranscription
        activityId={activityId}
        transcriberId={transcriberId}
        pathSegment="info"
      />

      <TranscriberInfo
        editDefaultTranscriber={transcriber}
        editTranscriberPathname={`/app/transcribe/${transcriberId}/edit`}
        editable
        favorites={favorites}
        modelMap={modelMap}
        transcriber={transcriber}
        workspace={workspaces.find(
          (workspace) => workspace.id === transcriber.workspaceId,
        )}
      />
    </>
  );
}
