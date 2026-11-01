import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { BotMessageSquare } from "lucide-react";
import { getAgentById } from "../_models/getAgentById";

export async function HeaderAgent({ agentId }: { agentId: string }) {
  const agent = await getAgentById(agentId);

  return (
    <HeaderMain appColor={agent?.color}>
      <HeaderMainContent>
        <BotMessageSquare />
        {agent?.name}
      </HeaderMainContent>
    </HeaderMain>
  );
}
