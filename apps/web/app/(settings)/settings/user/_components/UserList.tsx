"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@schornio/aibox-package-ui/components/input-group";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Search } from "lucide-react";
import { UserListTable } from "./UserListTable";
import { useT } from "next-i18next/client";
import { useUserList } from "./UserListProvider";

export function UserList() {
  const { filter, setFilter } = useUserList();
  const { t } = useT("settings", {
    keyPrefix: "_components.UserList",
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

      <UserListTable />
    </>
  );
}
