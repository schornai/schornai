"use client";
import { useEffect } from "react";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { getXRAGPublication } from "../_actions/getXRAGPublication";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";

export function XRAGPublicationStatus({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const { t } = useT("settings", { keyPrefix: "_components.XRAGUpload" });
  const { execute, result, hasErrored, isPending, status } =
    useAction(getXRAGPublication);
  const state = result.data?.state;
  useEffect(() => {
    if (isPending || state === "published" || state === "error") return;
    const timer = setTimeout(
      () => execute({ id }),
      status === "idle" ? 0 : 5000,
    );
    return () => clearTimeout(timer);
  }, [execute, id, state, result, isPending, status]);
  return (
    <Alert
      variant={state === "error" || hasErrored ? "destructive" : "default"}
    >
      <AlertDescription>
        {t(
          hasErrored
            ? "errorPublicationStatus"
            : state === "published"
              ? "labelPublished"
              : state === "error"
                ? "errorPublication"
                : "labelProcessing",
          { name },
        )}
      </AlertDescription>
    </Alert>
  );
}
