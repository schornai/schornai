"use client";

import {
  CardApp,
  CardAppAvatar,
  CardAppContent,
  CardAppDescription,
  CardAppFooter,
  CardAppMain,
  CardAppName,
} from "@schornio/aibox-package-ui/components/card-app";
import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import { AudioLines } from "lucide-react";
import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import { TranscriberIconGroupActions } from "./TranscriberIconGroupActions";
import { TranscriberIconGroupInfos } from "./TranscriberIconGroupInfos";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import type { WorkspaceClaim } from "../../../../_models/getWorkspaceClaims";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";

export function TranscriberCard({
  transcriber,
  favorites,
  model,
  workspace,
}: {
  transcriber?: Partial<Transcriber_new>;
  favorites?: SettingFavorites;
  model?: AIModel;
  workspace?: WorkspaceClaim;
}) {
  const router = useRouter();
  const { t } = useT("transcriber", {
    keyPrefix: "_components.TranscriberCard",
  });

  return (
    <CardApp appColor={transcriber?.color}>
      <div className="text-muted-foreground mx-auto mt-1 flex gap-1 text-xs">
        <AudioLines className="size-4" />
        {t("labelType")}
      </div>
      <CardAppMain
        render={
          transcriber ? (
            <button
              onClick={() =>
                router.push(
                  `/app/transcribe/${transcriber.id}/${crypto.randomUUID()}/files`,
                )
              }
            />
          ) : undefined
        }
      >
        <CardAppAvatar icon={transcriber?.icon} />
        <CardAppContent>
          <CardAppName>{transcriber?.name}</CardAppName>
          <CardAppDescription>{transcriber?.description}</CardAppDescription>
        </CardAppContent>
      </CardAppMain>
      <CardAppFooter>
        <TranscriberIconGroupInfos model={model} workspace={workspace} />
        <TranscriberIconGroupActions
          favorites={favorites}
          transcriber={transcriber}
          workspace={workspace}
        />
      </CardAppFooter>
    </CardApp>
  );
}
