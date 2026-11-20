"use client";
import { useEffect, useEffectEvent, useId, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import type { XRAGResource } from "xrag/schema";
import { globalIdentifierSchema } from "xrag/identifier";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import {
  Field,
  FieldLabel,
  FieldError,
} from "@schornio/aibox-package-ui/components/field";
import { Input } from "@schornio/aibox-package-ui/components/input";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { getResourceIdentity } from "../../(main)/app/xrag/_actions/getResourceIdentity";
import { setResourceIdentity } from "../../(main)/app/xrag/_actions/setResourceIdentity";

export function XRAGIdentitySettings({
  kind,
  id,
}: {
  kind: XRAGResource["resourceType"];
  id: string;
}) {
  const { t } = useT("common", { keyPrefix: "_components.XRAGExportButton" });
  const fieldId = useId();
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState("");
  const identity = useAction(getResourceIdentity, {
    onSuccess: ({ data }) => {
      if (data) {
        setValue(data.globalId);
        setSaved(data.globalId);
      }
    },
  });
  const save = useAction(setResourceIdentity, {
    onSuccess: ({ data }) => {
      if (data) {
        setValue(data.globalId);
        setSaved(data.globalId);
      }
    },
  });
  const loadIdentity = useEffectEvent(() => identity.execute({ kind, id }));
  useEffect(() => {
    loadIdentity();
  }, [kind, id]);
  const invalid =
    value !== saved && !globalIdentifierSchema.safeParse(value).success;
  return (
    <ContainerMain>
      <Field>
        <FieldLabel htmlFor={fieldId}>{t("labelGlobalId")}</FieldLabel>
        <Input
          id={fieldId}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${fieldId}-error` : undefined}
          value={value}
          onChange={(e) => {
            save.reset();
            setValue(e.target.value);
          }}
          disabled={!saved || save.isPending}
        />
        {invalid && (
          <FieldError id={`${fieldId}-error`}>{t("errorGlobalId")}</FieldError>
        )}
        <ButtonAction
          variant="outline"
          isPending={save.isPending || identity.isPending}
          hasErrored={save.hasErrored || identity.hasErrored}
          hasSucceeded={save.hasSucceeded && value === saved}
          disabled={!saved || value === saved || invalid}
          onClick={() =>
            save.execute({ kind, id, globalId: value, expectedGlobalId: saved })
          }
        >
          {t("labelSaveId")}
        </ButtonAction>
      </Field>
    </ContainerMain>
  );
}
