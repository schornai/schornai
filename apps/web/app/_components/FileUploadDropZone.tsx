"use client";

import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import { FileUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { useFileUpload } from "./FileUploadProvider";
import { useState } from "react";
import { useT } from "next-i18next/client";

export function FileUploadDropZone({
  children,
  className,
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { t } = useT("common", { keyPrefix: "_components.FileUploadDropZone" });

  const [dragOver, setDragOver] = useState(false);
  const { queueFileUploadsByDataTransfer } = useFileUpload();

  return (
    <div
      className={cn("relative flex-1", className)}
      onDragLeave={() => {
        setDragOver(false);
      }}
      onDragOver={(eventArgs) => {
        eventArgs.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDrop={(eventArgs) => {
        eventArgs.preventDefault();
        if (!disabled) queueFileUploadsByDataTransfer(eventArgs.dataTransfer);
        setDragOver(false);
      }}
    >
      {children}
      {dragOver ? (
        <ContainerStyled
          className="pointer-events-none absolute inset-3 z-30 flex flex-col items-center justify-center"
          variant="card"
        >
          {dragOver ? (
            <>
              <FileUp
                className="text-muted-foreground animate-bounce"
                size={64}
              />
              <div className="text-muted-foreground text-2xl font-bold">
                {t("drop")}
              </div>
            </>
          ) : undefined}
        </ContainerStyled>
      ) : undefined}
    </div>
  );
}
