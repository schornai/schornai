"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { Type } from "lucide-react";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Input } from "@schornio/aibox-package-ui/components/input";
import { Textarea } from "@schornio/aibox-package-ui/components/textarea";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@schornio/aibox-package-ui/components/field";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@schornio/aibox-package-ui/components/collapsible";
import { MarkdownProse } from "@schornio/aibox-package-ui/components/markdown-prose";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { ModelRemove } from "./ModelRemove";
import { updateModelMetadata } from "../_actions/updateModelMetadata";

export function ModelMetadataForm({
  model,
}: {
  model: { id: string; name: string; description: string | null; type: string };
}) {
  const { t } = useT("settings", { keyPrefix: "models" });
  const id = useId();
  const router = useRouter();
  const [name, setName] = useState(model.name);
  const [description, setDescription] = useState(model.description ?? "");
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = useAction(updateModelMetadata);
  const pending = save.isPending;
  return (
    <>
      <ContainerMain>
        <form
          onChange={() => {
            setSaved(false);
            setError(false);
          }}
          className="flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (pending) return;
            setError(false);
            setSaved(false);
            try {
              const result = await save.executeAsync({
                id: model.id,
                name,
                description,
              });
              if (!result?.data?.id) throw new Error();
              setSaved(true);
              router.refresh();
            } catch {
              setError(true);
            }
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${id}-name`}>{t("fields.name")}</FieldLabel>
              <Input
                id={`${id}-name`}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
                required
                maxLength={500}
                disabled={pending}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-docs`}>
                {t("fields.documentation")}
              </FieldLabel>
              <FieldDescription>
                {t("descriptionDocumentation")}
              </FieldDescription>
              <Collapsible>
                <div className="mb-1 flex justify-end">
                  <CollapsibleTrigger
                    render={<Button type="button" variant="ghost" size="xs" />}
                  >
                    <Type /> {t("labelPreview")}
                  </CollapsibleTrigger>
                </div>
                <div className="flex flex-col gap-3 lg:flex-row">
                  <Field className="flex-1">
                    <Textarea
                      id={`${id}-docs`}
                      className="min-h-[20ch] font-mono"
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        setSaved(false);
                      }}
                      maxLength={100_000}
                      disabled={pending}
                    />
                  </Field>
                  <CollapsibleContent className="min-w-0 flex-1">
                    <MarkdownProse className="mx-auto rounded-md border p-3">
                      {description}
                    </MarkdownProse>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </Field>
          </FieldGroup>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{t("errorUpdate")}</AlertDescription>
            </Alert>
          )}
          <ButtonAction
            className="self-start"
            type="submit"
            disabled={pending}
            isPending={save.isPending}
            hasErrored={error}
            hasSucceeded={saved}
          >
            {t("labelSave")}
          </ButtonAction>
        </form>
      </ContainerMain>
      <hr className="my-10" />
      <ContainerMain>
        <section
          className="flex flex-col gap-3"
          aria-labelledby={`${id}-delete-title`}
        >
          <h2 id={`${id}-delete-title`} className="text-lg font-medium">
            {t("labelDelete")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("descriptionDeleteAgents")}
          </p>
          <p className="text-muted-foreground text-sm">
            {t("descriptionDeleteAgentsTip")}
          </p>
          <div>
            <ModelRemove model={model} disabled={pending} />
          </div>
        </section>
      </ContainerMain>
    </>
  );
}
