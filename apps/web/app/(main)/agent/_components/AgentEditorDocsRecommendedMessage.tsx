"use client";

import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@schornio/aibox-package-ui/components/field";
import { Grip, Pencil, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { AgentRecommendedMessage } from "./AgentRecommendedMessage";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { Input } from "@schornio/aibox-package-ui/components/input";
import { Textarea } from "@schornio/aibox-package-ui/components/textarea";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { useAgentEditor } from "./AgentEditor";
import { useSortable } from "@dnd-kit/react/sortable";
import { useT } from "next-i18next/client";

export function AgentEditorDocsRecommendedMessage({
  defaultOpen = false,
  index,
  recommendedMessage,
}: {
  defaultOpen?: boolean;
  index: number;
  recommendedMessage: Agent["recommendedMessages"][number];
}) {
  const labelInputId = useId();
  const labelMessageId = useId();
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentEditorDocsRecommendedMessage",
  });

  const [element, setElement] = useState<Element | null>(null);
  const handleRef = useRef<HTMLButtonElement | null>(null);
  const { isDragging } = useSortable({
    element,
    handle: handleRef,
    id: recommendedMessage.id,
    index,
  });

  const [editing, setEditing] = useState(defaultOpen);
  const { agent, setAgent } = useAgentEditor();

  return (
    <div className="flex gap-1" ref={setElement}>
      <div
        className={cn(
          "bg-muted flex flex-1 flex-col rounded-md transition-shadow",
          {
            "shadow-2xl": isDragging,
          },
        )}
      >
        <AgentRecommendedMessage
          agent={agent}
          className="flex-1"
          recommendedMessage={recommendedMessage}
        />
        {editing ? (
          <FieldGroup className="p-3">
            <Field>
              <FieldLabel htmlFor={labelInputId}>{t("labelLabel")}</FieldLabel>
              <Input
                className="bg-background"
                id={labelInputId}
                onChange={({ currentTarget: { value } }) =>
                  setAgent((prev) => ({
                    ...prev,
                    recommendedMessages: prev?.recommendedMessages?.map(($) =>
                      $.id === recommendedMessage.id
                        ? { ...$, label: value }
                        : $,
                    ),
                  }))
                }
                value={recommendedMessage.label ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={labelMessageId}>
                {t("labelMessage")}
              </FieldLabel>
              <Textarea
                className="bg-background"
                id={labelMessageId}
                onChange={({ currentTarget: { value } }) =>
                  setAgent((prev) => ({
                    ...prev,
                    recommendedMessages: prev?.recommendedMessages?.map(($) =>
                      $.id === recommendedMessage.id
                        ? { ...$, message: value }
                        : $,
                    ),
                  }))
                }
                value={recommendedMessage.message ?? ""}
              />
            </Field>
            <Button
              className="self-end"
              onClick={() => setEditing(false)}
              size="sm"
              variant="ghost"
            >
              {t("labelClose")}
            </Button>
          </FieldGroup>
        ) : undefined}
      </div>
      <div className="flex items-center gap-1">
        <Button
          aria-expanded={editing}
          onClick={() => setEditing((prev) => !prev)}
          size="icon-sm"
          variant="ghost"
        >
          <Pencil />
        </Button>
        <Button
          className="cursor-grab"
          ref={handleRef}
          size="icon-sm"
          variant="ghost"
        >
          <Grip />
        </Button>
        <Button
          onClick={() => {
            setAgent((prev) => ({
              ...prev,
              recommendedMessages: prev?.recommendedMessages?.filter(
                (message) => message.id !== recommendedMessage.id,
              ),
            }));
            setEditing(false);
          }}
          size="icon-sm"
          variant="destructive"
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
