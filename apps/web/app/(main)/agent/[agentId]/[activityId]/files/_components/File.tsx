import { StorageFileActions } from "../../../../../../_components/StorageFileActions";
import {
  HeaderMain,
  HeaderMainContent,
  HeaderMainAsideContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { BotMessageSquare } from "lucide-react";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { StorageBreadcrumbs } from "../../../../../../_components/StorageBreadcrumbs";
import { StorageFilePreview } from "../../../../../../_components/StorageFilePreview";
import type { StorageObject } from "@schornio/aibox-package-database/storage/_types";
import { StorageSession } from "@schornio/aibox-package-database/storage/_utils/StorageSession";
import { TabsChat } from "../../_components/TabsChat";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getAgentById } from "@schornio/aibox-package-database/agent/getAgentById";
import { getDocumentContent } from "@schornio/aibox-package-database/storage/getDocumentContent";
import { notFound } from "next/navigation";
import { storageToAppBasePath } from "@/lib/storageToAppBasePath";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";

export async function File({
  activityId,
  agentId,
  file,
}: {
  activityId: string;
  agentId: string;
  file: StorageObject;
}) {
  const [supabase] = await Promise.all([createSupabaseServerClient()]);

  const storageSession = new StorageSession({
    storage: { activityId, agentId, type: "activity" },
    supabaseStorage: supabase.storage,
  });

  const { data } = await tryAsync(() =>
    Promise.all([
      getAgentById(agentId, { supabase }),
      getDocumentContent(file.path, storageSession),
    ]),
  );

  if (!data) {
    notFound();
  }

  const [agent, content] = data;

  return (
    <>
      <HeaderMain appColor={agent?.color}>
        <HeaderMainContent>
          <BotMessageSquare />
          {agent?.name}
        </HeaderMainContent>
        <HeaderMainAsideContent>
          {file.file && (
            <StorageFileActions
              file={file}
              storage={storageSession.storage}
              canWrite={true}
              navigateAfterChange
              options
              editable={content !== undefined}
            />
          )}
        </HeaderMainAsideContent>
      </HeaderMain>

      <TabsChat
        activityId={activityId}
        agentId={agentId}
        pathSegment="files"
        hasDocumentation={Boolean(agent?.documentation?.trim())}
      />

      <ContainerMain>
        <StorageBreadcrumbs
          basePathApp={storageToAppBasePath(storageSession.storage) ?? ""}
          path={file.path}
        />

        {/* todo: hier wrappen mit dem realtime log (refresh bei neuer action "content changed" oder so) */}
        <StorageFilePreview
          detailView
          canWrite
          fileContent={content}
          fileObject={file}
          storage={storageSession.storage}
        />
      </ContainerMain>
    </>
  );
}
