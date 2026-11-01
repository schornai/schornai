"use client";

import { AudioLines, Library, Search, VectorPolygon } from "lucide-react";
import {
  IconGroup,
  IconGroupInfo,
} from "@schornio/aibox-package-ui/components/icon-group";
import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import { UserRoleText } from "../../../../_components/UserRoleText";
import type { WorkspaceClaim } from "../../../../_models/getWorkspaceClaims";
import { useT } from "next-i18next/client";

export function DocumentRepositoryIconGroupInfos({
  documentRepository,
  embeddingModel,
  transcriber,
  workspace,
}: {
  documentRepository?: Partial<DocumentRepository>;
  embeddingModel?: AIModel;
  transcriber?: Transcriber_new;
  workspace?: WorkspaceClaim;
}) {
  const { t } = useT("documentRepository", {
    keyPrefix: "_components.DocumentRepositoryIconGroupInfos",
  });

  return (
    <IconGroup>
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

      {documentRepository?.index?.keyword?.active ? (
        <IconGroupInfo tooltip="Schlüsselwortsuche">
          <Search />
        </IconGroupInfo>
      ) : undefined}

      {documentRepository?.index?.embedding?.active ? (
        <IconGroupInfo tooltip={embeddingModel?.name ?? "Unbekanntes Modell"}>
          <VectorPolygon />
        </IconGroupInfo>
      ) : undefined}

      {documentRepository?.transcriberIdentifier ? (
        <IconGroupInfo
          tooltip={transcriber?.name ?? "Unbekannter Transkriptor"}
        >
          <AudioLines />
        </IconGroupInfo>
      ) : undefined}
    </IconGroup>
  );
}
