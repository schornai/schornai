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
import { useT } from "next-i18next/client";
import { useTranscriberEditor } from "./TranscriberEditor";

export function TranscriberEditorDiscardAllChanges() {
  const { transcriber, defaultTranscriber, setTranscriber } =
    useTranscriberEditor();
  const { t } = useT("transcriber", {
    keyPrefix: "_components.TranscriberEditorDiscardAllChanges",
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <ButtonDiscardChanges objA={defaultTranscriber} objB={transcriber} />
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
              setTranscriber(defaultTranscriber);
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
