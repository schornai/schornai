"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@schornio/aibox-package-ui/components/input-group";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Search } from "lucide-react";
import { UserEditPermissionListOptionsDropdown } from "./UserEditPermissionListOptionsDropdown";
import { UserEditPermissionListTable } from "./UserEditPermissionListTable";
import { useT } from "next-i18next/client";
import { useUserEditPermissionList } from "./UserEditPermissionListProvider";

export function UserEditPermissionList({ userId }: { userId: string }) {
  const { filter, setFilter } = useUserEditPermissionList();
  const { t } = useT("settings", {
    keyPrefix: "_components.UserEditPermissionList",
  });

  return (
    <>
      <ContainerMain className="flex justify-end">
        <UserEditPermissionListOptionsDropdown />
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

      <UserEditPermissionListTable userId={userId} />
    </>
  );
}
