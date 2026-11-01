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
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { InputChangeIndicator } from "../../../../_components/InputChangeIndicator";
import type { SSOProvider } from "@schornio/aibox-package-database/sso/_types";
import { updateSAMLAttributeMapping } from "../_actions/updateSAMLAttributeMapping";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useT } from "next-i18next/client";

export default function EditSAMLAttributeMapping({
  ssoProvider,
}: {
  ssoProvider: SSOProvider;
}) {
  const firstNameInputId = useId();
  const lastNameInputId = useId();
  const avatarUrlInputId = useId();
  const permissionGroupsInputId = useId();

  const { t } = useT("settings", {
    keyPrefix: "_components.EditSAMLAttributeMapping",
  });

  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { execute, isPending } = useAction(
    updateSAMLAttributeMapping,
    actionUtils,
  );

  const defaultFirstNameMapping =
    ssoProvider.saml.attribute_mapping?.keys?.["firstName"]?.name ?? "";
  const [firstNameMapping, setFirstNameMapping] = useState(
    defaultFirstNameMapping,
  );

  const defaultLastNameMapping =
    ssoProvider.saml.attribute_mapping?.keys?.["lastName"]?.name ?? "";
  const [lastNameMapping, setLastNameMapping] = useState(
    defaultLastNameMapping,
  );

  const defaultAvatarUrlMapping =
    ssoProvider.saml.attribute_mapping?.keys?.["avatarUrl"]?.name ?? "";
  const [avatarUrlMapping, setAvatarUrlMapping] = useState(
    defaultAvatarUrlMapping,
  );

  const defaultPermissionGroupsMapping =
    ssoProvider.saml.attribute_mapping?.keys?.["groups"]?.name ?? "";
  const [permissionGroupsMapping, setPermissionGroupsMapping] = useState(
    defaultPermissionGroupsMapping,
  );

  const hasChanges =
    firstNameMapping !== defaultFirstNameMapping ||
    lastNameMapping !== defaultLastNameMapping ||
    avatarUrlMapping !== defaultAvatarUrlMapping ||
    permissionGroupsMapping !== defaultPermissionGroupsMapping;

  return (
    <ContainerMain>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          execute({
            samlMappingAttributeAvatarUrl: avatarUrlMapping,
            samlMappingAttributeFirstName: firstNameMapping,
            samlMappingAttributeLastName: lastNameMapping,
            samlMappingAttributePermissionGroups: permissionGroupsMapping,
          });
        }}
      >
        <FieldSet>
          <FieldLegend>{t("legend")}</FieldLegend>
          <FieldDescription>{t("description")}</FieldDescription>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={firstNameInputId}>
                {t("labelFirstName")}
              </FieldLabel>
              <InputChangeIndicator
                defaultValue={defaultFirstNameMapping}
                id={firstNameInputId}
                onChange={(event) =>
                  setFirstNameMapping(event.currentTarget.value)
                }
                placeholder={t("placeholderFirstName")}
                value={firstNameMapping}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={lastNameInputId}>
                {t("labelLastName")}
              </FieldLabel>
              <InputChangeIndicator
                defaultValue={defaultLastNameMapping}
                id={lastNameInputId}
                onChange={(event) =>
                  setLastNameMapping(event.currentTarget.value)
                }
                placeholder={t("placeholderLastName")}
                value={lastNameMapping}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={avatarUrlInputId}>
                {t("labelAvatarUrl")}
              </FieldLabel>
              <InputChangeIndicator
                defaultValue={defaultAvatarUrlMapping}
                id={avatarUrlInputId}
                onChange={(event) =>
                  setAvatarUrlMapping(event.currentTarget.value)
                }
                placeholder={t("placeholderAvatarUrl")}
                value={avatarUrlMapping}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={permissionGroupsInputId}>
                {t("labelPermissionGroups")}
              </FieldLabel>
              <InputChangeIndicator
                defaultValue={defaultPermissionGroupsMapping}
                id={permissionGroupsInputId}
                onChange={(event) =>
                  setPermissionGroupsMapping(event.currentTarget.value)
                }
                placeholder={t("placeholderPermissionGroups")}
                value={permissionGroupsMapping}
              />
            </Field>
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
                  setFirstNameMapping(defaultFirstNameMapping);
                  setLastNameMapping(defaultLastNameMapping);
                  setAvatarUrlMapping(defaultAvatarUrlMapping);
                  setPermissionGroupsMapping(defaultPermissionGroupsMapping);
                }}
                variant="outline"
              >
                {t("buttonDiscard")}
              </Button>
            </Field>
          </FieldGroup>
        </FieldSet>
      </form>
    </ContainerMain>
  );
}
