"use client";

import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@schornio/aibox-package-ui/components/dropdown-menu";
import { StorageDialogCreateTextFile } from "./StorageDialogCreateTextFile";
import { FileText } from "lucide-react";
import { useAudioRecorder } from "./AudioRecorderModal";
import { Folder, Mic, Paperclip, SlidersHorizontal } from "lucide-react";
import { type ReactElement, useId, useState } from "react";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { DropdownMenuItemAction } from "@schornio/aibox-package-ui/components/dropdown-menu-item-action";
import { StorageDialogCreateFolder } from "./StorageDialogCreateFolder";
import { useFileUpload } from "./FileUploadProvider";
import { useStorageView } from "./StorageViewProvider";
import { useT } from "next-i18next/client";

import { StorageActionMenu } from "./StorageActionMenu";

export function StorageViewOptionsDropdown({
  children,
}: {
  children?: ReactElement;
}) {
  const uploadInputId = useId();
  const audioRecorder = useAudioRecorder();

  // <DialogTrigger /> gets selected on drop-down. Therefore this workaround
  const [createTextDialogOpen, setCreateTextDialogOpen] = useState(false);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);

  const {
    basePathStorage,
    canWrite,
    group,
    isUserPreferences,
    resetPreferences,
    savePreferences,
    savePreferencesHasErrored,
    savePreferencesHasSucceeded,
    savePreferencesIsPending,
    setGroup,
    setSort,
    setView,
    storage,
    sort,
    view,
  } = useStorageView();

  const { queueFileUploadsByFileList } = useFileUpload();

  const { t } = useT("common", {
    keyPrefix: "_components.StorageViewOptionsDropdown",
  });

  return (
    <>
      <StorageActionMenu
        trigger={
          children ? undefined : (
            <Button variant="ghost">
              <SlidersHorizontal />
              <span className="sr-only sm:not-sr-only">
                {t("labelOptions")}
              </span>
            </Button>
          )
        }
        children={children ? () => children : undefined}
        items={
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t("labelView")}</DropdownMenuLabel>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {t("labelSort")}
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={sort ?? ""}
                      onValueChange={(value) => setSort(String(value))}
                    >
                      <DropdownMenuRadioItem value="name:asc">
                        {t("labelNameAsc")}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="name:desc">
                        {t("labelNameDesc")}
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup
                      value={sort ?? ""}
                      onValueChange={(value) => setSort(String(value))}
                    >
                      <DropdownMenuRadioItem value="size:asc">
                        {t("labelSizeAsc")}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="size:desc">
                        {t("labelSizeDesc")}
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup
                      value={sort ?? ""}
                      onValueChange={(value) => setSort(String(value))}
                    >
                      <DropdownMenuRadioItem value="created:asc">
                        {t("labelCreatedAsc")}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="created:desc">
                        {t("labelCreatedDesc")}
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup
                      value={sort ?? ""}
                      onValueChange={(value) => setSort(String(value))}
                    >
                      <DropdownMenuRadioItem value="updated:asc">
                        {t("labelUpdatedAsc")}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="updated:desc">
                        {t("labelUpdatedDesc")}
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {t("labelGroup")}
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={group ?? ""}
                      onValueChange={(value) => setGroup(String(value))}
                    >
                      <DropdownMenuRadioItem value="no-group">
                        {t("labelNoGroup")}
                      </DropdownMenuRadioItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioItem value="first-letter">
                        {t("labelFirstLetter")}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="type">
                        {t("labelFileType")}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="created">
                        {t("labelCreated")}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="updated">
                        {t("labelUpdated")}
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {t("labelView")}
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={view ?? ""}
                      onValueChange={(value) => setView(String(value))}
                    >
                      <DropdownMenuRadioItem value="tiles-small">
                        {t("labelTilesSmall")}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="tiles-medium">
                        {t("labelTilesMedium")}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="tiles-large">
                        {t("labelTilesLarge")}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="table">
                        {t("labelTable")}
                      </DropdownMenuRadioItem>
                      {storage.type === "documentRepository" ? (
                        <DropdownMenuRadioItem value="columns">
                          {t("labelColumns")}
                        </DropdownMenuRadioItem>
                      ) : undefined}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              {isUserPreferences ? undefined : (
                <div className="flex flex-col gap-1 py-1">
                  <ButtonAction
                    hasErrored={savePreferencesHasErrored}
                    hasSucceeded={savePreferencesHasSucceeded}
                    isPending={savePreferencesIsPending}
                    onClick={() => savePreferences()}
                    size="xs"
                  >
                    {t("labelSaveView")}
                  </ButtonAction>
                  <Button
                    onClick={() => resetPreferences()}
                    size="xs"
                    variant="outline"
                  >
                    {t("labelReset")}
                  </Button>
                </div>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {canWrite && (
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("labelThisFolder")}</DropdownMenuLabel>
                <DropdownMenuItem render={<label htmlFor={uploadInputId} />}>
                  <Paperclip /> {t("labelUploadFile")}
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    {t("labelNew")}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          onClick={() => setCreateTextDialogOpen(true)}
                        >
                          <FileText />
                          {t("labelNewTextFile")}
                        </DropdownMenuItem>
                        {audioRecorder.enabled ? (
                          <DropdownMenuItem
                            onClick={() => audioRecorder.open()}
                          >
                            <Mic /> {t("labelNewRecording")}
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItemAction
                          onClick={() => setCreateFolderDialogOpen(true)}
                        >
                          <Folder /> {t("labelNewFolder")}
                        </DropdownMenuItemAction>
                      </DropdownMenuGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuGroup>
            )}
          </>
        }
      />

      <input
        className="hidden"
        id={uploadInputId}
        multiple
        onChange={({ currentTarget: { files } }) => {
          queueFileUploadsByFileList(files);
        }}
        type="file"
      />

      <StorageDialogCreateTextFile
        basePath={basePathStorage}
        storage={storage}
        open={createTextDialogOpen}
        onOpenChange={setCreateTextDialogOpen}
      />
      <StorageDialogCreateFolder
        basePath={basePathStorage}
        onOpenChange={setCreateFolderDialogOpen}
        open={createFolderDialogOpen}
        storage={storage}
      />
    </>
  );
}
