"use client";

import { useId, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@schornio/aibox-package-ui/components/field";
import { Input } from "@schornio/aibox-package-ui/components/input";
import { createXRAGPackage } from "../_actions/createXRAGPackage";

export function XRAGPackageCreateForm() {
  const { t } = useT("common", { keyPrefix: "_components.XRAGPackages" });
  const id = useId();
  const [name, setName] = useState("");
  const create = useAction(createXRAGPackage, {
    onSuccess: () => setName(""),
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim() && !create.isPending)
          create.execute({ name: name.trim() });
      }}
    >
      <Field>
        <FieldLabel htmlFor={id}>{t("labelName")}</FieldLabel>
        <div className="flex flex-wrap gap-2">
          <Input
            id={id}
            className="min-w-32 flex-1"
            maxLength={200}
            required
            disabled={create.isPending}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <ButtonAction
            type="submit"
            isPending={create.isPending}
            hasErrored={create.hasErrored}
            disabled={!name.trim()}
          >
            {t("labelCreate")}
          </ButtonAction>
        </div>
        {create.hasErrored && <FieldError>{t("errorCreate")}</FieldError>}
      </Field>
    </form>
  );
}
