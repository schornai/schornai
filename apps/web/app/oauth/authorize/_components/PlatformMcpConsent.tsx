"use client";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { FieldError } from "@schornio/aibox-package-ui/components/field";
import { authorizePlatformMcp } from "../_actions/authorizePlatformMcp";
import type { z } from "zod";
import type { authorizationSchema } from "@/lib/platformMcp/oauth";

export function PlatformMcpConsent({
  request,
  clientName,
}: {
  request: z.infer<typeof authorizationSchema>;
  clientName: string;
}) {
  const { t } = useT("me", { keyPrefix: "platformMcp" });
  const action = useAction(authorizePlatformMcp, {
    onSuccess: ({ data }) => {
      if (data) window.location.assign(data.redirectUrl);
    },
  });
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-6">
      <h1>{t("labelTitle", { client: clientName })}</h1>
      <p>{t("description")}</p>
      <p>
        {t("labelLevel")}: <strong>{t(`level.${request.scope}`)}</strong>
      </p>
      <p>
        {t("labelResource")}: <code>{request.resource}</code>
      </p>
      <p>
        {t("labelRedirect")}: <code>{request.redirect_uri}</code>
      </p>
      <div className="flex gap-2">
        <ButtonAction
          isPending={action.isPending}
          hasErrored={action.hasErrored}
          disabled={action.isPending}
          onClick={() => action.execute({ request, approve: true })}
        >
          {t("labelApprove")}
        </ButtonAction>
        <ButtonAction
          variant="outline"
          isPending={action.isPending}
          disabled={action.isPending}
          onClick={() => action.execute({ request, approve: false })}
        >
          {t("labelDeny")}
        </ButtonAction>
      </div>
      {action.hasErrored && <FieldError>{t("errorAuthorization")}</FieldError>}
    </div>
  );
}
