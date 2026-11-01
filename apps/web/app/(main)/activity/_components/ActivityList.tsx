"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@schornio/aibox-package-ui/components/input-group";
import { ActivityListList } from "./ActivityListList";
import { ActivityListTable } from "./ActivityListTable";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Search } from "lucide-react";
import { useActivityList } from "./ActivityListProvider";
import { useT } from "next-i18next/client";

export function ActivityList() {
  const { filter, setFilter, view } = useActivityList();
  const { t } = useT("activity", {
    keyPrefix: "_components.ActivityList",
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

        {view === "list" ? <ActivityListList /> : undefined}
        {view === "table" ? <ActivityListTable /> : undefined}
    </>
  );
}
