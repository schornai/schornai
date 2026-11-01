"use client";
import { useId, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { useRouter } from "next/navigation";
import type { Storage } from "@schornio/aibox-package-database/storage/_types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@schornio/aibox-package-ui/components/dialog";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@schornio/aibox-package-ui/components/field";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { Input } from "@schornio/aibox-package-ui/components/input";
import { getFileCategory } from "@schornio/aibox-package-utils/getFileTypeLabel";
import { storageToAppBasePath } from "@/lib/storageToAppBasePath";
import { storageCreateTextFile } from "../_actions/storageCreateTextFile";

export function StorageDialogCreateTextFile({
  storage,
  basePath,
  open,
  onOpenChange,
}: {
  storage: Storage;
  basePath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useT("common", {
    keyPrefix: "_components.StorageDialogCreateTextFile",
  });
  const id = useId();
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState(false);
  const { executeAsync, isPending } = useAction(storageCreateTextFile);
  const close = () => {
    if (!isPending) {
      onOpenChange(false);
      setError(false);
      setName("");
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) close();
      }}
    >
      <DialogContent aria-describedby={undefined}>
        <form
          className="contents"
          onSubmit={async (event) => {
            event.preventDefault();
            if (isPending) return;
            setError(false);
            try {
              const result = await executeAsync({
                storage,
                basePath,
                name,
              });
              if (!result?.data) throw new Error();
              router.refresh();
              const file = result.data.file;
              close();
              if (["plain-text", "code"].includes(getFileCategory(file.path)))
                router.push(
                  `${storageToAppBasePath(storage)}/${file.path.split("/").map(encodeURIComponent).join("/")}?view=edit`,
                );
            } catch {
              setError(true);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("labelTitle")}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel className="sr-only" htmlFor={`${id}-name`}>
                {t("labelName")}
              </FieldLabel>
              <Input
                id={`${id}-name`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={200}
                disabled={isPending}
                placeholder="Notizen.txt"
              />
            </Field>
            {error && (
              <FieldDescription role="alert">
                {t("errorCreate")}
              </FieldDescription>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={close}
            >
              {t("labelCancel")}
            </Button>

            <ButtonAction type="submit" isPending={isPending}>
              {t("labelCreate")}
            </ButtonAction>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
