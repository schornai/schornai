"use client";

import { ArrowDownToLine, Type } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import {
  Field,
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { ButtonDiscardChanges } from "@schornio/aibox-package-ui/components/button-discard-changes";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { MarkdownProse } from "@schornio/aibox-package-ui/components/markdown-prose";
import { Textarea } from "@schornio/aibox-package-ui/components/textarea";
import { updateDocs } from "../_actions/updateDocumentation";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useState } from "react";
import { useT } from "next-i18next/client";

export function WorkspaceEditorDocs({
  defaultDocs = "",
  workspaceId,
}: {
  defaultDocs?: string;
  workspaceId: string;
}) {
  const { t } = useT("workspace", {
    keyPrefix: "_components.WorkspaceEditorDocs",
  });

  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { execute, isPending } = useAction(updateDocs, actionUtils);

  const [docs, setDocs] = useState(defaultDocs);

  return (
    <>
      <ContainerMain className="scroll-mt-32" id="docs">
        <FieldSet>
          <FieldLegend>
            {t("legend")}
            <ButtonDiscardChanges
              objA={defaultDocs}
              objB={docs}
              onClick={() => setDocs(defaultDocs)}
              variant="inline"
            />
          </FieldLegend>
          <FieldDescription>{t("description")}</FieldDescription>
          <Collapsible>
            <div className="mb-1 flex justify-end">
              <CollapsibleTrigger render={<Button size="xs" variant="ghost" />}>
                <Type /> {t("labelMarkdown")}
              </CollapsibleTrigger>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row">
              <Field className="flex-1">
                <Textarea
                  className="min-h-[20ch] font-mono"
                  onChange={({ currentTarget: { value } }) => setDocs(value)}
                  value={docs}
                />
              </Field>

              <CollapsibleContent className="flex-1">
                <MarkdownProse className="mx-auto rounded-md border p-3">
                  {docs}
                </MarkdownProse>
              </CollapsibleContent>
            </div>
          </Collapsible>

          <Field orientation="horizontal">
            <ButtonAction
              disabled={docs === defaultDocs}
              hasErrored={hasErrored}
              hasSucceeded={hasSucceeded}
              isPending={isPending}
              onClick={() => execute({ docs, workspaceId })}
            >
              <ArrowDownToLine /> {t("buttonSave")}
            </ButtonAction>
            <Button
              disabled={docs === defaultDocs}
              onClick={() => {
                setDocs(defaultDocs);
              }}
              variant="outline"
            >
              {t("buttonReset")}
            </Button>
          </Field>
        </FieldSet>
      </ContainerMain>
    </>
  );
}
