"use client";

import { Unplug } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { FieldError } from "@schornio/aibox-package-ui/components/field";
import { disconnectMCP } from "../_actions/disconnectMCP";

export function MCPDisconnectButton({ serverUrl }: { serverUrl: string }) {
  const { t } = useT("me", { keyPrefix: "connections.page" });
  const { execute, isPending, hasErrored } = useAction(disconnectMCP);
  return (
    <div className="flex flex-col gap-2">
      <ButtonAction
        variant="outline"
        isPending={isPending}
        hasErrored={hasErrored}
        onClick={() => execute({ serverUrl })}
      >
        <Unplug />
        {t("labelDisconnect")}
      </ButtonAction>
      {hasErrored && <FieldError>{t("errorDisconnect")}</FieldError>}
    </div>
  );
}
