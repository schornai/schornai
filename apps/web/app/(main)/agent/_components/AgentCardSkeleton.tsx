import {
  CardApp,
  CardAppAvatar,
  CardAppMain,
} from "@schornio/aibox-package-ui/components/card-app";
export function AgentCardSkeleton() {
  return (
    <CardApp className="bg-muted animate-pulse">
      <CardAppMain>
        <CardAppAvatar />
      </CardAppMain>
    </CardApp>
  );
}
