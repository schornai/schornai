"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@schornio/aibox-package-ui/components/input-group";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Search } from "lucide-react";
import { WorkspaceListTable } from "./WorkspaceListTable";
import { useT } from "next-i18next/client";
import { useWorkspaceList } from "./WorkspaceListProvider";

export function WorkspaceList() {
  const { filter, setFilter } = useWorkspaceList();
  const { t } = useT("settings", {
    keyPrefix: "_components.WorkspaceList",
  });

  return (
    <>
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

      <WorkspaceListTable />
    </>
  );
}
