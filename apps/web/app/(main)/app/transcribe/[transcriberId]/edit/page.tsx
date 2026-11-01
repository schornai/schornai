import { TranscriberEditor } from "../_components/TranscriberEditor";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getAIModels } from "../../../../../_models/getAIModels";
import { getCurrentUserConfigFavorites } from "../../../../../_models/currentUserConfigFavorites";
import { getSystemConfigTheme } from "../../../../../_models/systemConfigTheme";
import { getTranscriberById } from "@schornio/aibox-package-database/transcriber/getTranscriberById";
import { getWorkspaceClaims } from "../../../../../_models/getWorkspaceClaims";
import { hasPermission } from "@/lib/hasPermission";
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
    theme,
    { claims: workspaces },
  ] = await Promise.all([
    tryAsync(() => getTranscriberById(transcriberId, { supabase })),
    getCurrentUserConfigFavorites(),
    getAIModels(),
    getSystemConfigTheme(),
    getWorkspaceClaims(),
  ]);

  if (
    !transcriber ||
    !workspaces.some(
      (workspace) =>
        workspace.id === transcriber.workspaceId &&
        hasPermission({
          claim: workspace.claim,
          permission: "workspace-admin",
        }),
    )
  ) {
    notFound();
  }

  return (
    <TranscriberEditor
      favorites={favorites}
      mode="update"
      transcriber={transcriber}
      relations={{ models, theme, workspaces }}
    />
  );
}
