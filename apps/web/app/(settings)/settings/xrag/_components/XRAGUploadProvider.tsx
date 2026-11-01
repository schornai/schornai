"use client";

import { createContext, useContext, useState } from "react";
import { FileUploadDropZone } from "../../../../_components/FileUploadDropZone";
import { FileUploadProvider } from "../../../../_components/FileUploadProvider";
import type { ReactNode } from "react";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { submitXRAG } from "../_actions/submitXRAG";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";

const xragUploadContext = createContext({
  hasErrored: false,
  hasSucceeded: false,
  isPending: false,
});

export default function XRAGUploadProvider({
  children,
}: {
  children?: ReactNode;
}) {
  const [uploadDirectory] = useState(() => `uploads/${crypto.randomUUID()}`);
  const {
    actionUtils: actionUtilsUploadAction,
    hasErrored: hasErroredSubmitXRAG,
    hasSucceeded: hasSucceededSubmitXRAG,
  } = useDecayActionState();
  const { execute, isPending: isPendingSumbitXRAG } = useAction(
    submitXRAG,
    actionUtilsUploadAction,
  );

  const [hasErroredUploadXRAG, setHasErroredUploadXRAG] = useState(false);
  const [isPendingUploadXRAG, setIsPendingUploadXRAG] = useState(false);

  const hasErrored = hasErroredSubmitXRAG || hasErroredUploadXRAG;
  const hasSucceeded = hasSucceededSubmitXRAG;
  const isPending = isPendingSumbitXRAG || isPendingUploadXRAG;

  return (
    <xragUploadContext.Provider value={{ hasErrored, hasSucceeded, isPending }}>
      <FileUploadProvider
        basePath="/"
        bucketName="box-action-files"
        bucketPath={uploadDirectory}
        beforeUpload={() => {
          setIsPendingUploadXRAG(true);
        }}
        onFileUploadError={(error) => {
          logError("/settings/xrag", error);
          setIsPendingUploadXRAG(false);
          setHasErroredUploadXRAG(true);
        }}
        onFileUploadSuccess={(upload) => {
          execute({ actionFileName: `${uploadDirectory}/${upload.file.name}` });
          setIsPendingUploadXRAG(false);
        }}
      >
        <FileUploadDropZone>{children}</FileUploadDropZone>
      </FileUploadProvider>
    </xragUploadContext.Provider>
  );
}

export function useXRAGUpload() {
  return useContext(xragUploadContext);
}
