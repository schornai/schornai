"use client";

import {
  ResourceActions,
  ResourceActionButton,
  type ResourceActionDisplay,
} from "../../../_components/ResourceActions";
import type { ReactNode } from "react";
import { Info, Mic, Paperclip, Pencil } from "lucide-react";
import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import { TranscriberIconGroupActionFavorite } from "./TranscriberIconGroupActionFavorite";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import type { WorkspaceClaim } from "../../../../_models/getWorkspaceClaims";
import { hasPermission } from "@/lib/hasPermission";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";

export function TranscriberIconGroupActions({
  transcriber,
  favorites,
  display = "icons",
  packageActions,
  remove,
  workspace,
}: {
  transcriber?: Partial<Transcriber_new>;
  display?: ResourceActionDisplay;
  packageActions?: ReactNode;
  remove?: ReactNode;
  favorites?: SettingFavorites;
  workspace?: WorkspaceClaim;
}) {
  const router = useRouter();
  const { t } = useT("transcriber", {
    keyPrefix: "_components.TranscriberIconGroupActions",
  });

  return (
    <ResourceActions
      display={display}
      primary={
        <>
          <ResourceActionButton
            display={display}
            disabled={!transcriber?.id}
            onClick={() =>
              router.push(
                `/app/transcribe/${transcriber?.id}/${crypto.randomUUID()}/files`,
              )
            }
            label={t("tooltipNewTranscription")}
          >
            <Paperclip />
          </ResourceActionButton>
          {display !== "buttons" && (
            <ResourceActionButton
              display={display}
              disabled={!transcriber?.id}
              onClick={() =>
                router.push(
                  `/app/transcribe/${transcriber?.id}/${crypto.randomUUID()}/files#record`,
                )
              }
              label={t("tooltipRecord")}
            >
              <Mic />
            </ResourceActionButton>
          )}
        </>
      }
      favorite={
        <TranscriberIconGroupActionFavorite
          display={display}
          transcriber={transcriber}
          favorites={favorites}
        />
      }
      info={
        <ResourceActionButton
          display={display}
          disabled={!transcriber?.id}
          onClick={() => router.push(`/app/transcribe/${transcriber?.id}`)}
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
            disabled={!transcriber?.id}
            onClick={() =>
              router.push(`/app/transcribe/${transcriber?.id}/edit`)
            }
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
