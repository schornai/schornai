import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { AgentCardSkeleton } from "./_components/AgentCardSkeleton";
import { AgentListCardsContainer } from "./_components/AgentListCardsContainer";
import { BotMessageSquare } from "lucide-react";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Skeleton } from "@schornio/aibox-package-ui/components/skeleton";

export default function Loading() {
  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <BotMessageSquare className="text-muted-foreground animate-pulse" />
        </HeaderMainContent>
      </HeaderMain>

      <ContainerMain className="flex justify-center">
        <Skeleton className="h-8 w-sm" />
      </ContainerMain>

      <AgentListCardsContainer>
        <AgentCardSkeleton />
        <AgentCardSkeleton />
        <AgentCardSkeleton />
      </AgentListCardsContainer>
    </>
  );
}
