"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import type {
  Storage,
  StorageFileObject,
  StorageFileContent,
} from "@schornio/aibox-package-database/storage/_types";
import { transcriptionToText } from "@schornio/aibox-package-database/storage/transcriptionToText";
import { Field, FieldGroup } from "@schornio/aibox-package-ui/components/field";
import { Textarea } from "@schornio/aibox-package-ui/components/textarea";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { storageUpdateFileText } from "../_actions/storageUpdateFileText";

export function StorageFileEditor({
  file,
  storage,
  content,
}: {
  file: StorageFileObject;
  storage: Storage;
  content: NonNullable<StorageFileContent>;
}) {
  const { t } = useT("common", { keyPrefix: "_components.StorageFileEditor" });
  const router = useRouter();
  const pathname = usePathname();
  const [expectedText, setExpectedText] = useState(() =>
    content.type === "mdc" ? content.current : transcriptionToText(content),
  );
  const [text, setText] = useState(expectedText);
  const [error, setError] = useState<string>();
  const { executeAsync, isPending } = useAction(storageUpdateFileText);
  const close = () => {
    router.replace(pathname);
    router.refresh();
  };
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (isPending) return;
        setError(undefined);
        try {
          const result = await executeAsync({
            storage,
            path: file.path,
            text,
            expectedText,
          });
          if (!result?.data) throw new Error();
          if (result.data.status === "conflict") {
            setError("errorConflict");
            return;
          }
          setExpectedText(text);
          if (!result.data.indexQueued) {
            setError("errorIndex");
            return;
          }
          close();
        } catch {
          setError("errorSave");
        }
      }}
    >
      <FieldGroup>
        <Field data-disabled={isPending}>
          <Textarea
            aria-label={t("labelContent")}
            className="min-h-[60vh] resize-y font-mono text-sm"
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={isPending}
            spellCheck={false}
          />
        </Field>
      </FieldGroup>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {t(error)}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          type="button"
          disabled={isPending}
          onClick={close}
        >
          {t("labelCancel")}
        </Button>
        <ButtonAction type="submit" isPending={isPending}>
          {t("labelSave")}
        </ButtonAction>
      </div>
    </form>
  );
}
