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
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { CirclePlus } from "lucide-react";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Input } from "@schornio/aibox-package-ui/components/input";
import Link from "next/link";
import { Textarea } from "@schornio/aibox-package-ui/components/textarea";
import { createWorkspace } from "../_actions/createWorkspace";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useT } from "next-i18next/client";

export function WorkspaceCreator() {
  const nameInputId = useId();
  const descriptionInputId = useId();
  const { t } = useT("workspace", {
    keyPrefix: "_components.WorkspaceCreator",
  });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { execute, isPending } = useAction(createWorkspace, actionUtils);

  return (
    <ContainerMain>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!isPending && name.trim()) execute({ description, name });
        }}
      >
        <FieldSet disabled={isPending}>
          <FieldLegend>{t("labelTitle")}</FieldLegend>
          <FieldDescription>{t("descriptionWorkspace")}</FieldDescription>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={nameInputId}>{t("labelName")}</FieldLabel>
              <Input
                id={nameInputId}
                required
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={descriptionInputId}>
                {t("labelDescription")}
              </FieldLabel>
              <Textarea
                id={descriptionInputId}
                value={description}
                onChange={(event) => setDescription(event.currentTarget.value)}
              />
            </Field>
          </FieldGroup>
          {hasErrored && (
            <p role="alert" className="text-destructive text-sm">
              {t("errorCreate")}
            </p>
          )}
          <Field orientation="horizontal">
            <ButtonAction
              disabled={!name.trim() || isPending}
              hasErrored={hasErrored}
              hasSucceeded={hasSucceeded}
              isPending={isPending}
              type="submit"
            >
              <CirclePlus /> {t("labelCreate")}
            </ButtonAction>
            <Button
              variant="outline"
              disabled={isPending}
              nativeButton={false}
              render={<Link href="/settings/workspace" />}
            >
              {t("labelCancel")}
            </Button>
          </Field>
        </FieldSet>
      </form>
    </ContainerMain>
  );
}
