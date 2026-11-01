import { RealtimeRoom } from "@/lib/RealtimeRoom";
import { SidebarActivitesRealtime } from "./SidebarActivitesRealtime";
import { getActivitiesDocumentName } from "@schornio/aibox-realtime/documents/activity/_utils";
import { getCurrentUserProfile } from "../../_models/getCurrentUserProfile";
import { notFound } from "next/navigation";

export async function SidebarActivites() {
  const user = await getCurrentUserProfile();

  if (!user) {
    notFound();
  }

  const activitiesDocumentName = getActivitiesDocumentName({ userId: user.id });

  return (
    <RealtimeRoom name={activitiesDocumentName}>
      <SidebarActivitesRealtime />
    </RealtimeRoom>
  );
}
