import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { MarkdownProse } from "@schornio/aibox-package-ui/components/markdown-prose";
import { notFound } from "next/navigation";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";
import { HeaderAgent } from "../../_components/HeaderAgent";
import { getAgentById } from "../../_models/getAgentById";
import { TabsChat } from "../_components/TabsChat";

export default async function Page(
  props: PageProps<"/agent/[agentId]/[activityId]/documentation">,
) {
  const { agentId, activityId } = await props.params;
  const { data: agent } = await tryAsync(() => getAgentById(agentId));
  if (!agent?.documentation?.trim()) notFound();

  return (
    <>
      <HeaderAgent agentId={agentId} />
      <TabsChat
        activityId={activityId}
        agentId={agentId}
        pathSegment="documentation"
        hasDocumentation
      />
      <ContainerMain>
        <MarkdownProse className="max-w-full">
          {agent.documentation}
        </MarkdownProse>
      </ContainerMain>
    </>
  );
}
