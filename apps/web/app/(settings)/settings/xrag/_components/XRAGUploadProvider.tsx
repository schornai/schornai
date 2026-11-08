"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { FileUploadDropZone } from "../../../../_components/FileUploadDropZone";
import { FileUploadProvider } from "../../../../_components/FileUploadProvider";
import type { ReactNode } from "react";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { submitXRAG } from "../_actions/submitXRAG";
import { useAction } from "next-safe-action/hooks";
import { useSessionToken } from "@/lib/supabase/use-session-token";
import { uploadResumeUser } from "@/lib/resumeUpload";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";

type Publication = { id: string; name: string; createdAt: number };

const xragUploadContext = createContext({
  publications: [] as Publication[],
  hasErrored: false,
  hasSucceeded: false,
  isPending: false,
});

export default function XRAGUploadProvider({
  children,
}: {
  children?: ReactNode;
}) {
  const token = useSessionToken();
  const user = uploadResumeUser(token);
  const storageKey = user ? `xrag-publications:${user}` : undefined;
  const [loadedKey, setLoadedKey] = useState<string>();
  const [publications, setPublications] = useState<Publication[]>([]);
  useEffect(() => {
    if (!storageKey) return;
    try {
      const records: unknown = JSON.parse(
        localStorage.getItem(storageKey) ?? "[]",
      );
      setPublications(
        Array.isArray(records)
          ? records
              .filter(
                (item): item is Publication =>
                  item &&
                  typeof item.id === "string" &&
                  /^[a-f0-9-]{36}$/.test(item.id) &&
                  typeof item.name === "string" &&
                  typeof item.createdAt === "number" &&
                  item.createdAt > Date.now() - 72 * 3600000,
              )
              .slice(-100)
          : [],
      );
    } catch {
      setPublications([]);
    }
    setLoadedKey(storageKey);
  }, [storageKey]);
  useEffect(() => {
    if (storageKey && loadedKey === storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(publications));
      } catch {
        /* Storage may be disabled. */
      }
    }
  }, [publications, storageKey, loadedKey]);
  const {
    actionUtils: actionUtilsUploadAction,
    hasErrored: hasErroredSubmitXRAG,
    hasSucceeded: hasSucceededSubmitXRAG,
  } = useDecayActionState();
  const { execute, isPending: isPendingSumbitXRAG } = useAction(submitXRAG, {
    ...actionUtilsUploadAction,
    onSuccess: (args) => {
      actionUtilsUploadAction.onSuccess?.();
      if (args.data?.id)
        setPublications((previous) =>
          [
            ...previous.filter(({ id }) => id !== args.data.id),
            {
              id: args.data.id,
              name: args.input.actionFileName.split("/").pop()!,
              createdAt: Date.now(),
            },
          ].slice(-100),
        );
    },
  });

  const [hasErroredUploadXRAG, setHasErroredUploadXRAG] = useState(false);
  const [isPendingUploadXRAG, setIsPendingUploadXRAG] = useState(false);

  const hasErrored = hasErroredSubmitXRAG || hasErroredUploadXRAG;
  const hasSucceeded = hasSucceededSubmitXRAG;
  const isPending = isPendingSumbitXRAG || isPendingUploadXRAG;

  return (
    <xragUploadContext.Provider
      value={{ publications, hasErrored, hasSucceeded, isPending }}
    >
      <FileUploadProvider
        basePath="/"
        bucketName="box-action-files"
        bucketPath={() => `uploads/${crypto.randomUUID()}`}
        upsert={false}
        resumable
        beforeUpload={() => {
          setIsPendingUploadXRAG(true);
        }}
        onFileUploadError={(error) => {
          logError("/settings/xrag", error);
          setIsPendingUploadXRAG(false);
          setHasErroredUploadXRAG(true);
        }}
        onFileUploadSuccess={(upload) => {
          execute({
            actionFileName: upload.objectName,
          });
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
