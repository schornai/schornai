import { ActivityContextProvider } from "./ActivityContextProvider";
import type { ReactNode } from "react";
import { RealtimeRoom } from "@/lib/RealtimeRoom";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getActivitiesDocumentName } from "@schornio/aibox-realtime/documents/activity/_utils";
import { getActivityTypeInfos } from "@schornio/aibox-package-database/activity/getActivityTypeInfos";
import { getCurrentUser } from "@schornio/aibox-database/user/getCurrentUser";

export async function ActivityContext({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser({ supabaseAuth: supabase.auth });

  const activitiesDocumentName = getActivitiesDocumentName({ userId: user.id });

  const typeInfos = await getActivityTypeInfos({ supabase });

  return (
    <RealtimeRoom name={activitiesDocumentName}>
      <ActivityContextProvider typeInfos={typeInfos}>
        {children}
      </ActivityContextProvider>
    </RealtimeRoom>
  );
}
