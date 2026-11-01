"use client";
import { useSearchParams } from "next/navigation";
import { StorageFileEditor } from "./StorageFileEditor";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import type {
  Storage,
  StorageFileContent,
  StorageObject,
} from "@schornio/aibox-package-database/storage/_types";
import { StorageFileActions } from "./StorageFileActions";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { FileQuestion } from "lucide-react";
import { StorageFilePreviewMDC } from "./StorageFilePreviewMDC";
import { StorageFilePreviewTranscription } from "./transcription/StorageFilePreviewTranscription";
import { StorageObjectTile } from "./StorageObjectTile";

function StorageFilePreviewContent({
  fileContent,
  fileObject,
  storage,
}: {
  fileContent: StorageFileContent;
  fileObject: StorageObject;
  storage: Storage;
}) {
  switch (fileContent?.type) {
    case "mdc":
      return (
        <StorageFilePreviewMDC
          fileContent={fileContent}
          fileObject={fileObject}
          storage={storage}
        />
      );
    case "transcript":
      return (
        <StorageFilePreviewTranscription
          key={JSON.stringify([storage, fileObject.path])}
          fileContent={fileContent}
          fileObject={fileObject}
          storage={storage}
        />
      );
    default:
      return (
        <>
          <div className="mx-auto my-10 w-52">
            <StorageObjectTile
              storageObject={fileObject}
              storage={storage}
              variant="tiles-large"
            />
          </div>
          <ContainerMain className="flex flex-col gap-3" size="narrow">
            <Alert>
              <FileQuestion />
              <AlertDescription>
                Unbekanntes Dateiformat. Die Datei kann nicht verarbeitet werden
                und der KI zur Verfügung gestellt werden.
              </AlertDescription>
            </Alert>
          </ContainerMain>
        </>
      );
  }
}

export function StorageFilePreview(props: {
  fileContent: StorageFileContent;
  fileObject: StorageObject;
  storage: Storage;
  canWrite?: boolean;
  detailView?: boolean;
}) {
  const searchParams = useSearchParams();
  if (
    props.detailView &&
    props.canWrite &&
    props.fileObject.file &&
    props.fileContent &&
    searchParams.get("view") === "edit"
  ) {
    return (
      <StorageFileEditor
        key={JSON.stringify([props.storage, props.fileObject.path])}
        file={props.fileObject}
        storage={props.storage}
        content={props.fileContent}
      />
    );
  }
  return (
    <>
      {!props.detailView && props.fileObject.file && (
        <div className="flex justify-end">
          <StorageFileActions
            file={props.fileObject}
            storage={props.storage}
            canWrite={props.canWrite}
            editable={props.fileContent !== undefined}
            navigateAfterChange
          />
        </div>
      )}
      <StorageFilePreviewContent {...props} />
    </>
  );
}
