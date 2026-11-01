"use client";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import { AudioRecorderButton, useAudioRecorder } from "./AudioRecorderModal";
import { FolderOpen, Folder, Paperclip, Ellipsis, Mic } from "lucide-react";
import { useRef, useState } from "react";
import { ButtonGroup } from "@schornio/aibox-package-ui/components/button-group";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@schornio/aibox-package-ui/components/dropdown-menu";
import { StorageDialogCreateTextFile } from "./StorageDialogCreateTextFile";
import { FileText } from "lucide-react";
import { StorageDialogCreateFolder } from "./StorageDialogCreateFolder";
import { useStorageView } from "./StorageViewProvider";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { useFileUpload } from "./FileUploadProvider";
import { useT } from "next-i18next/client";

export function StorageViewEmpty() {
  const { t } = useT("common", {
    keyPrefix: "_components.StorageViewEmpty",
  });

  const { queueFileUploadsByFileList } = useFileUpload();
  const { storage, basePathStorage, canWrite } = useStorageView();
  const recorder = useAudioRecorder();
  const inputRef = useRef<HTMLInputElement>(null);
  const [textOpen, setTextOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const { t: menuT } = useT("common", {
    keyPrefix: "_components.StorageViewOptionsDropdown",
  });
  const grouped =
    storage.type === "documentRepository" || storage.type === "activity";
  const uploadButton = (
    <Button variant="outline" onClick={() => inputRef.current?.click()}>
      <Paperclip data-icon="inline-start" />
      {t("labelUploadFile")}
    </Button>
  );

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderOpen />
        </EmptyMedia>
        <EmptyTitle>{t("labelTitle")}</EmptyTitle>
        <EmptyDescription>{t("labelDescription")}</EmptyDescription>
        {canWrite && (
          <EmptyContent className="flex-row flex-wrap justify-center gap-2">
            <input
              ref={inputRef}
              className="hidden"
              multiple
              type="file"
              onChange={({ currentTarget }) => {
                queueFileUploadsByFileList(currentTarget.files);
                currentTarget.value = "";
              }}
            />
            {grouped ? (
              <ButtonGroup aria-label={t("labelUploadFile")}>
                {uploadButton}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={menuT("labelOptions")}
                      />
                    }
                  >
                    <Ellipsis />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                      {recorder.enabled ? (
                        <DropdownMenuItem onClick={() => recorder.open()}>
                          <Mic />
                          {menuT("labelNewRecording")}
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem onClick={() => setTextOpen(true)}>
                        <FileText />
                        {menuT("labelNewTextFile")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFolderOpen(true)}>
                        <Folder />
                        {menuT("labelNewFolder")}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ButtonGroup>
            ) : (
              <>
                {uploadButton}
                <AudioRecorderButton />
                <Button variant="outline" onClick={() => setTextOpen(true)}>
                  <FileText />
                  {menuT("labelNewTextFile")}
                </Button>
              </>
            )}
            <StorageDialogCreateTextFile
              storage={storage}
              basePath={basePathStorage}
              open={textOpen}
              onOpenChange={setTextOpen}
            />
            <StorageDialogCreateFolder
              basePath={basePathStorage}
              storage={storage}
              open={folderOpen}
              onOpenChange={setFolderOpen}
            />
          </EmptyContent>
        )}
      </EmptyHeader>
    </Empty>
  );
}
