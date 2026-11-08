"use client";

import { Button } from "@schornio/aibox-package-ui/components/button";
import { Square } from "lucide-react";
import { abortChatGeneration } from "../_actions/abortChatGeneration";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { useAction } from "next-safe-action/hooks";
import { useChatComposeMessage } from "./ChatComposeMessageContext";
import { useState } from "react";
import { useChatStatus } from "./ChatContext";
import { useT } from "next-i18next/client";

export function ChatCancelGeneration() {
  const { activityId, agentId } = useChatComposeMessage();
  const { t } = useT("agent", {
    keyPrefix: "_components.ChatCancelGeneration",
  });
  const { executeAsync, isPending } = useAction(abortChatGeneration);
  const [hasError, setHasError] = useState(false);

  const status = useChatStatus();
  if (status !== "queued" && status !== "generating") return null;

  const cancel = () => {
    setHasError(false);
    void executeAsync({ activityId, agentId })
      .then((result) => {
        if (result?.serverError || result?.validationErrors)
          throw new Error("Chat cancellation failed");
      })
      .catch((error: unknown) => {
        setHasError(true);
        logError("ChatCancelGeneration", error);
      });
  };

  return (
    <>
      {hasError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("errorCancel")}
        </p>
      ) : undefined}
      <Button
        disabled={isPending}
        onClick={cancel}
        size="sm"
        type="button"
        variant="destructive"
      >
        <Square data-icon="inline-start" /> {t("labelCancel")}
      </Button>
    </>
  );
}
