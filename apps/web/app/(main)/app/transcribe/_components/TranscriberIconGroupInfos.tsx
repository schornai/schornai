"use client";

import { Brain, Library } from "lucide-react";
import {
  IconGroup,
  IconGroupInfo,
} from "@schornio/aibox-package-ui/components/icon-group";
import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import { UserRoleText } from "../../../../_components/UserRoleText";
import type { WorkspaceClaim } from "../../../../_models/getWorkspaceClaims";
import { useT } from "next-i18next/client";

export function TranscriberIconGroupInfos({
  model,
  workspace,
}: {
  model?: AIModel;
  workspace?: WorkspaceClaim;
}) {
  const { t } = useT("transcriber", {
    keyPrefix: "_components.TranscriberIconGroupInfos",
  });

  return (
    <IconGroup>
      <IconGroupInfo tooltip={model?.name ?? t("labelModelUnknown")}>
        <Brain />
      </IconGroupInfo>
      <IconGroupInfo
        tooltip={
          <>
            {workspace?.name ?? t("labelUnknownWorkspace")},{" "}
            <UserRoleText role={workspace?.claim} />
          </>
        }
      >
        <Library />
      </IconGroupInfo>
    </IconGroup>
  );
}
