"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { CircleCheck, CircleX, PackageOpen, Paperclip } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Fragment } from "react/jsx-runtime";
import { StorageViewUpload } from "../../../../_components/StorageViewUpload";
import { useFileUpload } from "../../../../_components/FileUploadProvider";
import { useT } from "next-i18next/client";
import { XRAGPublicationStatus } from "./XRAGPublicationStatus";
import { useXRAGUpload } from "./XRAGUploadProvider";

export default function XRAGUpload() {
  const { t } = useT("settings", { keyPrefix: "_components.XRAGUpload" });

  const { uploads, queueFileUploadsByFileList, clearFinished } =
    useFileUpload();
  const { publications, hasErrored, hasSucceeded, isPending } = useXRAGUpload();

  return (
    <>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageOpen />
          </EmptyMedia>
          <EmptyTitle>{t("title")}</EmptyTitle>
          <EmptyDescription>{t("description")}</EmptyDescription>
          <EmptyContent>
            <ButtonAction
              hasErrored={hasErrored}
              hasSucceeded={hasSucceeded}
              isPending={isPending}
              nativeButton={false}
              render={<label />}
            >
              <Paperclip /> {t("buttonUpload")}
              <input
                className="hidden"
                onChangeCapture={(event) =>
                  queueFileUploadsByFileList(event.currentTarget.files)
                }
                type="file"
                multiple
                accept=".tar"
              />
            </ButtonAction>
          </EmptyContent>
        </EmptyHeader>
      </Empty>

      {publications.length > 0 ? (
        <ContainerMain className="flex flex-col gap-3">
          {publications.map((publication) => (
            <XRAGPublicationStatus key={publication.id} {...publication} />
          ))}
        </ContainerMain>
      ) : null}

      {isPending ? <StorageViewUpload /> : undefined}

      {uploads.length > 0 ? (
        <ContainerMain className="flex flex-col gap-3">
          {uploads.map((upload) => (
            <Fragment key={upload.id}>
              {upload.state === "error" ? (
                <Alert className="border-destructive/10 text-destructive dark:border-destructive/20">
                  <CircleX />
                  <AlertDescription>
                    {t("errorUpload", { name: upload.file.name })}
                  </AlertDescription>
                </Alert>
              ) : undefined}
              {upload.state === "success" ? (
                <Alert className="border-green-500/10 text-green-500 dark:border-green-500/20">
                  <CircleCheck />
                  <AlertDescription>
                    {t("successUpload", { name: upload.file.name })}
                  </AlertDescription>
                </Alert>
              ) : undefined}
            </Fragment>
          ))}

          <Button
            className="mx-auto"
            onClick={() => clearFinished()}
            size="sm"
            variant="ghost"
          >
            {t("buttonHide")}
          </Button>
        </ContainerMain>
      ) : undefined}
    </>
  );
}
