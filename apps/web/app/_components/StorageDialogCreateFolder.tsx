// "use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@schornio/aibox-package-ui/components/dialog";
import type { Dispatch, SetStateAction } from "react";
import { Field, FieldGroup } from "@schornio/aibox-package-ui/components/field";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { Folder } from "lucide-react";
import { Input } from "@schornio/aibox-package-ui/components/input";
import type { Storage } from "@schornio/aibox-package-database/storage/_types";
import { storageCreateFolders } from "../_actions/storageCreateFolders";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useState } from "react";
import { useT } from "next-i18next/client";

export function StorageDialogCreateFolder({
  basePath,
  storage,
  onOpenChange,
  open,
}: {
  basePath: string;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  open: boolean;
  storage: Storage;
}) {
  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { executeAsync, isPending } = useAction(
    storageCreateFolders,
    actionUtils,
  );
  const { t } = useT("common", {
    keyPrefix: "_components.StorageDialogCreateFolder",
  });

  const [folderName, setFolderName] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          autoComplete="off"
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            void executeAsync({
              basePath,
              folderNames: [folderName],
              storage,
            }).then(() => {
              setFolderName("");
              onOpenChange(false);
            });
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1">
              <Folder className="inline size-5" /> {t("labelTitle")}
            </DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <Input
                aria-autocomplete="none"
                onChange={({ currentTarget: { value } }) =>
                  setFolderName(value)
                }
                placeholder={t("placeholderFolderName")}
                required
                value={folderName}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline">{t("labelCancel")}</Button>}
            />
            <ButtonAction
              hasErrored={hasErrored}
              hasSucceeded={hasSucceeded}
              isPending={isPending}
              type="submit"
            >
              {t("labelCreate")}
            </ButtonAction>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
