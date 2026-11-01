import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import type {
  Storage,
  StorageFileContent,
  StorageObject,
} from "@schornio/aibox-package-database/storage/_types";
import { Code } from "@schornio/aibox-package-ui/components/code";
import { FileIcon } from "./FileIcon";
import { MarkdownProse } from "@schornio/aibox-package-ui/components/markdown-prose";
import { StorageSession } from "@schornio/aibox-package-database/storage/_utils/StorageSession";
import { getFileCategory } from "@schornio/aibox-package-utils/getFileTypeLabel";
import { logError } from "@schornio/aibox-package-ui/components/error-log";

export function StorageFilePreviewMDC({
  fileContent,
  fileObject,
  storage,
}: {
  fileContent: Extract<StorageFileContent, { type: "mdc" }>;
  fileObject: StorageObject;
  storage?: Storage;
}) {
  const fileExtension = fileObject.path.split(".").pop();
  const fileCategory =
    fileExtension === "md" ? "rich-text" : getFileCategory(fileObject.path);

  switch (fileCategory) {
    case "code":
      return (
        <div className="[&_>_pre]:scroll-fade-x w-full max-w-full overflow-x-scroll [&_>_pre]:rounded-md [&_>_pre]:p-3">
          <Code lang={fileExtension}>{fileContent.current}</Code>
        </div>
      );
    case "plain-text":
      return (
        <pre className="rounded-md border p-3 text-sm whitespace-break-spaces shadow-md">
          {fileContent.current}
        </pre>
      );
    case "presentation":
    case "rich-text":
    case "spreadsheet":
    case "image":
      return (
        <>
          {fileCategory === "image" && storage ? (
            <div className="bg-muted overflow-hidden rounded-md border shadow-md">
              <img
                className="max-h-80 w-full object-contain"
                src={`/api/storage/${StorageSession.getStorageName(storage.type)}/${
                  StorageSession.getStoragePath(fileObject.path, storage)
                    .storagePath
                }`}
              />
            </div>
          ) : undefined}
          {fileObject.file &&
          (fileObject.readableContent || fileExtension === "md") ? (
            <MarkdownProse className="bg-background max-w-full rounded-md border p-3 shadow-md">
              {fileContent.current}
            </MarkdownProse>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileIcon path={fileObject.path} />
                </EmptyMedia>
                {/* TODO: es gibt ja doc repos ohne transcriber bzw kein default transcriber (für agents) */}
                <EmptyTitle>Noch nicht verarbeitet</EmptyTitle>
                <EmptyDescription>
                  Damit die KI die Datei versteht muss zuerst der Inhalt
                  extrahiert werden. Je nach Größe und Art der Datei kann das
                  etwas Zeit in Anspruch nehmen
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </>
      );
    default:
      logError("StorageFilePreviewMDC", { unknownFileCategory: fileCategory });
      return <>?</>;
  }
}
