"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";
import { X } from "lucide-react";
import { Button } from "@schornio/aibox-package-ui/components/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@schornio/aibox-package-ui/components/alert-dialog";
import { useAgentEditor } from "./AgentEditor";

export function AgentEditorRoleRemoveTool({
  roleId,
  tool,
}: {
  roleId: string;
  tool: "toolCalculator" | "toolChatAwareness" | "toolPlatformAccess";
}) {
  const { setAgentRole } = useAgentEditor();
  const router = useRouter();
  const [removeOpen, setRemoveOpen] = useState(false);
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentEditorRoleRemoveTool",
  });
  return (
    <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
      <AlertDialogTrigger
        render={
          <Button type="button" variant="destructive">
            <X data-icon="inline-start" />
            {t("labelRemove")}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("labelRemove")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("descriptionRemove")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("labelCancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              setRemoveOpen(false);
              setAgentRole(roleId, (prev) => ({
                ...prev,
                [tool]: undefined,
              }));
              router.push(`?view=roles#role-${roleId}`);
            }}
          >
            {t("labelRemove")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
