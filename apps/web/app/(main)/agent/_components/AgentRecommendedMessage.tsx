"use client";

import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import { useRouter } from "next/navigation";

export function AgentRecommendedMessage({
  agent,
  className,
  onSelect,
  disabled = false,
  recommendedMessage: { id, message, label },
}: {
  agent?: Partial<Agent>;
  className?: string;
  onSelect?: (message: string) => void;
  disabled?: boolean;
  recommendedMessage: Agent["recommendedMessages"][number];
}) {
  const router = useRouter();

  return (
    <ContainerStyled
      appColor={agent?.color}
      className={className}
      render={
        <button
          type="button"
          className="text-left"
          disabled={disabled || !agent?.id}
          onClick={() => {
            if (onSelect) {
              onSelect(message);
              return;
            }
            router.push(
              `/agent/${agent?.id}/${crypto.randomUUID()}#recommendedMessage=${encodeURIComponent(id)}`,
            );
          }}
        />
      }
      variant="card"
    >
      <div className="line-clamp-2">
        <strong>{label}</strong>
        <div>{message}</div>
      </div>
    </ContainerStyled>
  );
}
