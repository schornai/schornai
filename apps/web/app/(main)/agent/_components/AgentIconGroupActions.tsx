"use client";

import {
  IconGroup,
  IconGroupButton,
} from "@schornio/aibox-package-ui/components/icon-group";
import { Info, MessageSquarePlus, Pencil } from "lucide-react";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { AgentIconGroupActionFavorite } from "./AgentIconGroupActionFavorite";
import type { SettingFavorites } from "../../../_models/currentUserConfigFavorites";
import type { WorkspaceClaim } from "../../../_models/getWorkspaceClaims";
import { hasPermission } from "@/lib/hasPermission";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";

export function AgentIconGroupActions({
  agent,
  favorites,
  workspace,
}: {
  agent?: Partial<Agent>;
  favorites?: SettingFavorites;
  workspace?: WorkspaceClaim;
}) {
  const router = useRouter();
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentIconGroupActions",
  });

  return (
    <IconGroup>
      {hasPermission({
        claim: workspace?.claim,
        permission: "workspace-admin",
      }) ? (
        <IconGroupButton
          disabled={!agent?.id}
          onClick={() => router.push(`/agent/${agent?.id}/edit`)}
          tooltip={t("tooltipEdit")}
        >
          <Pencil />
        </IconGroupButton>
      ) : undefined}
      <IconGroupButton
        disabled={!agent?.id}
        onClick={() => router.push(`/agent/${agent?.id}`)}
        tooltip={t("tooltipInfo")}
      >
        <Info />
      </IconGroupButton>
      <AgentIconGroupActionFavorite agent={agent} favorites={favorites} />
      <IconGroupButton
        disabled={
          !agent?.id ||
          !hasPermission({ claim: workspace?.claim, permission: "user" })
        }
        onClick={() =>
          router.push(`/agent/${agent?.id}/${crypto.randomUUID()}`)
        }
        tooltip={t("tooltipNewChat")}
      >
        <MessageSquarePlus />
      </IconGroupButton>
    </IconGroup>
  );
}
