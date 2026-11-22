"use client";

import {
  ResourceActions,
  ResourceActionButton,
  type ResourceActionDisplay,
} from "../../_components/ResourceActions";
import type { ReactNode } from "react";
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
  display = "icons",
  packageActions,
  remove,
  workspace,
}: {
  agent?: Partial<Agent>;
  display?: ResourceActionDisplay;
  packageActions?: ReactNode;
  remove?: ReactNode;
  favorites?: SettingFavorites;
  workspace?: WorkspaceClaim;
}) {
  const router = useRouter();
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentIconGroupActions",
  });

  return (
    <ResourceActions
      display={display}
      primary={
        <ResourceActionButton
          display={display}
          disabled={
            !agent?.id ||
            !hasPermission({ claim: workspace?.claim, permission: "user" })
          }
          onClick={() =>
            router.push(`/agent/${agent?.id}/${crypto.randomUUID()}`)
          }
          label={t("tooltipNewChat")}
        >
          <MessageSquarePlus />
        </ResourceActionButton>
      }
      favorite={
        <AgentIconGroupActionFavorite
          display={display}
          agent={agent}
          favorites={favorites}
        />
      }
      info={
        <ResourceActionButton
          display={display}
          disabled={!agent?.id}
          onClick={() => router.push(`/agent/${agent?.id}`)}
          label={t("tooltipInfo")}
        >
          <Info />
        </ResourceActionButton>
      }
      edit={
        hasPermission({
          claim: workspace?.claim,
          permission: "workspace-admin",
        }) && (
          <ResourceActionButton
            display={display}
            disabled={!agent?.id}
            onClick={() => router.push(`/agent/${agent?.id}/edit`)}
            label={t("tooltipEdit")}
          >
            <Pencil />
          </ResourceActionButton>
        )
      }
      packageActions={packageActions}
      remove={remove}
    />
  );
}
