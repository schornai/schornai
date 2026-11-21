"use client";
import { useAction } from "next-safe-action/hooks";
import { prepareXRAGUpload } from "../_actions/prepareXRAGUpload";
import { useT } from "next-i18next/client";
import { LoaderCircle, PackageOpen, Paperclip } from "lucide-react";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { FieldGroup } from "@schornio/aibox-package-ui/components/field";
import {
  FileUploadProvider,
  useFileUpload,
} from "../../../../_components/FileUploadProvider";
import { FileUploadDropZone } from "../../../../_components/FileUploadDropZone";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@schornio/aibox-package-ui/components/progress";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@schornio/aibox-package-ui/components/empty";
export function XRAGImportUpload({ userId }: { userId: string }) {
  const prepare = useAction(prepareXRAGUpload);
  return (
    <FileUploadProvider
      basePath="/"
      bucketName="xrag-transfers"
      bucketPath={() => `${userId}/${crypto.randomUUID()}`}
      upsert={false}
      resumable
      restrictUpload={(files) => files.length === 1}
      beforeUpload={() => prepare.reset()}
      onFileUploadSuccess={(upload) =>
        prepare.execute({ path: upload.objectName })
      }
    >
      <UploadForm preparing={prepare.isPending} failed={prepare.hasErrored} />
    </FileUploadProvider>
  );
}
function UploadForm({
  preparing,
  failed,
}: {
  preparing: boolean;
  failed: boolean;
}) {
  const { t } = useT("common", { keyPrefix: "_components.XRAGTransfer" });
  const { uploads, queueFileUploadsByFileList } = useFileUpload();
  const file = uploads.at(-1);
  const uploading = file?.state === "queued" || file?.state === "uploading";
  const busy = preparing || uploading;
  return (
    <FileUploadDropZone disabled={busy}>
      <FieldGroup>
        <input
          id="xrag-file-upload"
          className="hidden"
          type="file"
          accept=".tar"
          disabled={busy}
          onChange={(event) => {
            queueFileUploadsByFileList(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
        {failed && (
          <Alert variant="destructive">
            <AlertDescription>{t("errorAction")}</AlertDescription>
          </Alert>
        )}
        {file?.state === "error" && (
          <Alert variant="destructive">
            <AlertDescription>{t("errorUpload")}</AlertDescription>
          </Alert>
        )}
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageOpen />
            </EmptyMedia>
            <EmptyTitle>{t("labelUploadTitle")}</EmptyTitle>
            <EmptyDescription className="max-w-full wrap-anywhere">
              {busy ? file?.file.name : t("descriptionDrop")}
            </EmptyDescription>
          </EmptyHeader>
          {uploading ? (
            <Progress className="w-full max-w-sm" max={1} value={file.progress}>
              <ProgressLabel>{t("descriptionUploading")}</ProgressLabel>
              <ProgressValue />
            </Progress>
          ) : preparing ? (
            <div
              role="status"
              className="text-muted-foreground flex min-h-8 items-center gap-2 text-sm"
            >
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              {t("descriptionInspecting")}
            </div>
          ) : (
            <Button
              nativeButton={false}
              render={<label htmlFor="xrag-file-upload" />}
            >
              <Paperclip />
              {t(
                failed || file?.state === "error"
                  ? "labelAnotherUpload"
                  : "labelUpload",
              )}
            </Button>
          )}
        </Empty>
      </FieldGroup>
    </FileUploadDropZone>
  );
}
