"use client";

import { createContext, useContext, useState } from "react";
import { FileUploadDropZone } from "../../_components/FileUploadDropZone";
import { FileUploadProvider } from "../../_components/FileUploadProvider";
import type { ReactNode } from "react";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { updateProfileAvatar } from "../_actions/updateProfileAvatar";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useDecayState } from "@schornio/aibox-package-ui/hooks/use-decay-state";

const editorAvatarContext = createContext({
  hasErrored: false,
  hasSucceeded: false,
  isPending: false,
});

export function EditorAvatarUploadProvider({
  children,
  targetUserId,
  userId,
}: {
  children?: ReactNode;
  targetUserId?: string;
  userId: string;
}) {
  const {
    actionUtils: actionUtilsUploadAction,
    hasErrored: hasErroredUploadAction,
    hasSucceeded: hasSucceededUploadAction,
  } = useDecayActionState();
  const { execute, isPending: isPendingUploadAction } = useAction(
    updateProfileAvatar,
    actionUtilsUploadAction,
  );

  const [hasErroredUploadFile, setHasErroredUploadFile] = useDecayState(false);
  const [isPendingUpload, setIsPendingUpload] = useState(false);

  const hasErrored = hasErroredUploadAction || hasErroredUploadFile;
  const hasSucceeded = hasSucceededUploadAction;
  const isPending = isPendingUpload || isPendingUploadAction;

  return (
    <editorAvatarContext.Provider
      value={{ hasErrored, hasSucceeded, isPending }}
    >
      <FileUploadProvider
        basePath="/"
        beforeUpload={() => {
          setIsPendingUpload(true);
        }}
        bucketName="user_avatars"
        bucketPath={targetUserId ?? userId}
        onFileUploadError={(error) => {
          logError("/me /settings -> EditorAvatar", error);
          setIsPendingUpload(false);
          setHasErroredUploadFile(true);
        }}
        onFileUploadSuccess={(upload) => {
          execute({
            avatarUrl: `user_avatars/${targetUserId ?? userId}/${upload.path}`,
            targetUserId,
          });
          setIsPendingUpload(false);
        }}
        restrictUpload={(files) =>
          files.length === 1 &&
          files.every((file) => {
            return file.type.startsWith("image/");
          })
        }
      >
        <FileUploadDropZone>{children}</FileUploadDropZone>
      </FileUploadProvider>
    </editorAvatarContext.Provider>
  );
}

export function useEditorAvatarUpload() {
  return useContext(editorAvatarContext);
}
