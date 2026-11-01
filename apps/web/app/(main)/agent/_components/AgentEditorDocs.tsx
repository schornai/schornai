"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
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
import { Info, Lightbulb, Plus, Type } from "lucide-react";
import { AgentEditorDocsRecommendedMessage } from "./AgentEditorDocsRecommendedMessage";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonDiscardChanges } from "@schornio/aibox-package-ui/components/button-discard-changes";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { DragDropProvider } from "@dnd-kit/react";
import { Markdown } from "@schornio/aibox-package-ui/components/markdown";
import { MarkdownProse } from "@schornio/aibox-package-ui/components/markdown-prose";
import { Textarea } from "@schornio/aibox-package-ui/components/textarea";
import { move } from "@dnd-kit/helpers";
import { useAgentEditor } from "./AgentEditor";
import { useState } from "react";
import { useT } from "next-i18next/client";

export function AgentEditorDocs() {
  const { agent, defaultAgent, setAgent } = useAgentEditor();
  const { t } = useT("agent", { keyPrefix: "_components.AgentEditorDocs" });

  const [newestRecommendedMessageId, setNewestRecommendedMessageId] = useState<
    string | undefined
  >();

  return (
    <>
      <ContainerMain
        className="flex scroll-mt-32 flex-col gap-3"
        id="recommendedMessages"
      >
        <FieldSet>
          <FieldLegend>
            {t("labelRecommendedMessages")}{" "}
            <ButtonDiscardChanges
              objA={defaultAgent?.recommendedMessages}
              objB={agent?.recommendedMessages}
              onClick={() =>
                setAgent((prev) => ({
                  ...prev,
                  recommendedMessages: defaultAgent?.recommendedMessages,
                }))
              }
              variant="inline"
            />
          </FieldLegend>
          <FieldDescription>
            {t("descriptionRecommendedMessages")}
          </FieldDescription>
        </FieldSet>

        <DragDropProvider
          onDragEnd={(event) =>
            setAgent((prev) => ({
              ...prev,
              recommendedMessages: move(prev?.recommendedMessages ?? [], event),
            }))
          }
        >
          {agent?.recommendedMessages?.map((recommendedMessage, index) => (
            <AgentEditorDocsRecommendedMessage
              defaultOpen={recommendedMessage.id === newestRecommendedMessageId}
              index={index}
              key={recommendedMessage.id}
              recommendedMessage={recommendedMessage}
            />
          ))}
        </DragDropProvider>

        <Button
          className="mx-auto"
          onClick={() => {
            const id = crypto.randomUUID();
            setNewestRecommendedMessageId(id);
            setAgent((prev) => ({
              ...prev,
              recommendedMessages: [
                ...(prev?.recommendedMessages ?? []),
                { id, message: "" },
              ],
            }));
          }}
        >
          {t("labelAddMessage")} <Plus />
        </Button>
      </ContainerMain>

      <hr className="my-10" />

      <ContainerMain className="scroll-mt-32" id="docs">
        <FieldSet>
          <FieldLegend>
            {t("labelDocumentation")}{" "}
            <ButtonDiscardChanges
              objA={defaultAgent?.documentation}
              objB={agent?.documentation}
              onClick={() =>
                setAgent((prev) => ({
                  ...prev,
                  documentation: defaultAgent?.documentation,
                }))
              }
              variant="inline"
            />
          </FieldLegend>
          <FieldDescription>{t("descriptionDocumentation")}</FieldDescription>
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
                  onChange={({ currentTarget: { value } }) =>
                    setAgent((prev) => ({ ...prev, documentation: value }))
                  }
                  value={agent?.documentation ?? ""}
                />
              </Field>

              <CollapsibleContent className="flex-1">
                <MarkdownProse className="mx-auto rounded-md border p-3">
                  {agent?.documentation}
                </MarkdownProse>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </FieldSet>
      </ContainerMain>

      <hr className="my-10" />

      <ContainerMain className="flex flex-col gap-3" size="narrow">
        <h2 title="Help">
          <Info className="mx-auto" size={40} />
        </h2>

        <Alert>
          <Lightbulb />
          <AlertDescription>
            {t("descriptionDocumentationHelp")}
          </AlertDescription>
        </Alert>

        <Alert>
          <Type />
          <AlertDescription>
            <Markdown>{t("descriptionMarkdownHelp")}</Markdown>
          </AlertDescription>
        </Alert>
      </ContainerMain>
    </>
  );
}
