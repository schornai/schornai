import {
  HeaderMain,
  HeaderMainAsideContent,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { AudioLines } from "lucide-react";
import { AudioRecorderButton } from "../../../../../../../_components/AudioRecorderModal";
import { StorageContext } from "../../../../../../../_components/StorageContext";
import { StorageSession } from "@schornio/aibox-package-database/storage/_utils/StorageSession";
import { StorageView } from "../../../../../../../_components/StorageView";
import { StorageViewOptionsDropdown } from "../../../../../../../_components/StorageViewOptionsDropdown";
import { TabsTranscription } from "../../_components/TabsTranscription";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getGroupSortViewPreferences } from "@/lib/groupSortView/model";
import { getTranscriberById } from "@schornio/aibox-package-database/transcriber/getTranscriberById";
import { list } from "@schornio/aibox-package-database/storage/list";
import { notFound } from "next/navigation";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";

export async function Folder({
  activityId,
  transcriberId,
  path,
}: {
  activityId: string;
  transcriberId: string;
  path: string;
}) {
  const [supabase, groupSortViewPreferences] = await Promise.all([
    createSupabaseServerClient(),
    getGroupSortViewPreferences(
      "/app/transcribe/[transcriberId]/[activityId]/files",
    ),
  ]);

  const { data } = await tryAsync(() =>
    Promise.all([
      list(
        path,
        new StorageSession({
          storage: {
            activityId,
            transcriberId,
            type: "activity-transcription",
          },
          supabaseStorage: supabase.storage,
        }),
      ),
      getTranscriberById(transcriberId, { supabase }),
    ]),
  );

  if (!data) {
    notFound();
  }

  const [storageObjects, transcriber] = data;

  return (
    <StorageContext
      audioRecording={{ appColor: transcriber?.color }}
      basePathApp={`/app/transcribe/${transcriberId}/${activityId}/files`}
      basePathStorage={resolvePath(path)}
      id="/app/transcribe/[transcriberId]/[activityId]/files"
      storage={{ activityId, transcriberId, type: "activity-transcription" }}
      storageObjects={storageObjects}
      userPreferences={groupSortViewPreferences}
    >
      <HeaderMain appColor={transcriber?.color}>
        <HeaderMainContent>
          <AudioLines />
          {transcriber?.name}
        </HeaderMainContent>
        <HeaderMainAsideContent>
          <AudioRecorderButton iconOnly />
          <StorageViewOptionsDropdown />
        </HeaderMainAsideContent>
      </HeaderMain>

      <TabsTranscription
        activityId={activityId}
        transcriberId={transcriberId}
        pathSegment="files"
      />

      <StorageView />
    </StorageContext>
  );
}
