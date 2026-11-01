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
import { useAgentEditor } from "./AgentEditor";
import { useT } from "next-i18next/client";

export function AgentEditorDiscardAllChanges() {
  const { agent, defaultAgent, setAgent } = useAgentEditor();
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentEditorDiscardAllChanges",
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<ButtonDiscardChanges objA={defaultAgent} objB={agent} />}
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
              setAgent(defaultAgent);
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
