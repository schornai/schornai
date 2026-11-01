"use client";

import {
  Field,
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { UserRoundPlus } from "lucide-react";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { updateAutoJoin } from "../_actions/updateAutoJoin";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useT } from "next-i18next/client";

export function WorkspaceEditorAutoJoin({
  autoJoin = false,
  workspaceId,
}: {
  autoJoin?: boolean;
  workspaceId: string;
}) {
  const { t } = useT("workspace", {
    keyPrefix: "_components.WorkspaceEditorAutoJoin",
  });
  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { execute, isPending } = useAction(updateAutoJoin, actionUtils);

  return (
    <ContainerMain>
      <FieldSet>
        <FieldLegend>{t("legend")}</FieldLegend>
        <FieldDescription>{t("description")}</FieldDescription>
        <Field orientation="horizontal">
          <ButtonAction
            className={cn({
              "bg-primary/10 text-primary dark:bg-primary/80 dark:hover:bg-primary/50 hover:bg-primary/20 dark:text-white":
                autoJoin,
            })}
            hasErrored={hasErrored}
            hasSucceeded={hasSucceeded}
            isPending={isPending}
            onClick={() => execute({ autoJoin: !autoJoin, workspaceId })}
            type="submit"
            variant={autoJoin ? undefined : "outline"}
          >
            <UserRoundPlus /> {autoJoin ? t("labelActive") : t("labelInactive")}
          </ButtonAction>
        </Field>
      </FieldSet>
    </ContainerMain>
  );
}
