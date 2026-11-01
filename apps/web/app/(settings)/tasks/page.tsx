import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { RealtimeRoom } from "@/lib/RealtimeRoom";
import { SquareActivity } from "lucide-react";
import { TaskTable } from "./_components/TaskTable";
import { getT } from "next-i18next/server";
import { getTaskQueueDocumentName } from "@schornio/aibox-realtime/documents/taskQueue/_utils";

export default async function Page() {
  const documentName = getTaskQueueDocumentName();
  const { t } = await getT("settings", {
    keyPrefix: "tasks.page",
  });

  return (
    <RealtimeRoom name={documentName}>
      <HeaderMain>
        <HeaderMainContent>
          <SquareActivity /> {t("labelTitle")}
        </HeaderMainContent>
      </HeaderMain>
      <ContainerMain>
        <TaskTable />
        {/* <CleanupTasksButton /> */}
      </ContainerMain>
    </RealtimeRoom>
  );
}
