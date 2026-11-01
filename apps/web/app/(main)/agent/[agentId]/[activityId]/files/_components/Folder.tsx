import {
  HeaderMain,
  HeaderMainAsideContent,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { BotMessageSquare } from "lucide-react";
import { StorageContext } from "../../../../../../_components/StorageContext";
import { StorageSession } from "@schornio/aibox-package-database/storage/_utils/StorageSession";
import { StorageView } from "../../../../../../_components/StorageView";
import { StorageViewOptionsDropdown } from "../../../../../../_components/StorageViewOptionsDropdown";
import { TabsChat } from "../../_components/TabsChat";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getAgentById } from "@schornio/aibox-package-database/agent/getAgentById";
import { getGroupSortViewPreferences } from "@/lib/groupSortView/model";
import { list } from "@schornio/aibox-package-database/storage/list";
import { notFound } from "next/navigation";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";

export async function Folder({
  activityId,
  agentId,
  path,
}: {
  activityId: string;
  agentId: string;
  path: string;
}) {
  const [supabase, groupSortViewPreferences] = await Promise.all([
    createSupabaseServerClient(),
    getGroupSortViewPreferences("/agent/[agentId]/[activityId]/files"),
  ]);

  const { data } = await tryAsync(() =>
    Promise.all([
      list(
        path,
        new StorageSession({
          storage: { activityId, agentId, type: "activity" },
          supabaseStorage: supabase.storage,
        }),
      ),
      getAgentById(agentId, { supabase }),
    ]),
  );

  if (!data) {
    notFound();
  }

  const [storageObjects, agent] = data;

  return (
    <StorageContext
      audioRecording={
        agent?.transcriberIdentifier ? { appColor: agent.color } : undefined
      }
      basePathApp={`/agent/${agentId}/${activityId}/files`}
      basePathStorage={resolvePath(path)}
      id="/agent/[agentId]/[activityId]/files"
      storage={{ activityId, agentId, type: "activity" }}
      storageObjects={storageObjects}
      userPreferences={groupSortViewPreferences}
    >
      <HeaderMain appColor={agent?.color}>
        <HeaderMainContent>
          <BotMessageSquare />
          {agent?.name}
        </HeaderMainContent>
        <HeaderMainAsideContent>
          <StorageViewOptionsDropdown />
        </HeaderMainAsideContent>
      </HeaderMain>

      <TabsChat activityId={activityId} agentId={agentId} pathSegment="files" />

      <StorageView />
    </StorageContext>
  );
}
