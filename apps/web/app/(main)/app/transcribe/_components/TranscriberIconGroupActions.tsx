"use client";

import {
  IconGroup,
  IconGroupButton,
} from "@schornio/aibox-package-ui/components/icon-group";
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
  workspace,
}: {
  transcriber?: Partial<Transcriber_new>;
  favorites?: SettingFavorites;
  workspace?: WorkspaceClaim;
}) {
  const router = useRouter();
  const { t } = useT("transcriber", {
    keyPrefix: "_components.TranscriberIconGroupActions",
  });

  return (
    <IconGroup>
      {hasPermission({
        claim: workspace?.claim,
        permission: "workspace-admin",
      }) ? (
        <IconGroupButton
          disabled={!transcriber?.id}
          onClick={() => router.push(`/app/transcribe/${transcriber?.id}/edit`)}
          tooltip={t("tooltipEdit")}
        >
          <Pencil />
        </IconGroupButton>
      ) : undefined}
      <IconGroupButton
        disabled={!transcriber?.id}
        onClick={() => router.push(`/app/transcribe/${transcriber?.id}`)}
        tooltip={t("tooltipInfo")}
      >
        <Info />
      </IconGroupButton>
      <TranscriberIconGroupActionFavorite
        transcriber={transcriber}
        favorites={favorites}
      />
      <IconGroupButton
        disabled={!transcriber?.id}
        onClick={() =>
          router.push(
            `/app/transcribe/${transcriber?.id}/${crypto.randomUUID()}/files`,
          )
        }
        tooltip={t("tooltipNewTranscription")}
      >
        <Paperclip />
      </IconGroupButton>
      <IconGroupButton
        disabled={!transcriber?.id}
        onClick={() =>
          router.push(
            `/app/transcribe/${transcriber?.id}/${crypto.randomUUID()}/files#record`,
          )
        }
        tooltip={t("tooltipRecord")}
      >
        <Mic />
      </IconGroupButton>
    </IconGroup>
  );
}
