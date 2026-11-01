import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@schornio/aibox-package-ui/components/alert-dialog";
import { AlertDialogActionClose } from "@schornio/aibox-package-ui/components/alert-dialog-action-close";
import { AlertDialogMediaDestructive } from "@schornio/aibox-package-ui/components/alert-dialog-media-destructive";
import { ButtonDiscardChanges } from "@schornio/aibox-package-ui/components/button-discard-changes";
import { XCircle } from "lucide-react";
import { useDocumentRepositoryEditor } from "./DocumentRepositoryEditor";
import { useT } from "next-i18next/client";

export function DocumentRepositoryEditorDiscardAllChanges() {
  const {
    defaultDocumentRepository,
    documentRepository,
    setDocumentRepository,
  } = useDocumentRepositoryEditor();
  const { t } = useT("documentRepository", {
    keyPrefix: "_components.DocumentRepositoryEditorDiscardAllChanges",
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <ButtonDiscardChanges
            objA={defaultDocumentRepository}
            objB={documentRepository}
          />
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMediaDestructive>
            <XCircle />
          </AlertDialogMediaDestructive>
          <AlertDialogTitle>{t("labelDiscardTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("labelDiscardConfirm")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("labelCancel")}</AlertDialogCancel>
          <AlertDialogActionClose
            onClick={() => {
              setDocumentRepository(defaultDocumentRepository);
            }}
            variant="destructive"
          >
            {t("labelDiscard")}
          </AlertDialogActionClose>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
