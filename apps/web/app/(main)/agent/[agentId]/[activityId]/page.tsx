import { ensureActivity } from "@/lib/ensureActivity";
import { getCurrentUser } from "@schornio/aibox-package-database/user/getCurrentUser";
import { ChatComposeMessage } from "./_components/ChatComposeMessage";
import { ChatComposeMessageContext } from "./_components/ChatComposeMessageContext";
import { ChatContext } from "./_components/ChatContext";
import { ChatMessageItems } from "./_components/ChatMessageItems";
import { ContainerChat } from "./_components/ContainerChat";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { HeaderAgent } from "../_components/HeaderAgent";
import { MessageScrollerContent } from "@schornio/aibox-package-ui/components/message-scroller";
import { TabsChat } from "./_components/TabsChat";
import { TabsMainContent } from "../../../../_components/TabsMain";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { getAgentWorkspaceId } from "@schornio/aibox-package-database/agent/getAgentWorkspaceId";
import { getAgentById } from "@schornio/aibox-package-database/agent/getAgentById";
import { notFound } from "next/navigation";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";
import { getWorkspaceClaims } from "../../../../_models/getWorkspaceClaims";
import { hasPermission } from "@/lib/hasPermission";
import { getT } from "next-i18next/server";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";

export default async function Page(
  props: PageProps<"/agent/[agentId]/[activityId]">,
) {
  const [{ agentId, activityId }, supabase] = await Promise.all([
    props.params,
    createSupabaseServerClient(),
  ]);

  const { claims } = await getWorkspaceClaims();
  const workspaceId = await getAgentWorkspaceId(agentId, {
    supabase: createSupabaseServiceRoleClient(),
  });
  if (!workspaceId) notFound();
  const workspace = claims.find((item) => item.id === workspaceId);
  if (!hasPermission({ claim: workspace?.claim, permission: "user" })) {
    const { t } = await getT("agent", {
      keyPrefix: "_components.ChatComposeMessage",
    });
    return (
      <ContainerMain>
        <Alert variant="destructive">
          <AlertDescription>{t("errorNoAccess")}</AlertDescription>
        </Alert>
      </ContainerMain>
    );
  }
  const { data: agent } = await tryAsync(() =>
    getAgentById(agentId, { supabase }),
  );
  if (!agent) notFound();
  const user = await getCurrentUser({ supabaseAuth: supabase.auth });
  await ensureActivity(
    user.id,
    { type: "activity", activityId, agentId },
    { publishActivity: false },
  );
  return (
    <ChatContext activityId={activityId} agentId={agentId}>
      <ChatComposeMessageContext
        activityId={activityId}
        agentId={agentId}
        modelThinking={agent.modelThinking}
        audioRecording={
          agent.transcriberIdentifier ? { appColor: agent.color } : undefined
        }
      >
        <ContainerChat>
          <HeaderAgent agentId={agentId} />

          <TabsChat
            activityId={activityId}
            agentId={agentId}
            pathSegment="chat"
          />

          <ContainerMain>
            <TabsMainContent view="default">
              <MessageScrollerContent>
                <ChatMessageItems
                  activityId={activityId}
                  agentColor={agent.color}
                />
              </MessageScrollerContent>
            </TabsMainContent>
          </ContainerMain>
        </ContainerChat>

        <ChatComposeMessage agentColor={agent.color} />
      </ChatComposeMessageContext>
    </ChatContext>
  );
}
