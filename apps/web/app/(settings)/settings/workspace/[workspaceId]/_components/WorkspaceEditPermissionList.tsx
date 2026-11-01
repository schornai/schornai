"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@schornio/aibox-package-ui/components/input-group";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Search } from "lucide-react";
import { WorkspaceEditPermissionListOptionsDropdown } from "./WorkspaceEditPermissionListOptionsDropdown";
import { WorkspaceEditPermissionListTable } from "./WorkspaceEditPermissionListTable";
import { useT } from "next-i18next/client";
import { useWorkspaceEditPermissionList } from "./WorkspaceEditPermissionListProvider";

export function WorkspaceEditPermissionList({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const { filter, setFilter } = useWorkspaceEditPermissionList();
  const { t } = useT("settings", {
    keyPrefix: "_components.WorkspaceEditPermissionList",
  });

  return (
    <>
      <ContainerMain className="flex justify-end">
        <WorkspaceEditPermissionListOptionsDropdown />
      </ContainerMain>

      <ContainerMain className="flex justify-center">
        <InputGroup className="max-w-sm">
             <InputGroupInput
             onChange={(event) => setFilter(event.currentTarget.value)}
             placeholder={t("placeholderSearch")}
             value={filter ?? ""}
             />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
      </ContainerMain>

      <WorkspaceEditPermissionListTable workspaceId={workspaceId} />
    </>
  );
}
