"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@schornio/aibox-package-ui/components/input-group";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Search } from "lucide-react";
import { StorageBreadcrumbs } from "./StorageBreadcrumbs";
import { StorageViewTable } from "./StorageViewTable";
import { StorageViewTiles } from "./StorageViewTiles";
import { StorageViewUpload } from "./StorageViewUpload";
import { StorageViewColumns } from "./StorageViewColumns";
import { useStorageView } from "./StorageViewProvider";
import { useT } from "next-i18next/client";

export function StorageView() {
  const { basePathApp, basePathStorage, filter, setFilter, view } =
    useStorageView();
  const { t } = useT("common", {
    keyPrefix: "_components.StorageView",
  });

  return (
    <>
      <StorageBreadcrumbs
        basePathApp={basePathApp}
        path={basePathStorage}
        view={view}
      />

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

      {view === "table" ? <StorageViewTable /> : undefined}
      {view === "columns" ? <StorageViewColumns /> : undefined}
      {view.startsWith("tiles-") ? <StorageViewTiles /> : undefined}

      <StorageViewUpload />
    </>
  );
}
