import { StorageFileActions } from "../../../../../../../_components/StorageFileActions";
import {
  HeaderMain,
  HeaderMainContent,
  HeaderMainAsideContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { AudioLines } from "lucide-react";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { StorageBreadcrumbs } from "../../../../../../../_components/StorageBreadcrumbs";
import { StorageFilePreview } from "../../../../../../../_components/StorageFilePreview";
import type { StorageObject } from "@schornio/aibox-package-database/storage/_types";
import { StorageSession } from "@schornio/aibox-package-database/storage/_utils/StorageSession";
import { TabsTranscription } from "../../_components/TabsTranscription";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getDocumentContent } from "@schornio/aibox-package-database/storage/getDocumentContent";
import { getTranscriberById } from "@schornio/aibox-package-database/transcriber/getTranscriberById";
import { notFound } from "next/navigation";
import { storageToAppBasePath } from "@/lib/storageToAppBasePath";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";

export async function File({
  activityId,
  file,
  transcriberId,
}: {
  activityId: string;
  file: StorageObject;
  transcriberId: string;
}) {
  const [supabase] = await Promise.all([createSupabaseServerClient()]);

  const storageSession = new StorageSession({
    storage: { activityId, transcriberId, type: "activity-transcription" },
    supabaseStorage: supabase.storage,
  });

  const { data } = await tryAsync(() =>
    Promise.all([
      getTranscriberById(transcriberId, { supabase }),
      getDocumentContent(file.path, storageSession),
    ]),
  );

  if (!data) {
    notFound();
  }

  const [transcriber, content] = data;

  return (
    <>
      <HeaderMain appColor={transcriber?.color}>
        <HeaderMainContent>
          <AudioLines />
          {transcriber?.name}
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

      <TabsTranscription
        activityId={activityId}
        transcriberId={transcriberId}
        pathSegment="files"
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
