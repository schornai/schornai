"use client";

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { useId, useState } from "react";
import { ArrowDownToLine } from "lucide-react";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { ButtonDiscardChanges } from "@schornio/aibox-package-ui/components/button-discard-changes";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Input } from "@schornio/aibox-package-ui/components/input";
import { UserRoleIcon } from "../../../../_components/UserRoleIcon";
import { updateSSOMapping } from "../_actions/updateSSOMapping";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useT } from "next-i18next/client";

export function WorkspaceEditorSSOMappings({
  defaultSamlMappingUser = "",
  defaultSamlMappingEditor = "",
  defaultSamlMappingWorkspaceAdmin = "",
  workspaceId,
}: {
  defaultSamlMappingUser?: string;
  defaultSamlMappingEditor?: string;
  defaultSamlMappingWorkspaceAdmin?: string;
  workspaceId: string;
}) {
  const samlMappingUserInputId = useId();
  const samlMappingEditorInputId = useId();
  const samlMappingWorkspaceAdminInputId = useId();

  const { t } = useT("workspace", {
    keyPrefix: "_components.WorkspaceEditorSSOMappings",
  });

  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { execute, isPending } = useAction(updateSSOMapping, actionUtils);

  const [samlMappingUser, setSamlMappingUser] = useState(
    defaultSamlMappingUser,
  );
  const [samlMappingEditor, setSamlMappingEditor] = useState(
    defaultSamlMappingEditor,
  );
  const [samlMappingWorkspaceAdmin, setSamlMappingWorkspaceAdmin] = useState(
    defaultSamlMappingWorkspaceAdmin,
  );

  const hasChanges =
    samlMappingUser !== defaultSamlMappingUser ||
    samlMappingEditor !== defaultSamlMappingEditor ||
    samlMappingWorkspaceAdmin !== defaultSamlMappingWorkspaceAdmin;

  return (
    <>
      <ContainerMain>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            execute({
              samlMappingEditor,
              samlMappingUser,
              samlMappingWorkspaceAdmin,
              workspaceId,
            });
          }}
        >
          <FieldSet>
            <FieldLegend>{t("legend")}</FieldLegend>
            <FieldDescription>{t("description")}</FieldDescription>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={samlMappingUserInputId}>
                  <UserRoleIcon className="size-4" role="user" />
                  {t("labelRoleUser")}
                  <ButtonDiscardChanges
                    objA={defaultSamlMappingUser}
                    objB={samlMappingUser}
                    onClick={() => setSamlMappingUser(defaultSamlMappingUser)}
                    variant="inline"
                  />
                </FieldLabel>
                <Input
                  id={samlMappingUserInputId}
                  placeholder={t("placeholderNoGroup")}
                  onChange={(event) =>
                    setSamlMappingUser(event.currentTarget.value)
                  }
                  value={samlMappingUser ?? ""}
                />
                <FieldDescription>{t("descriptionRoleUser")}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor={samlMappingEditorInputId}>
                  <UserRoleIcon className="size-4" role="editor" />
                  {t("labelRoleEditor")}
                  <ButtonDiscardChanges
                    objA={defaultSamlMappingEditor}
                    objB={samlMappingEditor}
                    onClick={() =>
                      setSamlMappingEditor(defaultSamlMappingEditor)
                    }
                    variant="inline"
                  />
                </FieldLabel>
                <Input
                  id={samlMappingEditorInputId}
                  placeholder={t("placeholderNoGroup")}
                  onChange={(event) =>
                    setSamlMappingEditor(event.currentTarget.value)
                  }
                  value={samlMappingEditor ?? ""}
                />
                <FieldDescription>
                  {t("descriptionRoleEditor")}
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor={samlMappingWorkspaceAdminInputId}>
                  <UserRoleIcon className="size-4" role="workspace-admin" />{" "}
                  {t("labelRoleWorkspaceAdmin")}
                  <ButtonDiscardChanges
                    objA={defaultSamlMappingWorkspaceAdmin}
                    objB={samlMappingWorkspaceAdmin}
                    onClick={() =>
                      setSamlMappingWorkspaceAdmin(
                        defaultSamlMappingWorkspaceAdmin,
                      )
                    }
                    variant="inline"
                  />
                </FieldLabel>
                <Input
                  id={samlMappingWorkspaceAdminInputId}
                  placeholder={t("placeholderNoGroup")}
                  onChange={(event) =>
                    setSamlMappingWorkspaceAdmin(event.currentTarget.value)
                  }
                  value={samlMappingWorkspaceAdmin ?? ""}
                />
                <FieldDescription>
                  {t("descriptionRoleWorkspaceAdmin")}
                </FieldDescription>
              </Field>
            </FieldGroup>
            <Field orientation="horizontal">
              <ButtonAction
                disabled={!hasChanges}
                hasErrored={hasErrored}
                hasSucceeded={hasSucceeded}
                isPending={isPending}
                type="submit"
              >
                <ArrowDownToLine /> {t("buttonSave")}
              </ButtonAction>
              <Button
                disabled={!hasChanges}
                onClick={() => {
                  setSamlMappingUser(defaultSamlMappingUser);
                  setSamlMappingEditor(defaultSamlMappingEditor);
                  setSamlMappingWorkspaceAdmin(
                    defaultSamlMappingWorkspaceAdmin,
                  );
                }}
                variant="outline"
              >
                {t("buttonReset")}
              </Button>
            </Field>
          </FieldSet>
        </form>
      </ContainerMain>
    </>
  );
}
