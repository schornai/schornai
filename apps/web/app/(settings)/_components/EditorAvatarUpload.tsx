"use client";

import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { Field } from "@schornio/aibox-package-ui/components/field";
import { ImageUp } from "lucide-react";
import { useEditorAvatarUpload } from "./EditorAvatarUploadProvider";
import { useFileUpload } from "../../_components/FileUploadProvider";
import { useT } from "next-i18next/client";

export function EditorAvatarUpload() {
  const { t } = useT("me", { keyPrefix: "_components.EditorAvatarUpload" });

  const { queueFileUploadsByFileList } = useFileUpload();
  const { hasErrored, hasSucceeded, isPending } = useEditorAvatarUpload();

  return (
    <Field>
      <ButtonAction
        hasErrored={hasErrored}
        hasSucceeded={hasSucceeded}
        isPending={isPending}
        nativeButton={false}
        render={<label />}
      >
        <ImageUp /> {t("buttonUpload")}
        <input
          className="hidden"
          onChange={(event) => {
            queueFileUploadsByFileList(event.currentTarget.files);
          }}
          type="file"
        />
      </ButtonAction>
    </Field>
  );
}
